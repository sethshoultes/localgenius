/**
 * End-to-end integration tests for LocalGenius business flows.
 *
 * These tests call the actual Next.js route handlers with mocked
 * external dependencies (database, AI service, password hashing, JWT).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  TEST_ORG,
  TEST_BUSINESS,
  TEST_USER,
  TEST_CONVERSATION,
  TEST_MESSAGE_OWNER,
  TEST_MESSAGE_ASSISTANT,
  TEST_REVIEW,
  TEST_REVIEW_RESPONSE,
  TEST_ACTION,
  TEST_CONTENT_ITEM,
  TEST_WEEKLY_DIGEST,
} from "../mocks/db";
import {
  MOCK_SOCIAL_POST,
  MOCK_REVIEW_RESPONSE,
  MOCK_GENERATED_TEXT,
  MOCK_DIGEST_NARRATIVE,
} from "../mocks/ai";

// ─── Shared mock state ──────────────────────────────────────────────────────

let insertCallHistory: unknown[][] = [];
let selectCallHistory: unknown[][] = [];

// Configurable return values per test — keyed by a simple counter
let insertResults: unknown[][] = [];
let insertCallIndex = 0;

let selectResults: unknown[][] = [];
let selectCallIndex = 0;

// ─── Database mock (chainable Drizzle-style) ────────────────────────────────

/**
 * Build a thenable chain node. Every method returns the same chainable object,
 * and awaiting any point in the chain resolves to the next selectResults entry.
 */
function makeSelectChain() {
  const node: Record<string, unknown> = {};
  const resolve = () => {
    const result = selectResults[selectCallIndex] ?? [];
    selectCallIndex++;
    return Promise.resolve(result);
  };
  for (const m of ["from", "where", "orderBy", "limit", "leftJoin", "innerJoin", "groupBy", "having"]) {
    node[m] = vi.fn().mockImplementation(() => node);
  }
  // Make every chain position awaitable
  node.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => resolve().then(res, rej);
  return node;
}

const mockInsertReturning = vi.fn().mockImplementation(() => {
  const result = insertResults[insertCallIndex] ?? [];
  insertCallIndex++;
  return Promise.resolve(result);
});
const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
const mockInsert = vi.fn().mockImplementation((...args: unknown[]) => {
  insertCallHistory.push(args);
  return { values: mockInsertValues };
});

const mockSelect = vi.fn().mockImplementation((...args: unknown[]) => {
  selectCallHistory.push(args);
  return makeSelectChain();
});

const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

vi.mock("@/lib/db", () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
  getDb: vi.fn(),
}));

// ─── Password mock ──────────────────────────────────────────────────────────

vi.mock("@/lib/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("salthex:hashhex"),
  verifyPassword: vi.fn().mockResolvedValue(true),
}));

// ─── Auth middleware mock ───────────────────────────────────────────────────

const MOCK_ACCESS_TOKEN = "mock-access-token-jwt";
const MOCK_REFRESH_TOKEN = "mock-refresh-token-jwt";

const MOCK_AUTH_CONTEXT = {
  userId: TEST_USER.id,
  organizationId: TEST_ORG.id,
  businessId: TEST_BUSINESS.id,
  plan: "base" as const,
};

vi.mock("@/api/middleware/auth", () => ({
  issueAccessToken: vi.fn().mockResolvedValue("mock-access-token-jwt"),
  issueRefreshToken: vi.fn().mockResolvedValue("mock-refresh-token-jwt"),
  verifyAuth: vi.fn().mockResolvedValue({
    userId: "user-uuid-001",
    organizationId: "org-uuid-001",
    businessId: "biz-uuid-001",
    plan: "base",
  }),
}));

// ─── AI service mock ────────────────────────────────────────────────────────

