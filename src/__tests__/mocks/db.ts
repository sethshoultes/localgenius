/**
 * Mock for @/lib/db
 *
 * Provides a chainable mock that mirrors Drizzle ORM's query builder API.
 * Each test can configure return values via mockReturnValue / mockResolvedValue.
 */

import { vi } from "vitest";

// ─── Realistic test data matching the schema ────────────────────────────────

export const TEST_ORG = {
  id: "org-uuid-001",
  name: "Test Biz Inc",
  plan: "base",
  stripeCustomerId: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
  deletedAt: null,
};

export const TEST_BUSINESS = {
  id: "biz-uuid-001",
  organizationId: "org-uuid-001",
  name: "Test Biz Inc",
  vertical: "restaurant",
  city: "Austin",
  state: "TX",
  address: "123 Main St",
  phone: "512-555-0100",
  employeeCount: 5,
  timezone: "America/Chicago",
  onboardingCompletedAt: null,
  priorityFocus: null,
  autonomyLevel: 0,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
  deletedAt: null,
};

export const TEST_USER = {
  id: "user-uuid-001",
  organizationId: "org-uuid-001",
  businessId: "biz-uuid-001",
  email: "owner@testbiz.com",
  phone: null,
  name: "Test Owner",
  role: "owner",
  authProvider: "email",
  passwordHash: "abc123:def456",
  consentAt: new Date("2025-01-01"),
  lastActiveAt: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
  deletedAt: null,
};

export const TEST_CONVERSATION = {
  id: "conv-uuid-001",
  businessId: "biz-uuid-001",
  organizationId: "org-uuid-001",
  createdAt: new Date("2025-01-01"),
};

export const TEST_MESSAGE_OWNER = {
  id: "msg-uuid-001",
  conversationId: "conv-uuid-001",
  businessId: "biz-uuid-001",
  organizationId: "org-uuid-001",
  role: "owner",
  contentType: "text",
  content: { text: "How should I respond to this review?" },
  aiModel: null,
  tokensInput: null,
  tokensOutput: null,
  createdAt: new Date("2025-01-02"),
};

export const TEST_MESSAGE_ASSISTANT = {
  id: "msg-uuid-002",
  conversationId: "conv-uuid-001",
  businessId: "biz-uuid-001",
  organizationId: "org-uuid-001",
  role: "assistant",
  contentType: "text",
  content: { text: "Here is a suggested response for your review..." },
  aiModel: "claude-sonnet-4-6-20250514",
  tokensInput: 100,
  tokensOutput: 50,
  createdAt: new Date("2025-01-02"),
};

export const TEST_REVIEW = {
  id: "review-uuid-001",
  businessId: "biz-uuid-001",
  organizationId: "org-uuid-001",
  platform: "google",
  externalReviewId: "ext-review-001",
  reviewerName: "Jane Doe",
  rating: 4,
  reviewText: "Great food, friendly staff!",
  reviewDate: new Date("2025-01-15"),
  sentiment: "positive",
  keyTopics: ["food", "staff"],
  createdAt: new Date("2025-01-15"),
};

export const TEST_REVIEW_RESPONSE = {
  id: "rr-uuid-001",
  reviewId: "review-uuid-001",
  businessId: "biz-uuid-001",
  organizationId: "org-uuid-001",
  actionId: "action-uuid-001",
  responseText: "Thank you, Jane! We appreciate your kind words.",
  postedAt: new Date("2025-01-16"),
  postedToPlatform: true,
  createdAt: new Date("2025-01-16"),
};

