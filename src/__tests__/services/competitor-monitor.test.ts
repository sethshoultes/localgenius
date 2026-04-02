/**
 * Tests for src/services/competitor-monitor.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB ────────────────────────────────────────────────────────────────

let selectCallCount = 0;
const selectResults: unknown[][] = [];
let insertCallCount = 0;
const insertResults: unknown[][] = [];

function makeThenable(result: unknown[]) {
  const obj: Record<string, unknown> = {};
  obj.limit = vi.fn().mockImplementation(() => makeThenable(result));
  obj.orderBy = vi.fn().mockImplementation(() => makeThenable(result));
  obj.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
    Promise.resolve(result).then(res, rej);
  return obj;
}

const mockSelectWhere = vi.fn().mockImplementation(() => {
  const result = selectResults[selectCallCount] || [];
  selectCallCount++;
  return makeThenable(result);
});
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockImplementation((...args: unknown[]) => {
  // If no .where() is called (like getCompetitors), return thenable directly
  const chain = { from: vi.fn().mockReturnValue({ where: mockSelectWhere }) };
  return chain;
});

const mockInsertReturning = vi.fn().mockImplementation(() => {
  const result = insertResults[insertCallCount] || [];
  insertCallCount++;
  return Promise.resolve(result);
});
const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

const mockDeleteReturning = vi.fn().mockResolvedValue([{ id: "comp-1" }]);
const mockDeleteWhere = vi.fn().mockReturnValue({ returning: mockDeleteReturning });
const mockDelete = vi.fn().mockReturnValue({ where: mockDeleteWhere });

const mockUpdateReturning = vi.fn().mockImplementation(() => {
  const result = insertResults[insertCallCount] || [];
  insertCallCount++;
  return Promise.resolve(result);
});
const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

vi.mock("@/db/schema", () => ({
  competitors: {
    id: "competitors.id",
    businessId: "competitors.businessId",
    organizationId: "competitors.organizationId",
    googlePlaceId: "competitors.googlePlaceId",
    googleRating: "competitors.googleRating",
    googleReviewCount: "competitors.googleReviewCount",
  },
  businesses: { id: "businesses.id", city: "businesses.city" },
  reviews: { businessId: "reviews.businessId", rating: "reviews.rating", createdAt: "reviews.createdAt" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ op: "eq", args })),
  and: vi.fn((...args: unknown[]) => ({ op: "and", args })),
  gte: vi.fn((...args: unknown[]) => ({ op: "gte", args })),
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({ op: "sql", strings, values }),
    { raw: (s: string) => s }
  ),
}));

vi.mock("@/services/ai", () => ({
  generate: vi.fn().mockResolvedValue("You're ahead in reviews and gaining momentum."),
}));

// ─── Setup ──────────────────────────────────────────────────────────────────

function resetMocks() {
  selectCallCount = 0;
  insertCallCount = 0;
  selectResults.length = 0;
  insertResults.length = 0;
  vi.clearAllMocks();

  // Re-wire after clearAllMocks
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockSelect.mockImplementation(() => ({ from: mockSelectFrom }));
  mockSelectWhere.mockImplementation(() => {
    const result = selectResults[selectCallCount] || [];
    selectCallCount++;
    return makeThenable(result);
  });
  mockInsertValues.mockReturnValue({ returning: mockInsertReturning });
  mockInsert.mockReturnValue({ values: mockInsertValues });
  mockInsertReturning.mockImplementation(() => {
    const result = insertResults[insertCallCount] || [];
    insertCallCount++;
    return Promise.resolve(result);
  });
  mockDeleteWhere.mockReturnValue({ returning: mockDeleteReturning });
  mockDelete.mockReturnValue({ where: mockDeleteWhere });
  mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
  mockUpdate.mockReturnValue({ set: mockUpdateSet });
  mockUpdateWhere.mockReturnValue({ returning: mockUpdateReturning });
  mockUpdateReturning.mockImplementation(() => {
    const result = insertResults[insertCallCount] || [];
    insertCallCount++;
    return Promise.resolve(result);
  });
}

beforeEach(resetMocks);

// ─── Tests ──────────────────────────────────────────────────────────────────

const COMP_RECORD = {
  id: "comp-uuid-001",
  businessId: "biz-uuid-001",
  organizationId: "org-uuid-001",
  competitorName: "Rival Bistro",
  googlePlaceId: "ChIJ_test_place",
  googleRating: "4.5",
  googleReviewCount: 120,
  lastRating: "4.4",
  lastReviewCount: 115,
  lastCheckedAt: new Date(),
  createdAt: new Date(),
};

describe("addCompetitor", () => {
  it("creates a competitor record", async () => {
    selectResults.push([{ city: "Austin" }]); // business lookup
    insertResults.push([COMP_RECORD]);

    const { addCompetitor } = await import("@/services/competitor-monitor");
    const result = await addCompetitor("biz-uuid-001", "org-uuid-001", "Rival Bistro");

    expect(result.competitorName).toBe("Rival Bistro");
    expect(mockInsert).toHaveBeenCalled();
  });

  it("uses provided googlePlaceId instead of searching", async () => {
    insertResults.push([{ ...COMP_RECORD, googlePlaceId: "ChIJ_provided" }]);

    const { addCompetitor } = await import("@/services/competitor-monitor");
    const result = await addCompetitor("biz-uuid-001", "org-uuid-001", "Rival Bistro", "ChIJ_provided");

    expect(result.googlePlaceId).toBe("ChIJ_provided");
    // Should NOT call select for business city (no search needed)
  });
});

describe("removeCompetitor", () => {
  it("returns true when competitor is deleted", async () => {
    mockDeleteReturning.mockResolvedValueOnce([{ id: "comp-uuid-001" }]);

    const { removeCompetitor } = await import("@/services/competitor-monitor");
    const result = await removeCompetitor("comp-uuid-001", "biz-uuid-001");

    expect(result).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
  });

  it("returns false when competitor not found", async () => {
    mockDeleteReturning.mockResolvedValueOnce([]);

    const { removeCompetitor } = await import("@/services/competitor-monitor");
    const result = await removeCompetitor("nonexistent", "biz-uuid-001");

    expect(result).toBe(false);
  });
});

describe("getCompetitors", () => {
  it("returns list of competitors for a business", async () => {
    selectResults.push([COMP_RECORD, { ...COMP_RECORD, id: "comp-2", competitorName: "Another Place" }]);

    const { getCompetitors } = await import("@/services/competitor-monitor");
    const results = await getCompetitors("biz-uuid-001");

    expect(results).toHaveLength(2);
    expect(results[0].competitorName).toBe("Rival Bistro");
  });

  it("returns empty array when no competitors tracked", async () => {
    selectResults.push([]);

    const { getCompetitors } = await import("@/services/competitor-monitor");
    const results = await getCompetitors("biz-uuid-001");

    expect(results).toHaveLength(0);
  });
});

describe("checkCompetitor", () => {
  it("fetches place data and updates competitor record", async () => {
    selectResults.push([COMP_RECORD]); // competitor lookup
    insertResults.push([{ ...COMP_RECORD, googleRating: "4.6", googleReviewCount: 125 }]); // update returning

    const { checkCompetitor } = await import("@/services/competitor-monitor");
    const result = await checkCompetitor("comp-uuid-001");

    expect(result).not.toBeNull();
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("returns null for competitor without googlePlaceId", async () => {
    selectResults.push([{ ...COMP_RECORD, googlePlaceId: null }]);

    const { checkCompetitor } = await import("@/services/competitor-monitor");
    const result = await checkCompetitor("comp-uuid-001");

    expect(result).toBeNull();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns null for nonexistent competitor", async () => {
    selectResults.push([]);

    const { checkCompetitor } = await import("@/services/competitor-monitor");
    const result = await checkCompetitor("nonexistent");

    expect(result).toBeNull();
  });
});
