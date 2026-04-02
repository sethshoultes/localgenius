/**
 * Tests for src/services/content-scheduler.ts
 * — schedule(), getUpcoming(), cancel(), publishDue()
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TEST_BUSINESS } from "../mocks/db";

// ─── Module mocks ────────────────────────────────────────────────────────────

// Mock DB — chainable Drizzle-style
const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

const mockSelectResult = vi.fn();
const mockSelectLimit = vi.fn().mockImplementation(() => mockSelectResult());
const mockSelectOrderBy = vi.fn().mockReturnValue({ limit: mockSelectLimit });
const mockSelectWhere = vi.fn().mockReturnValue({
  limit: mockSelectLimit,
  orderBy: mockSelectOrderBy,
});
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
  getDb: vi.fn(),
}));

// Mock schema
vi.mock("@/db/schema", () => ({
  scheduledPosts: {
    id: "scheduledPosts.id",
    businessId: "scheduledPosts.businessId",
    organizationId: "scheduledPosts.organizationId",
    status: "scheduledPosts.status",
    scheduledFor: "scheduledPosts.scheduledFor",
    actionId: "scheduledPosts.actionId",
  },
  contentItems: {
    businessId: "contentItems.businessId",
    contentType: "contentItems.contentType",
  },
  actions: {
    id: "actions.id",
  },
  businesses: {
    id: "businesses.id",
  },
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  lte: vi.fn((...args: unknown[]) => ({ type: "lte", args })),
  desc: vi.fn(),
  sql: vi.fn(),
}));

// Mock AI service
const mockGenerateSocialPost = vi.fn().mockResolvedValue("Fresh catch of the day! Come try our famous fish tacos. #AustinEats #FishFriday");

vi.mock("@/services/ai", () => ({
  generateSocialPost: (...args: unknown[]) => mockGenerateSocialPost(...args),
}));

// ─── Test data ──────────────────────────────────────────────────────────────

const SCHEDULED_FOR = new Date("2026-04-10T17:00:00Z");

const TEST_SCHEDULED_POST = {
  id: "sched-post-001",
  businessId: "biz-uuid-001",
  organizationId: "org-uuid-001",
  contentItemId: "content-uuid-001",
  actionId: "action-uuid-001",
  platform: "instagram",
  content: { text: "Fish taco special!", mediaUrls: [], topic: "fish tacos" },
  scheduledFor: SCHEDULED_FOR,
  status: "pending",
  publishedAt: null,
  errorDetails: null,
  createdAt: new Date("2026-04-02"),
};

const TEST_CONTENT_ITEM_RESULT = {
  id: "content-uuid-new",
  businessId: "biz-uuid-001",
  organizationId: "org-uuid-001",
  contentType: "social_post",
  content: { text: "Fish taco special!", mediaUrls: [], topic: "fish tacos" },
  aiModel: "claude-sonnet-4-20250514",
  approved: true,
};

const TEST_ACTION_RESULT = {
  id: "action-uuid-new",
  businessId: "biz-uuid-001",
  organizationId: "org-uuid-001",
  actionType: "social_post",
  status: "scheduled",
  content: { text: "Fish taco special!", mediaUrls: [], topic: "fish tacos", platform: "instagram" },
  scheduledFor: SCHEDULED_FOR,
};

const TEST_SCHEDULED_POST_RESULT = {
  id: "sched-post-new",
  businessId: "biz-uuid-001",
  organizationId: "org-uuid-001",
  contentItemId: "content-uuid-new",
  actionId: "action-uuid-new",
  platform: "instagram",
  content: { text: "Fish taco special!", mediaUrls: [], topic: "fish tacos" },
  scheduledFor: SCHEDULED_FOR,
  status: "pending",
};

// ─── Tests: schedule() ──────────────────────────────────────────────────────

describe("Content Scheduler — schedule()", () => {
  let scheduleFn: typeof import("@/services/content-scheduler").schedule;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default: 3 sequential inserts — contentItem, action, scheduledPost
    let insertCallCount = 0;
    mockInsertReturning.mockImplementation(() => {
      insertCallCount++;
      switch (insertCallCount) {
        case 1: return Promise.resolve([TEST_CONTENT_ITEM_RESULT]);
        case 2: return Promise.resolve([TEST_ACTION_RESULT]);
        case 3: return Promise.resolve([TEST_SCHEDULED_POST_RESULT]);
        default: return Promise.resolve([]);
      }
    });

    const mod = await import("@/services/content-scheduler");
    scheduleFn = mod.schedule;
  });

  it("schedules a post with pre-generated content", async () => {
    const result = await scheduleFn({
      businessId: "biz-uuid-001",
      organizationId: "org-uuid-001",
      platform: "instagram",
      topic: "fish tacos",
      scheduledFor: SCHEDULED_FOR,
      content: "Fish taco special this Friday!",
    });

    expect(result.id).toBe("sched-post-new");
    expect(result.platform).toBe("instagram");
    expect(result.status).toBe("pending");
    expect(result.scheduledFor).toEqual(SCHEDULED_FOR);
    expect(result.content.text).toBe("Fish taco special this Friday!");

    // Should NOT call AI since content was provided
    expect(mockGenerateSocialPost).not.toHaveBeenCalled();

    // Should insert content item, action, and scheduled post
    expect(mockInsert).toHaveBeenCalledTimes(3);
  });

  it("generates content via AI when no content is provided", async () => {
    // First select call returns the business (for AI context)
    mockSelectResult.mockResolvedValue([TEST_BUSINESS]);

    const result = await scheduleFn({
      businessId: "biz-uuid-001",
      organizationId: "org-uuid-001",
      platform: "facebook",
      topic: "weekend brunch",
      scheduledFor: SCHEDULED_FOR,
    });

    expect(mockGenerateSocialPost).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TEST_BUSINESS.name,
        vertical: TEST_BUSINESS.vertical,
        city: TEST_BUSINESS.city,
      }),
      "weekend brunch"
    );
    expect(result.id).toBe("sched-post-new");
    expect(mockInsert).toHaveBeenCalledTimes(3);
  });

  it("handles database insert failure", async () => {
    mockInsertReturning.mockRejectedValueOnce(new Error("DB connection lost"));

    await expect(
      scheduleFn({
        businessId: "biz-uuid-001",
        organizationId: "org-uuid-001",
        platform: "instagram",
        topic: "test",
        scheduledFor: SCHEDULED_FOR,
        content: "Test post",
      })
    ).rejects.toThrow("DB connection lost");
  });
});

// ─── Tests: getUpcoming() ───────────────────────────────────────────────────

describe("Content Scheduler — getUpcoming()", () => {
  let getUpcoming: typeof import("@/services/content-scheduler").getUpcoming;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Make orderBy return an object with limit
    mockSelectWhere.mockReturnValue({
      orderBy: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
      limit: mockSelectLimit,
    });

    const mod = await import("@/services/content-scheduler");
    getUpcoming = mod.getUpcoming;
  });

  it("returns formatted list of upcoming scheduled posts", async () => {
    const posts = [
      TEST_SCHEDULED_POST,
      { ...TEST_SCHEDULED_POST, id: "sched-post-002", scheduledFor: new Date("2026-04-11T11:00:00Z") },
    ];

    mockSelectWhere.mockReturnValue({
      orderBy: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(posts),
      }),
      limit: mockSelectLimit,
    });

    const result = await getUpcoming("biz-uuid-001", "org-uuid-001");

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("sched-post-001");
    expect(result[0].platform).toBe("instagram");
    expect(result[0].status).toBe("pending");
    expect(result[0].content.text).toBe("Fish taco special!");
    expect(result[1].id).toBe("sched-post-002");
  });

  it("returns empty array when no posts are scheduled", async () => {
    mockSelectWhere.mockReturnValue({
      orderBy: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
      limit: mockSelectLimit,
    });

    const result = await getUpcoming("biz-uuid-001", "org-uuid-001");

    expect(result).toEqual([]);
  });
});

// ─── Tests: cancel() ────────────────────────────────────────────────────────

describe("Content Scheduler — cancel()", () => {
  let cancel: typeof import("@/services/content-scheduler").cancel;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import("@/services/content-scheduler");
    cancel = mod.cancel;
  });

  it("cancels a pending scheduled post and its action", async () => {
    // Post found
    mockSelectResult.mockResolvedValue([TEST_SCHEDULED_POST]);

    const result = await cancel("sched-post-001", "biz-uuid-001");

    expect(result).toBe(true);

    // Should update scheduledPost status to cancelled
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "cancelled" })
    );

    // Should also update the action status to rejected
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });

  it("returns false when post is not found (wrong id or not pending)", async () => {
    mockSelectResult.mockResolvedValue([]);

    const result = await cancel("nonexistent-id", "biz-uuid-001");

    expect(result).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("skips action cancellation when post has no actionId", async () => {
    mockSelectResult.mockResolvedValue([{ ...TEST_SCHEDULED_POST, actionId: null }]);

    const result = await cancel("sched-post-001", "biz-uuid-001");

    expect(result).toBe(true);
    // Should only update scheduledPost, not the action
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});

// ─── Tests: publishDue() ────────────────────────────────────────────────────

describe("Content Scheduler — publishDue()", () => {
  let publishDue: typeof import("@/services/content-scheduler").publishDue;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import("@/services/content-scheduler");
    publishDue = mod.publishDue;
  });

  it("publishes due posts and returns count", async () => {
    const duePosts = [
      TEST_SCHEDULED_POST,
      { ...TEST_SCHEDULED_POST, id: "sched-post-002", actionId: "action-uuid-002" },
    ];

    // Make the where chain for select return orderBy -> limit
    mockSelectWhere.mockReturnValue({
      orderBy: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(duePosts),
      }),
      limit: mockSelectLimit,
    });

    const result = await publishDue();

    expect(result.published).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.errors).toEqual([]);

    // Should update each post status to published + update each action
    // 2 posts x 2 updates each = 4 update calls
    expect(mockUpdate).toHaveBeenCalledTimes(4);
  });

  it("returns zeros when no posts are due", async () => {
    mockSelectWhere.mockReturnValue({
      orderBy: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
      limit: mockSelectLimit,
    });

    const result = await publishDue();

    expect(result.published).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.errors).toEqual([]);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("handles partial failures and reports errors", async () => {
    const duePosts = [
      TEST_SCHEDULED_POST,
      { ...TEST_SCHEDULED_POST, id: "sched-post-fail", actionId: "action-fail" },
    ];

    mockSelectWhere.mockReturnValue({
      orderBy: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(duePosts),
      }),
      limit: mockSelectLimit,
    });

    // First post succeeds, second post fails on update
    let updateCallCount = 0;
    mockUpdateSet.mockImplementation(() => {
      updateCallCount++;
      // Call 1: first post status update (published) — succeeds
      // Call 2: first post action update — succeeds
      // Call 3: second post status update (published) — fails
      if (updateCallCount === 3) {
        return {
          where: vi.fn().mockRejectedValue(new Error("DB timeout")),
        };
      }
      return { where: mockUpdateWhere };
    });

    const result = await publishDue();

    expect(result.published).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("sched-post-fail");
    expect(result.errors[0]).toContain("DB timeout");
  });
});
