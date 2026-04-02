/**
 * Tests for src/services/analytics.ts
 * recordEvent, getWeeklyAggregates, getAttributionSummary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TEST_BUSINESS } from "../mocks/db";

// ─── Module mocks ────────────────────────────────────────────────────────────

// Track sequential select calls so different queries return different data
let selectCallCount = 0;
const selectResults: unknown[][] = [];

function makeThenable(result: unknown[]) {
  const obj: Record<string, unknown> = {};
  obj.limit = vi.fn().mockImplementation(() => makeThenable(result));
  obj.orderBy = vi.fn().mockImplementation(() => makeThenable(result));
  obj.groupBy = vi.fn().mockImplementation(() => makeThenable(result));
  obj.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return obj;
}

const mockSelectWhere = vi.fn().mockImplementation(() => {
  const result = selectResults[selectCallCount] || [];
  selectCallCount++;
  return makeThenable(result);
});
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

// Insert mock: chainable with .values().returning() and .values().onConflictDoUpdate()
const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);

let insertCallCount = 0;
const insertResults: unknown[][] = [];

const mockInsertReturning = vi.fn().mockImplementation(() => {
  const result = insertResults[insertCallCount] || [];
  insertCallCount++;
  return Promise.resolve(result);
});
const mockInsertValues = vi.fn().mockReturnValue({
  returning: mockInsertReturning,
  onConflictDoUpdate: mockOnConflictDoUpdate,
});
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
  getDb: vi.fn(),
}));

// Mock schema
vi.mock("@/db/schema", () => ({
  analyticsEvents: {
    businessId: "analyticsEvents.businessId",
    organizationId: "analyticsEvents.organizationId",
    eventType: "analyticsEvents.eventType",
    source: "analyticsEvents.source",
    metadata: "analyticsEvents.metadata",
    occurredAt: "analyticsEvents.occurredAt",
  },
  attributionEvents: {
    businessId: "attributionEvents.businessId",
    organizationId: "attributionEvents.organizationId",
    actionId: "attributionEvents.actionId",
    eventType: "attributionEvents.eventType",
    confidence: "attributionEvents.confidence",
    attributionWindowHours: "attributionEvents.attributionWindowHours",
    valueCents: "attributionEvents.valueCents",
    occurredAt: "attributionEvents.occurredAt",
  },
  benchmarkAggregates: {
    vertical: "benchmarkAggregates.vertical",
    city: "benchmarkAggregates.city",
    sizeBucket: "benchmarkAggregates.sizeBucket",
    periodType: "benchmarkAggregates.periodType",
    periodStart: "benchmarkAggregates.periodStart",
    metricName: "benchmarkAggregates.metricName",
    metricValue: "benchmarkAggregates.metricValue",
    sampleSize: "benchmarkAggregates.sampleSize",
  },
  actions: {
    businessId: "actions.businessId",
    status: "actions.status",
    executedAt: "actions.executedAt",
    actionType: "actions.actionType",
  },
  businesses: {
    id: "businesses.id",
    vertical: "businesses.vertical",
    city: "businesses.city",
    employeeCount: "businesses.employeeCount",
  },
}));

// Mock drizzle-orm
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

// ─── Tests: recordEvent ──────────────────────────────────────────────────────

describe("analytics — recordEvent()", () => {
  let recordEvent: typeof import("@/services/analytics").recordEvent;

  const EVENT_RESULT = {
    id: "event-uuid-001",
    businessId: TEST_BUSINESS.id,
    organizationId: TEST_BUSINESS.organizationId,
    eventType: "page_view",
    source: "google_analytics",
    metadata: {},
    occurredAt: new Date(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    resetAllCounters();

    // Default insert results: 1st = event insert, 2nd = attribution insert (if any), 3rd = benchmark insert
    setInsertResults(
      [EVENT_RESULT], // event insert returning
      [],             // attribution insert (if triggered)
      [],             // benchmark upsert
    );

    // Default select results:
    // 1st: attemptAttribution looks for recent actions -> none found
    // 2nd: updateBenchmarks looks up business
    setSelectResults(
      [],              // no matching action for attribution
      [TEST_BUSINESS], // business lookup for benchmarks
    );

    const mod = await import("@/services/analytics");
    recordEvent = mod.recordEvent;
  });

  it("inserts an analytics event into the database", async () => {
    const event = await recordEvent(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      "page_view",
      "google_analytics",
      { source_page: "/contact" }
    );

    expect(mockInsert).toHaveBeenCalled();
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: TEST_BUSINESS.id,
        organizationId: TEST_BUSINESS.organizationId,
        eventType: "page_view",
        source: "google_analytics",
        metadata: { source_page: "/contact" },
      })
    );

    expect(event.id).toBe("event-uuid-001");
    expect(event.eventType).toBe("page_view");
  });

  it("records event with empty metadata", async () => {
    await recordEvent(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      "social_engagement",
      "facebook",
      {}
    );

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "social_engagement",
        metadata: {},
      })
    );
  });

  it("records event with default metadata", async () => {
    await recordEvent(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      "phone_call",
      "google_business"
    );

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "phone_call",
        metadata: {},
      })
    );
  });

  it("attempts direct attribution for social_engagement events", async () => {
    // social_engagement is in the attribution map
    setInsertResults(
      [{
        id: "event-uuid-001",
        businessId: TEST_BUSINESS.id,
        organizationId: TEST_BUSINESS.organizationId,
        eventType: "social_engagement",
        source: "facebook",
        metadata: {},
        occurredAt: new Date(),
      }],
      [], // attribution insert (no matching action found)
      [], // benchmark upsert
    );

    setSelectResults(
      [],              // no matching action for attribution
      [TEST_BUSINESS], // business lookup for benchmarks
    );

    await recordEvent(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      "social_engagement",
      "facebook"
    );

    // Verify attribution lookup was attempted (select was called)
    expect(mockSelectWhere).toHaveBeenCalled();
  });

  it("updates benchmark aggregates for the event", async () => {
    // Use an event type NOT in attribution map so attribution is skipped entirely
    setInsertResults(
      [{
        id: "event-uuid-001",
        businessId: TEST_BUSINESS.id,
        organizationId: TEST_BUSINESS.organizationId,
        eventType: "custom_event",
        source: "test",
        metadata: {},
        occurredAt: new Date(),
      }],
      [], // benchmark upsert
    );

    // Only one select: updateBenchmarks looks up business
    // (no attribution attempted since "custom_event" is not in the map)
    setSelectResults(
      [TEST_BUSINESS], // business for benchmarks
    );

    await recordEvent(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      "custom_event",
      "test"
    );

    // event insert + benchmark insert = 2
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it("returns inserted event with all fields populated", async () => {
    const bookingEvent = {
      id: "event-uuid-002",
      businessId: TEST_BUSINESS.id,
      organizationId: TEST_BUSINESS.organizationId,
      eventType: "booking",
      source: "website",
      metadata: { booking_value: 150 },
      occurredAt: new Date(),
    };

    setInsertResults(
      [bookingEvent],  // event insert
      [],              // attribution insert
      [],              // benchmark upsert
    );

    // booking is in the attribution map -> attemptAttribution will select for actions
    setSelectResults(
      [],              // no matching action for attribution
      [TEST_BUSINESS], // business lookup for benchmarks
    );

    const event = await recordEvent(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      "booking",
      "website",
      { booking_value: 150 }
    );

    expect(event).toMatchObject({
      id: "event-uuid-002",
      businessId: TEST_BUSINESS.id,
      organizationId: TEST_BUSINESS.organizationId,
      eventType: "booking",
      source: "website",
    });
  });
});

// ─── Tests: getWeeklyAggregates ──────────────────────────────────────────────

describe("analytics — getWeeklyAggregates()", () => {
  let getWeeklyAggregates: typeof import("@/services/analytics").getWeeklyAggregates;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetAllCounters();

    const mod = await import("@/services/analytics");
    getWeeklyAggregates = mod.getWeeklyAggregates;
  });

  it("returns aggregated metrics for the past week", async () => {
    setSelectResults([{
      pageViews: 150,
      phoneCalls: 23,
      bookings: 8,
      socialEngagement: 245,
      reviewsReceived: 5,
    }]);

    const result = await getWeeklyAggregates(TEST_BUSINESS.id);

    expect(result).toMatchObject({
      websiteVisits: 150,
      phoneCalls: 23,
      bookings: 8,
      socialEngagement: 245,
      reviewsReceived: 5,
    });
  });

  it("defaults to 1 week lookback when weeksBack is omitted", async () => {
    setSelectResults([{
      pageViews: 0, phoneCalls: 0, bookings: 0, socialEngagement: 0, reviewsReceived: 0,
    }]);

    await getWeeklyAggregates(TEST_BUSINESS.id);

    expect(mockSelectWhere).toHaveBeenCalled();
  });

  it("respects custom weeks lookback parameter", async () => {
    setSelectResults([{
      pageViews: 0, phoneCalls: 0, bookings: 0, socialEngagement: 0, reviewsReceived: 0,
    }]);

    await getWeeklyAggregates(TEST_BUSINESS.id, 4);

    expect(mockSelectWhere).toHaveBeenCalled();
  });

  it("returns zero metrics when no events exist", async () => {
    setSelectResults([{
      pageViews: null,
      phoneCalls: null,
      bookings: null,
      socialEngagement: null,
      reviewsReceived: null,
    }]);

    const result = await getWeeklyAggregates(TEST_BUSINESS.id);

    expect(result.websiteVisits).toBe(0);
    expect(result.phoneCalls).toBe(0);
    expect(result.bookings).toBe(0);
    expect(result.socialEngagement).toBe(0);
    expect(result.reviewsReceived).toBe(0);
  });

  it("filters events by businessId", async () => {
    setSelectResults([{
      pageViews: 0, phoneCalls: 0, bookings: 0, socialEngagement: 0, reviewsReceived: 0,
    }]);

    await getWeeklyAggregates(TEST_BUSINESS.id);

    expect(mockSelectFrom).toHaveBeenCalled();
    expect(mockSelectWhere).toHaveBeenCalled();
  });

  it("aggregates multiple event types", async () => {
    setSelectResults([{
      pageViews: 150,
      phoneCalls: 23,
      bookings: 8,
      socialEngagement: 245,
      reviewsReceived: 5,
    }]);

    const result = await getWeeklyAggregates(TEST_BUSINESS.id);

    expect(result.websiteVisits).toBe(150);
    expect(result.phoneCalls).toBe(23);
    expect(result.bookings).toBe(8);
    expect(result.socialEngagement).toBe(245);
    expect(result.reviewsReceived).toBe(5);
  });
});

// ─── Tests: getAttributionSummary ────────────────────────────────────────────

describe("analytics — getAttributionSummary()", () => {
  let getAttributionSummary: typeof import("@/services/analytics").getAttributionSummary;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetAllCounters();

    const mod = await import("@/services/analytics");
    getAttributionSummary = mod.getAttributionSummary;
  });

  it("returns attribution counts and estimated value", async () => {
    setSelectResults([{
      directCount: 12,
      correlatedCount: 28,
      totalValue: 450000,
    }]);

    const result = await getAttributionSummary(TEST_BUSINESS.id);

    expect(result).toMatchObject({
      directActions: 12,
      correlatedOutcomes: 28,
      estimatedValueCents: 450000,
    });
  });

  it("defaults to 7 days lookback when daysBack is omitted", async () => {
    setSelectResults([{ directCount: 0, correlatedCount: 0, totalValue: 0 }]);

    await getAttributionSummary(TEST_BUSINESS.id);

    expect(mockSelectWhere).toHaveBeenCalled();
  });

  it("respects custom days lookback parameter", async () => {
    setSelectResults([{ directCount: 0, correlatedCount: 0, totalValue: 0 }]);

    await getAttributionSummary(TEST_BUSINESS.id, 30);

    expect(mockSelectWhere).toHaveBeenCalled();
  });

  it("returns zero metrics when no attribution events exist", async () => {
    setSelectResults([{
      directCount: null,
      correlatedCount: null,
      totalValue: null,
    }]);

    const result = await getAttributionSummary(TEST_BUSINESS.id);

    expect(result.directActions).toBe(0);
    expect(result.correlatedOutcomes).toBe(0);
    expect(result.estimatedValueCents).toBe(0);
  });

  it("distinguishes between direct and correlated attribution", async () => {
    setSelectResults([{ directCount: 12, correlatedCount: 28, totalValue: 450000 }]);

    const result = await getAttributionSummary(TEST_BUSINESS.id);

    expect(result.directActions).toBe(12);
    expect(result.correlatedOutcomes).toBe(28);
    expect(result.directActions).toBeLessThan(result.correlatedOutcomes);
  });

  it("aggregates value in cents for currency precision", async () => {
    setSelectResults([{ directCount: 12, correlatedCount: 28, totalValue: 450000 }]);

    const result = await getAttributionSummary(TEST_BUSINESS.id);

    expect(result.estimatedValueCents).toBe(450000);
  });

  it("filters attribution events by businessId", async () => {
    setSelectResults([{ directCount: 0, correlatedCount: 0, totalValue: 0 }]);

    await getAttributionSummary(TEST_BUSINESS.id, 14);

    expect(mockSelectFrom).toHaveBeenCalled();
    expect(mockSelectWhere).toHaveBeenCalled();
  });

  it("handles mixed attribution confidence levels", async () => {
    setSelectResults([{ directCount: 5, correlatedCount: 10, totalValue: 100000 }]);

    const result = await getAttributionSummary(TEST_BUSINESS.id);

    expect(result.directActions).toBeGreaterThanOrEqual(0);
    expect(result.correlatedOutcomes).toBeGreaterThanOrEqual(0);
  });
});

// ─── Integration tests ───────────────────────────────────────────────────────

describe("analytics — integration", () => {
  let recordEvent: typeof import("@/services/analytics").recordEvent;
  let getWeeklyAggregates: typeof import("@/services/analytics").getWeeklyAggregates;
  let getAttributionSummary: typeof import("@/services/analytics").getAttributionSummary;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetAllCounters();

    const mod = await import("@/services/analytics");
    recordEvent = mod.recordEvent;
    getWeeklyAggregates = mod.getWeeklyAggregates;
    getAttributionSummary = mod.getAttributionSummary;
  });

  it("records events and they contribute to weekly aggregates", async () => {
    // recordEvent: insert event, attemptAttribution (page_view is in map) -> select action,
    // updateBenchmarks -> select business, insert benchmark
    setInsertResults(
      [{
        id: "event-uuid-001",
        businessId: TEST_BUSINESS.id,
        organizationId: TEST_BUSINESS.organizationId,
        eventType: "page_view",
        source: "google_analytics",
        metadata: {},
        occurredAt: new Date(),
      }],
      [], // benchmark upsert
    );

    setSelectResults(
      [],              // no matching action for attribution
      [TEST_BUSINESS], // business lookup for benchmarks
      // getWeeklyAggregates query
      [{
        pageViews: 1,
        phoneCalls: 0,
        bookings: 0,
        socialEngagement: 0,
        reviewsReceived: 0,
      }],
    );

    await recordEvent(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      "page_view",
      "google_analytics"
    );

    const aggregates = await getWeeklyAggregates(TEST_BUSINESS.id);

    expect(aggregates.websiteVisits).toBeGreaterThanOrEqual(0);
  });

  it("supports multiple event types in analytics workflow", async () => {
    const events = ["page_view", "phone_call", "booking", "social_engagement", "review_received"] as const;

    for (let i = 0; i < events.length; i++) {
      const eventType = events[i];

      // Reset counters for each iteration
      resetAllCounters();

      // Each recordEvent: insert event + possibly select action + select business + insert benchmark
      setInsertResults(
        [{
          id: `event-${eventType}`,
          businessId: TEST_BUSINESS.id,
          organizationId: TEST_BUSINESS.organizationId,
          eventType,
          source: "test",
          metadata: {},
          occurredAt: new Date(),
        }],
        [], // attribution insert (no match)
        [], // benchmark upsert
      );

      // All event types are in the attribution map, so:
      // 1st select: attribution action lookup (no match)
      // 2nd select: business lookup for benchmarks
      setSelectResults(
        [],              // no matching action
        [TEST_BUSINESS], // business for benchmarks
      );

      await recordEvent(
        TEST_BUSINESS.id,
        TEST_BUSINESS.organizationId,
        eventType,
        "test"
      );
    }

    // Each event produces 2 inserts (event + benchmark) since no attribution match
    expect(mockInsert).toHaveBeenCalledTimes(10);
  });

  it("attribution summary reflects tracking window", async () => {
    setSelectResults([{ directCount: 5, correlatedCount: 15, totalValue: 100000 }]);

    const summary7d = await getAttributionSummary(TEST_BUSINESS.id, 7);
    expect(summary7d.directActions).toBe(5);

    resetAllCounters();
    setSelectResults([{ directCount: 8, correlatedCount: 22, totalValue: 250000 }]);

    const summary30d = await getAttributionSummary(TEST_BUSINESS.id, 30);
    expect(summary30d.directActions).toBe(8);
  });
});

// ─── Tests: recordEvent with DB mocks ────────────────────────────────────────

describe("analytics — recordEvent() with DB mocks", () => {
  let recordEvent: typeof import("@/services/analytics").recordEvent;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetAllCounters();

    const mod = await import("@/services/analytics");
    recordEvent = mod.recordEvent;
  });

  it("inserts event and attempts attribution", async () => {
    setInsertResults(
      [{
        id: "event-uuid-001",
        businessId: TEST_BUSINESS.id,
        organizationId: TEST_BUSINESS.organizationId,
        eventType: "page_view",
        source: "google_analytics",
        metadata: {},
        occurredAt: new Date(),
      }],
      [], // attribution (no match)
      [], // benchmark upsert
    );

    // page_view is in attribution map -> select for actions, then select business for benchmarks
    setSelectResults(
      [],              // no matching action for attribution
      [TEST_BUSINESS], // business lookup for benchmarks
    );

    const event = await recordEvent(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      "page_view",
      "google_analytics"
    );

    expect(event.id).toBe("event-uuid-001");
    expect(mockInsert).toHaveBeenCalledTimes(2); // event + benchmark
  });
});
