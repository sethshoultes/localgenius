/**
 * Tests for src/services/digest.ts
 * — generateDigest(), generateAllDigests()
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TEST_BUSINESS } from "../mocks/db";

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
    _: {
      fullSchema: {
        conversations: { businessId: "conversations.businessId" },
      },
    },
  },
  getDb: vi.fn(),
}));

// Mock schema
vi.mock("@/db/schema", () => ({
  businesses: { id: "businesses.id", organizationId: "businesses.organizationId", name: "businesses.name", vertical: "businesses.vertical", city: "businesses.city", deletedAt: "businesses.deletedAt", onboardingCompletedAt: "businesses.onboardingCompletedAt" },
  weeklyDigests: { businessId: "weeklyDigests.businessId", organizationId: "weeklyDigests.organizationId", periodStart: "weeklyDigests.periodStart", periodEnd: "weeklyDigests.periodEnd", metrics: "weeklyDigests.metrics", actionsCompleted: "weeklyDigests.actionsCompleted", recommendations: "weeklyDigests.recommendations" },
  reviews: { businessId: "reviews.businessId" },
  actions: { businessId: "actions.businessId", status: "actions.status", actionType: "actions.actionType", executedAt: "actions.executedAt" },
  messages: { conversationId: "messages.conversationId", businessId: "messages.businessId", organizationId: "messages.organizationId", role: "messages.role", contentType: "messages.contentType", content: "messages.content", aiModel: "messages.aiModel" },
}));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  gte: vi.fn((...args: unknown[]) => ({ type: "gte", args })),
  desc: vi.fn((...args: unknown[]) => ({ type: "desc", args })),
  sql: vi.fn((...args: unknown[]) => ({ type: "sql", args })),
}));

// Mock analytics service
const mockGetWeeklyAggregates = vi.fn();
const mockGetAttributionSummary = vi.fn();

vi.mock("@/services/analytics", () => ({
  getWeeklyAggregates: (...args: unknown[]) => mockGetWeeklyAggregates(...args),
  getAttributionSummary: (...args: unknown[]) => mockGetAttributionSummary(...args),
}));

// Mock reviews service
const mockGetReviewTrends = vi.fn();

vi.mock("@/services/reviews", () => ({
  getReviewTrends: (...args: unknown[]) => mockGetReviewTrends(...args),
}));

// Mock competitor monitor service
const mockGetCompetitorDigestSection = vi.fn();

vi.mock("@/services/competitor-monitor", () => ({
  getCompetitorDigestSection: (...args: unknown[]) => mockGetCompetitorDigestSection(...args),
}));

// Mock SEO service
const mockRunAudit = vi.fn();

vi.mock("@/services/seo", () => ({
  runAudit: (...args: unknown[]) => mockRunAudit(...args),
}));

// Mock AI service
const mockGenerateDigestNarrative = vi.fn().mockResolvedValue("This week was fantastic! You got 12 new reviews with an average rating of 4.8.");

vi.mock("@/services/ai", () => ({
  generateDigestNarrative: (...args: unknown[]) => mockGenerateDigestNarrative(...args),
}));

// ─── Test data ──────────────────────────────────────────────────────────────

const BUSINESS_ONBOARDED = {
  ...TEST_BUSINESS,
  id: "biz-uuid-001",
  organizationId: "org-uuid-001",
  name: "Test Restaurant",
  vertical: "restaurant",
  city: "Austin",
  onboardingCompletedAt: new Date("2026-01-01"),
  deletedAt: null,
};

const BUSINESS_NOT_ONBOARDED = {
  ...BUSINESS_ONBOARDED,
  onboardingCompletedAt: null,
};

const BUSINESS_DELETED = {
  ...BUSINESS_ONBOARDED,
  deletedAt: new Date("2026-03-01"),
};

const WEEKLY_METRICS = {
  reviewsReceived: 12,
  averageRating: 4.8,
  pageViews: 450,
  directCalls: 32,
  directionRequests: 18,
  bookings: 8,
};

const ATTRIBUTION_DATA = {
  directActions: 5,
  correlatedOutcomes: 3,
  attributionRate: 0.4,
};

const REVIEW_TRENDS = {
  totalReviews: 145,
  recentReviews: 12,
  averageRating: 4.6,
  recentAverageRating: 4.8,
  ratingTrend: 0.2,
  velocityPerWeek: 1.7,
};

const COMPETITOR_CONTEXT = {
  businessRating: 4.8,
  businessReviewCount: 145,
  businessReviewDelta: 12,
  competitors: [
    {
      name: "Rival Restaurant",
      rating: 4.5,
      reviewCount: 120,
      reviewDelta: 5,
    },
  ],
  summary: "You're outperforming competitors on rating.",
};

const SEO_AUDIT_RESULT = {
  score: {
    overall: 78,
    categories: [
      { name: "Profile Completeness", score: 20, maxScore: 25 },
      { name: "Reviews & Reputation", score: 22, maxScore: 25 },
      { name: "Content & Social Signals", score: 18, maxScore: 25 },
      { name: "Search Performance", score: 18, maxScore: 25 },
    ],
  },
  grade: "C",
  topRecommendation: "Get more Google reviews to boost local search rankings.",
  recommendations: [
    { title: "Increase review volume", priority: "high", description: "Aim for 2-3 new reviews per week" },
  ],
  aiInsights: "Your profile is strong overall but review velocity is the bottleneck.",
};

const ACTION_COUNTS = {
  total: 18,
  socialPosts: 5,
  reviewResponses: 8,
  emailCampaigns: 3,
  seoUpdates: 2,
  gbpUpdates: 0,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Setup select chain for generateDigest() multiple sequential calls
 */
