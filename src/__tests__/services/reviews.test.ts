/**
 * Tests for src/services/reviews.ts
 * — syncReviews(), syncAllReviews(), getReviewTrends()
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TEST_BUSINESS, TEST_REVIEW } from "../mocks/db";

// ─── Module mocks ────────────────────────────────────────────────────────────

// Mock DB — chainable Drizzle-style
const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

const mockSelectLimitResult = vi.fn();
const mockSelectLimit = vi.fn().mockImplementation(() => mockSelectLimitResult());
const mockSelectOrderBy = vi.fn().mockReturnValue({ limit: mockSelectLimit });
const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit, orderBy: mockSelectOrderBy });
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
  getDb: vi.fn(),
}));

// Mock schema
vi.mock("@/db/schema", () => ({
  businesses: { id: "businesses.id", organizationId: "businesses.organizationId", autonomyLevel: "businesses.autonomyLevel" },
  reviews: { businessId: "reviews.businessId", platform: "reviews.platform", rating: "reviews.rating", createdAt: "reviews.createdAt", reviewDate: "reviews.reviewDate", id: "reviews.id", reviewerName: "reviews.reviewerName", reviewText: "reviews.reviewText" },
  actions: { businessId: "actions.businessId", organizationId: "actions.organizationId", actionType: "actions.actionType", status: "actions.status", autoApproved: "actions.autoApproved", content: "actions.content" },
  businessSettings: { businessId: "businessSettings.businessId", platform: "businessSettings.platform", connectionStatus: "businessSettings.connectionStatus", organizationId: "businessSettings.organizationId" },
}));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  gte: vi.fn((...args: unknown[]) => ({ type: "gte", args })),
  desc: vi.fn((...args: unknown[]) => ({ type: "desc", args })),
  sql: vi.fn(),
}));

// Mock AI service
const mockGenerateReviewResponse = vi.fn().mockResolvedValue("Thank you for your wonderful review! We truly appreciate your business.");

vi.mock("@/services/ai", () => ({
  generateReviewResponse: (...args: unknown[]) => mockGenerateReviewResponse(...args),
}));

// Mock google-business service
const mockGoogleSyncReviews = vi.fn();
const mockGetGoogleToken = vi.fn();

vi.mock("@/services/google-business", () => ({
  syncReviews: (...args: unknown[]) => mockGoogleSyncReviews(...args),
  getAccessToken: (...args: unknown[]) => mockGetGoogleToken(...args),
}));

// ─── Test data ──────────────────────────────────────────────────────────────

const BUSINESS_AUTONOMY_HIGH = {
  ...TEST_BUSINESS,
  autonomyLevel: 2, // Can auto-approve quality responses
};

const BUSINESS_AUTONOMY_LOW = {
  ...TEST_BUSINESS,
  autonomyLevel: 0, // Requires approval for all
};

const GOOGLE_REVIEW_POSITIVE = {
  ...TEST_REVIEW,
  platform: "google",
  rating: 5,
  reviewerName: "John Doe",
  reviewText: "Best service in town!",
  reviewDate: new Date("2026-03-20"),
};

const GOOGLE_REVIEW_NEGATIVE = {
  ...TEST_REVIEW,
  platform: "google",
  rating: 2,
  reviewerName: "Jane Doe",
  reviewText: "Very disappointed with the experience.",
  reviewDate: new Date("2026-03-21"),
};

const BUSINESS_SETTING_GOOGLE_ACTIVE = {
  businessId: "biz-uuid-001",
  organizationId: "org-uuid-001",
  platform: "google_business",
  connectionStatus: "active",
};

const BUSINESS_SETTING_GOOGLE_INACTIVE = {
  businessId: "biz-uuid-002",
  organizationId: "org-uuid-001",
  platform: "google_business",
  connectionStatus: "inactive",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Setup select chain for syncReviews() flow:
 * 1. Business lookup
 * 2. (Optional) Reviews by platform/date
 */
function setupSelectForSyncReviews(
  business: typeof BUSINESS_AUTONOMY_HIGH | null,
  newReviewsToReturn: typeof GOOGLE_REVIEW_POSITIVE[] = []
) {
  let callCount = 0;
  mockSelectLimitResult.mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      return Promise.resolve(business ? [business] : []);
    }
    // Subsequent calls for review lookups
    return Promise.resolve(newReviewsToReturn.slice(0, 5)); // Limit new reviews to first 5
  });

  mockSelectWhere.mockImplementation(() => {
    return {
      limit: mockSelectLimit,
      orderBy: vi.fn().mockReturnValue({ limit: mockSelectLimit }),
      then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve(newReviewsToReturn.slice(0, 5)).then(resolve, reject),
    };
  });
}

