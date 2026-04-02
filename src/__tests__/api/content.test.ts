/**
 * Tests for POST /api/content/generate
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  TEST_BUSINESS,
  TEST_CONTENT_ITEM,
  TEST_ACTION,
} from "../mocks/db";
import {
  MOCK_SOCIAL_POST,
  MOCK_REVIEW_RESPONSE,
  MOCK_GENERATED_TEXT,
} from "../mocks/ai";

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
const mockGenerate = vi.fn().mockResolvedValue(MOCK_GENERATED_TEXT);
const mockGenerateSocialPost = vi.fn().mockResolvedValue(MOCK_SOCIAL_POST);
const mockGenerateReviewResponse = vi.fn().mockResolvedValue(MOCK_REVIEW_RESPONSE);

vi.mock("@/services/ai", () => ({
  generate: (...args: unknown[]) => mockGenerate(...args),
  generateSocialPost: (...args: unknown[]) => mockGenerateSocialPost(...args),
  generateReviewResponse: (...args: unknown[]) => mockGenerateReviewResponse(...args),
  generateDigestNarrative: vi.fn(),
}));

// Mock DB
let selectCallCount = 0;
const mockSelectLimit = vi.fn().mockImplementation(() => {
  selectCallCount++;
  // First select: business lookup
  return Promise.resolve([TEST_BUSINESS]);
});
const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
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

import { POST } from "@/app/api/content/generate/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/content/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer mock-token",
    },
    body: JSON.stringify(body),
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/content/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallCount = 0;
    mockSelectLimit.mockImplementation(() => Promise.resolve([TEST_BUSINESS]));
    mockVerifyAuth.mockResolvedValue(AUTH_CONTEXT);

    // Insert returns: content item, then action
    let insertCount = 0;
    mockInsertReturning.mockImplementation(() => {
      insertCount++;
      if (insertCount === 1) return Promise.resolve([TEST_CONTENT_ITEM]);
      return Promise.resolve([TEST_ACTION]);
    });
  });

  it("generates a social post successfully", async () => {
    const request = makeRequest({ type: "social_post", topic: "weekly specials" });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.contentItem).toBeDefined();
    expect(body.data.action).toBeDefined();
    expect(body.data.action.status).toBe("proposed");

    // Verify AI social post generator was called
    expect(mockGenerateSocialPost).toHaveBeenCalledOnce();
    expect(mockGenerateSocialPost).toHaveBeenCalledWith(
      expect.objectContaining({ name: TEST_BUSINESS.name, vertical: TEST_BUSINESS.vertical, city: TEST_BUSINESS.city }),
      "weekly specials"
    );

    // Verify two inserts: content_item + action
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it("generates a review response when reviewData is provided", async () => {
    const reviewData = { reviewerName: "Jane", rating: 5, reviewText: "Amazing!" };
    const request = makeRequest({ type: "review_response", reviewData });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(mockGenerateReviewResponse).toHaveBeenCalledOnce();
    expect(mockGenerateReviewResponse).toHaveBeenCalledWith(
      expect.objectContaining({ name: TEST_BUSINESS.name }),
      reviewData
    );
  });

  it("returns 400 when review_response type is missing reviewData", async () => {
    const request = makeRequest({ type: "review_response" });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("reviewData required");
  });

  it("generates email campaign content", async () => {
    const request = makeRequest({ type: "email_campaign", topic: "holiday special" });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);

    // Email uses the generic generate function
    expect(mockGenerate).toHaveBeenCalledOnce();
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("email campaign"),
        maxTokens: 512,
      })
    );
  });

  it("generates website content", async () => {
    const request = makeRequest({ type: "website_content" });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(mockGenerate).toHaveBeenCalledOnce();
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("website copy"),
      })
    );
  });

  it("returns 401 when auth fails", async () => {
    mockVerifyAuth.mockResolvedValueOnce(
      NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Missing or invalid Authorization header" } },
        { status: 401 }
      )
    );

    const request = makeRequest({ type: "social_post" });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 404 when business not found", async () => {
    mockSelectLimit.mockResolvedValueOnce([]);

    const request = makeRequest({ type: "social_post" });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 for invalid content type", async () => {
    const request = makeRequest({ type: "podcast_episode" });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 500 when AI generation fails", async () => {
    mockGenerateSocialPost.mockRejectedValueOnce(new Error("AI service unavailable"));

    const request = makeRequest({ type: "social_post", topic: "test" });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("GENERATION_FAILED");
    expect(body.error.message).toBe("AI service unavailable");
  });
});