vi.mock("@/services/ai", () => ({
  generate: vi.fn().mockResolvedValue(MOCK_GENERATED_TEXT),
  generateSocialPost: vi.fn().mockResolvedValue(MOCK_SOCIAL_POST),
  generateReviewResponse: vi.fn().mockResolvedValue(MOCK_REVIEW_RESPONSE),
  generateDigestNarrative: vi.fn().mockResolvedValue(MOCK_DIGEST_NARRATIVE),
}));

// ─── Drizzle ORM operator mocks ────────────────────────────────────────────

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  desc: vi.fn((col: unknown) => ({ type: "desc", col })),
  lt: vi.fn((...args: unknown[]) => ({ type: "lt", args })),
  gte: vi.fn((...args: unknown[]) => ({ type: "gte", args })),
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({ type: "sql", strings, values }),
    { raw: (s: string) => ({ type: "sql_raw", value: s }) }
  ),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(
  url: string,
  options: { method?: string; body?: Record<string, unknown>; token?: string } = {}
): NextRequest {
  const { method = "GET", body, token } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const init: RequestInit = { method, headers };
  if (body) init.body = JSON.stringify(body);
  return new NextRequest(url, init as any);
}

function resetCallCounters() {
  insertCallIndex = 0;
  selectCallIndex = 0;
  insertCallHistory = [];
  selectCallHistory = [];
  insertResults = [];
  selectResults = [];

  vi.clearAllMocks();

  // Re-wire mock chains after clearAllMocks
  mockInsertReturning.mockImplementation(() => {
    const result = insertResults[insertCallIndex] ?? [];
    insertCallIndex++;
    return Promise.resolve(result);
  });
  mockInsertValues.mockReturnValue({ returning: mockInsertReturning });
  mockInsert.mockImplementation((...args: unknown[]) => {
    insertCallHistory.push(args);
    return { values: mockInsertValues };
  });

  mockSelect.mockImplementation((...args: unknown[]) => {
    selectCallHistory.push(args);
    return makeSelectChain();
  });

  mockUpdateWhere.mockResolvedValue(undefined);
  mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
  mockUpdate.mockReturnValue({ set: mockUpdateSet });
}

// ─── Test Suites ────────────────────────────────────────────────────────────