/**
 * Setup for syncAllReviews() — returns connections
 */
function setupSelectForSyncAllReviews(connections: typeof BUSINESS_SETTING_GOOGLE_ACTIVE[] = []) {
  mockSelectWhere.mockImplementation(() => ({
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(connections).then(resolve, reject),
    limit: mockSelectLimit,
  }));
}

/**
 * Setup select for getReviewTrends() — returns all reviews
 */
function setupSelectForGetReviewTrends(reviews: typeof GOOGLE_REVIEW_POSITIVE[] = []) {
  mockSelectWhere.mockImplementation(() => ({
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(reviews).then(resolve, reject),
    orderBy: vi.fn().mockReturnValue({
      then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve(reviews).then(resolve, reject),
    }),
  }));
}

// ─── Tests: syncReviews ──────────────────────────────────────────────────────

describe("Reviews Service — syncReviews()", () => {
  let syncReviews: typeof import("@/services/reviews").syncReviews;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/services/reviews");
    syncReviews = mod.syncReviews;
  });

  it("returns empty result when business not found", async () => {
    setupSelectForSyncReviews(null);

    const result = await syncReviews("nonexistent-id", "org-uuid-001");

    expect(result.synced).toBe(0);
    expect(result.drafted).toBe(0);
    expect(result.sources).toEqual([]);
  });

  it("reports Google as not connected when getGoogleToken returns null", async () => {
    setupSelectForSyncReviews(BUSINESS_AUTONOMY_LOW);
    mockGetGoogleToken.mockResolvedValueOnce(null);

    const result = await syncReviews("biz-uuid-001", "org-uuid-001");

    expect(result.sources).toContain("google:not connected");
    expect(result.synced).toBe(0);
  });

  it("syncs new Google reviews and auto-drafts responses for high autonomy business", async () => {
    setupSelectForSyncReviews(BUSINESS_AUTONOMY_HIGH, [GOOGLE_REVIEW_POSITIVE]);
    mockGetGoogleToken.mockResolvedValueOnce("access-token-123");
    mockGoogleSyncReviews.mockResolvedValueOnce({
      synced: 1,
      total: 15,
      updatedAt: new Date(),
    });

    const result = await syncReviews("biz-uuid-001", "org-uuid-001");

    expect(result.synced).toBe(1);
    expect(result.drafted).toBe(1);
    expect(result.sources).toContain("google:1 new of 15 total");

    // Check that response draft was created with auto-approved=true
    expect(mockInsert).toHaveBeenCalled();
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: "biz-uuid-001",
        actionType: "review_response",
        status: "approved", // Auto-approved for positive review
        autoApproved: true,
      })
    );
  });

  it("creates proposed response for negative review when autonomy is low", async () => {
    setupSelectForSyncReviews(BUSINESS_AUTONOMY_LOW, [GOOGLE_REVIEW_NEGATIVE]);
    mockGetGoogleToken.mockResolvedValueOnce("access-token-123");
    mockGoogleSyncReviews.mockResolvedValueOnce({
      synced: 1,
      total: 10,
      updatedAt: new Date(),
    });

    const result = await syncReviews("biz-uuid-001", "org-uuid-001");

    expect(result.drafted).toBe(1);
    // Response should be proposed (needs approval) for low-rating review
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "proposed",
        autoApproved: false,
      })
    );
  });

  it("handles Google API errors gracefully", async () => {
    setupSelectForSyncReviews(BUSINESS_AUTONOMY_LOW);
    mockGetGoogleToken.mockResolvedValueOnce("access-token-123");
    mockGoogleSyncReviews.mockRejectedValueOnce(new Error("Google API rate limit exceeded"));

    const result = await syncReviews("biz-uuid-001", "org-uuid-001");

    // Error should be captured in sources as a string
    const errorSource = result.sources.find((s) => s.includes("google:error"));
    expect(errorSource).toBeDefined();
    expect(errorSource).toContain("Google API rate limit exceeded");
    expect(result.synced).toBe(0);
  });

  it("calls generateReviewResponse with correct business and review context", async () => {
    setupSelectForSyncReviews(BUSINESS_AUTONOMY_HIGH, [GOOGLE_REVIEW_POSITIVE]);
    mockGetGoogleToken.mockResolvedValueOnce("access-token-123");
    mockGoogleSyncReviews.mockResolvedValueOnce({ synced: 1, total: 15, updatedAt: new Date() });

    await syncReviews("biz-uuid-001", "org-uuid-001");

    expect(mockGenerateReviewResponse).toHaveBeenCalledWith(
      expect.objectContaining({ name: BUSINESS_AUTONOMY_HIGH.name }),
      expect.objectContaining({
        reviewerName: "John Doe",
        rating: 5,
        reviewText: "Best service in town!",
      })
    );
  });

  it("does not draft responses if Google reports zero new reviews", async () => {
    setupSelectForSyncReviews(BUSINESS_AUTONOMY_HIGH, []);
    mockGetGoogleToken.mockResolvedValueOnce("access-token-123");
    mockGoogleSyncReviews.mockResolvedValueOnce({
      synced: 0,
      total: 15,
      updatedAt: new Date(),
    });

    const result = await syncReviews("biz-uuid-001", "org-uuid-001");

    expect(result.drafted).toBe(0);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

// ─── Tests: syncAllReviews ───────────────────────────────────────────────────

describe("Reviews Service — syncAllReviews()", () => {
  let syncAllReviews: typeof import("@/services/reviews").syncAllReviews;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/services/reviews");
    syncAllReviews = mod.syncAllReviews;
  });

  it("returns zero counts when no businesses have active Google connections", async () => {
    setupSelectForSyncAllReviews([]);

    const result = await syncAllReviews();

    expect(result.total).toBe(0);
    expect(result.synced).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it("syncs multiple businesses and counts successes", async () => {
    const connections = [
      BUSINESS_SETTING_GOOGLE_ACTIVE,
      { ...BUSINESS_SETTING_GOOGLE_ACTIVE, businessId: "biz-uuid-002" },
    ];
    setupSelectForSyncAllReviews(connections);

    // Mock the individual syncReviews calls via google-business
    mockGetGoogleToken.mockResolvedValue("access-token-123");
    mockGoogleSyncReviews.mockResolvedValue({ synced: 1, total: 15, updatedAt: new Date() });

    let callCount = 0;
    mockSelectLimitResult.mockImplementation(() => {
      callCount++;
      // First call: business lookup (synced case)
      if (callCount === 1) return Promise.resolve([BUSINESS_AUTONOMY_HIGH]);
      // Second call: business lookup (synced case)
      if (callCount === 2) return Promise.resolve([BUSINESS_AUTONOMY_HIGH]);
      return Promise.resolve([]);
    });

    const result = await syncAllReviews();

    expect(result.total).toBe(2);
    expect(result.synced).toBe(2);
    expect(result.failed).toBe(0);
  });

  it("counts businesses with synced reviews", async () => {
    const connections = [BUSINESS_SETTING_GOOGLE_ACTIVE];
    setupSelectForSyncAllReviews(connections);

    mockGetGoogleToken.mockResolvedValue("access-token-123");
    mockGoogleSyncReviews.mockResolvedValue({
      synced: 2,
      total: 10,
      updatedAt: new Date(),
    });

    mockSelectLimitResult.mockResolvedValue([BUSINESS_AUTONOMY_HIGH]);

    const result = await syncAllReviews();

    expect(result.total).toBe(1);
    expect(result.synced).toBe(1); // One business had synced > 0
    expect(result.failed).toBe(0);
  });

  it("counts synced businesses (those with synced > 0) separately from total", async () => {
    const connections = [
      BUSINESS_SETTING_GOOGLE_ACTIVE,
      { ...BUSINESS_SETTING_GOOGLE_ACTIVE, businessId: "biz-uuid-002" },
    ];
    setupSelectForSyncAllReviews(connections);

    mockGetGoogleToken.mockResolvedValue("access-token-123");
    // First has 1 synced, second has 0 synced
    mockGoogleSyncReviews
      .mockResolvedValueOnce({ synced: 1, total: 10, updatedAt: new Date() })
      .mockResolvedValueOnce({ synced: 0, total: 10, updatedAt: new Date() });

    let callCount = 0;
    mockSelectLimitResult.mockImplementation(() => {
      callCount++;
      if (callCount <= 2) return Promise.resolve([BUSINESS_AUTONOMY_HIGH]);
      return Promise.resolve([]);
    });

    const result = await syncAllReviews();

    expect(result.total).toBe(2);
    expect(result.synced).toBe(1); // Only one business had synced > 0
    expect(result.failed).toBe(0);
  });
});

// ─── Tests: getReviewTrends ──────────────────────────────────────────────────

describe("Reviews Service — getReviewTrends()", () => {
  let getReviewTrends: typeof import("@/services/reviews").getReviewTrends;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/services/reviews");
    getReviewTrends = mod.getReviewTrends;
  });

  it("calculates trends with no reviews", async () => {
    setupSelectForGetReviewTrends([]);

    const result = await getReviewTrends("biz-uuid-001", 30);

    expect(result.totalReviews).toBe(0);
    expect(result.recentReviews).toBe(0);
    expect(result.averageRating).toBe(0);
    expect(result.recentAverageRating).toBe(0);
    expect(result.ratingTrend).toBe(0);
    expect(result.velocityPerWeek).toBe(0);
  });

  it("calculates average rating across all reviews", async () => {
    const reviews = [
      { ...GOOGLE_REVIEW_POSITIVE, rating: 5 },
      { ...GOOGLE_REVIEW_POSITIVE, rating: 4 },
      { ...GOOGLE_REVIEW_POSITIVE, rating: 3 },
    ];
    setupSelectForGetReviewTrends(reviews);

    const result = await getReviewTrends("biz-uuid-001", 30);

    expect(result.totalReviews).toBe(3);
    expect(result.averageRating).toBe(4.0); // (5+4+3)/3 = 4
  });

  it("filters recent reviews by daysBack parameter", async () => {
    const now = Date.now();
    const fifteenDaysAgo = new Date(now - 15 * 24 * 60 * 60 * 1000);
    const fortyDaysAgo = new Date(now - 40 * 24 * 60 * 60 * 1000);

    const reviews = [
      { ...GOOGLE_REVIEW_POSITIVE, rating: 5, reviewDate: fifteenDaysAgo },
      { ...GOOGLE_REVIEW_POSITIVE, rating: 4, reviewDate: fifteenDaysAgo },
      { ...GOOGLE_REVIEW_POSITIVE, rating: 2, reviewDate: fortyDaysAgo }, // Older than 30 days
    ];
    setupSelectForGetReviewTrends(reviews);

    const result = await getReviewTrends("biz-uuid-001", 30);

    expect(result.totalReviews).toBe(3);
    expect(result.recentReviews).toBe(2); // Only 2 within 30 days
    expect(result.recentAverageRating).toBe(4.5); // (5+4)/2
  });

  it("calculates rating trend (recent vs overall)", async () => {
    const now = Date.now();
    const recent = new Date(now - 5 * 24 * 60 * 60 * 1000);
    const old = new Date(now - 45 * 24 * 60 * 60 * 1000);

    const reviews = [
      { ...GOOGLE_REVIEW_POSITIVE, rating: 5, reviewDate: recent },
      { ...GOOGLE_REVIEW_POSITIVE, rating: 5, reviewDate: recent },
      { ...GOOGLE_REVIEW_POSITIVE, rating: 3, reviewDate: old },
      { ...GOOGLE_REVIEW_POSITIVE, rating: 3, reviewDate: old },
    ];
    setupSelectForGetReviewTrends(reviews);

    const result = await getReviewTrends("biz-uuid-001", 30);

    expect(result.averageRating).toBe(4.0); // (5+5+3+3)/4
    expect(result.recentAverageRating).toBe(5.0); // (5+5)/2
    expect(result.ratingTrend).toBe(1.0); // 5.0 - 4.0
  });

  it("calculates velocity per week correctly", async () => {
    const now = Date.now();
    const reviews = [
      { ...GOOGLE_REVIEW_POSITIVE, reviewDate: new Date(now - 2 * 24 * 60 * 60 * 1000) },
      { ...GOOGLE_REVIEW_POSITIVE, reviewDate: new Date(now - 4 * 24 * 60 * 60 * 1000) },
      { ...GOOGLE_REVIEW_POSITIVE, reviewDate: new Date(now - 6 * 24 * 60 * 60 * 1000) },
      { ...GOOGLE_REVIEW_POSITIVE, reviewDate: new Date(now - 45 * 24 * 60 * 60 * 1000) }, // Outside window
    ];
    setupSelectForGetReviewTrends(reviews);

    const result = await getReviewTrends("biz-uuid-001", 30);

    expect(result.recentReviews).toBe(3);
    // (3 reviews / 30 days) * 7 = 0.7 per week
    expect(result.velocityPerWeek).toBe(0.7);
  });

  it("rounds numeric values to 1 decimal place", async () => {
    const reviews = [
      { ...GOOGLE_REVIEW_POSITIVE, rating: 4.7 },
      { ...GOOGLE_REVIEW_POSITIVE, rating: 4.6 },
      { ...GOOGLE_REVIEW_POSITIVE, rating: 4.5 },
    ];
    setupSelectForGetReviewTrends(reviews);

    const result = await getReviewTrends("biz-uuid-001", 30);

    expect(Number.isInteger(result.averageRating * 10)).toBe(true); // 1 decimal place
    expect(Number.isInteger(result.velocityPerWeek * 10)).toBe(true);
  });
});
