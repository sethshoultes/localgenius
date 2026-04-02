/**
 * Tests for src/services/seo.ts — runAudit()
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TEST_BUSINESS } from "../mocks/db";

// ─── Module mocks ────────────────────────────────────────────────────────────

// Mock DB — chainable Drizzle-style
const mockSelectLimitResult = vi.fn();
const mockSelectLimit = vi.fn().mockImplementation(() => mockSelectLimitResult());
const mockSelectOrderBy = vi.fn().mockReturnValue({ limit: mockSelectLimit });
const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit, orderBy: mockSelectOrderBy });
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
  getDb: vi.fn(),
}));

// Mock schema imports
vi.mock("@/db/schema", () => ({
  businesses: { id: "businesses.id" },
  reviews: { businessId: "reviews.businessId", rating: "reviews.rating", reviewDate: "reviews.reviewDate", id: "reviews.id" },
  actions: {},
  analyticsEvents: { businessId: "analyticsEvents.businessId", eventType: "analyticsEvents.eventType", occurredAt: "analyticsEvents.occurredAt" },
  contentItems: { businessId: "contentItems.businessId", contentType: "contentItems.contentType", createdAt: "contentItems.createdAt" },
  businessSettings: { businessId: "businessSettings.businessId", platform: "businessSettings.platform", connectionStatus: "businessSettings.connectionStatus" },
}));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  gte: vi.fn((...args: unknown[]) => ({ type: "gte", args })),
  sql: vi.fn(),
  desc: vi.fn(),
}));

// Mock AI service
const mockGenerate = vi.fn().mockResolvedValue("Your restaurant is doing well in Austin! Focus on getting more Google reviews to climb local search rankings.");

vi.mock("@/services/ai", () => ({
  generate: (...args: unknown[]) => mockGenerate(...args),
}));

// ─── Test data ──────────────────────────────────────────────────────────────

const BUSINESS_WITH_FULL_PROFILE = {
  ...TEST_BUSINESS,
  name: "Test Biz Inc",
  address: "123 Main St",
  phone: "512-555-0100",
  vertical: "restaurant",
  city: "Austin",
  state: "TX",
};

const BUSINESS_MISSING_FIELDS = {
  ...TEST_BUSINESS,
  name: "Incomplete Biz",
  address: null,
  phone: null,
  vertical: "restaurant",
  city: "Austin",
  state: "TX",
};

const REVIEW_DATA_STRONG = { total: 55, avgRating: 4.7, recent: 6, responded: 50 };
const REVIEW_DATA_WEAK = { total: 5, avgRating: 3.2, recent: 0, responded: 0 };

const CONTENT_DATA_STRONG = { totalPosts: 30, recentPosts: 14 };
const CONTENT_DATA_WEAK = { totalPosts: 1, recentPosts: 0 };

const TRAFFIC_DATA_STRONG = { pageViews: 250, searchImpressions: 600, directionRequests: 30, phoneCalls: 25 };
const TRAFFIC_DATA_WEAK = { pageViews: 10, searchImpressions: 20, directionRequests: 0, phoneCalls: 1 };

const GOOGLE_CONNECTED = { connectionStatus: "active" };

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Configure the select mock to return different data for sequential calls.
 * Call order in runAudit: business, reviewData, contentData, trafficData, googleConn
 */