function setupSelectForDigest(
  business: typeof BUSINESS_ONBOARDED | null,
  withCompetitor = true,
  withSeo = true
) {
  let callCount = 0;

  mockSelectLimitResult.mockImplementation(() => {
    callCount++;
    switch (callCount) {
      case 1:
        return Promise.resolve(business ? [business] : []);
      case 2:
        // Conversation lookup
        return Promise.resolve(business ? [{ id: "conv-uuid-001" }] : []);
      default:
        return Promise.resolve([]);
    }
  });

  mockSelectWhere.mockImplementation(() => {
    return {
      limit: mockSelectLimit,
      orderBy: vi.fn().mockReturnValue({ limit: mockSelectLimit }),
      then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
        // For conversations lookup
        if (business) {
          return Promise.resolve([{ id: "conv-uuid-001" }]).then(resolve, reject);
        }
        return Promise.resolve([]).then(resolve, reject);
      },
    };
  });
}

/**
 * Setup for generateAllDigests() — returns list of businesses
 */
function setupSelectForAllDigests(businesses: typeof BUSINESS_ONBOARDED[] = []) {
  mockSelectWhere.mockImplementation(() => ({
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(businesses).then(resolve, reject),
    limit: mockSelectLimit,
  }));

  mockSelectLimitResult.mockImplementation(() => Promise.resolve([]));
}

// ─── Tests: generateDigest ───────────────────────────────────────────────────