describe("Integration: Full onboarding flow", () => {
  beforeEach(() => resetCallCounters());

  it("register -> confirm -> set priority -> complete onboarding", async () => {
    // ── Step 1: Register ──
    // inserts: org, business, user, conversation (4 insert calls)
    insertResults = [
      [TEST_ORG],
      [TEST_BUSINESS],
      [TEST_USER],
      [TEST_CONVERSATION],
    ];

    const { POST: registerPOST } = await import("@/app/api/auth/register/route");
    const registerReq = makeRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: {
        email: "owner@testbiz.com",
        password: "securepass123",
        name: "Test Owner",
        businessName: "Test Biz Inc",
        businessType: "restaurant",
        city: "Austin",
        state: "TX",
      },
    });

    const registerRes = await registerPOST(registerReq);
    const registerBody = await registerRes.json();

    expect(registerRes.status).toBe(201);
    expect(registerBody.data.user.id).toBe(TEST_USER.id);
    expect(registerBody.data.user.email).toBe("owner@testbiz.com");
    expect(registerBody.data.business.id).toBe(TEST_BUSINESS.id);
    expect(registerBody.data.business.vertical).toBe("restaurant");
    expect(registerBody.data.organization.id).toBe(TEST_ORG.id);
    expect(registerBody.data.accessToken).toBe(MOCK_ACCESS_TOKEN);
    expect(registerBody.data.refreshToken).toBe(MOCK_REFRESH_TOKEN);
    expect(registerBody.meta.timestamp).toBeDefined();

    const token = registerBody.data.accessToken;

    // ── Step 2: Confirm business details ──
    resetCallCounters();
    const { POST: onboardingPOST } = await import("@/app/api/onboarding/route");

    const confirmReq = makeRequest("http://localhost:3000/api/onboarding", {
      method: "POST",
      token,
      body: { step: "confirm", data: { address: "456 Oak Ave", phone: "512-555-0200" } },
    });
    const confirmRes = await onboardingPOST(confirmReq);
    const confirmBody = await confirmRes.json();

    expect(confirmRes.status).toBe(200);
    expect(confirmBody.data.step).toBe("confirm");
    expect(confirmBody.data.status).toBe("completed");
    // Verify db.update was called to persist address/phone
    expect(mockUpdate).toHaveBeenCalled();

    // ── Step 3: Set priority focus ──
    resetCallCounters();
    const priorityReq = makeRequest("http://localhost:3000/api/onboarding", {
      method: "POST",
      token,
      body: { step: "priority", data: { focus: "reviews" } },
    });
    const priorityRes = await onboardingPOST(priorityReq);
    const priorityBody = await priorityRes.json();

    expect(priorityRes.status).toBe(200);
    expect(priorityBody.data.step).toBe("priority");
    expect(priorityBody.data.status).toBe("completed");
    expect(mockUpdate).toHaveBeenCalled();

    // ── Step 4: Complete onboarding ──
    resetCallCounters();
    const completeReq = makeRequest("http://localhost:3000/api/onboarding", {
      method: "POST",
      token,
      body: { step: "complete" },
    });
    const completeRes = await onboardingPOST(completeReq);
    const completeBody = await completeRes.json();

    expect(completeRes.status).toBe(200);
    expect(completeBody.data.step).toBe("complete");
    expect(completeBody.data.status).toBe("completed");
    expect(mockUpdate).toHaveBeenCalled();

    // ── Step 5: Verify onboarding status via GET ──
    resetCallCounters();
    const completedBusiness = { ...TEST_BUSINESS, onboardingCompletedAt: new Date(), priorityFocus: "reviews" };
    selectResults = [
      [completedBusiness],  // business lookup
      [TEST_CONVERSATION],  // conversation lookup
    ];

    const { GET: onboardingGET } = await import("@/app/api/onboarding/route");
    const statusReq = makeRequest("http://localhost:3000/api/onboarding", { token });
    const statusRes = await onboardingGET(statusReq);
    const statusBody = await statusRes.json();

    expect(statusRes.status).toBe(200);
    expect(statusBody.data.business.onboardingCompleted).toBe(true);
    expect(statusBody.data.business.priorityFocus).toBe("reviews");
    expect(statusBody.data.conversationId).toBe(TEST_CONVERSATION.id);
  });
});

