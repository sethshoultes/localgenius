/**
 * Tests for POST /api/analytics (record event) and GET /api/analytics (aggregated)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  TEST_ANALYTICS_EVENT,
  TEST_BUSINESS,
} from "../mocks/db";

// ─── Module mocks ────────────────────────────────────────────────────────────

const AUTH_CONTEXT = {
  userId: "user-uuid-001",
  organizationId: "org-uuid-001",
  businessId: "biz-uuid-001",
  plan: "base" as const,
};

const mockVerifyAuth = vi.fn().mockResolvedValue(AUTH_CONTEXT);

vi.mock("@/api/middleware/auth", () => ({
  verifyAuth: (...args: unknown[]) => mockVerifyAuth(...args),
}));

vi.mock("@/services/ai", () => ({
  generate: vi.fn(),
  generateSocialPost: vi.fn(),
  generateReviewResponse: vi.fn(),
  generateDigestNarrative: vi.fn(),
}));

// Mock DB
let dbCallSequence: Array<() => unknown> = [];
let dbCallIndex = 0;

function pushDbResult(fn: () => unknown) {
  dbCallSequence.push(fn);
}

function nextDbResult() {
  const fn = dbCallSequence[dbCallIndex];
  dbCallIndex++;
  return fn ? fn() : [];
}

function createThenableChain() {
  const chainMethods: Record<string, unknown> = {};

  chainMethods.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
    return Promise.resolve(nextDbResult()).then(resolve, reject);
  };

  const methods = ["where", "orderBy", "limit", "groupBy", "having"];
  for (const method of methods) {
    chainMethods[method] = vi.fn().mockReturnValue(chainMethods);
  }

  return chainMethods;
}

const selectThenableChain = createThenableChain();
const mockSelectFrom = vi.fn().mockReturnValue(selectThenableChain);
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

vi.mock("@/lib/db", () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    select: (...args: unknown[]) => mockSelect(...args),
    update: vi.fn(),
  },
  getDb: vi.fn(),
}));

// ─── Import route handlers ──────────────────────────────────────────────────

import { POST, GET } from "@/app/api/analytics/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/analytics", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer mock-token",
    },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(params?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/analytics");
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), {
    method: "GET",
    headers: { Authorization: "Bearer mock-token" },
  });
}

// ─── Tests: POST /api/analytics ─────────────────────────────────────────────

describe("POST /api/analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbCallSequence = [];
    dbCallIndex = 0;
    mockVerifyAuth.mockResolvedValue(AUTH_CONTEXT);
  });

  it("records an analytics event successfully", async () => {
    mockInsertReturning.mockResolvedValueOnce([TEST_ANALYTICS_EVENT]);

    const request = makePostRequest({
      eventType: "page_view",
      source: "google_analytics",
      metadata: { page: "/home" },
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.event).toBeDefined();
    expect(body.data.event.id).toBe(TEST_ANALYTICS_EVENT.id);
    expect(body.data.event.eventType).toBe("page_view");
    expect(body.meta.timestamp).toBeDefined();

    // Verify insert was called
    expect(mockInsert).toHaveBeenCalledOnce();
  });

  it("records event with custom occurredAt timestamp", async () => {
    const customTime = "2025-06-15T10:30:00.000Z";
    mockInsertReturning.mockResolvedValueOnce([{
      ...TEST_ANALYTICS_EVENT,
      occurredAt: new Date(customTime),
    }]);

    const request = makePostRequest({
      eventType: "booking",
      source: "website",
      occurredAt: customTime,
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledOnce();
  });

  it("returns 400 for missing eventType", async () => {
    const request = makePostRequest({ source: "google" });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for missing source", async () => {
    const request = makePostRequest({ eventType: "page_view" });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid occurredAt format", async () => {
    const request = makePostRequest({
      eventType: "page_view",
      source: "google",
      occurredAt: "not-a-date",
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 401 when auth fails", async () => {
    mockVerifyAuth.mockResolvedValueOnce(
      NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Missing or invalid Authorization header" } },
        { status: 401 }
      )
    );

    const request = makePostRequest({ eventType: "page_view", source: "google" });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 500 when database insert fails", async () => {
    mockInsertReturning.mockRejectedValueOnce(new Error("DB error"));

    const request = makePostRequest({ eventType: "page_view", source: "google" });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });
});

// ─── Tests: GET /api/analytics ──────────────────────────────────────────────

describe("GET /api/analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbCallSequence = [];
    dbCallIndex = 0;
    mockVerifyAuth.mockResolvedValue(AUTH_CONTEXT);
  });

  it("returns aggregated analytics for weekly period (default)", async () => {
    // DB calls: event aggregation, attribution aggregation, business lookup
    pushDbResult(() => [{
      pageViews: 150,
      phoneCalls: 20,
      bookings: 10,
      reviewsReceived: 5,
      socialEngagement: 30,
    }]);
    pushDbResult(() => [{
      directCount: 8,
      correlatedCount: 12,
      totalValue: 50000,
    }]);
    pushDbResult(() => [TEST_BUSINESS]); // business lookup

    const request = makeGetRequest();
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.period).toBe("weekly");
    expect(body.data.metrics).toBeDefined();
    expect(body.data.metrics.websiteVisits).toBe(150);
    expect(body.data.metrics.phoneCalls).toBe(20);
    expect(body.data.metrics.bookings).toBe(10);
    expect(body.data.metrics.reviewsReceived).toBe(5);
    expect(body.data.metrics.socialEngagement).toBe(30);

    expect(body.data.attribution).toBeDefined();
    expect(body.data.attribution.directActions).toBe(8);
    expect(body.data.attribution.correlatedOutcomes).toBe(12);
    expect(body.data.attribution.estimatedValueCents).toBe(50000);
  });

  it("supports monthly period parameter", async () => {
    pushDbResult(() => [{ pageViews: 500, phoneCalls: 80, bookings: 40, reviewsReceived: 20, socialEngagement: 100 }]);
    pushDbResult(() => [{ directCount: 30, correlatedCount: 50, totalValue: 200000 }]);
    pushDbResult(() => [TEST_BUSINESS]);

    const request = makeGetRequest({ period: "monthly" });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.period).toBe("monthly");
    expect(body.data.metrics.websiteVisits).toBe(500);
  });

  it("returns null benchmarks when none are available", async () => {
    pushDbResult(() => [{ pageViews: 0, phoneCalls: 0, bookings: 0, reviewsReceived: 0, socialEngagement: 0 }]);
    pushDbResult(() => [{ directCount: 0, correlatedCount: 0, totalValue: 0 }]);
    pushDbResult(() => [TEST_BUSINESS]);
    // Benchmark query returns empty
    pushDbResult(() => []);

    const request = makeGetRequest();
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    // benchmarks should be null when no rows returned
    expect(body.data.benchmarks).toBeNull();
  });

  it("returns 401 when auth fails", async () => {
    mockVerifyAuth.mockResolvedValueOnce(
      NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Missing or invalid Authorization header" } },
        { status: 401 }
      )
    );

    const request = makeGetRequest();
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("handles zero metrics gracefully", async () => {
    pushDbResult(() => [{ pageViews: 0, phoneCalls: 0, bookings: 0, reviewsReceived: 0, socialEngagement: 0 }]);
    pushDbResult(() => [{ directCount: 0, correlatedCount: 0, totalValue: 0 }]);
    pushDbResult(() => [TEST_BUSINESS]);

    const request = makeGetRequest();
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.metrics.websiteVisits).toBe(0);
    expect(body.data.attribution.estimatedValueCents).toBe(0);
  });
});
