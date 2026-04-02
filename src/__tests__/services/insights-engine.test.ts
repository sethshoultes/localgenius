/**
 * Tests for src/services/insights-engine.ts
 * generateInsights, pattern detection, analytics aggregation
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

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
  getDb: vi.fn(),
}));

// Mock schema
vi.mock("@/db/schema", () => ({
  businesses: {
    id: "businesses.id",
    name: "businesses.name",
    vertical: "businesses.vertical",
    city: "businesses.city",
  },
  reviews: {
    id: "reviews.id",
    businessId: "reviews.businessId",
    sentiment: "reviews.sentiment",
    reviewDate: "reviews.reviewDate",
  },
  contentItems: {
    businessId: "contentItems.businessId",
    contentType: "contentItems.contentType",
    createdAt: "contentItems.createdAt",
  },
  analyticsEvents: {
    businessId: "analyticsEvents.businessId",
    eventType: "analyticsEvents.eventType",
    occurredAt: "analyticsEvents.occurredAt",
  },
  attributionEvents: {
    businessId: "attributionEvents.businessId",
    confidence: "attributionEvents.confidence",
    valueCents: "attributionEvents.valueCents",
    occurredAt: "attributionEvents.occurredAt",
  },
  competitors: {},
  actions: {},
}));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  gte: vi.fn((...args: unknown[]) => ({ type: "gte", args })),
  desc: vi.fn((...args: unknown[]) => ({ type: "desc", args })),
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({
      op: "sql",
      strings: Array.from(strings),
      values,
    }),
    { raw: (s: string) => s }
  ),
}));

// Mock services
const mockGenerate = vi.fn().mockResolvedValue("Post more on Tuesdays.");
vi.mock("@/services/ai", () => ({
  generate: (...args: unknown[]) => mockGenerate(...args),
}));

const mockGetReviewTrends = vi.fn().mockResolvedValue({
  velocityPerWeek: 2.5,
  totalReviews: 45,
  avgRating: 4.3,
});
vi.mock("@/services/reviews", () => ({
  getReviewTrends: (...args: unknown[]) => mockGetReviewTrends(...args),
}));

const mockGetCompetitors = vi.fn().mockResolvedValue([]);
vi.mock("@/services/competitor-monitor", () => ({
  getCompetitors: (...args: unknown[]) => mockGetCompetitors(...args),
}));

// ─── Tests: generateInsights ─────────────────────────────────────────────────

describe("insights-engine — generateInsights()", () => {
  let generateInsights: typeof import("@/services/insights-engine").generateInsights;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import("@/services/insights-engine");
    generateInsights = mod.generateInsights;
  });

  it("returns empty array when business not found", async () => {
    mockSelectWhere.mockImplementationOnce(() => makeThenable([]));

    const result = await generateInsights(TEST_BUSINESS.id, TEST_BUSINESS.organizationId);

    expect(result).toEqual([]);
  });

  it("generates insights when business exists", async () => {
    const biz = { ...TEST_BUSINESS, name: "My Restaurant", vertical: "restaurant", city: "Austin" };

    let callCount = 0;
    mockSelectWhere.mockImplementation(() => {
      callCount++;
      const result = (() => {
        switch (callCount) {
          case 1: return [biz];
          case 2: return [{ dayOfWeek: 2, count: 5 }];
          case 3: return [{ count: 5 }];
          case 4: return [{ count: 0 }];
          case 5: return [{ count: 0 }];
          case 6: return [{ count: 150 }];
          case 7: return [{ count: 140 }];
          case 8: return [{ directCount: 10, totalValue: 100000 }];
          case 9: return [{ count: 45 }];
          default: return [];
        }
      })();
      return makeThenable(result);
    });

    mockGetReviewTrends.mockResolvedValue({ velocityPerWeek: 3.2, totalReviews: 45 });
    mockGetCompetitors.mockResolvedValue([]);

    const result = await generateInsights(TEST_BUSINESS.id, TEST_BUSINESS.organizationId);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("calls AI service when enough data available", async () => {
    const biz = { ...TEST_BUSINESS, name: "Hotel", vertical: "hospitality", city: "Austin" };

    let callCount = 0;
    mockSelectWhere.mockImplementation(() => {
      callCount++;
      const result = (() => {
        switch (callCount) {
          case 1: return [biz];
          case 2: return [{ dayOfWeek: 2, count: 5 }];
          case 3: return [{ count: 5 }];
          case 4: return [{ count: 2 }];
          case 5: return [{ count: 0 }];
          case 6: return [{ count: 100 }];
          case 7: return [{ count: 90 }];
          case 8: return [{ directCount: 5, totalValue: 100000 }];
          case 9: return [{ count: 50 }];
          default: return [];
        }
      })();
      return makeThenable(result);
    });

    mockGetReviewTrends.mockResolvedValue({ velocityPerWeek: 2, totalReviews: 50 });
    mockGetCompetitors.mockResolvedValue([]);

    const result = await generateInsights(TEST_BUSINESS.id, TEST_BUSINESS.organizationId);

    expect(mockGenerate).toHaveBeenCalled();
  });

  it("handles AI service error gracefully", async () => {
    const biz = { ...TEST_BUSINESS, name: "Boutique", vertical: "retail", city: "Austin" };

    let callCount = 0;
    mockSelectWhere.mockImplementation(() => {
      callCount++;
      return makeThenable(callCount === 1 ? [biz] : []);
    });

    mockGetReviewTrends.mockResolvedValue({ velocityPerWeek: 1.5, totalReviews: 25 });
    mockGetCompetitors.mockResolvedValue([]);

    mockGenerate.mockRejectedValueOnce(new Error("AI service down"));

    const result = await generateInsights(TEST_BUSINESS.id, TEST_BUSINESS.organizationId);

    expect(result.length).toBeGreaterThan(0);
    const aiInsight = result.find((i) => i.type === "ai_recommendation");
    expect(aiInsight).toBeUndefined();
  });

  it("sorts insights by priority (high first)", async () => {
    const biz = { ...TEST_BUSINESS, name: "Pizzeria", vertical: "restaurant", city: "Austin" };

    let callCount = 0;
    mockSelectWhere.mockImplementation(() => {
      callCount++;
      return makeThenable(callCount === 1 ? [biz] : []);
    });

    mockGetReviewTrends.mockResolvedValue({ velocityPerWeek: 1, totalReviews: 20 });
    mockGetCompetitors.mockResolvedValue([]);

    const result = await generateInsights(TEST_BUSINESS.id, TEST_BUSINESS.organizationId);

    const priorities = result.map((i) => i.priority);
    const highIndices = priorities.map((p, i) => (p === "high" ? i : -1)).filter((i) => i >= 0);
    const mediumIndices = priorities.map((p, i) => (p === "medium" ? i : -1)).filter((i) => i >= 0);

    if (highIndices.length > 0 && mediumIndices.length > 0) {
      expect(Math.max(...highIndices)).toBeLessThan(Math.min(...mediumIndices));
    }
  });

  it("includes competitor insights when tracked", async () => {
    const biz = { ...TEST_BUSINESS, name: "Bakery", vertical: "food", city: "Austin" };

    let callCount = 0;
    mockSelectWhere.mockImplementation(() => {
      callCount++;
      return makeThenable(callCount === 1 ? [biz] : []);
    });

    mockGetReviewTrends.mockResolvedValue({ velocityPerWeek: 2, totalReviews: 30 });

    const competitors = [
      {
        id: "comp-1",
        businessId: TEST_BUSINESS.id,
        competitorName: "Rival Bakery",
        googleRating: 4.5,
        lastRating: 4.2,
        googleReviewCount: 55,
        lastReviewCount: 40,
      },
    ];

    mockGetCompetitors.mockResolvedValue(competitors);

    const result = await generateInsights(TEST_BUSINESS.id, TEST_BUSINESS.organizationId);

    const competitorInsight = result.find((i) => i.category === "competitor");
    expect(competitorInsight).toBeDefined();
  });
});

// ─── Tests: trackInsightAction ───────────────────────────────────────────────

describe("insights-engine — trackInsightAction()", () => {
  let trackInsightAction: typeof import("@/services/insights-engine").trackInsightAction;
  let getInsightHistory: typeof import("@/services/insights-engine").getInsightHistory;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import("@/services/insights-engine");
    trackInsightAction = mod.trackInsightAction;
    getInsightHistory = mod.getInsightHistory;
  });

  it("tracks insight actions", () => {
    trackInsightAction("insight-123", "acted");

    const history = getInsightHistory();
    expect(history.has("insight-123")).toBe(true);
    expect(history.get("insight-123")?.action).toBe("acted");
  });

  it("tracks dismissed actions", () => {
    trackInsightAction("insight-456", "dismissed");

    const history = getInsightHistory();
    expect(history.get("insight-456")?.action).toBe("dismissed");
  });
});