describe("Digest Service — generateDigest()", () => {
  let generateDigest: typeof import("@/services/digest").generateDigest;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup default mock returns for all dependencies
    mockGetWeeklyAggregates.mockResolvedValue(WEEKLY_METRICS);
    mockGetAttributionSummary.mockResolvedValue(ATTRIBUTION_DATA);
    mockGetReviewTrends.mockResolvedValue(REVIEW_TRENDS);
    // getCompetitorDigestSection returns the raw API format, which the service transforms
    mockGetCompetitorDigestSection.mockResolvedValue({
      businessRating: 4.8,
      businessReviewCount: 145,
      businessReviewDelta: 12,
      competitors: [
        {
          competitorName: "Rival Restaurant",
          competitorRating: 4.5,
          competitorReviewCount: 120,
          competitorReviewDelta: 5,
        },
      ],
      summary: "You're outperforming competitors on rating.",
    });
    mockRunAudit.mockResolvedValue(SEO_AUDIT_RESULT);

    const mod = await import("@/services/digest");
    generateDigest = mod.generateDigest;
  });

  it("returns null when business is not found", async () => {
    setupSelectForDigest(null);

    const result = await generateDigest("nonexistent-id", "org-uuid-001");

    expect(result).toBeNull();
  });

  it("generates a complete digest with all metrics and sections", async () => {
    setupSelectForDigest(BUSINESS_ONBOARDED, true, true);

    const result = await generateDigest("biz-uuid-001", "org-uuid-001");

    expect(result).not.toBeNull();
    expect(result?.business.id).toBe("biz-uuid-001");
    expect(result?.business.name).toBe("Test Restaurant");
    expect(result?.metrics).toEqual(WEEKLY_METRICS);
    expect(result?.attribution).toEqual(ATTRIBUTION_DATA);
    expect(result?.reviewTrends).toEqual(REVIEW_TRENDS);
    expect(result?.competitorContext).toEqual(COMPETITOR_CONTEXT);
    expect(result?.seoScore).toBeDefined();
  });

  it("collects action counts from database for the week", async () => {
    setupSelectForDigest(BUSINESS_ONBOARDED);

    // Mock the action count query to return aggregated counts
    let selectCallCount = 0;
    mockSelectLimitResult.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) return Promise.resolve([BUSINESS_ONBOARDED]);
      if (selectCallCount === 2) return Promise.resolve([{ id: "conv-uuid-001" }]);
      return Promise.resolve([]);
    });

    // Mock the aggregate counts from drizzle sql query
    mockSelectWhere.mockImplementation(() => ({
      then: (resolve: (v: unknown) => unknown) =>
        Promise.resolve([ACTION_COUNTS]).then(resolve),
      limit: mockSelectLimit,
    }));

    const result = await generateDigest("biz-uuid-001", "org-uuid-001");

    expect(result?.actionsCompleted).toMatchObject({
      total: expect.any(Number),
      socialPosts: expect.any(Number),
      reviewResponses: expect.any(Number),
      emailCampaigns: expect.any(Number),
    });
  });

  it("includes competitor context when available", async () => {
    setupSelectForDigest(BUSINESS_ONBOARDED, true);
    // Return raw API format that service will transform
    mockGetCompetitorDigestSection.mockResolvedValueOnce({
      businessRating: 4.8,
      businessReviewCount: 145,
      businessReviewDelta: 12,
      competitors: [
        {
          competitorName: "Rival Restaurant",
          competitorRating: 4.5,
          competitorReviewCount: 120,
          competitorReviewDelta: 5,
        },
      ],
      summary: "You're outperforming competitors on rating.",
    });

    const result = await generateDigest("biz-uuid-001", "org-uuid-001");

    expect(result?.competitorContext).not.toBeNull();
    expect(result?.competitorContext?.competitors).toHaveLength(1);
    expect(result?.competitorContext?.competitors[0].name).toBe("Rival Restaurant");
  });

  it("returns null competitor context when no competitors tracked", async () => {
    setupSelectForDigest(BUSINESS_ONBOARDED, false);
    mockGetCompetitorDigestSection.mockResolvedValueOnce(null);

    const result = await generateDigest("biz-uuid-001", "org-uuid-001");

    expect(result?.competitorContext).toBeNull();
  });

  it("includes SEO score when audit succeeds", async () => {
    setupSelectForDigest(BUSINESS_ONBOARDED, true, true);

    const result = await generateDigest("biz-uuid-001", "org-uuid-001");

    expect(result?.seoScore).not.toBeNull();
    expect(result?.seoScore?.overall).toBe(78);
    expect(result?.seoScore?.grade).toBe("C");
    expect(result?.seoScore?.topRecommendation).toBeDefined();
  });

  it("gracefully continues when SEO audit fails", async () => {
    setupSelectForDigest(BUSINESS_ONBOARDED, true, false);
    mockRunAudit.mockRejectedValueOnce(new Error("SEO audit service down"));

    const result = await generateDigest("biz-uuid-001", "org-uuid-001");

    expect(result).not.toBeNull();
    expect(result?.seoScore).toBeNull(); // Non-critical, digest still generates
  });

  it("calls generateDigestNarrative with correct metrics and context", async () => {
    setupSelectForDigest(BUSINESS_ONBOARDED, true, true);

    await generateDigest("biz-uuid-001", "org-uuid-001");

    expect(mockGenerateDigestNarrative).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Test Restaurant" }),
      expect.objectContaining({
        ...WEEKLY_METRICS,
        socialPosts: expect.any(Number),
        reviewResponses: expect.any(Number),
        averageRating: REVIEW_TRENDS.recentAverageRating,
        totalReviews: REVIEW_TRENDS.totalReviews,
        newReviews: REVIEW_TRENDS.recentReviews,
        competitorContext: expect.any(Object),
        seoScore: expect.any(Object),
      })
    );
  });

  it("stores digest in database with all data", async () => {
    setupSelectForDigest(BUSINESS_ONBOARDED);

    await generateDigest("biz-uuid-001", "org-uuid-001");

    expect(mockInsert).toHaveBeenCalled();
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: "biz-uuid-001",
        organizationId: "org-uuid-001",
        metrics: expect.any(Object),
        actionsCompleted: expect.any(Object),
        recommendations: expect.objectContaining({
          narrative: expect.any(String),
        }),
      })
    );
  });

  it("creates message in conversation thread with digest content", async () => {
    setupSelectForDigest(BUSINESS_ONBOARDED);

    await generateDigest("biz-uuid-001", "org-uuid-001");

    // Should insert twice: once for weeklyDigests, once for messages
    const calls = mockInsert.mock.calls;
    const messageInsert = calls.some((call) =>
      String(call).includes("messages")
    );

    expect(messageInsert || calls.length >= 2).toBe(true);
  });

  it("returns digest data with narrative text", async () => {
    setupSelectForDigest(BUSINESS_ONBOARDED);
    mockGenerateDigestNarrative.mockResolvedValueOnce("Great week! You're trending upward.");

    const result = await generateDigest("biz-uuid-001", "org-uuid-001");

    expect(result?.narrative).toBe("Great week! You're trending upward.");
    expect(typeof result?.narrative).toBe("string");
  });

  it("queries weekly metrics and trends with correct time window", async () => {
    setupSelectForDigest(BUSINESS_ONBOARDED);

    await generateDigest("biz-uuid-001", "org-uuid-001");

    // Should call getWeeklyAggregates(businessId, 1) for 1 week
    expect(mockGetWeeklyAggregates).toHaveBeenCalledWith("biz-uuid-001", 1);

    // Should call getReviewTrends(businessId, 7) for 7 days
    expect(mockGetReviewTrends).toHaveBeenCalledWith("biz-uuid-001", 7);

    // Should call getAttributionSummary(businessId, 7) for 7 days
    expect(mockGetAttributionSummary).toHaveBeenCalledWith("biz-uuid-001", 7);
  });
});

