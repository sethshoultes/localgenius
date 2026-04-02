/**
 * Tests for GET /api/digest
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  TEST_BUSINESS,
  TEST_WEEKLY_DIGEST,
} from "../mocks/db";
import { MOCK_DIGEST_NARRATIVE } from "../mocks/ai";

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

// Mock AI service
const mockGenerateDigestNarrative = vi.fn().mockResolvedValue(MOCK_DIGEST_NARRATIVE);

vi.mock("@/services/ai", () => ({
  generate: vi.fn(),
  generateSocialPost: vi.fn(),
  generateReviewResponse: vi.fn(),
  generateDigestNarrative: (...args: unknown[]) => mockGenerateDigestNarrative(...args),
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

// ─── Import route handler ───────────────────────────────────────────────────

import { GET } from "@/app/api/digest/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(params?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/digest");
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), {
    method: "GET",
    headers: { Authorization: "Bearer mock-token" },
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/digest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbCallSequence = [];
    dbCallIndex = 0;
    mockVerifyAuth.mockResolvedValue(AUTH_CONTEXT);
  });

  it("returns existing digests when generate=false (default)", async () => {
    // The handler queries digests with orderBy + limit
    pushDbResult(() => [TEST_WEEKLY_DIGEST]);

    const request = makeRequest();
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.digests).toBeDefined();
    expect(body.data.digests).toHaveLength(1);
    expect(body.data.digests[0].id).toBe(TEST_WEEKLY_DIGEST.id);
    expect(body.meta.timestamp).toBeDefined();

    // AI should NOT have been called
    expect(mockGenerateDigestNarrative).not.toHaveBeenCalled();
  });

  it("generates a new digest when generate=true", async () => {
    // DB call sequence for generate=true:
    // 1. business lookup
    // 2. review stats
    // 3. action stats
    // 4. event stats
    pushDbResult(() => [TEST_BUSINESS]); // business
    pushDbResult(() => [{ count: 5, avgRating: 4.2 }]); // review stats
    pushDbResult(() => [{ completed: 8, socialPosts: 3, reviewResponses: 5 }]); // action stats
    pushDbResult(() => [{ pageViews: 120, phoneCalls: 15, bookings: 8 }]); // event stats

    // Insert: new digest
    mockInsertReturning.mockResolvedValueOnce([{
      ...TEST_WEEKLY_DIGEST,
      id: "digest-uuid-new",
    }]);

    const request = makeRequest({ generate: "true" });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.digest).toBeDefined();
    expect(body.data.digest.narrative).toBe(MOCK_DIGEST_NARRATIVE);

    // Verify AI was called with business and metrics
    expect(mockGenerateDigestNarrative).toHaveBeenCalledOnce();
    expect(mockGenerateDigestNarrative).toHaveBeenCalledWith(
      expect.objectContaining({ name: TEST_BUSINESS.name }),
      expect.objectContaining({
        reviewsReceived: 5,
        averageRating: 4.2,
        actionsCompleted: 8,
        socialPostsPublished: 3,
        reviewsResponded: 5,
        websiteVisits: 120,
        phoneCalls: 15,
        bookings: 8,
      })
    );

    // Verify digest was inserted
    expect(mockInsert).toHaveBeenCalledOnce();
  });

  it("returns 404 when business not found during generation", async () => {
    pushDbResult(() => []); // no business

    const request = makeRequest({ generate: "true" });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("Business not found");
  });

  it("returns 401 when auth fails", async () => {
    mockVerifyAuth.mockResolvedValueOnce(
      NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Missing or invalid Authorization header" } },
        { status: 401 }
      )
    );

    const request = makeRequest();
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("handles zero metrics gracefully during generation", async () => {
    pushDbResult(() => [TEST_BUSINESS]);
    pushDbResult(() => [{ count: 0, avgRating: 0 }]);
    pushDbResult(() => [{ completed: 0, socialPosts: 0, reviewResponses: 0 }]);
    pushDbResult(() => [{ pageViews: 0, phoneCalls: 0, bookings: 0 }]);

    mockInsertReturning.mockResolvedValueOnce([TEST_WEEKLY_DIGEST]);

    const request = makeRequest({ generate: "true" });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGenerateDigestNarrative).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        reviewsReceived: 0,
        actionsCompleted: 0,
        websiteVisits: 0,
      })
    );
  });
});
