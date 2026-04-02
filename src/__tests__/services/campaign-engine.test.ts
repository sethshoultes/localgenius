/**
 * Tests for src/services/campaign-engine.ts
 * — generateSuggestedCampaigns() and approveCampaign()
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TEST_BUSINESS, TEST_ACTION } from "../mocks/db";
import type { SuggestedCampaign } from "@/services/campaign-engine";

// ─── Module mocks ────────────────────────────────────────────────────────────

// Mock DB — chainable Drizzle-style
const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

const mockSelectLimitResult = vi.fn();
const mockSelectLimit = vi.fn().mockImplementation(() => mockSelectLimitResult());
const mockSelectOrderBy = vi.fn().mockReturnValue({ limit: mockSelectLimit });
const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit, orderBy: mockSelectOrderBy });
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
  getDb: vi.fn(),
}));

// Mock schema
vi.mock("@/db/schema", () => ({
  businesses: { id: "businesses.id" },
  contentItems: { businessId: "contentItems.businessId", contentType: "contentItems.contentType", createdAt: "contentItems.createdAt", content: "contentItems.content", approved: "contentItems.approved" },
  actions: {},
  analyticsEvents: { businessId: "analyticsEvents.businessId", eventType: "analyticsEvents.eventType", occurredAt: "analyticsEvents.occurredAt" },
  reviews: { businessId: "reviews.businessId", rating: "reviews.rating", reviewDate: "reviews.reviewDate", keyTopics: "reviews.keyTopics" },
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  gte: vi.fn((...args: unknown[]) => ({ type: "gte", args })),
  desc: vi.fn(),
  sql: vi.fn(),
}));

// Mock AI service
const mockGenerate = vi.fn().mockResolvedValue("Generated email content for review request.");
const mockGenerateSocialPost = vi.fn().mockResolvedValue("Check out our amazing specials this week! #LocalFood #Austin");

vi.mock("@/services/ai", () => ({
  generate: (...args: unknown[]) => mockGenerate(...args),
  generateSocialPost: (...args: unknown[]) => mockGenerateSocialPost(...args),
}));

// Mock insights engine
const mockGenerateInsights = vi.fn();

vi.mock("@/services/insights-engine", () => ({
  generateInsights: (...args: unknown[]) => mockGenerateInsights(...args),
}));

// Mock content scheduler
const mockSchedule = vi.fn().mockResolvedValue({
  id: "scheduled-post-001",
  platform: "instagram",
  content: { text: "Scheduled post text" },
  scheduledFor: new Date("2026-04-10T11:00:00"),
  status: "pending",
});

vi.mock("@/services/content-scheduler", () => ({
  schedule: (...args: unknown[]) => mockSchedule(...args),
}));

// ─── Test data ──────────────────────────────────────────────────────────────

const BIZ = {
  ...TEST_BUSINESS,
  name: "Test Biz Inc",
  vertical: "restaurant",
  city: "Austin",
  state: "TX",
};

const CONTENT_TIMING_INSIGHT = {
  id: "insight-timing-001",
  type: "content_timing" as const,
  priority: "high" as const,
  title: "Tuesday posts outperform",
  description: "Your Tuesday posts get 34% more engagement.",
  metricContext: "Engagement peaks on Tuesdays",
  metricValue: 34,
  category: "content" as const,
  createdAt: new Date().toISOString(),
};

const REVIEW_DROP_INSIGHT = {
  id: "insight-review-drop-001",
  type: "review_velocity_drop" as const,
  priority: "high" as const,
  title: "Review momentum slowing",
  description: "You received fewer reviews this month.",
  metricValue: -20,
  category: "reviews" as const,
  createdAt: new Date().toISOString(),
};

const ENGAGEMENT_DOWN_INSIGHT = {
  id: "insight-engagement-001",
  type: "engagement_pattern" as const,
  priority: "medium" as const,
  title: "Traffic dropped",
  description: "Website traffic is down 15% this week.",
  metricValue: -15,
  category: "engagement" as const,
  createdAt: new Date().toISOString(),
};

const SOCIAL_POST_CAMPAIGN: SuggestedCampaign = {
  id: "campaign_timing_123",
  type: "social_post",
  title: "Tuesday post — your best day for engagement",
  description: "Your Tuesday posts get the most engagement.",
  content: {
    text: "Check out our specials!\n\nPosted by LocalGenius",
    platform: "instagram",
    scheduledFor: "2026-04-07T11:00:00",
    topic: "optimized_timing",
  },
  basedOn: "insight-timing-001",
  estimatedImpact: "34% higher engagement",
  priority: "high",
  createdAt: new Date().toISOString(),
};

const REVIEW_REQUEST_CAMPAIGN: SuggestedCampaign = {
  id: "campaign_reviews_123",
  type: "review_request",
  title: "Review request campaign",
  description: "Review momentum is slowing.",
  content: {
    text: "Please leave us a review!",
    platform: "email",
    topic: "review_request",
  },
  basedOn: "insight-review-drop-001",
  estimatedImpact: "3-5 new reviews",
  priority: "high",
  createdAt: new Date().toISOString(),
};

// ─── Tests: generateSuggestedCampaigns ──────────────────────────────────────

describe("Campaign Engine — generateSuggestedCampaigns()", () => {
  let generateSuggestedCampaigns: typeof import("@/services/campaign-engine").generateSuggestedCampaigns;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default: business found
    mockSelectLimitResult.mockResolvedValue([BIZ]);

    // Default: content lookup for topic returns a content item
    mockSelectWhere.mockImplementation(() => {
      return {
        limit: mockSelectLimit,
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ content: { topic: "weekly specials" } }]),
        }),
        then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
          Promise.resolve([{ content: { topic: "weekly specials" } }]).then(resolve, reject),
      };
    });

    const mod = await import("@/services/campaign-engine");
    generateSuggestedCampaigns = mod.generateSuggestedCampaigns;
  });

  it("returns empty array when business is not found", async () => {
    mockSelectLimitResult.mockResolvedValue([]);

    const result = await generateSuggestedCampaigns("nonexistent-id", "org-uuid-001");

    expect(result).toEqual([]);
  });

  it("generates campaigns from content_timing insights", async () => {
    mockGenerateInsights.mockResolvedValue([CONTENT_TIMING_INSIGHT]);

    const result = await generateSuggestedCampaigns("biz-uuid-001", "org-uuid-001");

    expect(result.length).toBeGreaterThanOrEqual(1);
    const timingCampaign = result.find((c) => c.type === "social_post");
    expect(timingCampaign).toBeDefined();
    expect(timingCampaign!.priority).toBe("high");
    expect(timingCampaign!.basedOn).toBe(CONTENT_TIMING_INSIGHT.id);
    expect(mockGenerateSocialPost).toHaveBeenCalled();
  });

  it("generates review request campaign from review_velocity_drop insight", async () => {
    mockGenerateInsights.mockResolvedValue([REVIEW_DROP_INSIGHT]);

    const result = await generateSuggestedCampaigns("biz-uuid-001", "org-uuid-001");

    const reviewCampaign = result.find((c) => c.type === "review_request");
    expect(reviewCampaign).toBeDefined();
    expect(reviewCampaign!.title).toBe("Review request campaign");
    expect(mockGenerate).toHaveBeenCalled();
  });

  it("always includes a timely social post if no social_post campaigns exist", async () => {
    // Return only review-related insight — no social posts generated from insights
    mockGenerateInsights.mockResolvedValue([
      {
        id: "insight-unanswered-001",
        type: "review_unanswered",
        priority: "high",
        title: "Unanswered reviews",
        description: "5 reviews need responses.",
        metricValue: 5,
        category: "reviews",
        createdAt: new Date().toISOString(),
      },
    ]);

    const result = await generateSuggestedCampaigns("biz-uuid-001", "org-uuid-001");

    const socialPost = result.find((c) => c.type === "social_post");
    expect(socialPost).toBeDefined();
    expect(socialPost!.basedOn).toBe("proactive_suggestion");
  });

  it("sorts campaigns by priority — high first", async () => {
    mockGenerateInsights.mockResolvedValue([
      ENGAGEMENT_DOWN_INSIGHT, // medium
      CONTENT_TIMING_INSIGHT,  // high
    ]);

    const result = await generateSuggestedCampaigns("biz-uuid-001", "org-uuid-001");

    if (result.length >= 2) {
      const priorities = result.map((c) => c.priority);
      const highIdx = priorities.indexOf("high");
      const mediumIdx = priorities.indexOf("medium");
      if (highIdx !== -1 && mediumIdx !== -1) {
        expect(highIdx).toBeLessThan(mediumIdx);
      }
    }
  });

  it("processes at most 5 insights", async () => {
    const manyInsights = Array.from({ length: 10 }, (_, i) => ({
      ...CONTENT_TIMING_INSIGHT,
      id: `insight-${i}`,
    }));
    mockGenerateInsights.mockResolvedValue(manyInsights);

    const result = await generateSuggestedCampaigns("biz-uuid-001", "org-uuid-001");

    // Should have at most 5 from insights + possibly 1 timely post
    expect(result.length).toBeLessThanOrEqual(6);
    // generateSocialPost is called for each content_timing insight (up to 5) + possibly timely
    expect(mockGenerateSocialPost.mock.calls.length).toBeLessThanOrEqual(6);
  });
});

// ─── Tests: approveCampaign ─────────────────────────────────────────────────

describe("Campaign Engine — approveCampaign()", () => {
  let approveCampaign: typeof import("@/services/campaign-engine").approveCampaign;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default insert returning
    mockInsertReturning.mockResolvedValue([{ ...TEST_ACTION, id: "action-uuid-new", status: "approved" }]);

    const mod = await import("@/services/campaign-engine");
    approveCampaign = mod.approveCampaign;
  });

  it("schedules social_post campaigns via content-scheduler", async () => {
    const result = await approveCampaign("biz-uuid-001", "org-uuid-001", SOCIAL_POST_CAMPAIGN);

    expect(result.success).toBe(true);
    expect(result.actionId).toBe("scheduled-post-001");
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: "biz-uuid-001",
        organizationId: "org-uuid-001",
        platform: "instagram",
        content: SOCIAL_POST_CAMPAIGN.content.text,
      })
    );
  });

  it("creates a DB action for non-scheduled campaigns (review_request)", async () => {
    const result = await approveCampaign("biz-uuid-001", "org-uuid-001", REVIEW_REQUEST_CAMPAIGN);

    expect(result.success).toBe(true);
    expect(result.actionId).toBeDefined();
    expect(mockInsert).toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it("creates a DB action for social_post campaigns without scheduledFor", async () => {
    const campaignNoSchedule: SuggestedCampaign = {
      ...SOCIAL_POST_CAMPAIGN,
      content: { text: "No schedule", platform: "instagram" },
    };

    const result = await approveCampaign("biz-uuid-001", "org-uuid-001", campaignNoSchedule);

    expect(result.success).toBe(true);
    expect(mockInsert).toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it("handles DB insert failure by propagating error", async () => {
    mockInsertReturning.mockRejectedValueOnce(new Error("DB write failed"));

    await expect(
      approveCampaign("biz-uuid-001", "org-uuid-001", REVIEW_REQUEST_CAMPAIGN)
    ).rejects.toThrow("DB write failed");
  });
});
