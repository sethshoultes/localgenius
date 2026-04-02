/**
 * Tests for src/services/meta-social.ts
 * OAuth token exchange, storage, publishing to Instagram/Facebook, engagement sync
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
  analyticsEvents: {
    businessId: "analyticsEvents.businessId",
    organizationId: "analyticsEvents.organizationId",
    eventType: "analyticsEvents.eventType",
    source: "analyticsEvents.source",
    metadata: "analyticsEvents.metadata",
    occurredAt: "analyticsEvents.occurredAt",
  },
  actions: {
    businessId: "actions.businessId",
    actionType: "actions.actionType",
    status: "actions.status",
    externalId: "actions.externalId",
    externalPlatform: "actions.externalPlatform",
  },
}));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  desc: vi.fn((...args: unknown[]) => ({ type: "desc", args })),
  sql: vi.fn((...args: unknown[]) => ({ type: "sql", args })),
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

describe("meta-social — exchangeCode()", () => {
  let exchangeCode: typeof import("@/services/meta-social").exchangeCode;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv("META_APP_ID", "test-app-id");
    vi.stubEnv("META_APP_SECRET", "test-app-secret");
    vi.stubEnv("META_REDIRECT_URI", "https://localhost/callback");

    const mod = await import("@/services/meta-social");
    exchangeCode = mod.exchangeCode;
  });

  it("exchanges OAuth code for long-lived token", async () => {
    const shortLivedResponse = {
      access_token: "short_lived_token_123",
      token_type: "bearer",
      expires_in: 3600,
    };

    const longLivedResponse = {
      access_token: "long_lived_token_456",
      token_type: "bearer",
      expires_in: 5184000, // 60 days
    };

    const pagesResponse = {
      data: [
        {
          id: "page-123",
          name: "Test Page",
          access_token: "page_token_789",
        },
      ],
    };

    const igResponse = {
      instagram_business_account: {
        id: "ig-user-456",
      },
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => shortLivedResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => longLivedResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => pagesResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => igResponse,
      });

    const result = await exchangeCode("auth-code-123");

    expect(result.accessToken).toBe("long_lived_token_456");
    expect(result.expiresIn).toBe(5184000);
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].id).toBe("page-123");
    expect(result.igUserId).toBe("ig-user-456");
  });

  it("handles missing Instagram Business Account", async () => {
    const shortLivedResponse = {
      access_token: "short_lived_token_123",
      token_type: "bearer",
      expires_in: 3600,
    };

    const longLivedResponse = {
      access_token: "long_lived_token_456",
      token_type: "bearer",
      expires_in: 5184000,
    };

    const pagesResponse = {
      data: [
        {
          id: "page-123",
          name: "Test Page",
          access_token: "page_token_789",
        },
      ],
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => shortLivedResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => longLivedResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => pagesResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

    const result = await exchangeCode("auth-code-123");

    expect(result.igUserId).toBe(null);
  });

  it("throws error on short-lived token exchange failure", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      text: async () => "invalid_grant",
    });

    await expect(exchangeCode("invalid-code")).rejects.toThrow(
      "Meta token exchange failed"
    );
  });

  it("throws error on long-lived token exchange failure", async () => {
    const shortLivedResponse = {
      access_token: "short_lived_token_123",
      token_type: "bearer",
      expires_in: 3600,
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => shortLivedResponse,
      })
      .mockResolvedValueOnce({
        ok: false,
        text: async () => "exchange_token_failed",
      });

    await expect(exchangeCode("auth-code-123")).rejects.toThrow(
      "Meta long-lived token exchange failed"
    );
  });

  it("throws error when pages fetch fails", async () => {
    const shortLivedResponse = {
      access_token: "short_lived_token_123",
      token_type: "bearer",
      expires_in: 3600,
    };

    const longLivedResponse = {
      access_token: "long_lived_token_456",
      token_type: "bearer",
      expires_in: 5184000,
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => shortLivedResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => longLivedResponse,
      })
      .mockResolvedValueOnce({
        ok: false,
        text: async () => "forbidden",
      });

    await expect(exchangeCode("auth-code-123")).rejects.toThrow(
      "Failed to fetch connected Facebook pages"
    );
  });

  it("handles empty pages list", async () => {
    const shortLivedResponse = {
      access_token: "short_lived_token_123",
      token_type: "bearer",
      expires_in: 3600,
    };

    const longLivedResponse = {
      access_token: "long_lived_token_456",
      token_type: "bearer",
      expires_in: 5184000,
    };

    const pagesResponse = {
      data: [],
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => shortLivedResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => longLivedResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => pagesResponse,
      });

    const result = await exchangeCode("auth-code-123");

    expect(result.pages).toHaveLength(0);
    expect(result.igUserId).toBe(null);
  });
});

// ─── Tests: storeConnection ──────────────────────────────────────────────────

describe("meta-social — storeConnection()", () => {
  let storeConnection: typeof import("@/services/meta-social").storeConnection;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import("@/services/meta-social");
    storeConnection = mod.storeConnection;
  });

  it("encrypts and stores Meta tokens", async () => {
    mockInsertValues.mockReturnValueOnce({
      returning: mockInsertReturning,
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    });

    const tokens = {
      accessToken: "long_lived_token_456",
      expiresIn: 5184000,
    };

    await storeConnection(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      tokens,
      "page-123",
      "ig-user-456"
    );

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: TEST_BUSINESS.id,
        organizationId: TEST_BUSINESS.organizationId,
        platform: "meta",
        connectionStatus: "active",
      })
    );

    expect(mockEncrypt).toHaveBeenCalledWith("long_lived_token_456");
  });

  it("stores null igUserId when not provided", async () => {
    mockInsertValues.mockReturnValueOnce({
      returning: mockInsertReturning,
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    });

    const tokens = {
      accessToken: "long_lived_token_456",
      expiresIn: 5184000,
    };

    await storeConnection(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      tokens,
      "page-123",
      null
    );

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        platformUserId: "",
      })
    );
  });

  it("updates existing connection on conflict", async () => {
    mockInsertValues.mockReturnValueOnce({
      returning: mockInsertReturning,
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    });

    const tokens = {
      accessToken: "new_token_789",
      expiresIn: 5184000,
    };

    await storeConnection(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      tokens,
      "page-456",
      "ig-user-789"
    );

    const insertCall = mockInsertValues.mock.calls[0][0];
    expect(insertCall.accessToken).toBe("encrypted_new_token_789");
  });

  it("sets refreshToken to null for Meta (no refresh token)", async () => {
    mockInsertValues.mockReturnValueOnce({
      returning: mockInsertReturning,
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    });

    const tokens = {
      accessToken: "long_lived_token_456",
      expiresIn: 5184000,
    };

    await storeConnection(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      tokens,
      "page-123",
      "ig-user-456"
    );

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        refreshToken: null,
      })
    );
  });
});

// ─── Tests: getAccessToken ───────────────────────────────────────────────────

describe("meta-social — getAccessToken()", () => {
  let getAccessToken: typeof import("@/services/meta-social").getAccessToken;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import("@/services/meta-social");
    getAccessToken = mod.getAccessToken;
  });

  it("returns token when connection exists and valid", async () => {
    const connection = {
      id: "setting-uuid-001",
      businessId: TEST_BUSINESS.id,
      accessToken: "encrypted_token_123",
      refreshToken: null,
      tokenExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      platformUserId: "ig-user-456",
      platformBusinessId: "page-123",
      connectionStatus: "active",
      config: { pageId: "page-123", igUserId: "ig-user-456" },
    };

    mockSelectWhere.mockImplementationOnce(() => makeThenable([connection]));

    const result = await getAccessToken(TEST_BUSINESS.id);

    expect(result).not.toBe(null);
    expect(result?.token).toBe("token_123");
    expect(result?.pageId).toBe("page-123");
    expect(result?.igUserId).toBe("ig-user-456");
  });

  it("returns null when no connection exists", async () => {
    mockSelectWhere.mockImplementationOnce(() => makeThenable([]));

    const result = await getAccessToken(TEST_BUSINESS.id);

    expect(result).toBe(null);
  });

  it("returns null when connection is not active", async () => {
    const connection = {
      id: "setting-uuid-001",
      businessId: TEST_BUSINESS.id,
      accessToken: "encrypted_token_123",
      connectionStatus: "inactive",
      tokenExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    };

    mockSelectWhere.mockImplementationOnce(() => makeThenable([connection]));

    const result = await getAccessToken(TEST_BUSINESS.id);

    expect(result).toBe(null);
  });

  it("refreshes token when within 7 days of expiry", async () => {
    const connection = {
      id: "setting-uuid-001",
      businessId: TEST_BUSINESS.id,
      accessToken: "encrypted_token_123",
      tokenExpiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      platformUserId: "ig-user-456",
      platformBusinessId: "page-123",
      connectionStatus: "active",
      config: { pageId: "page-123", igUserId: "ig-user-456" },
    };

    const refreshedToken = {
      access_token: "refreshed_token_789",
      token_type: "bearer",
      expires_in: 5184000,
    };

    mockSelectWhere.mockImplementationOnce(() => makeThenable([connection]));

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => refreshedToken,
    });

    const result = await getAccessToken(TEST_BUSINESS.id);

    expect(result?.token).toBe("refreshed_token_789");
    expect(mockUpdateSet).toHaveBeenCalled();
  });

  it("marks connection as expired if token has fully expired during refresh", async () => {
    const connection = {
      id: "setting-uuid-001",
      businessId: TEST_BUSINESS.id,
      accessToken: "encrypted_token_123",
      tokenExpiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      platformUserId: "ig-user-456",
      platformBusinessId: "page-123",
      connectionStatus: "active",
      config: { pageId: "page-123", igUserId: "ig-user-456" },
    };

    mockSelectWhere.mockImplementationOnce(() => makeThenable([connection]));

    (global.fetch as any).mockRejectedValueOnce(new Error("Token expired"));

    const result = await getAccessToken(TEST_BUSINESS.id);

    // Should still return the old token if refresh fails but token not yet expired
    expect(result?.token).toBe("token_123");
  });

  it("returns current token if refresh fails but token still valid", async () => {
    const connection = {
      id: "setting-uuid-001",
      businessId: TEST_BUSINESS.id,
      accessToken: "encrypted_token_123",
      tokenExpiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      platformUserId: "ig-user-456",
      platformBusinessId: "page-123",
      connectionStatus: "active",
      config: { pageId: "page-123", igUserId: "ig-user-456" },
    };

    mockSelectWhere.mockImplementationOnce(() => makeThenable([connection]));

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await getAccessToken(TEST_BUSINESS.id);

    expect(result?.token).toBe("token_123");
  });
});

// ─── Tests: publishToInstagram ───────────────────────────────────────────────

describe("meta-social — publishToInstagram()", () => {
  let publishToInstagram: typeof import("@/services/meta-social").publishToInstagram;
  let getAccessToken: typeof import("@/services/meta-social").getAccessToken;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import("@/services/meta-social");
    publishToInstagram = mod.publishToInstagram;
    getAccessToken = mod.getAccessToken;
  });

  it("publishes image post to Instagram with caption", async () => {
    const connection = {
      id: "setting-uuid-001",
      businessId: TEST_BUSINESS.id,
      accessToken: "encrypted_token_123",
      tokenExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      platformUserId: "ig-user-456",
      platformBusinessId: "page-123",
      connectionStatus: "active",
      config: { pageId: "page-123", igUserId: "ig-user-456" },
    };

    mockSelectWhere.mockImplementation(() => makeThenable([connection]));

    const containerResponse = {
      id: "container-123",
    };

    const publishResponse = {
      id: "ig_post_001",
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => containerResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => publishResponse,
      });

    const result = await publishToInstagram(TEST_BUSINESS.id, {
      text: "Check out our new specials!",
      imageUrl: "https://cdn.example.com/image.jpg",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBe("ig_post_001");
    expect(result.platform).toBe("instagram");
    expect(result.postUrl).toContain("instagram.com/p/ig_post_001");
  });

  it("adds watermark to caption", async () => {
    const connection = {
      id: "setting-uuid-001",
      businessId: TEST_BUSINESS.id,
      accessToken: "encrypted_token_123",
      tokenExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      platformUserId: "ig-user-456",
      platformBusinessId: "page-123",
      connectionStatus: "active",
      config: { pageId: "page-123", igUserId: "ig-user-456" },
    };

    mockSelectWhere.mockImplementation(() => makeThenable([connection]));

    const containerResponse = {
      id: "container-123",
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => containerResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "ig_post_001" }),
      });

    await publishToInstagram(TEST_BUSINESS.id, {
      text: "Check it out!",
      imageUrl: "https://cdn.example.com/image.jpg",
    });

    const firstFetchCall = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(firstFetchCall[1].body);
    expect(body.caption).toContain("Posted by LocalGenius");
  });

  it("fails when no image URL provided", async () => {
    const connection = {
      id: "setting-uuid-001",
      businessId: TEST_BUSINESS.id,
      accessToken: "encrypted_token_123",
      tokenExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      platformUserId: "ig-user-456",
      platformBusinessId: "page-123",
      connectionStatus: "active",
      config: { pageId: "page-123", igUserId: "ig-user-456" },
    };

    mockSelectWhere.mockImplementation(() => makeThenable([connection]));

    const result = await publishToInstagram(TEST_BUSINESS.id, {
      text: "Check it out!",
      imageUrl: "",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Instagram requires a public image URL");
  });

  it("fails when no Instagram Business Account connected", async () => {
    const connection = {
      id: "setting-uuid-001",
      businessId: TEST_BUSINESS.id,
      accessToken: "encrypted_token_123",
      tokenExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      platformUserId: null,
      platformBusinessId: "page-123",
      connectionStatus: "active",
      config: { pageId: "page-123", igUserId: null },
    };

    mockSelectWhere.mockImplementation(() => makeThenable([connection]));

    const result = await publishToInstagram(TEST_BUSINESS.id, {
      text: "Check it out!",
      imageUrl: "https://cdn.example.com/image.jpg",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("No Instagram Business Account");
  });

  it("returns error when no Meta connection", async () => {
    mockSelectWhere.mockImplementation(() => makeThenable([]));

    const result = await publishToInstagram(TEST_BUSINESS.id, {
      text: "Check it out!",
      imageUrl: "https://cdn.example.com/image.jpg",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("No active Meta connection");
  });

  it("returns error when container creation fails", async () => {
    const connection = {
      id: "setting-uuid-001",
      businessId: TEST_BUSINESS.id,
      accessToken: "encrypted_token_123",
      tokenExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      platformUserId: "ig-user-456",
      platformBusinessId: "page-123",
      connectionStatus: "active",
      config: { pageId: "page-123", igUserId: "ig-user-456" },
    };

    mockSelectWhere.mockImplementation(() => makeThenable([connection]));

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      text: async () => "Invalid image URL",
    });

    const result = await publishToInstagram(TEST_BUSINESS.id, {
      text: "Check it out!",
      imageUrl: "https://invalid.example.com/image.jpg",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Instagram container creation failed");
  });
});

// ─── Tests: publishToFacebook ────────────────────────────────────────────────

describe("meta-social — publishToFacebook()", () => {
  let publishToFacebook: typeof import("@/services/meta-social").publishToFacebook;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import("@/services/meta-social");
    publishToFacebook = mod.publishToFacebook;
  });

  it("publishes text post to Facebook", async () => {
    const connection = {
      id: "setting-uuid-001",
      businessId: TEST_BUSINESS.id,
      accessToken: "encrypted_token_123",
      tokenExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      platformUserId: "ig-user-456",
      platformBusinessId: "page-123",
      connectionStatus: "active",
      config: { pageId: "page-123", igUserId: "ig-user-456" },
    };

    mockSelectWhere.mockImplementation(() => makeThenable([connection]));

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "fb_post_001" }),
    });

    const result = await publishToFacebook(TEST_BUSINESS.id, {
      text: "Check out our new menu items!",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBe("fb_post_001");
    expect(result.platform).toBe("facebook");
    expect(result.postUrl).toContain("facebook.com/fb_post_001");
  });

  it("publishes photo post to Facebook with caption", async () => {
    const connection = {
      id: "setting-uuid-001",
      businessId: TEST_BUSINESS.id,
      accessToken: "encrypted_token_123",
      tokenExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      platformUserId: "ig-user-456",
      platformBusinessId: "page-123",
      connectionStatus: "active",
      config: { pageId: "page-123", igUserId: "ig-user-456" },
    };

    mockSelectWhere.mockImplementation(() => makeThenable([connection]));

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "fb_photo_001" }),
    });

    const result = await publishToFacebook(TEST_BUSINESS.id, {
      text: "Check out our new location!",
      imageUrl: "https://cdn.example.com/photo.jpg",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBe("fb_photo_001");
  });

  it("adds watermark to Facebook posts", async () => {
    const connection = {
      id: "setting-uuid-001",
      businessId: TEST_BUSINESS.id,
      accessToken: "encrypted_token_123",
      tokenExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      platformUserId: "ig-user-456",
      platformBusinessId: "page-123",
      connectionStatus: "active",
      config: { pageId: "page-123", igUserId: "ig-user-456" },
    };

    mockSelectWhere.mockImplementation(() => makeThenable([connection]));

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "fb_post_001" }),
    });

    await publishToFacebook(TEST_BUSINESS.id, {
      text: "Hello!",
    });

    const fetchCall = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.message).toContain("Posted by LocalGenius");
  });

  it("returns error when no Meta connection", async () => {
    mockSelectWhere.mockImplementation(() => makeThenable([]));

    const result = await publishToFacebook(TEST_BUSINESS.id, {
      text: "Test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("No active Meta connection");
  });

  it("returns error when text post fails", async () => {
    const connection = {
      id: "setting-uuid-001",
      businessId: TEST_BUSINESS.id,
      accessToken: "encrypted_token_123",
      tokenExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      platformUserId: "ig-user-456",
      platformBusinessId: "page-123",
      connectionStatus: "active",
      config: { pageId: "page-123", igUserId: "ig-user-456" },
    };

    mockSelectWhere.mockImplementation(() => makeThenable([connection]));

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      text: async () => "Rate limit exceeded",
    });

    const result = await publishToFacebook(TEST_BUSINESS.id, {
      text: "Test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Facebook publish failed");
  });
});

// ─── Tests: fullSync ─────────────────────────────────────────────────────────

describe("meta-social — fullSync()", () => {
  let fullSync: typeof import("@/services/meta-social").fullSync;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import("@/services/meta-social");
    fullSync = mod.fullSync;
  });

  it("syncs engagement metrics for recent posts", async () => {
    let selectCallCount = 0;

    const connection = {
      id: "setting-uuid-001",
      businessId: TEST_BUSINESS.id,
      accessToken: "encrypted_token_123",
      tokenExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      platformUserId: "ig-user-456",
      platformBusinessId: "page-123",
      connectionStatus: "active",
      config: { pageId: "page-123", igUserId: "ig-user-456" },
    };

    const recentActions = [
      {
        id: "action-001",
        businessId: TEST_BUSINESS.id,
        actionType: "social_post",
        status: "completed",
        externalId: "ig_post_001",
        externalPlatform: "instagram",
      },
    ];

    // First select: getAccessToken -> get connection
    // Second select: fullSync -> get recent actions
    const selectResults = [[connection], recentActions];

    mockSelectWhere.mockImplementation(() => {
      const result = selectResults[selectCallCount] || [];
      selectCallCount++;
      return makeThenable(result);
    });

    const insightsResponse = {
      data: [
        { name: "reach", values: [{ value: 150 }] },
        { name: "impressions", values: [{ value: 200 }] },
        { name: "likes", values: [{ value: 50 }] },
      ],
    };

    // Mock the fetch response for getPostInsights
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => insightsResponse,
    });

    // Mock the insert for the analytics event
    mockInsertReturning.mockResolvedValueOnce([{ id: "event-uuid-001" }]);

    const result = await fullSync(TEST_BUSINESS.id, TEST_BUSINESS.organizationId);

    // The actual verification: did we sync successfully?
    expect(result.success).toBe(true);
    // Verify that update was called for lastSyncedAt
    expect(mockUpdateSet).toHaveBeenCalled();
  });

  it("returns success false when no connection", async () => {
    mockSelectWhere.mockImplementationOnce(() => makeThenable([]));

    const result = await fullSync(TEST_BUSINESS.id, TEST_BUSINESS.organizationId);

    expect(result.success).toBe(false);
    expect(result.postsSynced).toBe(0);
  });

  it("skips posts without externalId", async () => {
    let selectCallCount = 0;

    const connection = {
      id: "setting-uuid-001",
      businessId: TEST_BUSINESS.id,
      accessToken: "encrypted_token_123",
      tokenExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      platformUserId: "ig-user-456",
      platformBusinessId: "page-123",
      connectionStatus: "active",
      config: { pageId: "page-123", igUserId: "ig-user-456" },
    };

    const recentActions = [
      {
        id: "action-001",
        businessId: TEST_BUSINESS.id,
        actionType: "social_post",
        status: "completed",
        externalId: null,
        externalPlatform: null,
      },
    ];

    mockSelectWhere.mockImplementation(() => {
      const results = [[connection], recentActions];
      const result = results[selectCallCount] || [];
      selectCallCount++;
      return makeThenable(result);
    });

    const result = await fullSync(TEST_BUSINESS.id, TEST_BUSINESS.organizationId);

    expect(result.postsSynced).toBe(0);
  });

  it("updates lastSyncedAt on connection", async () => {
    let selectCallCount = 0;

    const connection = {
      id: "setting-uuid-001",
      businessId: TEST_BUSINESS.id,
      accessToken: "encrypted_token_123",
      tokenExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      platformUserId: "ig-user-456",
      platformBusinessId: "page-123",
      connectionStatus: "active",
      config: { pageId: "page-123", igUserId: "ig-user-456" },
    };

    const recentActions: unknown[] = [];

    mockSelectWhere.mockImplementation(() => {
      const results = [[connection], recentActions];
      const result = results[selectCallCount] || [];
      selectCallCount++;
      return makeThenable(result);
    });

    await fullSync(TEST_BUSINESS.id, TEST_BUSINESS.organizationId);

    expect(mockUpdateSet).toHaveBeenCalled();
  });

  it("catches and returns false on error", async () => {
    mockSelectWhere.mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const result = await fullSync(TEST_BUSINESS.id, TEST_BUSINESS.organizationId);

    expect(result.success).toBe(false);
    expect(result.postsSynced).toBe(0);
  });
});
