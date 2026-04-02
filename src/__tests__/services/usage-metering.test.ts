/**
 * Tests for src/services/usage-metering.ts
 * AI cost tracking, budget enforcement, and upsell logic.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Module mocks ────────────────────────────────────────────────────────────

// Mock DB: chainable select with sequential call tracking.
// The first query in getUsage ends at .where() (no .limit()),
// so .where() must be thenable. The second and third queries use .limit(1).
let selectCallCount = 0;
const mockSelectResults: unknown[][] = [];

function makeThenable(result: unknown[]) {
  const obj: Record<string, unknown> = {};
  // Support .limit() which also must be thenable
  obj.limit = vi.fn().mockImplementation(() => makeThenable(result));
  obj.groupBy = vi.fn().mockImplementation(() => makeThenable(result));
  // Make the object itself thenable (for `await db.select().from().where()`)
  obj.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return obj;
}

const mockSelectWhere = vi.fn().mockImplementation(() => {
  const result = mockSelectResults[selectCallCount] || [];
  selectCallCount++;
  return makeThenable(result);
});
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
  messages: {
    businessId: "messages.businessId",
    aiModel: "messages.aiModel",
    tokensInput: "messages.tokensInput",
    tokensOutput: "messages.tokensOutput",
    createdAt: "messages.createdAt",
  },
  organizations: {
    id: "organizations.id",
    plan: "organizations.plan",
  },
  businesses: {
    id: "businesses.id",
    organizationId: "businesses.organizationId",
    name: "businesses.name",
  },
}));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ op: "eq", args })),
  and: vi.fn((...args: unknown[]) => ({ op: "and", args })),
  gte: vi.fn((...args: unknown[]) => ({ op: "gte", args })),
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({
      op: "sql",
      strings: Array.from(strings),
      values,
    }),
    { raw: (s: string) => s }
  ),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setSelectResults(...results: unknown[][]) {
  selectCallCount = 0;
  mockSelectResults.length = 0;
  results.forEach((r) => mockSelectResults.push(r));
}

// ─── Tests: getUsage ─────────────────────────────────────────────────────────

describe("getUsage", () => {
  let getUsage: typeof import("@/services/usage-metering").getUsage;

  beforeEach(async () => {
    vi.clearAllMocks();
    selectCallCount = 0;
    mockSelectResults.length = 0;

    const mod = await import("@/services/usage-metering");
    getUsage = mod.getUsage;
  });

  it("returns zero usage when no messages exist", async () => {
    // Query 1: token sums (ends at .where(), no .limit())
    // Query 2: business lookup (uses .limit(1))
    // Query 3: org plan lookup (uses .limit(1))
    setSelectResults(
      [{ totalInput: 0, totalOutput: 0, sonnetInput: 0, sonnetOutput: 0, haikuInput: 0, haikuOutput: 0 }],
      [{ organizationId: "org-uuid-001" }],
      [{ plan: "base" }]
    );

    const result = await getUsage("biz-uuid-001");

    expect(result.totalInputTokens).toBe(0);
    expect(result.totalOutputTokens).toBe(0);
    expect(result.estimatedCostCents).toBe(0);
    expect(result.budgetCents).toBe(435);
    expect(result.budgetUsedPercent).toBe(0);
    expect(result.shouldUpsell).toBe(false);
    expect(result.shouldAlert).toBe(false);
    expect(result.upsellMessage).toBeNull();
    expect(result.model).toBe("claude-sonnet-4-20250514");
  });

  it("calculates cost correctly for sonnet tokens", async () => {
    // 1M input tokens at $3/M = $3.00 = 300 cents
    // 1M output tokens at $15/M = $15.00 = 1500 cents
    // Total = $18.00 = 1800 cents
    setSelectResults(
      [{
        totalInput: 1_000_000, totalOutput: 1_000_000,
        sonnetInput: 1_000_000, sonnetOutput: 1_000_000,
        haikuInput: 0, haikuOutput: 0,
      }],
      [{ organizationId: "org-uuid-001" }],
      [{ plan: "base" }]
    );

    const result = await getUsage("biz-uuid-001");

    expect(result.totalInputTokens).toBe(1_000_000);
    expect(result.totalOutputTokens).toBe(1_000_000);
    expect(result.estimatedCostCents).toBe(1800);
    expect(result.budgetUsedPercent).toBeGreaterThan(100);
    expect(result.shouldAlert).toBe(true);
  });

  it("triggers upsell at 80% budget for base plan", async () => {
    // Budget is 435 cents, 80% = 348 cents
    // sonnetCost = (233333/1M)*15 = 3.4999 => 350 cents
    setSelectResults(
      [{
        totalInput: 0, totalOutput: 233_333,
        sonnetInput: 0, sonnetOutput: 233_333,
        haikuInput: 0, haikuOutput: 0,
      }],
      [{ organizationId: "org-uuid-001" }],
      [{ plan: "base" }]
    );

    const result = await getUsage("biz-uuid-001");

    expect(result.budgetUsedPercent).toBeGreaterThanOrEqual(80);
    expect(result.shouldUpsell).toBe(true);
    expect(result.upsellMessage).toContain("Upgrade to Pro");
  });

  it("does NOT upsell on pro plan even when over 80%", async () => {
    // Pro budget is 1185 cents.
    // sonnet output: 640000 tokens => (640000/1M)*15 = $9.60 = 960 cents
    // 960/1185 = 81%
    setSelectResults(
      [{
        totalInput: 0, totalOutput: 640_000,
        sonnetInput: 0, sonnetOutput: 640_000,
        haikuInput: 0, haikuOutput: 0,
      }],
      [{ organizationId: "org-uuid-001" }],
      [{ plan: "pro" }]
    );

    const result = await getUsage("biz-uuid-001");

    expect(result.budgetCents).toBe(1185);
    expect(result.budgetUsedPercent).toBeGreaterThanOrEqual(80);
    expect(result.shouldUpsell).toBe(false);
    expect(result.upsellMessage).toBeNull();
  });

  it("triggers alert at 90% budget", async () => {
    // 90% of 435 = 391.5 cents
    // sonnet output: 265000 tokens => (265000/1M)*15 = $3.975 = 398 cents
    // 398/435 = 91%
    setSelectResults(
      [{
        totalInput: 0, totalOutput: 265_000,
        sonnetInput: 0, sonnetOutput: 265_000,
        haikuInput: 0, haikuOutput: 0,
      }],
      [{ organizationId: "org-uuid-001" }],
      [{ plan: "base" }]
    );

    const result = await getUsage("biz-uuid-001");

    expect(result.shouldAlert).toBe(true);
  });

  it("defaults to base budget when business not found", async () => {
    setSelectResults(
      [{ totalInput: 0, totalOutput: 0, sonnetInput: 0, sonnetOutput: 0, haikuInput: 0, haikuOutput: 0 }],
      [] // no business found
    );

    const result = await getUsage("nonexistent-biz");

    expect(result.budgetCents).toBe(435);
  });

  it("always returns sonnet as the model (never degrades quality)", async () => {
    setSelectResults(
      [{
        totalInput: 10_000_000, totalOutput: 10_000_000,
        sonnetInput: 10_000_000, sonnetOutput: 10_000_000,
        haikuInput: 0, haikuOutput: 0,
      }],
      [{ organizationId: "org-uuid-001" }],
      [{ plan: "base" }]
    );

    const result = await getUsage("biz-uuid-001");

    expect(result.budgetUsedPercent).toBeGreaterThan(100);
    expect(result.model).toBe("claude-sonnet-4-20250514");
  });
});

// ─── Tests: getModel ─────────────────────────────────────────────────────────

describe("getModel", () => {
  let getModel: typeof import("@/services/usage-metering").getModel;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/services/usage-metering");
    getModel = mod.getModel;
  });

  it("returns sonnet for user-facing operations (batch=false)", async () => {
    const model = await getModel("biz-uuid-001", false);
    expect(model).toBe("claude-sonnet-4-20250514");
  });

  it("returns sonnet by default when batch is omitted", async () => {
    const model = await getModel("biz-uuid-001");
    expect(model).toBe("claude-sonnet-4-20250514");
  });

  it("returns haiku for batch/internal operations", async () => {
    const model = await getModel("biz-uuid-001", true);
    expect(model).toBe("claude-haiku-4-5-20251001");
  });
});

// ─── Tests: checkUpsell ──────────────────────────────────────────────────────

describe("checkUpsell", () => {
  let checkUpsell: typeof import("@/services/usage-metering").checkUpsell;

  beforeEach(async () => {
    vi.clearAllMocks();
    selectCallCount = 0;
    mockSelectResults.length = 0;

    const mod = await import("@/services/usage-metering");
    checkUpsell = mod.checkUpsell;
  });

  it("returns null when under threshold", async () => {
    setSelectResults(
      [{ totalInput: 0, totalOutput: 0, sonnetInput: 0, sonnetOutput: 0, haikuInput: 0, haikuOutput: 0 }],
      [{ organizationId: "org-uuid-001" }],
      [{ plan: "base" }]
    );

    const message = await checkUpsell("biz-uuid-001");
    expect(message).toBeNull();
  });

  it("returns upsell message when over threshold on base plan", async () => {
    setSelectResults(
      [{
        totalInput: 0, totalOutput: 233_333,
        sonnetInput: 0, sonnetOutput: 233_333,
        haikuInput: 0, haikuOutput: 0,
      }],
      [{ organizationId: "org-uuid-001" }],
      [{ plan: "base" }]
    );

    const message = await checkUpsell("biz-uuid-001");
    expect(message).not.toBeNull();
    expect(message).toContain("Upgrade to Pro");
  });
});
