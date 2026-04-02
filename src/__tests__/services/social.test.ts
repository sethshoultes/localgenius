/**
 * Tests for src/services/social.ts
 * Social post generation, publishing, scheduling, platform selection (Instagram vs Facebook).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TEST_BUSINESS } from "../mocks/db";

// ─── Module mocks ────────────────────────────────────────────────────────────

// Mock DB — sequential select/insert tracking
let selectCallCount = 0;
const selectResults: unknown[][] = [];

function makeThenable(result: unknown[]) {
  const obj: Record<string, unknown> = {};
  obj.limit = vi.fn().mockImplementation(() => makeThenable(result));
  obj.orderBy = vi.fn().mockImplementation(() => makeThenable(result));
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

let insertCallCount = 0;
const insertResults: unknown[][] = [];

const mockInsertReturning = vi.fn().mockImplementation(() => {
  const result = insertResults[insertCallCount] || [];
  insertCallCount++;
  return Promise.resolve(result);
});
const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

// Mock schema
vi.mock("@/db/schema", () => ({
  businesses: { id: "businesses.id", name: "businesses.name", vertical: "businesses.vertical", city: "businesses.city" },
  contentItems: {
    businessId: "contentItems.businessId",
    organizationId: "contentItems.organizationId",
    contentType: "contentItems.contentType",
    content: "contentItems.content",
    aiModel: "contentItems.aiModel",
  },
  actions: {
    id: "actions.id",
    businessId: "actions.businessId",
    organizationId: "actions.organizationId",
    actionType: "actions.actionType",
    status: "actions.status",
    content: "actions.content",
    autoApproved: "actions.autoApproved",
    executedAt: "actions.executedAt",
    externalId: "actions.externalId",
    externalPlatform: "actions.externalPlatform",
  },
  businessSettings: {},
  analyticsEvents: {},
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ op: "eq", args })),
  and: vi.fn((...args: unknown[]) => ({ op: "and", args })),
}));

// Mock AI service
const mockGenerateSocialPost = vi.fn();
vi.mock("@/services/ai", () => ({
  generateSocialPost: (...args: unknown[]) => mockGenerateSocialPost(...args),
}));

// Mock Meta social API
const mockPublishToFacebook = vi.fn();
const mockPublishToInstagram = vi.fn();
const mockGetMetaToken = vi.fn();

vi.mock("@/services/meta-social", () => ({
  publishToFacebook: (...args: unknown[]) => mockPublishToFacebook(...args),
  publishToInstagram: (...args: unknown[]) => mockPublishToInstagram(...args),
  getAccessToken: (...args: unknown[]) => mockGetMetaToken(...args),
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

// ─── Tests: generatePost ─────────────────────────────────────────────────────

describe("generatePost", () => {
  let generatePost: typeof import("@/services/social").generatePost;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetAllCounters();

    const mod = await import("@/services/social");
    generatePost = mod.generatePost;
  });

  it("generates a social post with watermark for instagram", async () => {
    setSelectResults([TEST_BUSINESS]);
    mockGenerateSocialPost.mockResolvedValueOnce("Amazing fresh fish tacos available today!");

    const result = await generatePost("biz-uuid-001", "fish tacos", "instagram");

    expect(result.text).toContain("Amazing fresh fish tacos available today!");
    expect(result.text).toContain("\n\nPosted by LocalGenius");
    expect(result.platform).toBe("instagram");
  });

  it("generates a social post with watermark for facebook", async () => {
    setSelectResults([TEST_BUSINESS]);
    mockGenerateSocialPost.mockResolvedValueOnce("Check out our new menu items!");

    const result = await generatePost("biz-uuid-001", "new menu", "facebook");

    expect(result.text).toContain("Check out our new menu items!");
    expect(result.text).toContain("\n\nPosted by LocalGenius");
    expect(result.platform).toBe("facebook");
  });

  it("queries business by ID", async () => {
    setSelectResults([TEST_BUSINESS]);
    mockGenerateSocialPost.mockResolvedValueOnce("Test post");

    await generatePost("biz-uuid-001", "topic", "instagram");

    expect(mockSelect).toHaveBeenCalled();
    expect(mockSelectFrom).toHaveBeenCalled();
  });

  it("calls generateSocialPost with business info", async () => {
    setSelectResults([{
      ...TEST_BUSINESS,
      name: "Joe's Taco Shop",
      vertical: "restaurant",
      city: "Austin",
    }]);
    mockGenerateSocialPost.mockResolvedValueOnce("Test post");

    await generatePost("biz-uuid-001", "specials", "instagram");

    expect(mockGenerateSocialPost).toHaveBeenCalledWith(
      {
        name: "Joe's Taco Shop",
        vertical: "restaurant",
        city: "Austin",
      },
      "specials"
    );
  });

  it("defaults to instagram when platform not specified", async () => {
    setSelectResults([TEST_BUSINESS]);
    mockGenerateSocialPost.mockResolvedValueOnce("Default platform post");

    const result = await generatePost("biz-uuid-001", "topic");

    expect(result.platform).toBe("instagram");
  });

  it("throws error when business not found", async () => {
    setSelectResults([]); // empty array = no business found
    mockGenerateSocialPost.mockResolvedValueOnce("Should not be called");

    await expect(generatePost("nonexistent", "topic")).rejects.toThrow(
      "Business not found"
    );
  });
});

// ─── Tests: publishPost ──────────────────────────────────────────────────────

describe("publishPost", () => {
  let publishPost: typeof import("@/services/social").publishPost;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetAllCounters();

    const mod = await import("@/services/social");
    publishPost = mod.publishPost;
  });

  it("publishes to instagram with real Meta credentials", async () => {
    mockGetMetaToken.mockResolvedValueOnce("meta_token_123");
    mockPublishToInstagram.mockResolvedValueOnce({
      id: "ig_post_001",
      success: true,
    });

    const result = await publishPost("biz-uuid-001", "instagram", {
      text: "Check out our specials!",
      imageUrl: "https://cdn.example.com/image.jpg",
    });

    expect(result.platform).toBe("instagram");
    expect(result.success).toBe(true);
    expect(result.id).toBe("ig_post_001");
    expect(result.postUrl).toContain("instagram.com/p/ig_post_001");
    expect(result.live).toBe(true);
  });

  it("publishes to facebook with real Meta credentials", async () => {
    mockGetMetaToken.mockResolvedValueOnce("meta_token_123");
    mockPublishToFacebook.mockResolvedValueOnce({
      id: "fb_post_001",
      success: true,
    });

    const result = await publishPost("biz-uuid-001", "facebook", {
      text: "New menu item alert!",
    });

    expect(result.platform).toBe("facebook");
    expect(result.success).toBe(true);
    expect(result.id).toBe("fb_post_001");
    expect(result.postUrl).toContain("facebook.com/fb_post_001");
    expect(result.live).toBe(true);
  });

  it("uses mock mode when no Meta credentials available", async () => {
    mockGetMetaToken.mockResolvedValueOnce(null);

    const result = await publishPost("biz-uuid-001", "instagram", {
      text: "Mock post",
    });

    expect(result.success).toBe(true);
    expect(result.live).toBe(false);
    expect(result.id).toMatch(/dev_instagram_\d+/);
    expect(result.postUrl).toContain("instagram.com/p/");
    expect(mockPublishToInstagram).not.toHaveBeenCalled();
  });

  it("generates dev mock post ID with timestamp for facebook", async () => {
    mockGetMetaToken.mockResolvedValueOnce(null);

    const result = await publishPost("biz-uuid-001", "facebook", {
      text: "Mock facebook post",
    });

    expect(result.success).toBe(true);
    expect(result.live).toBe(false);
    expect(result.id).toMatch(/dev_facebook_\d+/);
    expect(result.postUrl).toContain("facebook.com/post/");
  });

  it("returns error from Meta API when publish fails", async () => {
    mockGetMetaToken.mockResolvedValueOnce("meta_token_123");
    mockPublishToInstagram.mockResolvedValueOnce({
      id: "ig_post_002",
      success: false,
      error: "Rate limit exceeded",
    });

    const result = await publishPost("biz-uuid-001", "instagram", {
      text: "This will fail",
      imageUrl: "https://cdn.example.com/image.jpg",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Rate limit exceeded");
    expect(result.live).toBe(true);
  });

  it("catches exception from Meta API and returns error", async () => {
    mockGetMetaToken.mockResolvedValueOnce("meta_token_123");
    mockPublishToFacebook.mockRejectedValueOnce(new Error("Network timeout"));

    const result = await publishPost("biz-uuid-001", "facebook", {
      text: "This will error",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Network timeout");
    expect(result.live).toBe(true);
    expect(result.id).toBe("");
    expect(result.postUrl).toBe("");
  });

  it("passes image URL to Instagram but not Facebook", async () => {
    mockGetMetaToken.mockResolvedValueOnce("meta_token_123");
    mockPublishToInstagram.mockResolvedValueOnce({
      id: "ig_post_003",
      success: true,
    });

    await publishPost("biz-uuid-001", "instagram", {
      text: "Instagram post",
      imageUrl: "https://cdn.example.com/image.jpg",
    });

    expect(mockPublishToInstagram).toHaveBeenCalledWith("biz-uuid-001", {
      text: "Instagram post",
      imageUrl: "https://cdn.example.com/image.jpg",
    });
  });

  it("calls correct Meta API based on platform", async () => {
    mockGetMetaToken.mockResolvedValueOnce("meta_token_123");
    mockPublishToFacebook.mockResolvedValueOnce({
      id: "fb_post_002",
      success: true,
    });

    await publishPost("biz-uuid-001", "facebook", {
      text: "Facebook only",
    });

    expect(mockPublishToFacebook).toHaveBeenCalled();
    expect(mockPublishToInstagram).not.toHaveBeenCalled();
  });
});

// ─── Tests: createAndPublishPost ─────────────────────────────────────────────

describe("createAndPublishPost", () => {
  let createAndPublishPost: typeof import("@/services/social").createAndPublishPost;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetAllCounters();

    const mod = await import("@/services/social");
    createAndPublishPost = mod.createAndPublishPost;
  });

  it("generates, stores, and creates action without auto-publishing", async () => {
    // generatePost: select business
    setSelectResults([TEST_BUSINESS]);
    mockGenerateSocialPost.mockResolvedValueOnce("Generated post content!");

    // createAndPublishPost: insert contentItem, then insert action
    setInsertResults(
      [{
        id: "content-uuid-001",
        businessId: "biz-uuid-001",
        organizationId: "org-uuid-001",
        contentType: "social_post",
      }],
      [{
        id: "action-uuid-001",
        businessId: "biz-uuid-001",
        organizationId: "org-uuid-001",
        actionType: "social_post",
        status: "proposed",
      }],
    );

    mockGetMetaToken.mockResolvedValueOnce(null);

    const result = await createAndPublishPost(
      "biz-uuid-001",
      "org-uuid-001",
      "specials",
      "instagram",
      false
    );

    expect(result.content.id).toBe("content-uuid-001");
    expect(result.action.id).toBe("action-uuid-001");
    expect(result.published).toBe(false);
    expect(result.postUrl).toBeNull();
    expect(result.action.status).toBe("proposed");
  });

  it("auto-publishes when autoPublish is true", async () => {
    setSelectResults([TEST_BUSINESS]);
    mockGenerateSocialPost.mockResolvedValueOnce("Generated post");

    setInsertResults(
      [{ id: "content-uuid-001" }],
      [{ id: "action-uuid-001", status: "completed" }],
    );

    mockGetMetaToken.mockResolvedValueOnce("meta_token_123");
    mockPublishToInstagram.mockResolvedValueOnce({
      id: "ig_post_001",
      success: true,
    });

    const result = await createAndPublishPost(
      "biz-uuid-001",
      "org-uuid-001",
      "specials",
      "instagram",
      true
    );

    expect(result.published).toBe(true);
    expect(result.postUrl).toContain("instagram.com/p/");
    expect(result.live).toBe(true);
  });

  it("creates action with completed status when autoPublish is true", async () => {
    setSelectResults([TEST_BUSINESS]);
    mockGenerateSocialPost.mockResolvedValueOnce("Generated");

    setInsertResults(
      [{ id: "content-uuid-001" }],
      [{
        id: "action-uuid-001",
        status: "completed",
        autoApproved: true,
        executedAt: new Date(),
      }],
    );

    mockGetMetaToken.mockResolvedValueOnce(null);

    const result = await createAndPublishPost(
      "biz-uuid-001",
      "org-uuid-001",
      "topic",
      "instagram",
      true
    );

    expect(result.action.status).toBe("completed");
    expect(result.action.autoApproved).toBe(true);
  });

  it("updates action with external ID when publish succeeds", async () => {
    setSelectResults([TEST_BUSINESS]);
    mockGenerateSocialPost.mockResolvedValueOnce("Generated");

    setInsertResults(
      [{ id: "content-uuid-001" }],
      [{ id: "action-uuid-001" }],
    );

    mockGetMetaToken.mockResolvedValueOnce("meta_token_123");
    mockPublishToInstagram.mockResolvedValueOnce({
      id: "ig_post_002",
      success: true,
    });

    await createAndPublishPost(
      "biz-uuid-001",
      "org-uuid-001",
      "topic",
      "instagram",
      true
    );

    expect(mockUpdate).toHaveBeenCalled();
  });

  it("handles publish failure gracefully", async () => {
    setSelectResults([TEST_BUSINESS]);
    mockGenerateSocialPost.mockResolvedValueOnce("Generated");

    setInsertResults(
      [{ id: "content-uuid-001" }],
      [{ id: "action-uuid-001", status: "completed" }],
    );

    mockGetMetaToken.mockResolvedValueOnce("meta_token_123");
    mockPublishToInstagram.mockResolvedValueOnce({
      id: "ig_post_003",
      success: false,
      error: "Invalid image",
    });

    const result = await createAndPublishPost(
      "biz-uuid-001",
      "org-uuid-001",
      "topic",
      "instagram",
      true
    );

    expect(result.published).toBe(false);
    expect(result.action.status).toBe("completed");
  });

  it("defaults to instagram and no auto-publish", async () => {
    setSelectResults([TEST_BUSINESS]);
    mockGenerateSocialPost.mockResolvedValueOnce("Generated");

    setInsertResults(
      [{ id: "content-uuid-001" }],
      [{ id: "action-uuid-001", content: { platform: "instagram" } }],
    );

    mockGetMetaToken.mockResolvedValueOnce(null);

    const result = await createAndPublishPost(
      "biz-uuid-001",
      "org-uuid-001",
      "topic"
    );

    expect(result.action.content.platform).toBe("instagram");
    expect(result.published).toBe(false);
  });

  it("stores content with correct metadata", async () => {
    setSelectResults([TEST_BUSINESS]);
    mockGenerateSocialPost.mockResolvedValueOnce("Generated");

    setInsertResults(
      [{ id: "content-uuid-001" }],
      [{ id: "action-uuid-001" }],
    );

    mockGetMetaToken.mockResolvedValueOnce(null);

    await createAndPublishPost(
      "biz-uuid-001",
      "org-uuid-001",
      "specials",
      "facebook",
      false
    );

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: "biz-uuid-001",
        organizationId: "org-uuid-001",
        contentType: "social_post",
        aiModel: "claude-sonnet-4-20250514",
      })
    );
  });

  it("publishes to correct platform", async () => {
    setSelectResults([TEST_BUSINESS]);
    mockGenerateSocialPost.mockResolvedValueOnce("Generated");

    setInsertResults(
      [{ id: "content-uuid-001" }],
      [{ id: "action-uuid-001" }],
    );

    mockGetMetaToken.mockResolvedValueOnce("meta_token_123");
    mockPublishToFacebook.mockResolvedValueOnce({
      id: "fb_post_001",
      success: true,
    });

    await createAndPublishPost(
      "biz-uuid-001",
      "org-uuid-001",
      "topic",
      "facebook",
      true
    );

    expect(mockPublishToFacebook).toHaveBeenCalled();
    expect(mockPublishToInstagram).not.toHaveBeenCalled();
  });
});

// ─── Tests: Edge cases ───────────────────────────────────────────────────────

describe("Social service — edge cases", () => {
  let publishPost: typeof import("@/services/social").publishPost;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetAllCounters();

    const mod = await import("@/services/social");
    publishPost = mod.publishPost;
  });

  it("handles exception from Meta API with proper error capture", async () => {
    mockGetMetaToken.mockResolvedValueOnce("meta_token_123");
    mockPublishToFacebook.mockRejectedValueOnce(new Error("API Error"));

    const result = await publishPost("biz-uuid-001", "facebook", {
      text: "Test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("API Error");
  });

  it("mock post has expected URL pattern for instagram", async () => {
    mockGetMetaToken.mockResolvedValueOnce(null);

    const result = await publishPost("biz-uuid-001", "instagram", {
      text: "Test",
    });

    expect(result.postUrl).toContain("instagram.com/p/dev_instagram_");
    expect(result.live).toBe(false);
  });

  it("mock post has expected URL pattern for facebook", async () => {
    mockGetMetaToken.mockResolvedValueOnce(null);

    const result = await publishPost("biz-uuid-001", "facebook", {
      text: "Test",
    });

    expect(result.postUrl).toContain("facebook.com/post/dev_facebook_");
    expect(result.live).toBe(false);
  });
});
