/**
 * Tests for /api/conversations/[id]/messages (GET + POST)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  TEST_CONVERSATION,
  TEST_BUSINESS,
  TEST_MESSAGE_OWNER,
  TEST_MESSAGE_ASSISTANT,
} from "../mocks/db";
import { MOCK_GENERATED_TEXT } from "../mocks/ai";

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

vi.mock("@/services/ai", () => ({
  generate: (...args: unknown[]) => mockGenerate(...args),
  generateSocialPost: vi.fn(),
  generateReviewResponse: vi.fn(),
  generateDigestNarrative: vi.fn(),
}));

// Mock DB
const mockSelectResults: unknown[][] = [];
let selectCallIndex = 0;

const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

const mockSelectLimit = vi.fn().mockImplementation(() => {
  const result = mockSelectResults[selectCallIndex] || [];
  selectCallIndex++;
  return Promise.resolve(result);
});
const mockSelectOrderBy = vi.fn().mockReturnValue({ limit: mockSelectLimit });
const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit, orderBy: (...args: unknown[]) => mockSelectOrderBy(...args) });
const mockSelectFrom = vi.fn().mockReturnValue({
  where: (...args: unknown[]) => mockSelectWhere(...args),
  orderBy: (...args: unknown[]) => mockSelectOrderBy(...args),
});
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

vi.mock("@/lib/db", () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    select: (...args: unknown[]) => mockSelect(...args),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
  },
  getDb: vi.fn(),
}));

// ─── Import route handlers ──────────────────────────────────────────────────

import { POST, GET } from "@/app/api/conversations/[id]/messages/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePostRequest(conversationId: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer mock-token",
    },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(conversationId: string, params?: Record<string, string>): NextRequest {
  const url = new URL(`http://localhost:3000/api/conversations/${conversationId}/messages`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), {
    method: "GET",
    headers: { Authorization: "Bearer mock-token" },
  });
}

const ROUTE_PARAMS = { params: Promise.resolve({ id: "conv-uuid-001" }) };

// ─── Tests: POST (send message) ─────────────────────────────────────────────

describe("POST /api/conversations/[id]/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallIndex = 0;

    // Default select results: conversation found, business found, message history
    mockSelectResults.length = 0;
    mockSelectResults.push(
      [TEST_CONVERSATION], // conversation ownership check
      [TEST_BUSINESS],     // business context
      [TEST_MESSAGE_OWNER], // message history for AI context
    );

    // Insert returns: owner message, then assistant message
    let insertCount = 0;
    mockInsertReturning.mockImplementation(() => {
      insertCount++;
      if (insertCount === 1) return Promise.resolve([TEST_MESSAGE_OWNER]);
      return Promise.resolve([TEST_MESSAGE_ASSISTANT]);
    });

    mockVerifyAuth.mockResolvedValue(AUTH_CONTEXT);
  });

  it("stores owner message and generates AI response", async () => {
    const request = makePostRequest("conv-uuid-001", { content: "How should I respond to this review?" });
    const response = await POST(request, ROUTE_PARAMS);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.ownerMessage.id).toBe(TEST_MESSAGE_OWNER.id);
    expect(body.data.ownerMessage.role).toBe("owner");
    expect(body.data.assistantMessage.id).toBe(TEST_MESSAGE_ASSISTANT.id);
    expect(body.data.assistantMessage.role).toBe("assistant");

    // Verify AI was called
    expect(mockGenerate).toHaveBeenCalledOnce();
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("How should I respond to this review?"),
        businessContext: expect.objectContaining({ name: TEST_BUSINESS.name }),
      })
    );

    // Verify two inserts happened (owner + assistant messages)
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it("returns 401 when auth fails", async () => {
    mockVerifyAuth.mockResolvedValueOnce(
      NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Missing or invalid Authorization header" } },
        { status: 401 }
      )
    );

    const request = makePostRequest("conv-uuid-001", { content: "Hello" });
    const response = await POST(request, ROUTE_PARAMS);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 404 when conversation not found", async () => {
    mockSelectResults.length = 0;
    mockSelectResults.push([]); // no conversation found

    const request = makePostRequest("nonexistent", { content: "Hello" });
    const response = await POST(request, ROUTE_PARAMS);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 for empty message content", async () => {
    const request = makePostRequest("conv-uuid-001", { content: "" });
    const response = await POST(request, ROUTE_PARAMS);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for missing content field", async () => {
    const request = makePostRequest("conv-uuid-001", {});
    const response = await POST(request, ROUTE_PARAMS);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ─── Tests: GET (list messages) ─────────────────────────────────────────────

describe("GET /api/conversations/[id]/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallIndex = 0;
    mockSelectResults.length = 0;
    mockVerifyAuth.mockResolvedValue(AUTH_CONTEXT);
  });

  it("returns paginated messages", async () => {
    const testMessages = [TEST_MESSAGE_OWNER, TEST_MESSAGE_ASSISTANT];

    // The GET handler uses: select().from().where().orderBy().limit()
    mockSelectOrderBy.mockReturnValue({
      limit: vi.fn().mockResolvedValue(testMessages),
    });
    mockSelectWhere.mockReturnValue({
      orderBy: (...args: unknown[]) => mockSelectOrderBy(...args),
    });

    const request = makeGetRequest("conv-uuid-001");
    const response = await GET(request, ROUTE_PARAMS);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.messages).toBeDefined();
    expect(body.data.pagination).toBeDefined();
    expect(body.data.pagination.hasMore).toBe(false);
  });

  it("returns 401 when auth fails", async () => {
    mockVerifyAuth.mockResolvedValueOnce(
      NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Missing or invalid Authorization header" } },
        { status: 401 }
      )
    );

    const request = makeGetRequest("conv-uuid-001");
    const response = await GET(request, ROUTE_PARAMS);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