function setupSelectSequence(
  biz: typeof BUSINESS_WITH_FULL_PROFILE | null,
  reviewData: typeof REVIEW_DATA_STRONG,
  contentData: typeof CONTENT_DATA_STRONG,
  trafficData: typeof TRAFFIC_DATA_STRONG,
  googleConn: typeof GOOGLE_CONNECTED | null
) {
  let callCount = 0;
  mockSelectLimitResult.mockImplementation(() => {
    callCount++;
    switch (callCount) {
      case 1: return Promise.resolve(biz ? [biz] : []);
      case 2: return Promise.resolve([reviewData]);
      case 3: return Promise.resolve([contentData]);
      case 4: return Promise.resolve([trafficData]);
      case 5: return Promise.resolve(googleConn ? [googleConn] : []);
      default: return Promise.resolve([]);
    }
  });

  // For queries that don't use .limit() — reviewData, contentData, trafficData
  // These calls use .where() as terminal (returns thenable chain)
  // But in the actual service, all queries end with .limit(1) or are aggregate selects
  // The aggregate selects (reviews, content, traffic) don't use .limit() — they use .where() as terminal
  // We need the where chain to also be thenable for aggregate queries
  let whereCallCount = 0;
  mockSelectWhere.mockImplementation(() => {
    whereCallCount++;
    const result = (() => {
      switch (whereCallCount) {
        // Call 1: business lookup — uses .limit()
        case 1: return biz ? [biz] : [];
        // Call 2: review aggregate
        case 2: return [reviewData];
        // Call 3: content aggregate
        case 3: return [contentData];
        // Call 4: traffic aggregate
        case 4: return [trafficData];
        // Call 5: google connection — uses .limit()
        case 5: return googleConn ? [googleConn] : [];
        default: return [];
      }
    })();

    return {
      limit: vi.fn().mockResolvedValue(result),
      orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(result) }),
      then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve(result).then(resolve, reject),
    };
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("SEO Service — runAudit()", () => {
  let runAudit: typeof import("@/services/seo").runAudit;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import("@/services/seo");
    runAudit = mod.runAudit;
  });

  it("returns a high score for a business with strong data across all categories", async () => {
    setupSelectSequence(
      BUSINESS_WITH_FULL_PROFILE,
      REVIEW_DATA_STRONG,
      CONTENT_DATA_STRONG,
      TRAFFIC_DATA_STRONG,
      GOOGLE_CONNECTED
    );

    const result = await runAudit("biz-uuid-001", "org-uuid-001");

    expect(result.score.overall).toBeGreaterThanOrEqual(75);
    expect(result.score.categories).toHaveLength(4);
    expect(result.score.categories[0].name).toBe("Profile Completeness");
    expect(result.score.categories[1].name).toBe("Reviews & Reputation");
    expect(result.score.categories[2].name).toBe("Content & Social Signals");
    expect(result.score.categories[3].name).toBe("Search Performance");
    expect(result.aiInsights).toBeDefined();
    expect(typeof result.aiInsights).toBe("string");
  });

  it("returns a low score and recommendations for a business with weak data", async () => {
    setupSelectSequence(
      BUSINESS_MISSING_FIELDS,
      REVIEW_DATA_WEAK,
      CONTENT_DATA_WEAK,
      TRAFFIC_DATA_WEAK,
      null
    );

    const result = await runAudit("biz-uuid-001", "org-uuid-001");

    expect(result.score.overall).toBeLessThan(40);
    expect(result.recommendations.length).toBeGreaterThan(0);

    // Should recommend adding address (missing)
    const addressRec = result.recommendations.find((r) => r.title.includes("address"));
    expect(addressRec).toBeDefined();
    expect(addressRec?.priority).toBe("high");

    // Should recommend adding phone (missing)
    const phoneRec = result.recommendations.find((r) => r.title.includes("phone"));
    expect(phoneRec).toBeDefined();

    // Should recommend connecting Google
    const googleRec = result.recommendations.find((r) => r.title.includes("Google"));
    expect(googleRec).toBeDefined();
    expect(googleRec?.priority).toBe("high");
  });

  it("calculates profile completeness score correctly for full profile", async () => {
    setupSelectSequence(
      BUSINESS_WITH_FULL_PROFILE,
      REVIEW_DATA_STRONG,
      CONTENT_DATA_STRONG,
      TRAFFIC_DATA_STRONG,
      GOOGLE_CONNECTED
    );

    const result = await runAudit("biz-uuid-001", "org-uuid-001");

    const profileCategory = result.score.categories.find((c) => c.name === "Profile Completeness");
    expect(profileCategory).toBeDefined();
    expect(profileCategory!.score).toBe(25); // Full profile = 25/25
    expect(profileCategory!.maxScore).toBe(25);
    expect(profileCategory!.findings.every((f) => f.status === "pass")).toBe(true);
  });

  it("throws when business is not found", async () => {
    setupSelectSequence(null, REVIEW_DATA_STRONG, CONTENT_DATA_STRONG, TRAFFIC_DATA_STRONG, null);

    await expect(runAudit("nonexistent-id", "org-uuid-001")).rejects.toThrow("Business not found");
  });

  it("calls AI generate with business context for insights", async () => {
    setupSelectSequence(
      BUSINESS_WITH_FULL_PROFILE,
      REVIEW_DATA_STRONG,
      CONTENT_DATA_STRONG,
      TRAFFIC_DATA_STRONG,
      GOOGLE_CONNECTED
    );

    await runAudit("biz-uuid-001", "org-uuid-001");

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-haiku-4-5-20251001",
        maxTokens: 200,
        prompt: expect.stringContaining("Test Biz Inc"),
      })
    );
  });

  it("sorts recommendations by priority (high first)", async () => {
    setupSelectSequence(
      BUSINESS_MISSING_FIELDS,
      REVIEW_DATA_WEAK,
      CONTENT_DATA_WEAK,
      TRAFFIC_DATA_WEAK,
      null
    );

    const result = await runAudit("biz-uuid-001", "org-uuid-001");

    const priorities = result.recommendations.map((r) => r.priority);
    const highIdx = priorities.indexOf("high");
    const mediumIdx = priorities.indexOf("medium");
    const lowIdx = priorities.indexOf("low");

    // All high-priority recs should come before medium
    if (highIdx !== -1 && mediumIdx !== -1) {
      expect(highIdx).toBeLessThan(mediumIdx);
    }
    // All medium should come before low
    if (mediumIdx !== -1 && lowIdx !== -1) {
      expect(mediumIdx).toBeLessThan(lowIdx);
    }
  });

  it("handles AI generate failure gracefully by propagating the error", async () => {
    setupSelectSequence(
      BUSINESS_WITH_FULL_PROFILE,
      REVIEW_DATA_STRONG,
      CONTENT_DATA_STRONG,
      TRAFFIC_DATA_STRONG,
      GOOGLE_CONNECTED
    );
    mockGenerate.mockRejectedValueOnce(new Error("AI service unavailable"));

    await expect(runAudit("biz-uuid-001", "org-uuid-001")).rejects.toThrow("AI service unavailable");
  });
});

