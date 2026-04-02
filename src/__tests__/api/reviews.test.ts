/**
 * Tests for GET /api/reviews and POST /api/reviews/[id]/respond
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  TEST_REVIEW,
  TEST_REVIEW_RESPONSE,
  TEST_BUSINESS,
  TEST_ACTION,
} from "../mocks/db";
import { MOCK_REVIEW_RESPONSE } from "../mocks/ai";

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
const mockGenerateReviewResponse = vi.fn().mockResolvedValue(MOCK_REVIEW_RESPONSE);

vi.mock("@/services/ai", () => ({
  generate: vi.fn(),
  generateSocialPost: vi.fn(),
  generateReviewResponse: (...args: unknown[]) => mockGenerateReviewResponse(...args),
  generateDigestNarrative: vi.fn(),
}));

// Mock DB — more granular control
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

// Thenable chain
function createThenableChain() {
  const chainMethods: Record<string, unknown> = {};

  // Make chain thenable
  chainMethods.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
    try {
      return Promise.resolve(nextDbResult()).then(resolve, reject);
    } catch (e) {
      return reject ? Promise.reject(e).catch(reject) : Promise.reject(e);
    }
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
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
  },
  getDb: vi.fn(),
}));

// ─── Import route handlers ──────────────────────────────────────────────────

import { GET as getReviews } from "@/app/api/reviews/route";
import { POST as respondToReview } from "@/app/api/reviews/[id]/respond/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeGetRequest(params?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/reviews");
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), {
    method: "GET",
    headers: { Authorization: "Bearer mock-token" },
  });
}

function makeRespondRequest(reviewId: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost:3000/api/reviews/${reviewId}/respond`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer mock-token",
    },
    body: JSON.stringify(body),
  });
}

// ─── Tests: GET /api/reviews ─────────────────────────────────────────────────

describe("GET /api/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbCallSequence = [];
    dbCallIndex = 0;
    mockVerifyAuth.mockResolvedValue(AUTH_CONTEXT);
  });

  it("returns reviews list with summary and sentiment breakdown", async () => {
    // 3 db calls: reviews list, summary aggregation, review responses
    pushDbResult(() => [TEST_REVIEW]); // reviews list
    pushDbResult(() => [{ total: 1, avgRating: 4.0, positive: 1, neutral: 0, negative: 0 }]); // summary
    pushDbResult(() => []); // review responses (none)

    const request = makeGetRequest();
    const response = await getReviews(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.reviews).toBeDefined();
    expect(body.data.reviews).toHaveLength(1);
    expect(body.data.reviews[0].id).toBe(TEST_REVIEW.id);
    expect(body.data.reviews[0].hasResponse).toBe(false);

    expect(body.data.summary).toBeDefined();
    expect(body.data.summary.total).toBe(1);
    expect(body.data.summary.averageRating).toBe(4.0);
    expect(body.data.summary.pendingResponses).toBe(1);
    expect(body.data.summary.sentimentBreakdown.positive).toBe(1);
    expect(body.data.summary.sentimentBreakdown.negative).toBe(0);
  });

  it("marks reviews that have responses", async () => {
    pushDbResult(() => [TEST_REVIEW]);
    pushDbResult(() => [{ total: 1, avgRating: 4.0, positive: 1, neutral: 0, negative: 0 }]);
    pushDbResult(() => [{ reviewId: TEST_REVIEW.id }]); // this review has a response

    const request = makeGetRequest();
    const response = await getReviews(request);
    const body = await response.json();

    expect(body.data.reviews[0].hasResponse).toBe(true);
    expect(body.data.summary.pendingResponses).toBe(0);
  });

  it("returns 401 when auth fails", async () => {
    mockVerifyAuth.mockResolvedValueOnce(
      NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Missing or invalid Authorization header" } },
        { status: 401 }
      )
    );

    const request = makeGetRequest();
    const response = await getReviews(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns empty list when no reviews exist", async () => {
    pushDbResult(() => []); // no reviews
    pushDbResult(() => [{ total: 0, avgRating: 0, positive: 0, neutral: 0, negative: 0 }]);
    pushDbResult(() => []); // no responses

    const request = makeGetRequest();
    const response = await getReviews(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.reviews).toHaveLength(0);
    expect(body.data.summary.total).toBe(0);
    expect(body.data.summary.averageRating).toBe(0);
  });
});

// ─── Tests: POST /api/reviews/[id]/respond ──────────────────────────────────

describe("POST /api/reviews/[id]/respond", () => {
  const ROUTE_PARAMS = { params: Promise.resolve({ id: "review-uuid-001" }) };

  beforeEach(() => {
    vi.clearAllMocks();
    dbCallSequence = [];
    dbCallIndex = 0;
    mockVerifyAuth.mockResolvedValue(AUTH_CONTEXT);
  });

  it("responds to a review with AI-generated text", async () => {
    // DB calls: review lookup, business lookup
    pushDbResult(() => [TEST_REVIEW]);
    pushDbResult(() => [TEST_BUSINESS]);

    // Insert returns: action, then review response
    let insertCount = 0;
    mockInsertReturning.mockImplementation(() => {
      insertCount++;
      if (insertCount === 1) return Promise.resolve([{ ...TEST_ACTION, actionType: "review_response", status: "completed" }]);
      return Promise.resolve([TEST_REVIEW_RESPONSE]);
    });

    const request = makeRespondRequest("review-uuid-001", { useAiDraft: true });
    const response = await respondToReview(request, ROUTE_PARAMS);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.response).toBeDefined();
    expect(body.data.response.responseText).toBe(TEST_REVIEW_RESPONSE.responseText);

    // Verify AI was called
    expect(mockGenerateReviewResponse).toHaveBeenCalledOnce();
    expect(mockGenerateReviewResponse).toHaveBeenCalledWith(
      expect.objectContaining({ name: TEST_BUSINESS.name }),
      expect.objectContaining({
        reviewerName: TEST_REVIEW.reviewerName,
        rating: TEST_REVIEW.rating,
        reviewText: TEST_REVIEW.reviewText,
      })
    );
  });

  it("responds with custom text when provided", async () => {
    pushDbResult(() => [TEST_REVIEW]);

    let insertCount = 0;
    mockInsertReturning.mockImplementation(() => {
      insertCount++;
      if (insertCount === 1) return Promise.resolve([{ ...TEST_ACTION, actionType: "review_response" }]);
      return Promise.resolve([{ ...TEST_REVIEW_RESPONSE, responseText: "Custom thanks!" }]);
    });

    const request = makeRespondRequest("review-uuid-001", {
      responseText: "Custom thanks!",
      useAiDraft: false,
    });
    const response = await respondToReview(request, ROUTE_PARAMS);
    const body = await response.json();

    expect(response.status).toBe(200);
    // AI should NOT have been called since custom text was provided
    expect(mockGenerateReviewResponse).not.toHaveBeenCalled();
  });

  it("returns 404 when review not found", async () => {
    pushDbResult(() => []); // review not found

    const request = makeRespondRequest("nonexistent", { useAiDraft: true });
    const response = await respondToReview(request, ROUTE_PARAMS);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 401 when auth fails", async () => {
    mockVerifyAuth.mockResolvedValueOnce(
      NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Missing or invalid Authorization header" } },
        { status: 401 }
      )
    );

    const request = makeRespondRequest("review-uuid-001", { useAiDraft: true });
    const response = await respondToReview(request, ROUTE_PARAMS);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("indicates yelp reviews need manual posting", async () => {
    const yelpReview = { ...TEST_REVIEW, platform: "yelp" };
    pushDbResult(() => [yelpReview]);
    pushDbResult(() => [TEST_BUSINESS]);

    let insertCount = 0;
    mockInsertReturning.mockImplementation(() => {
      insertCount++;
      if (insertCount === 1) return Promise.resolve([TEST_ACTION]);
      return Promise.resolve([{ ...TEST_REVIEW_RESPONSE, postedToPlatform: false }]);
    });

    const request = makeRespondRequest("review-uuid-001", { useAiDraft: true });
    const response = await respondToReview(request, ROUTE_PARAMS);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.response.needsManualPosting).toBe(true);
    expect(body.data.response.platform).toBe("yelp");
  });
});