describe("Integration: Conversation with AI", () => {
  beforeEach(() => resetCallCounters());

  it("send message -> verify AI response stored -> send follow-up", async () => {
    const conversationId = TEST_CONVERSATION.id;
    const token = MOCK_ACCESS_TOKEN;

    // ── Step 1: Send initial message ──
    // select calls: conversation lookup, business lookup, message history
    selectResults = [
      [TEST_CONVERSATION],  // verify conversation ownership
      [TEST_BUSINESS],      // load business context
      [TEST_MESSAGE_OWNER], // history (just owner message)
    ];
    // insert calls: owner message, assistant message
    insertResults = [
      [TEST_MESSAGE_OWNER],
      [TEST_MESSAGE_ASSISTANT],
    ];

    const { POST: messagesPOST } = await import(
      "@/app/api/conversations/[id]/messages/route"
    );

    const sendReq = makeRequest(
      `http://localhost:3000/api/conversations/${conversationId}/messages`,
      { method: "POST", token, body: { content: "How should I respond to this review?" } }
    );
    const sendRes = await messagesPOST(sendReq, {
      params: Promise.resolve({ id: conversationId }),
    });
    const sendBody = await sendRes.json();

    expect(sendRes.status).toBe(201);
    expect(sendBody.data.ownerMessage).toBeDefined();
    expect(sendBody.data.ownerMessage.role).toBe("owner");
    expect(sendBody.data.ownerMessage.content).toEqual({ text: "How should I respond to this review?" });
    expect(sendBody.data.assistantMessage).toBeDefined();
    expect(sendBody.data.assistantMessage.role).toBe("assistant");
    expect(sendBody.data.assistantMessage.aiModel).toBe("claude-sonnet-4-20250514");
    expect(sendBody.meta.timestamp).toBeDefined();

    // Verify two insert calls were made (owner message + assistant message)
    expect(mockInsert).toHaveBeenCalledTimes(2);

    // ── Step 2: Send follow-up message ──
    resetCallCounters();
    const followUpOwnerMsg = {
      ...TEST_MESSAGE_OWNER,
      id: "msg-uuid-003",
      content: { text: "Can you make it more friendly?" },
      createdAt: new Date("2025-01-03"),
    };
    const followUpAssistantMsg = {
      ...TEST_MESSAGE_ASSISTANT,
      id: "msg-uuid-004",
      content: { text: "Sure! Here is a warmer version of that response..." },
      createdAt: new Date("2025-01-03"),
    };

    selectResults = [
      [TEST_CONVERSATION],
      [TEST_BUSINESS],
      [TEST_MESSAGE_OWNER, TEST_MESSAGE_ASSISTANT, followUpOwnerMsg], // history with previous messages
    ];
    insertResults = [
      [followUpOwnerMsg],
      [followUpAssistantMsg],
    ];

    const followUpReq = makeRequest(
      `http://localhost:3000/api/conversations/${conversationId}/messages`,
      { method: "POST", token, body: { content: "Can you make it more friendly?" } }
    );
    const followUpRes = await messagesPOST(followUpReq, {
      params: Promise.resolve({ id: conversationId }),
    });
    const followUpBody = await followUpRes.json();

    expect(followUpRes.status).toBe(201);
    expect(followUpBody.data.ownerMessage.id).toBe("msg-uuid-003");
    expect(followUpBody.data.assistantMessage.id).toBe("msg-uuid-004");
    expect(followUpBody.data.assistantMessage.content).toEqual({
      text: "Sure! Here is a warmer version of that response...",
    });

    // ── Step 3: Retrieve message history via GET ──
    resetCallCounters();
    const allMessages = [
      TEST_MESSAGE_OWNER,
      TEST_MESSAGE_ASSISTANT,
      followUpOwnerMsg,
      followUpAssistantMsg,
    ];
    selectResults = [allMessages];

    const { GET: messagesGET } = await import(
      "@/app/api/conversations/[id]/messages/route"
    );
    const getReq = makeRequest(
      `http://localhost:3000/api/conversations/${conversationId}/messages?limit=50`,
      { token }
    );
    const getRes = await messagesGET(getReq, {
      params: Promise.resolve({ id: conversationId }),
    });
    const getBody = await getRes.json();

    expect(getRes.status).toBe(200);
    expect(getBody.data.messages).toHaveLength(4);
    expect(getBody.data.pagination).toBeDefined();
    expect(getBody.data.pagination.hasMore).toBe(false);
  });
});