export const TEST_ACTION = {
  id: "action-uuid-001",
  businessId: "biz-uuid-001",
  organizationId: "org-uuid-001",
  messageId: null,
  actionType: "social_post",
  status: "proposed",
  content: { text: "Check out our latest specials!" },
  scheduledFor: null,
  approvedAt: null,
  executedAt: null,
  autoApproved: false,
  externalId: null,
  externalPlatform: null,
  errorDetails: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

export const TEST_CONTENT_ITEM = {
  id: "content-uuid-001",
  businessId: "biz-uuid-001",
  organizationId: "org-uuid-001",
  actionId: null,
  contentType: "social_post",
  content: { text: "Check out our latest specials!", platform: "instagram", topic: "weekly specials" },
  version: 1,
  approved: false,
  performance: null,
  aiModel: "claude-sonnet-4-6-20250514",
  tokensUsed: null,
  createdAt: new Date("2025-01-01"),
};

export const TEST_ANALYTICS_EVENT = {
  id: "event-uuid-001",
  businessId: "biz-uuid-001",
  organizationId: "org-uuid-001",
  eventType: "page_view",
  source: "google_analytics",
  metadata: {},
  occurredAt: new Date("2025-01-20"),
  createdAt: new Date("2025-01-20"),
};

export const TEST_WEEKLY_DIGEST = {
  id: "digest-uuid-001",
  businessId: "biz-uuid-001",
  organizationId: "org-uuid-001",
  messageId: null,
  periodStart: new Date("2025-01-13"),
  periodEnd: new Date("2025-01-20"),
  metrics: { reviewsReceived: 5, averageRating: 4.2, actionsCompleted: 8 },
  actionsCompleted: { socialPosts: 3, reviewResponses: 5, total: 8 },
  recommendations: { narrative: "Great week! Consider posting more on Instagram." },
  shareableUrl: null,
  createdAt: new Date("2025-01-20"),
};

// ─── Chainable mock builder ─────────────────────────────────────────────────

/**
 * Creates a chainable query mock that simulates Drizzle's fluent API:
 *   db.select().from(table).where(...).orderBy(...).limit(n)
 *   db.insert(table).values(...).returning()
 *   db.update(table).set(...).where(...)
 *
 * Call `mockChain.setResult(value)` to set what the chain resolves to.
 */
export function createChainMock(defaultResult: unknown = []) {
  let _result: unknown = defaultResult;

  const chain: Record<string, unknown> = {};
  const methods = ["from", "where", "orderBy", "limit", "set", "values", "returning", "leftJoin", "innerJoin", "groupBy", "having"];

  for (const method of methods) {
    chain[method] = vi.fn().mockImplementation(() => {
      // Terminal methods that typically end the chain resolve to the result
      if (method === "returning" || method === "limit") {
        return Promise.resolve(_result);
      }
      return chain;
    });
  }

  // Make the chain itself thenable so `await db.select().from(t).where(...)` works
  chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
    return Promise.resolve(_result).then(resolve, reject);
  };

  return {
    chain,
    setResult(value: unknown) {
      _result = value;
      // Also update returning and limit to resolve to the new value
      (chain.returning as ReturnType<typeof vi.fn>).mockImplementation(() => Promise.resolve(value));
      (chain.limit as ReturnType<typeof vi.fn>).mockImplementation(() => {
        // Return chain but thenable resolves to value
        const limitChain = { ...chain };
        limitChain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
          return Promise.resolve(value).then(resolve, reject);
        };
        return limitChain;
      });
    },
  };
}

// ─── The mock db object ─────────────────────────────────────────────────────

export const selectChain = createChainMock([]);
export const insertChain = createChainMock([]);
export const updateChain = createChainMock([]);

export const mockDb = {
  select: vi.fn().mockImplementation(() => selectChain.chain),
  insert: vi.fn().mockImplementation(() => insertChain.chain),
  update: vi.fn().mockImplementation(() => updateChain.chain),
};

/**
 * Reset all db mocks between tests. Call in beforeEach.
 */
export function resetDbMocks() {
  mockDb.select.mockClear();
  mockDb.insert.mockClear();
  mockDb.update.mockClear();

  selectChain.setResult([]);
  insertChain.setResult([]);
  updateChain.setResult(undefined);
}
