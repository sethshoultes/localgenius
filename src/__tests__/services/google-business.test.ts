/**
 * Tests for src/services/google-business.ts
 * OAuth token exchange, storage, refresh, reviews sync, insights sync
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TEST_BUSINESS } from "../mocks/db";

// ─── Module mocks ────────────────────────────────────────────────────────────

function makeThenable(result: unknown[]) {
  const obj: Record<string, unknown> = {};
  obj.limit = vi.fn().mockImplementation(() => makeThenable(result));
  obj.orderBy = vi.fn().mockImplementation(() => makeThenable(result));
  obj.groupBy = vi.fn().mockImplementation(() => makeThenable(result));
  obj.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return obj;
}

const mockSelectWhere = vi.fn().mockImplementation(() => makeThenable([]));
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

const mockUpdateWhere = vi.fn().mockResolvedValue([]);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

const mockInsertReturning = vi.fn().mockResolvedValue([]);
const mockInsertValues = vi.fn().mockReturnValue({
  returning: mockInsertReturning,
  onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
});
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
  getDb: vi.fn(),
}));

// Mock schema
vi.mock("@/db/schema", () => ({
  businessSettings: {
    id: "businessSettings.id",
    businessId: "businessSettings.businessId",
    platform: "businessSettings.platform",
    accessToken: "businessSettings.accessToken",
    refreshToken: "businessSettings.refreshToken",
    tokenExpiresAt: "businessSettings.tokenExpiresAt",
    platformUserId: "businessSettings.platformUserId",
    platformBusinessId: "businessSettings.platformBusinessId",
    connectionStatus: "businessSettings.connectionStatus",
    lastSyncedAt: "businessSettings.lastSyncedAt",
    config: "businessSettings.config",
    updatedAt: "businessSettings.updatedAt",
  },
  reviews: {
    id: "reviews.id",
    businessId: "reviews.businessId",
    organizationId: "reviews.organizationId",
    platform: "reviews.platform",
    externalReviewId: "reviews.externalReviewId",
    reviewerName: "reviews.reviewerName",
    rating: "reviews.rating",
    reviewText: "reviews.reviewText",
    reviewDate: "reviews.reviewDate",
    sentiment: "reviews.sentiment",
    keyTopics: "reviews.keyTopics",
  },
  analyticsEvents: {
    businessId: "analyticsEvents.businessId",
    organizationId: "analyticsEvents.organizationId",
    eventType: "analyticsEvents.eventType",
    source: "analyticsEvents.source",
    metadata: "analyticsEvents.metadata",
    occurredAt: "analyticsEvents.occurredAt",
  },
  actions: {},
  businesses: {},
}));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  gte: vi.fn((...args: unknown[]) => ({ type: "gte", args })),
  desc: vi.fn((...args: unknown[]) => ({ type: "desc", args })),
}));

// Mock encryption
const mockEncrypt = vi.fn().mockImplementation((val: string) => `encrypted_${val}`);
const mockDecrypt = vi.fn().mockImplementation((val: string) => val.replace(/^encrypted_/, ""));

vi.mock("@/lib/encryption", () => ({
  encrypt: (val: string) => mockEncrypt(val),
  decrypt: (val: string) => mockDecrypt(val),
}));

// Mock fetch
global.fetch = vi.fn();

// ─── Tests: exchangeCode ──────────────────────────────────────────────────────

describe("google-business — exchangeCode()", () => {
  let exchangeCode: typeof import("@/services/google-business").exchangeCode;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import("@/services/google-business");
    exchangeCode = mod.exchangeCode;
  });

  it("exchanges OAuth code for tokens", async () => {
    const mockTokenResponse = {
      access_token: "ya29.new-access-token",
      refresh_token: "1//refresh-token-value",
      expires_in: 3600,
      token_type: "Bearer",
      scope: "https://www.googleapis.com/auth/business.manage",
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTokenResponse,
    });

    const result = await exchangeCode("auth-code-123");

    expect(result.access_token).toBe("ya29.new-access-token");
    expect(result.refresh_token).toBe("1//refresh-token-value");
    expect(result.expires_in).toBe(3600);
  });

  it("throws error on API failure", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      text: async () => "invalid_grant",
    });

    await expect(exchangeCode("invalid-code")).rejects.toThrow();
  });
});

// ─── Tests: storeConnection ──────────────────────────────────────────────────

describe("google-business — storeConnection()", () => {
  let storeConnection: typeof import("@/services/google-business").storeConnection;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import("@/services/google-business");
    storeConnection = mod.storeConnection;
  });

  it("encrypts and stores tokens", async () => {
    mockInsertReturning.mockResolvedValueOnce([{ id: "setting-uuid-001" }]);

    const tokens = {
      access_token: "ya29.access-token",
      refresh_token: "1//refresh-token",
      expires_in: 3600,
      token_type: "Bearer",
      scope: "https://www.googleapis.com/auth/business.manage",
    };

    await storeConnection(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      tokens,
      "account-123",
      "location-456"
    );

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: TEST_BUSINESS.id,
        organizationId: TEST_BUSINESS.organizationId,
        platform: "google_business",
        connectionStatus: "active",
      })
    );

    expect(mockEncrypt).toHaveBeenCalledWith("ya29.access-token");
  });

  it("handles optional refresh_token", async () => {
    mockInsertReturning.mockResolvedValueOnce([{ id: "setting-uuid-001" }]);

    const tokens = {
      access_token: "ya29.access-token",
      expires_in: 3600,
      token_type: "Bearer",
      scope: "https://www.googleapis.com/auth/business.manage",
    };

    await storeConnection(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      tokens,
      "account-123",
      "location-456"
    );

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        refreshToken: null,
      })
    );
  });
});

// ─── Tests: syncReviews ──────────────────────────────────────────────────────

describe("google-business — syncReviews()", () => {
  let syncReviews: typeof import("@/services/google-business").syncReviews;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import("@/services/google-business");
    syncReviews = mod.syncReviews;
  });

  it("fetches and stores reviews", async () => {
    const connection = {
      id: "setting-uuid-001",
      businessId: TEST_BUSINESS.id,
      accessToken: "encrypted_token",
      refreshToken: null,
      tokenExpiresAt: new Date(Date.now() + 3600000),
      platformUserId: "account-123",
      platformBusinessId: "location-456",
      connectionStatus: "active",
    };

    let callCount = 0;
    mockSelectWhere.mockImplementation(() => {
      callCount++;
      return makeThenable(callCount === 1 ? [connection] : []);
    });

    const googleResponse = {
      reviews: [
        {
          name: "accounts/123/locations/456/reviews/review-1",
          reviewId: "review-1",
          reviewer: { displayName: "John Doe" },
          starRating: "FIVE",
          comment: "Good!",
          createTime: "2025-01-20T10:00:00Z",
          updateTime: "2025-01-20T10:00:00Z",
        },
      ],
      totalReviewCount: 42,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => googleResponse,
    });

    const result = await syncReviews(TEST_BUSINESS.id, TEST_BUSINESS.organizationId);

    expect(result.synced).toBe(1);
    expect(result.total).toBe(42);
  });

  it("returns empty when no connection", async () => {
    mockSelectWhere.mockImplementationOnce(() => makeThenable([]));

    const result = await syncReviews(TEST_BUSINESS.id, TEST_BUSINESS.organizationId);

    expect(result.synced).toBe(0);
    expect(result.total).toBe(0);
  });
});

// ─── Tests: fullSync ─────────────────────────────────────────────────────────

describe("google-business — fullSync()", () => {
  let fullSync: typeof import("@/services/google-business").fullSync;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import("@/services/google-business");
    fullSync = mod.fullSync;
  });

  it("returns success even on error", async () => {
    mockSelectWhere.mockImplementationOnce(() => makeThenable([]));

    const result = await fullSync(TEST_BUSINESS.id, TEST_BUSINESS.organizationId);

    expect(result.success).toBe(true);
    expect(result.reviews.synced).toBe(0);
  });
});