// ─── Score Grading Tests ────────────────────────────────────────────────────

describe("SEO Score grading thresholds", () => {
  let runAudit: typeof import("@/services/seo").runAudit;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/services/seo");
    runAudit = mod.runAudit;
  });

  it("produces score between 0 and 100", async () => {
    setupSelectSequence(
      BUSINESS_WITH_FULL_PROFILE,
      REVIEW_DATA_STRONG,
      CONTENT_DATA_STRONG,
      TRAFFIC_DATA_STRONG,
      GOOGLE_CONNECTED
    );

    const result = await runAudit("biz-uuid-001", "org-uuid-001");
    expect(result.score.overall).toBeGreaterThanOrEqual(0);
    expect(result.score.overall).toBeLessThanOrEqual(100);
  });

  it("category scores never exceed their maxScore", async () => {
    setupSelectSequence(
      BUSINESS_WITH_FULL_PROFILE,
      REVIEW_DATA_STRONG,
      CONTENT_DATA_STRONG,
      TRAFFIC_DATA_STRONG,
      GOOGLE_CONNECTED
    );

    const result = await runAudit("biz-uuid-001", "org-uuid-001");

    for (const category of result.score.categories) {
      expect(category.score).toBeLessThanOrEqual(category.maxScore);
      expect(category.score).toBeGreaterThanOrEqual(0);
    }
  });

  it("overall score equals the sum of category scores", async () => {
    setupSelectSequence(
      BUSINESS_WITH_FULL_PROFILE,
      REVIEW_DATA_STRONG,
      CONTENT_DATA_STRONG,
      TRAFFIC_DATA_STRONG,
      GOOGLE_CONNECTED
    );

    const result = await runAudit("biz-uuid-001", "org-uuid-001");

    const sumOfCategories = result.score.categories.reduce((sum, c) => sum + c.score, 0);
    expect(result.score.overall).toBe(sumOfCategories);
  });
});
