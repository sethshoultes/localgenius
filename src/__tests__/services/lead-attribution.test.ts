/**
 * Tests for src/services/lead-attribution.ts
 * recordLead, getAttributionReport, getDigestAttributionLine
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TEST_BUSINESS } from "../mocks/db";

// ─── Module mocks ────────────────────────────────────────────────────────────

let selectCallCount = 0;
const selectResults: unknown[][] = [];

let insertCallCount = 0;
const insertResults: unknown[][] = [];

function makeThenable(resultIndex: number) {
  const obj: Record<string, unknown> = {};

  // Non-terminal operations return a new chainable with same index
  obj.where = vi.fn().mockImplementation(() => makeThenable(resultIndex));
  obj.orderBy = vi.fn().mockImplementation(() => makeThenable(resultIndex));
  obj.groupBy = vi.fn().mockImplementation(() => makeThenable(resultIndex));
  obj.innerJoin = vi.fn().mockImplementation(() => makeThenable(resultIndex));
  obj.leftJoin = vi.fn().mockImplementation(() => makeThenable(resultIndex));

  // Terminal operations: limit() just returns self for chaining
  obj.limit = vi.fn().mockImplementation(() => obj);

  // Thenable: when awaited, use current counter and advance
  obj.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
    const result = selectResults[selectCallCount] || [];
    selectCallCount++;
    return Promise.resolve(result).then(resolve, reject);
  };

  return obj;
}

const mockSelectFrom = vi.fn().mockImplementation(() => {
  // Return a chainable starting at the current call count
  return makeThenable(selectCallCount);
});

const mockSelect = vi.fn().mockImplementation(() => {
  // Return an object with from method
  return { from: mockSelectFrom };
});

// Insert mock
const mockInsertReturning = vi.fn().mockImplementation(() => {
  const result = insertResults[insertCallCount] || [];
  insertCallCount++;
  return Promise.resolve(result);
});

const mockInsertValues = vi.fn().mockReturnValue({
  returning: mockInsertReturning,
});

const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}));

vi.mock("@/db/schema", () => ({
  attributionEvents: {
    id: "attributionEvents.id",
    businessId: "attributionEvents.businessId",
    organizationId: "attributionEvents.organizationId",
    actionId: "attributionEvents.actionId",
    eventType: "attributionEvents.eventType",
    confidence: "attributionEvents.confidence",
    valueCents: "attributionEvents.valueCents",
    metadata: "attributionEvents.metadata",
    occurredAt: "attributionEvents.occurredAt",
  },
  analyticsEvents: {
    id: "analyticsEvents.id",
    businessId: "analyticsEvents.businessId",
    organizationId: "analyticsEvents.organizationId",
    eventType: "analyticsEvents.eventType",
    source: "analyticsEvents.source",
    metadata: "analyticsEvents.metadata",
    occurredAt: "analyticsEvents.occurredAt",
  },
  actions: {
    id: "actions.id",
    businessId: "actions.businessId",
    actionType: "actions.actionType",
    status: "actions.status",
    executedAt: "actions.executedAt",
  },
  businesses: {
    id: "businesses.id",
    vertical: "businesses.vertical",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ op: "eq", args })),
  and: vi.fn((...args: unknown[]) => ({ op: "and", args })),
  gte: vi.fn((...args: unknown[]) => ({ op: "gte", args })),
  desc: vi.fn((...args: unknown[]) => ({ op: "desc", args })),
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({
      op: "sql",
      strings: Array.from(strings),
      values,
    }),
    { raw: (s: string) => s }
  ),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function setSelectResults(...results: unknown[][]) {
  selectCallCount = 0;
  selectResults.length = 0;
  results.forEach((r) => selectResults.push(r));
}

function setInsertResults(...results: unknown[][]) {
  insertCallCount = 0;
  insertResults.length = 0;
  results.forEach((r) => insertResults.push(r));
}

function resetAllCounters() {
  selectCallCount = 0;
  selectResults.length = 0;
  insertCallCount = 0;
  insertResults.length = 0;
}

// ─── Tests: recordLead ──────────────────────────────────────────────────────

describe("lead-attribution — recordLead()", () => {
  let recordLead: typeof import("@/services/lead-attribution").recordLead;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetAllCounters();

    const EVENT_RESULT = {
      id: "event-uuid-001",
      businessId: TEST_BUSINESS.id,
      organizationId: TEST_BUSINESS.organizationId,
      eventType: "phone_call",
      source: "google_business",
      metadata: {},
      occurredAt: new Date(),
    };

    const ACTION_RESULT = {
      id: "action-uuid-001",
      businessId: TEST_BUSINESS.id,
      actionType: "gbp_update",
      executedAt: new Date(Date.now() - 1000000),
    };

    setSelectResults(
      [{ vertical: TEST_BUSINESS.vertical }],
      [ACTION_RESULT],
    );

    setInsertResults(
      [EVENT_RESULT],
      [],
    );

    const mod = await import("@/services/lead-attribution");
    recordLead = mod.recordLead;
  });

  it("records a lead event with phone call source", async () => {
    const result = await recordLead(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      "phone_call",
      "google_business"
    );

    expect(result.eventId).toBe("event-uuid-001");
    expect(result.valueCents).toBeGreaterThan(0);
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it("estimates value based on business vertical and event type", async () => {
    const result = await recordLead(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      "phone_call",
      "google_business"
    );

    expect(result.valueCents).toBe(2500);
  });

  it("attributes lead to matching recent action", async () => {
    const result = await recordLead(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      "phone_call",
      "google_business"
    );

    expect(result.attributedTo).toBe("action-uuid-001");
  });

  it("applies correlated confidence for platform attribution", async () => {
    await recordLead(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      "phone_call",
      "google_business"
    );

    const attributionInsertCall = mockInsertValues.mock.calls[1][0];
    expect(attributionInsertCall.confidence).toBe("correlated");
  });
});

// ─── Tests: getAttributionReport ────────────────────────────────────────────

describe("lead-attribution — getAttributionReport()", () => {
  let getAttributionReport: typeof import("@/services/lead-attribution").getAttributionReport;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetAllCounters();

    const mod = await import("@/services/lead-attribution");
    getAttributionReport = mod.getAttributionReport;
  });

  it("returns lead counts and value for 30-day period", async () => {
    const thisMonthLeads = [
      {
        eventType: "phone_call",
        confidence: "direct",
        count: 12,
        totalValue: 30000,
      },
      {
        eventType: "booking",
        confidence: "correlated",
        count: 5,
        totalValue: 25000,
      },
    ];

    setSelectResults(
      thisMonthLeads,
      [{ count: 8 }],
      thisMonthLeads,
      [],
    );

    const report = await getAttributionReport(TEST_BUSINESS.id, 30);

    expect(report.period).toBe("30 days");
    expect(report.totalLeads).toBe(17);
    expect(report.totalEstimatedValueCents).toBe(55000);
  });

  it("generates headline with lead types", async () => {
    const thisMonthLeads = [
      {
        eventType: "phone_call",
        confidence: "direct",
        count: 12,
        totalValue: 30000,
      },
      {
        eventType: "booking",
        confidence: "correlated",
        count: 3,
        totalValue: 15000,
      },
    ];

    setSelectResults(
      thisMonthLeads,
      [{ count: 0 }],
      thisMonthLeads,
      [],
    );

    const report = await getAttributionReport(TEST_BUSINESS.id);

    expect(report.headline).toContain("LocalGenius generated");
    expect(report.headline).toContain("call");
    expect(report.headline).toContain("booking");
  });

  it("returns default headline when no leads", async () => {
    setSelectResults(
      [],
      [{ count: 0 }],
      [],
      [],
    );

    const report = await getAttributionReport(TEST_BUSINESS.id);

    expect(report.headline).toContain("Tracking your leads");
    expect(report.totalLeads).toBe(0);
  });

  it("computes trend vs last month", async () => {
    const thisMonthLeads = [
      {
        eventType: "phone_call",
        confidence: "direct",
        count: 12,
        totalValue: 30000,
      },
    ];

    setSelectResults(
      thisMonthLeads,
      [{ count: 10 }],
      thisMonthLeads,
      [],
    );

    const report = await getAttributionReport(TEST_BUSINESS.id);

    expect(report.trend.thisMonth).toBe(12);
    expect(report.trend.lastMonth).toBe(10);
    expect(report.trend.changePercent).toBe(20);
  });
});

// ─── Tests: getDigestAttributionLine ────────────────────────────────────────

describe("lead-attribution — getDigestAttributionLine()", () => {
  let getDigestAttributionLine: typeof import("@/services/lead-attribution").getDigestAttributionLine;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetAllCounters();

    const mod = await import("@/services/lead-attribution");
    getDigestAttributionLine = mod.getDigestAttributionLine;
  });

  it("returns tracking message when no leads", async () => {
    setSelectResults(
      [],
      [{ count: 0 }],
      [],
      [],
    );

    const line = await getDigestAttributionLine(TEST_BUSINESS.id);

    expect(line).toContain("tracking your leads");
  });

  it("includes headline and estimated value", async () => {
    const thisMonthLeads = [
      {
        eventType: "phone_call",
        confidence: "direct",
        count: 12,
        totalValue: 30000,
      },
    ];

    setSelectResults(
      thisMonthLeads,
      [{ count: 10 }],
      thisMonthLeads,
      [],
    );

    const line = await getDigestAttributionLine(TEST_BUSINESS.id);

    expect(line).toContain("LocalGenius generated");
    expect(line).toContain("$300");
  });

  it("includes trend emoji and percentage", async () => {
    const thisMonthLeads = [
      {
        eventType: "phone_call",
        confidence: "direct",
        count: 12,
        totalValue: 30000,
      },
    ];

    setSelectResults(
      thisMonthLeads,
      [{ count: 10 }],
      thisMonthLeads,
      [],
    );

    const line = await getDigestAttributionLine(TEST_BUSINESS.id);

    expect(line).toMatch(/📈|📉|➡️/);
    expect(line).toMatch(/\+?20%/);
  });
});

// ─── Integration tests ──────────────────────────────────────────────────────

describe("lead-attribution — integration", () => {
  let recordLead: typeof import("@/services/lead-attribution").recordLead;
  let getAttributionReport: typeof import("@/services/lead-attribution").getAttributionReport;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetAllCounters();

    const mod = await import("@/services/lead-attribution");
    recordLead = mod.recordLead;
    getAttributionReport = mod.getAttributionReport;
  });

  it("estimates value across different verticals", async () => {
    setSelectResults([{ vertical: "restaurant" }], []);
    setInsertResults([{ id: "e1" }], []);

    const restaurant = await recordLead(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      "phone_call",
      "google_business"
    );

    resetAllCounters();
    setSelectResults([{ vertical: "dental" }], []);
    setInsertResults([{ id: "e2" }], []);

    const dental = await recordLead(
      "dental-biz",
      TEST_BUSINESS.organizationId,
      "phone_call",
      "google_business"
    );

    expect(dental.valueCents).toBeGreaterThan(restaurant.valueCents);
  });

  it("Kevin-the-Plumber: attributes calls to GBP optimization", async () => {
    const actionResult = {
      id: "action-1",
      businessId: TEST_BUSINESS.id,
      actionType: "gbp_update",
      executedAt: new Date(),
    };

    setSelectResults(
      [{ vertical: TEST_BUSINESS.vertical }],
      [actionResult],
    );
    setInsertResults([{ id: "event-1" }], []);

    const lead = await recordLead(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      "phone_call",
      "google_business"
    );

    expect(lead.valueCents).toBe(2500);
    expect(lead.attributedTo).toBe("action-1");

    resetAllCounters();
    const thisMonthLeads = [
      {
        eventType: "phone_call",
        confidence: "direct",
        count: 12,
        totalValue: 30000,
      },
    ];

    setSelectResults(
      thisMonthLeads,
      [{ count: 0 }],
      thisMonthLeads,
      [
        {
          actionId: "action-1",
          actionType: "gbp_update",
          count: 12,
          totalValue: 30000,
        },
      ],
    );

    const report = await getAttributionReport(TEST_BUSINESS.id);

    expect(report.headline).toContain("12 calls");
    expect(report.byAction[0].leadsGenerated).toBe(12);
  });
});