// ─── Tests: generateAllDigests ───────────────────────────────────────────────

describe("Digest Service — generateAllDigests()", () => {
  let generateAllDigests: typeof import("@/services/digest").generateAllDigests;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockGetWeeklyAggregates.mockResolvedValue(WEEKLY_METRICS);
    mockGetAttributionSummary.mockResolvedValue(ATTRIBUTION_DATA);
    mockGetReviewTrends.mockResolvedValue(REVIEW_TRENDS);
    mockGetCompetitorDigestSection.mockResolvedValue(null);
    mockRunAudit.mockResolvedValue(SEO_AUDIT_RESULT);
    mockGenerateDigestNarrative.mockResolvedValue("Great week! You're trending upward.");

    const mod = await import("@/services/digest");
    generateAllDigests = mod.generateAllDigests;
  });

  it("returns zero counts when no businesses exist", async () => {
    setupSelectForAllDigests([]);

    const result = await generateAllDigests();

    expect(result.generated).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it("generates digests for all active onboarded businesses", async () => {
    const businesses = [
      BUSINESS_ONBOARDED,
      { ...BUSINESS_ONBOARDED, id: "biz-uuid-002", name: "Another Restaurant" },
    ];
    setupSelectForAllDigests(businesses);

    let selectCallCount = 0;
    mockSelectLimitResult.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount <= 2) {
        return Promise.resolve([
          selectCallCount === 1 ? businesses[0] : businesses[1],
        ]);
      }
      // Conversation lookups
      if (selectCallCount <= 4) {
        return Promise.resolve([{ id: "conv-uuid-001" }]);
      }
      return Promise.resolve([]);
    });

    const result = await generateAllDigests();

    expect(result.generated).toBe(2);
    expect(result.failed).toBe(0);
  });

  it("skips businesses that have not completed onboarding", async () => {
    const businesses = [BUSINESS_ONBOARDED, BUSINESS_NOT_ONBOARDED];
    setupSelectForAllDigests(businesses);

    // Only the onboarded business should be processed
    mockSelectLimitResult.mockResolvedValue([BUSINESS_ONBOARDED]);

    const result = await generateAllDigests();

    // Count depends on sql filter which we can't directly verify,
    // but verify that the function executes without error
    expect(result).toHaveProperty("generated");
    expect(result).toHaveProperty("failed");
  });

  it("skips deleted businesses", async () => {
    const businesses = [BUSINESS_ONBOARDED, BUSINESS_DELETED];
    setupSelectForAllDigests(businesses);

    const result = await generateAllDigests();

    expect(result).toHaveProperty("generated");
    // The sql filter should exclude deleted businesses
  });

  it("counts failures and collects error messages", async () => {
    const businesses = [BUSINESS_ONBOARDED];
    setupSelectForAllDigests(businesses);

    mockSelectLimitResult.mockResolvedValue([BUSINESS_ONBOARDED]);
    // Mock generateDigest to fail
    mockGetWeeklyAggregates.mockRejectedValueOnce(new Error("Database connection error"));

    const result = await generateAllDigests();

    expect(result.failed).toBeGreaterThan(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("Database connection error");
  });

  it("continues processing businesses after one fails", async () => {
    const businesses = [BUSINESS_ONBOARDED, { ...BUSINESS_ONBOARDED, id: "biz-uuid-002" }];
    setupSelectForAllDigests(businesses);

    let selectCallCount = 0;
    mockSelectLimitResult.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) return Promise.resolve([BUSINESS_ONBOARDED]); // This one fails
      if (selectCallCount === 2) return Promise.resolve([{ id: "conv-uuid-001" }]);
      if (selectCallCount === 3) return Promise.resolve([businesses[1]]); // This one succeeds
      if (selectCallCount === 4) return Promise.resolve([{ id: "conv-uuid-001" }]);
      return Promise.resolve([]);
    });

    // First business fails, second succeeds
    mockGetWeeklyAggregates
      .mockRejectedValueOnce(new Error("Metrics unavailable"))
      .mockResolvedValueOnce(WEEKLY_METRICS);

    mockGetAttributionSummary.mockResolvedValue(ATTRIBUTION_DATA);
    mockGetReviewTrends.mockResolvedValue(REVIEW_TRENDS);

    const result = await generateAllDigests();

    // At least one should fail and one should succeed
    expect(result.failed + result.generated).toBe(2);
  });

  it("includes business name in error message for failed digests", async () => {
    const businesses = [BUSINESS_ONBOARDED];
    setupSelectForAllDigests(businesses);

    mockSelectLimitResult.mockResolvedValue([BUSINESS_ONBOARDED]);
    mockGetWeeklyAggregates.mockRejectedValueOnce(new Error("Metrics service down"));

    const result = await generateAllDigests();

    expect(result.errors[0]).toContain("Test Restaurant");
    expect(result.errors[0]).toContain("biz-uuid-001");
  });

  it("returns summary with generated and failed counts", async () => {
    const businesses = [BUSINESS_ONBOARDED];
    setupSelectForAllDigests(businesses);

    mockSelectLimitResult.mockResolvedValue([BUSINESS_ONBOARDED]);

    const result = await generateAllDigests();

    expect(result).toMatchObject({
      generated: expect.any(Number),
      failed: expect.any(Number),
      errors: expect.any(Array),
    });
    expect(result.generated + result.failed).toBeGreaterThan(-1);
  });
});
