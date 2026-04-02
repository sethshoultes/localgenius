/**
 * Tests for src/services/webhook-dispatcher.ts
 * dispatch function: routes webhook events to conversation thread
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TEST_BUSINESS } from "../mocks/db";

// ─── Module mocks ────────────────────────────────────────────────────────────

let selectCallCount = 0;
const selectResults: unknown[][] = [];

function makeThenable(result: unknown[]) {
  const obj: Record<string, unknown> = {};
  obj.limit = vi.fn().mockImplementation(() => makeThenable(result));
  obj.where = vi.fn().mockImplementation(() => makeThenable(result));
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

// Insert mock: chainable with .values().returning()
let insertReturnCount = 0;
const insertReturnResults: unknown[][] = [
  [{ id: "msg-uuid-001", conversationId: "conv-uuid-001" }],
];

const mockInsertReturning = vi.fn().mockImplementation(() => {
  const result = insertReturnResults[insertReturnCount] || [];
  insertReturnCount++;
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
    _: {
      fullSchema: {
        users: { id: "users.id", email: "users.email", businessId: "users.businessId" },
      },
    },
  },
}));

vi.mock("@/db/schema", () => ({
  conversations: { id: "conversations.id", businessId: "conversations.businessId" },
  messages: {
    id: "messages.id",
    conversationId: "messages.conversationId",
    businessId: "messages.businessId",
    organizationId: "messages.organizationId",
    role: "messages.role",
    contentType: "messages.contentType",
    content: "messages.content",
  },
  businesses: { id: "businesses.id", name: "businesses.name" },
  organizations: { id: "organizations.id" },
  reviews: { id: "reviews.id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ op: "eq", args })),
  and: vi.fn((...args: unknown[]) => ({ op: "and", args })),
}));

// Mock AI service
const mockGenerateReviewResponse = vi.fn().mockResolvedValue(
  "Thank you for your feedback! We appreciate you taking the time to review us."
);

vi.mock("@/services/ai", () => ({
  generateReviewResponse: (...args: unknown[]) => mockGenerateReviewResponse(...args),
}));

// Mock email service
const mockSendNegativeReviewAlert = vi.fn().mockResolvedValue(undefined);

vi.mock("@/services/email", () => ({
  sendNegativeReviewAlert: (...args: unknown[]) => mockSendNegativeReviewAlert(...args),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function setSelectResults(...results: unknown[][]) {
  selectCallCount = 0;
  selectResults.length = 0;
  results.forEach((r) => selectResults.push(r));
}

function resetAllCounters() {
  selectCallCount = 0;
  selectResults.length = 0;
  insertReturnCount = 0;
}

function setInsertReturnResults(...results: unknown[][]) {
  insertReturnCount = 0;
  insertReturnResults.length = 0;
  results.forEach((r) => insertReturnResults.push(r));
}

const TEST_CONVERSATION = {
  id: "conv-uuid-001",
  businessId: TEST_BUSINESS.id,
  organizationId: TEST_BUSINESS.organizationId,
};

// ─── Tests: review.new event ────────────────────────────────────────────────

describe("webhook-dispatcher — review.new", () => {
  let dispatch: typeof import("@/services/webhook-dispatcher").dispatch;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetAllCounters();

    // Default results: conversation lookup, business lookup (for response generation)
    setSelectResults(
      [TEST_CONVERSATION],        // conversation lookup
      [TEST_BUSINESS],            // business lookup (for response generation)
    );

    const mod = await import("@/services/webhook-dispatcher");
    dispatch = mod.dispatch;
  });

  it("creates a message with review content in conversation thread", async () => {
    const result = await dispatch({
      type: "review.new",
      businessId: TEST_BUSINESS.id,
      organizationId: TEST_BUSINESS.organizationId,
      data: {
        reviewerName: "Jane Doe",
        rating: 5,
        reviewText: "Excellent service!",
        platform: "google",
      },
    });

    expect(mockSelect).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalled();
    expect(result.action).toBe("review_positive");
    expect(result.messageId).toBe("msg-uuid-001");
  });

  it("includes star rating in message", async () => {
    await dispatch({
      type: "review.new",
      businessId: TEST_BUSINESS.id,
      organizationId: TEST_BUSINESS.organizationId,
      data: {
        reviewerName: "John Smith",
        rating: 5,
        reviewText: "Amazing!",
        platform: "yelp",
      },
    });

    const insertedContent = mockInsertValues.mock.calls[0][0];
    const textContent = insertedContent.content.text as string;
    expect(textContent).toContain("★★★★★");
  });

  it("handles mixed sentiment (3-star) review", async () => {
    const result = await dispatch({
      type: "review.new",
      businessId: TEST_BUSINESS.id,
      organizationId: TEST_BUSINESS.organizationId,
      data: {
        reviewerName: "Bob Jones",
        rating: 3,
        reviewText: "It was okay.",
        platform: "google",
      },
    });

    expect(result.action).toBe("review_mixed");
  });

  it("attaches draft response from AI service", async () => {
    mockGenerateReviewResponse.mockResolvedValueOnce("Thanks for the feedback!");

    await dispatch({
      type: "review.new",
      businessId: TEST_BUSINESS.id,
      organizationId: TEST_BUSINESS.organizationId,
      data: {
        reviewerName: "Jane Doe",
        rating: 4,
        reviewText: "Very good!",
        platform: "google",
      },
    });

    expect(mockGenerateReviewResponse).toHaveBeenCalled();
    const insertedContent = mockInsertValues.mock.calls[0][0];
    expect(insertedContent.content).toHaveProperty("draftResponse");
  });

  it("returns null messageId when conversation not found", async () => {
    // Empty results: no conversation, no insert needed (early return)
    setSelectResults(
      [],  // no conversation found (first select in createThreadMessage)
      [TEST_BUSINESS],  // business lookup for response generation
    );
    setInsertReturnResults(
      [],  // no message insert since conversation is null
    );

    const result = await dispatch({
      type: "review.new",
      businessId: TEST_BUSINESS.id,
      organizationId: TEST_BUSINESS.organizationId,
      data: {
        reviewerName: "Jane Doe",
        rating: 5,
        reviewText: "Excellent!",
        platform: "google",
      },
    });

    // When conversation is not found, createThreadMessage returns null
    expect(result.messageId).toBeNull();
  });

  it("includes review metadata in message content", async () => {
    await dispatch({
      type: "review.new",
      businessId: TEST_BUSINESS.id,
      organizationId: TEST_BUSINESS.organizationId,
      data: {
        reviewerName: "Alice",
        rating: 4,
        reviewText: "Great place!",
        platform: "yelp",
      },
    });

    const insertedContent = mockInsertValues.mock.calls[0][0];
    expect(insertedContent.content).toHaveProperty("reviewData");
    expect(insertedContent.content.reviewData).toMatchObject({
      reviewerName: "Alice",
      rating: 4,
      platform: "yelp",
    });
  });
});

// ─── Tests: review.negative event ───────────────────────────────────────────

describe("webhook-dispatcher — review.negative", () => {
  let dispatch: typeof import("@/services/webhook-dispatcher").dispatch;

  const TEST_USER = {
    id: "user-uuid-001",
    email: "owner@testbiz.com",
    businessId: TEST_BUSINESS.id,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    resetAllCounters();

    // Results: conversation (for review.new), business (for response), business (for review.negative),
    // users table select (for email)
    setSelectResults(
      [TEST_CONVERSATION],  // conversation lookup in createThreadMessage
      [TEST_BUSINESS],      // business lookup in generateReviewResponse
      [TEST_BUSINESS],      // business lookup in review.negative handler
      [TEST_USER],          // user lookup for email
    );

    setInsertReturnResults(
      [{ id: "msg-uuid-001" }],  // message insert
    );

    const mod = await import("@/services/webhook-dispatcher");
    dispatch = mod.dispatch;
  });

  it("sends email alert in addition to thread message", async () => {
    const result = await dispatch({
      type: "review.negative",
      businessId: TEST_BUSINESS.id,
      organizationId: TEST_BUSINESS.organizationId,
      data: {
        reviewerName: "Unhappy Customer",
        rating: 2,
        reviewText: "Terrible experience.",
        platform: "google",
      },
    });

    expect(mockSendNegativeReviewAlert).toHaveBeenCalled();
    expect(result.emailSent).toBe(true);
    expect(result.action).toBe("review_negative_alerted");
  });

  it("handles email failure gracefully", async () => {
    mockSendNegativeReviewAlert.mockRejectedValueOnce(new Error("Email service down"));

    setSelectResults(
      [TEST_CONVERSATION],
      [TEST_BUSINESS],
      [TEST_BUSINESS],
      [TEST_USER],
    );

    setInsertReturnResults(
      [{ id: "msg-uuid-001" }],
    );

    const result = await dispatch({
      type: "review.negative",
      businessId: TEST_BUSINESS.id,
      organizationId: TEST_BUSINESS.organizationId,
      data: {
        reviewerName: "Bad Reviewer",
        rating: 1,
        reviewText: "Worst ever.",
        platform: "yelp",
      },
    });

    // Message still created even if email fails
    expect(result.messageId).toBe("msg-uuid-001");
    expect(result.emailSent).toBe(false);
  });

  it("includes low rating indicator (negative sentiment)", async () => {
    setSelectResults(
      [TEST_CONVERSATION],
      [TEST_BUSINESS],
      [TEST_BUSINESS],
      [TEST_USER],
    );

    setInsertReturnResults(
      [{ id: "msg-uuid-001" }],
    );

    await dispatch({
      type: "review.negative",
      businessId: TEST_BUSINESS.id,
      organizationId: TEST_BUSINESS.organizationId,
      data: {
        reviewerName: "Critical",
        rating: 1,
        reviewText: "Bad service.",
        platform: "facebook",
      },
    });

    const insertedContent = mockInsertValues.mock.calls[0][0];
    expect(insertedContent.content).toHaveProperty("status", "pending_approval");
  });
});

// ─── Tests: payment events ──────────────────────────────────────────────────

describe("webhook-dispatcher — payment events", () => {
  let dispatch: typeof import("@/services/webhook-dispatcher").dispatch;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetAllCounters();

    setSelectResults([TEST_CONVERSATION]);

    const mod = await import("@/services/webhook-dispatcher");
    dispatch = mod.dispatch;
  });

  it("payment.succeeded creates confirmation message", async () => {
    const result = await dispatch({
      type: "payment.succeeded",
      businessId: TEST_BUSINESS.id,
      organizationId: TEST_BUSINESS.organizationId,
      data: {
        amount: "$99.00",
        period: "through April 30, 2026",
      },
    });

    expect(result.action).toBe("payment_confirmed");
    expect(result.messageId).toBe("msg-uuid-001");

    const insertedContent = mockInsertValues.mock.calls[0][0];
    const text = insertedContent.content.text as string;
    expect(text).toContain("Payment confirmed");
  });

  it("payment.failed creates alert message", async () => {
    const result = await dispatch({
      type: "payment.failed",
      businessId: TEST_BUSINESS.id,
      organizationId: TEST_BUSINESS.organizationId,
      data: {},
    });

    expect(result.action).toBe("payment_failed_notified");

    const insertedContent = mockInsertValues.mock.calls[0][0];
    const text = insertedContent.content.text as string;
    expect(text).toContain("payment didn't go through");
  });
});

// ─── Tests: subscription events ─────────────────────────────────────────────

describe("webhook-dispatcher — subscription events", () => {
  let dispatch: typeof import("@/services/webhook-dispatcher").dispatch;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetAllCounters();

    setSelectResults([TEST_CONVERSATION]);

    const mod = await import("@/services/webhook-dispatcher");
    dispatch = mod.dispatch;
  });

  it("subscription.activated with pro plan", async () => {
    const result = await dispatch({
      type: "subscription.activated",
      businessId: TEST_BUSINESS.id,
      organizationId: TEST_BUSINESS.organizationId,
      data: { plan: "pro" },
    });

    expect(result.action).toBe("subscription_pro");
    const insertedContent = mockInsertValues.mock.calls[0][0];
    const text = insertedContent.content.text as string;
    expect(text).toContain("Pro");
  });

  it("subscription.activated with base plan", async () => {
    const result = await dispatch({
      type: "subscription.activated",
      businessId: TEST_BUSINESS.id,
      organizationId: TEST_BUSINESS.organizationId,
      data: { plan: "base" },
    });

    expect(result.action).toBe("subscription_base");
  });

  it("subscription.cancelled creates farewell message", async () => {
    const result = await dispatch({
      type: "subscription.cancelled",
      businessId: TEST_BUSINESS.id,
      organizationId: TEST_BUSINESS.organizationId,
      data: {},
    });

    expect(result.action).toBe("subscription_cancelled");
    const insertedContent = mockInsertValues.mock.calls[0][0];
    const text = insertedContent.content.text as string;
    expect(text).toContain("subscription has been cancelled");
  });

  it("subscription.changed upgrade", async () => {
    const result = await dispatch({
      type: "subscription.changed",
      businessId: TEST_BUSINESS.id,
      organizationId: TEST_BUSINESS.organizationId,
      data: { oldPlan: "base", newPlan: "pro" },
    });

    expect(result.action).toBe("plan_upgraded");
  });

  it("subscription.changed downgrade", async () => {
    const result = await dispatch({
      type: "subscription.changed",
      businessId: TEST_BUSINESS.id,
      organizationId: TEST_BUSINESS.organizationId,
      data: { oldPlan: "pro", newPlan: "base" },
    });

    expect(result.action).toBe("plan_downgraded");
  });
});

// ─── Tests: integration events ──────────────────────────────────────────────

describe("webhook-dispatcher — integration events", () => {
  let dispatch: typeof import("@/services/webhook-dispatcher").dispatch;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetAllCounters();

    setSelectResults([TEST_CONVERSATION]);

    const mod = await import("@/services/webhook-dispatcher");
    dispatch = mod.dispatch;
  });

  it("integration.connected google_business", async () => {
    const result = await dispatch({
      type: "integration.connected",
      businessId: TEST_BUSINESS.id,
      organizationId: TEST_BUSINESS.organizationId,
      data: { platform: "google_business" },
    });

    expect(result.action).toBe("connected_google_business");
    const insertedContent = mockInsertValues.mock.calls[0][0];
    const text = insertedContent.content.text as string;
    expect(text).toContain("Google Business Profile");
  });

  it("integration.connected meta (Instagram/Facebook)", async () => {
    const result = await dispatch({
      type: "integration.connected",
      businessId: TEST_BUSINESS.id,
      organizationId: TEST_BUSINESS.organizationId,
      data: { platform: "meta" },
    });

    expect(result.action).toBe("connected_meta");
    const insertedContent = mockInsertValues.mock.calls[0][0];
    const text = insertedContent.content.text as string;
    expect(text).toContain("Instagram and Facebook");
  });

  it("integration.disconnected with reason", async () => {
    const result = await dispatch({
      type: "integration.disconnected",
      businessId: TEST_BUSINESS.id,
      organizationId: TEST_BUSINESS.organizationId,
      data: {
        platform: "google_business",
        reason: "token expired",
      },
    });

    expect(result.action).toBe("disconnected_google_business");
    const insertedContent = mockInsertValues.mock.calls[0][0];
    const text = insertedContent.content.text as string;
    expect(text).toContain("connection needs to be refreshed");
  });

  it("integration.error with error message", async () => {
    const result = await dispatch({
      type: "integration.error",
      businessId: TEST_BUSINESS.id,
      organizationId: TEST_BUSINESS.organizationId,
      data: {
        platform: "meta",
        error: "Rate limit exceeded",
      },
    });

    expect(result.action).toBe("error_meta");
    const insertedContent = mockInsertValues.mock.calls[0][0];
    const text = insertedContent.content.text as string;
    expect(text).toContain("Rate limit exceeded");
  });
});

// ─── Tests: unhandled event types ───────────────────────────────────────────

describe("webhook-dispatcher — unhandled events", () => {
  let dispatch: typeof import("@/services/webhook-dispatcher").dispatch;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetAllCounters();

    const mod = await import("@/services/webhook-dispatcher");
    dispatch = mod.dispatch;
  });

  it("returns null for unknown event type", async () => {
    const result = await dispatch({
      type: "unknown.event" as any,
      businessId: TEST_BUSINESS.id,
      organizationId: TEST_BUSINESS.organizationId,
      data: {},
    });

    expect(result.messageId).toBeNull();
    expect(result.action).toContain("unhandled:");
  });
});

// ─── Integration tests ──────────────────────────────────────────────────────

describe("webhook-dispatcher — integration", () => {
  let dispatch: typeof import("@/services/webhook-dispatcher").dispatch;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetAllCounters();

    const mod = await import("@/services/webhook-dispatcher");
    dispatch = mod.dispatch;
  });

  it("routes multiple event types to same business conversation", async () => {
    // review.new: conversation lookup + business lookup
    setSelectResults([TEST_CONVERSATION], [TEST_BUSINESS]);

    await dispatch({
      type: "review.new",
      businessId: TEST_BUSINESS.id,
      organizationId: TEST_BUSINESS.organizationId,
      data: {
        reviewerName: "Jane",
        rating: 5,
        reviewText: "Great!",
        platform: "google",
      },
    });

    resetAllCounters();
    // payment.succeeded: conversation lookup only
    setSelectResults([TEST_CONVERSATION]);

    await dispatch({
      type: "payment.succeeded",
      businessId: TEST_BUSINESS.id,
      organizationId: TEST_BUSINESS.organizationId,
      data: { amount: "$99" },
    });

    // Both messages inserted (review.new + payment.succeeded = 2 inserts)
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it("different businesses get separate conversations", async () => {
    const biz2 = { ...TEST_BUSINESS, id: "biz-uuid-002" };
    const convo2 = { ...TEST_CONVERSATION, businessId: "biz-uuid-002" };

    setSelectResults([TEST_CONVERSATION]); // biz 1

    await dispatch({
      type: "payment.succeeded",
      businessId: TEST_BUSINESS.id,
      organizationId: TEST_BUSINESS.organizationId,
      data: {},
    });

    resetAllCounters();
    setSelectResults([convo2]); // biz 2

    await dispatch({
      type: "payment.succeeded",
      businessId: biz2.id,
      organizationId: TEST_BUSINESS.organizationId,
      data: {},
    });

    // Verify separate conversations were used
    expect(mockSelect).toHaveBeenCalledTimes(2);
  });
});