describe("Integration: Content generation pipeline", () => {
  beforeEach(() => resetCallCounters());

  it("generate social post -> verify content_items + actions created", async () => {
    const token = MOCK_ACCESS_TOKEN;

    // select: business lookup
    selectResults = [[TEST_BUSINESS]];
    // insert: content_item, action
    const contentItem = {
      ...TEST_CONTENT_ITEM,
      content: { text: MOCK_SOCIAL_POST, platform: "instagram", topic: "weekly specials" },
    };
    const action = {
      ...TEST_ACTION,
      actionType: "social_post",
      status: "proposed",
      content: { contentItemId: TEST_CONTENT_ITEM.id, text: MOCK_SOCIAL_POST, platform: "instagram" },
    };
    insertResults = [[contentItem], [action]];

    const { POST: contentPOST } = await import("@/app/api/content/generate/route");

    const req = makeRequest("http://localhost:3000/api/content/generate", {
      method: "POST",
      token,
      body: { type: "social_post", topic: "weekly specials", platform: "instagram" },
    });
    const res = await contentPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);

    // Verify content item was created
    expect(body.data.contentItem).toBeDefined();
    expect(body.data.contentItem.contentType).toBe("social_post");
    expect(body.data.contentItem.content.text).toBe(MOCK_SOCIAL_POST);
    expect(body.data.contentItem.content.platform).toBe("instagram");
    expect(body.data.contentItem.content.topic).toBe("weekly specials");
    expect(body.data.contentItem.aiModel).toBe("claude-sonnet-4-20250514");

    // Verify action was created with proposed status
    expect(body.data.action).toBeDefined();
    expect(body.data.action.status).toBe("proposed");
    expect(body.data.action.type).toBe("social_post");

    // Verify both insert calls happened (content_items + actions)
    expect(mockInsert).toHaveBeenCalledTimes(2);

    expect(body.meta.timestamp).toBeDefined();
  });

  it("generate email campaign -> verify content + action created", async () => {
    const token = MOCK_ACCESS_TOKEN;

    selectResults = [[TEST_BUSINESS]];
    const emailContent = {
      ...TEST_CONTENT_ITEM,
      id: "content-uuid-002",
      contentType: "email_campaign",
      content: { text: MOCK_GENERATED_TEXT, platform: "email", topic: "holiday promo" },
    };
    const emailAction = {
      ...TEST_ACTION,
      id: "action-uuid-002",
      actionType: "email_campaign",
      status: "proposed",
      content: { contentItemId: "content-uuid-002", text: MOCK_GENERATED_TEXT, platform: "email" },
    };
    insertResults = [[emailContent], [emailAction]];

    const { POST: contentPOST } = await import("@/app/api/content/generate/route");

    const req = makeRequest("http://localhost:3000/api/content/generate", {
      method: "POST",
      token,
      body: { type: "email_campaign", topic: "holiday promo", platform: "email" },
    });
    const res = await contentPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.contentItem.contentType).toBe("email_campaign");
    expect(body.data.action.type).toBe("email_campaign");
    expect(body.data.action.status).toBe("proposed");
  });

  it("returns 400 for invalid content type", async () => {
    const { POST: contentPOST } = await import("@/app/api/content/generate/route");

    const req = makeRequest("http://localhost:3000/api/content/generate", {
      method: "POST",
      token: MOCK_ACCESS_TOKEN,
      body: { type: "invalid_type" },
    });
    const res = await contentPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when business not found", async () => {
    selectResults = [[]]; // no business

    const { POST: contentPOST } = await import("@/app/api/content/generate/route");

    const req = makeRequest("http://localhost:3000/api/content/generate", {
      method: "POST",
      token: MOCK_ACCESS_TOKEN,
      body: { type: "social_post", topic: "test" },
    });
    const res = await contentPOST(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("Integration: Review response flow", () => {
  beforeEach(() => resetCallCounters());

  it("get reviews -> respond to review -> verify response stored", async () => {
    const token = MOCK_ACCESS_TOKEN;

    // ── Step 1: List reviews ──
    const reviewsList = [
      TEST_REVIEW,
      { ...TEST_REVIEW, id: "review-uuid-002", reviewerName: "John Smith", rating: 3, reviewText: "Average experience", sentiment: "neutral" },
    ];
    const summary = { total: 2, avgRating: 3.5, positive: 1, neutral: 1, negative: 0 };
    const responses: unknown[] = []; // no responses yet

    selectResults = [
      reviewsList,  // allReviews query
      [summary],    // summary aggregation
      responses,    // reviewResponses lookup
    ];

    const { GET: reviewsGET } = await import("@/app/api/reviews/route");

    const listReq = makeRequest("http://localhost:3000/api/reviews", { token });
    const listRes = await reviewsGET(listReq);
    const listBody = await listRes.json();

    expect(listRes.status).toBe(200);
    expect(listBody.data.reviews).toHaveLength(2);
    expect(listBody.data.reviews[0].hasResponse).toBe(false);
    expect(listBody.data.reviews[1].hasResponse).toBe(false);
    expect(listBody.data.summary.total).toBe(2);
    expect(listBody.data.summary.averageRating).toBe(3.5);
    expect(listBody.data.summary.pendingResponses).toBe(2);
    expect(listBody.data.summary.sentimentBreakdown.positive).toBe(1);

    // ── Step 2: Respond to a review using AI draft ──
    resetCallCounters();
    const reviewId = TEST_REVIEW.id;

    // select: review lookup, business lookup (for AI context)
    selectResults = [
      [TEST_REVIEW],    // review lookup
      [TEST_BUSINESS],  // business lookup for AI
    ];

    const responseAction = {
      ...TEST_ACTION,
      id: "action-uuid-resp",
      actionType: "review_response",
      status: "completed",
      content: { reviewId, responseText: MOCK_REVIEW_RESPONSE, platform: "google" },
      executedAt: new Date(),
    };
    const reviewResponse = {
      ...TEST_REVIEW_RESPONSE,
      actionId: "action-uuid-resp",
      responseText: MOCK_REVIEW_RESPONSE,
    };
    insertResults = [
      [responseAction],   // action insert
      [reviewResponse],   // reviewResponse insert
    ];

    const { POST: respondPOST } = await import("@/app/api/reviews/[id]/respond/route");

    const respondReq = makeRequest(
      `http://localhost:3000/api/reviews/${reviewId}/respond`,
      { method: "POST", token, body: { useAiDraft: true } }
    );
    const respondRes = await respondPOST(respondReq, {
      params: Promise.resolve({ id: reviewId }),
    });
    const respondBody = await respondRes.json();

    expect(respondRes.status).toBe(200);
    expect(respondBody.data.response).toBeDefined();
    expect(respondBody.data.response.reviewId).toBe(reviewId);
    expect(respondBody.data.response.responseText).toBe(MOCK_REVIEW_RESPONSE);
    expect(respondBody.data.response.platform).toBe("google");
    expect(respondBody.data.response.needsManualPosting).toBe(false);

    // Verify both inserts happened (action + reviewResponse)
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it("respond with custom text instead of AI draft", async () => {
    const token = MOCK_ACCESS_TOKEN;
    const reviewId = TEST_REVIEW.id;
    const customText = "Thanks for your review, Jane! We are glad you enjoyed it.";

    // select: review lookup (no business lookup needed since useAiDraft=false with text provided)
    selectResults = [[TEST_REVIEW]];

    const responseAction = {
      ...TEST_ACTION,
      id: "action-uuid-custom",
      actionType: "review_response",
      status: "completed",
      content: { reviewId, responseText: customText, platform: "google" },
    };
    const reviewResponse = {
      ...TEST_REVIEW_RESPONSE,
      id: "rr-uuid-custom",
      actionId: "action-uuid-custom",
      responseText: customText,
    };
    insertResults = [[responseAction], [reviewResponse]];

    const { POST: respondPOST } = await import("@/app/api/reviews/[id]/respond/route");

    const respondReq = makeRequest(
      `http://localhost:3000/api/reviews/${reviewId}/respond`,
      {
        method: "POST",
        token,
        body: { responseText: customText, useAiDraft: false },
      }
    );
    const respondRes = await respondPOST(respondReq, {
      params: Promise.resolve({ id: reviewId }),
    });
    const respondBody = await respondRes.json();

    expect(respondRes.status).toBe(200);
    expect(respondBody.data.response.responseText).toBe(customText);
  });

  it("returns 404 for non-existent review", async () => {
    selectResults = [[]]; // review not found

    const { POST: respondPOST } = await import("@/app/api/reviews/[id]/respond/route");

    const req = makeRequest("http://localhost:3000/api/reviews/nonexistent/respond", {
      method: "POST",
      token: MOCK_ACCESS_TOKEN,
      body: { useAiDraft: true },
    });
    const res = await respondPOST(req, {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("Integration: Digest generation", () => {
  beforeEach(() => resetCallCounters());

  it("generate digest -> verify metrics aggregated + narrative created", async () => {
    const token = MOCK_ACCESS_TOKEN;

    // select calls for digest generation:
    // 1. business lookup
    // 2. review stats aggregation
    // 3. action stats aggregation
    // 4. analytics event stats aggregation
    const reviewStats = { count: 5, avgRating: 4.2 };
    const actionStats = { completed: 8, socialPosts: 3, reviewResponses: 5 };
    const eventStats = { pageViews: 120, phoneCalls: 15, bookings: 8 };

    selectResults = [
      [TEST_BUSINESS],   // business lookup
      [reviewStats],     // review aggregation
      [actionStats],     // action aggregation
      [eventStats],      // analytics aggregation
    ];

    // insert: weekly digest
    const digest = {
      ...TEST_WEEKLY_DIGEST,
      metrics: {
        reviewsReceived: 5,
        averageRating: 4.2,
        actionsCompleted: 8,
        socialPostsPublished: 3,
        reviewsResponded: 5,
        websiteVisits: 120,
        phoneCalls: 15,
        bookings: 8,
      },
      recommendations: { narrative: MOCK_DIGEST_NARRATIVE },
    };
    insertResults = [[digest]];

    const { GET: digestGET } = await import("@/app/api/digest/route");

    const req = makeRequest("http://localhost:3000/api/digest?generate=true", { token });
    const res = await digestGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.digest).toBeDefined();

    // Verify metrics were aggregated correctly
    expect(body.data.digest.metrics.reviewsReceived).toBe(5);
    expect(body.data.digest.metrics.averageRating).toBe(4.2);
    expect(body.data.digest.metrics.actionsCompleted).toBe(8);
    expect(body.data.digest.metrics.socialPostsPublished).toBe(3);
    expect(body.data.digest.metrics.reviewsResponded).toBe(5);
    expect(body.data.digest.metrics.websiteVisits).toBe(120);
    expect(body.data.digest.metrics.phoneCalls).toBe(15);
    expect(body.data.digest.metrics.bookings).toBe(8);

    // Verify narrative was generated and included
    expect(body.data.digest.narrative).toBe(MOCK_DIGEST_NARRATIVE);
    expect(body.data.digest.recommendations.narrative).toBe(MOCK_DIGEST_NARRATIVE);

    // Verify period dates are present
    expect(body.data.digest.periodStart).toBeDefined();
    expect(body.data.digest.periodEnd).toBeDefined();

    // Verify digest was persisted (insert called)
    expect(mockInsert).toHaveBeenCalledTimes(1);

    expect(body.meta.timestamp).toBeDefined();
  });

  it("list existing digests without generating new one", async () => {
    const token = MOCK_ACCESS_TOKEN;

    const existingDigests = [
      TEST_WEEKLY_DIGEST,
      { ...TEST_WEEKLY_DIGEST, id: "digest-uuid-002", periodStart: new Date("2025-01-06"), periodEnd: new Date("2025-01-13") },
    ];
    selectResults = [existingDigests];

    const { GET: digestGET } = await import("@/app/api/digest/route");

    const req = makeRequest("http://localhost:3000/api/digest", { token });
    const res = await digestGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.digests).toHaveLength(2);
    // Should not have called insert (no new digest generated)
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns 404 when business not found during generation", async () => {
    selectResults = [[]]; // business not found

    const { GET: digestGET } = await import("@/app/api/digest/route");

    const req = makeRequest("http://localhost:3000/api/digest?generate=true", {
      token: MOCK_ACCESS_TOKEN,
    });
    const res = await digestGET(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
