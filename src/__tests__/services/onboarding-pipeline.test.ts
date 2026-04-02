/**
 * Tests for src/services/onboarding-pipeline.ts — runOnboardingPipeline()
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TEST_BUSINESS, TEST_CONVERSATION } from "../mocks/db";

// ─── Module mocks ────────────────────────────────────────────────────────────

// Mock DB — chainable Drizzle-style
const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

const mockSelectLimit = vi.fn();
const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
  getDb: vi.fn(),
}));

// Mock schema imports
vi.mock("@/db/schema", () => ({
  businesses: { id: "businesses.id", organizationId: "businesses.organizationId" },
  conversations: { businessId: "conversations.businessId" },
  messages: {},
  actions: {},
  analyticsEvents: {},
  weeklyDigests: {},
}));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
}));

// Mock website-generator
const mockGenerateWebsite = vi.fn().mockResolvedValue(undefined);
vi.mock("@/services/website-generator", () => ({
  generateWebsite: (...args: unknown[]) => mockGenerateWebsite(...args),
}));

// Mock sites (provisionSite imported as provisionCloudfareSite)
const mockProvisionCloudfareSite = vi.fn().mockResolvedValue({
  siteUrl: "https://test-biz-austin.localgenius.site",
  slug: "test-biz-austin",
});
vi.mock("@/services/sites", () => ({
  provisionSite: (...args: unknown[]) => mockProvisionCloudfareSite(...args),
}));

// Mock AI service
const mockGenerate = vi.fn().mockResolvedValue("Welcome to LocalGenius! Your website is live.");
const mockGenerateSocialPost = vi.fn().mockResolvedValue("Check out our amazing specials this week!");
vi.mock("@/services/ai", () => ({
  generate: (...args: unknown[]) => mockGenerate(...args),
  generateSocialPost: (...args: unknown[]) => mockGenerateSocialPost(...args),
}));

// Mock reviews
const mockSyncReviews = vi.fn().mockResolvedValue({ synced: 5 });
vi.mock("@/services/reviews", () => ({
  syncReviews: (...args: unknown[]) => mockSyncReviews(...args),
}));

// Mock SEO
const mockRunAudit = vi.fn().mockResolvedValue({
  score: { overall: 72 },
  recommendations: [{ title: "Add more photos", description: "Photos improve engagement", priority: "medium" }],
  aiInsights: "Your restaurant is doing well in Austin!",
});
vi.mock("@/services/seo", () => ({
  runAudit: (...args: unknown[]) => mockRunAudit(...args),
}));

// Mock logger
const mockLoggerInfo = vi.fn();
const mockLoggerError = vi.fn();
const mockLoggerWarn = vi.fn();
vi.mock("@/lib/logger", () => ({
  logger: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    error: (...args: unknown[]) => mockLoggerError(...args),
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
  },
}));

// ─── Test data ──────────────────────────────────────────────────────────────

const DEFAULT_INPUT = {
  businessId: TEST_BUSINESS.id,
  organizationId: TEST_BUSINESS.organizationId,
  userId: "user-uuid-001",
  businessName: TEST_BUSINESS.name,
  vertical: TEST_BUSINESS.vertical,
  city: TEST_BUSINESS.city,
  state: TEST_BUSINESS.state,
  address: TEST_BUSINESS.address,
  phone: TEST_BUSINESS.phone,
  photos: [],
  priorityFocus: null,
  hasGoogleConnection: false,
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Onboarding Pipeline — runOnboardingPipeline()", () => {
  let runOnboardingPipeline: typeof import("@/services/onboarding-pipeline").runOnboardingPipeline;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();

    // Default: conversation found
    mockSelectLimit.mockResolvedValue([TEST_CONVERSATION]);

    // Reset insert mock
    mockInsertValues.mockResolvedValue(undefined);

    const mod = await import("@/services/onboarding-pipeline");
    runOnboardingPipeline = mod.runOnboardingPipeline;
  });

  // ─── Test 1: Cloudflare Sites path ──────────────────────────────────────

  describe("Cloudflare Sites provisioning", () => {
    it("calls provisionCloudfareSite when LOCALGENIUS_SITES_API_TOKEN is set", async () => {
      vi.stubEnv("LOCALGENIUS_SITES_API_TOKEN", "cf-test-token-123");

      const result = await runOnboardingPipeline(DEFAULT_INPUT);

      expect(mockProvisionCloudfareSite).toHaveBeenCalledWith(
        DEFAULT_INPUT.businessId,
        DEFAULT_INPUT.organizationId
      );
      expect(mockGenerateWebsite).not.toHaveBeenCalled();
      expect(result.websiteGenerated).toBe(true);
    });

    it("does not call generateWebsite when Cloudflare Sites is used", async () => {
      vi.stubEnv("LOCALGENIUS_SITES_API_TOKEN", "cf-test-token-123");

      await runOnboardingPipeline(DEFAULT_INPUT);

      expect(mockGenerateWebsite).not.toHaveBeenCalled();
    });
  });

  // ─── Test 2: Static HTML fallback ──────────────────────────────────────

  describe("Static HTML fallback", () => {
    it("calls generateWebsite when LOCALGENIUS_SITES_API_TOKEN is NOT set", async () => {
      vi.stubEnv("LOCALGENIUS_SITES_API_TOKEN", "");

      const result = await runOnboardingPipeline(DEFAULT_INPUT);

      expect(mockGenerateWebsite).toHaveBeenCalledWith(
        DEFAULT_INPUT.businessId,
        DEFAULT_INPUT.organizationId,
        expect.objectContaining({
          name: DEFAULT_INPUT.businessName,
          vertical: DEFAULT_INPUT.vertical,
          city: DEFAULT_INPUT.city,
          state: DEFAULT_INPUT.state,
        })
      );
      expect(mockProvisionCloudfareSite).not.toHaveBeenCalled();
      expect(result.websiteGenerated).toBe(true);
    });

    it("uses static HTML when the env var is undefined", async () => {
      // Ensure env var is not set
      delete process.env.LOCALGENIUS_SITES_API_TOKEN;

      const result = await runOnboardingPipeline(DEFAULT_INPUT);

      expect(mockGenerateWebsite).toHaveBeenCalled();
      expect(mockProvisionCloudfareSite).not.toHaveBeenCalled();
      expect(result.websiteGenerated).toBe(true);
    });
  });

  // ─── Test 3: Website generation failure doesn't block remaining steps ──

  describe("website generation failure resilience", () => {
    it("continues pipeline when Cloudflare provisioning fails", async () => {
      vi.stubEnv("LOCALGENIUS_SITES_API_TOKEN", "cf-test-token-123");
      mockProvisionCloudfareSite.mockRejectedValueOnce(new Error("Cloudflare API timeout"));

      const result = await runOnboardingPipeline(DEFAULT_INPUT);

      expect(result.websiteGenerated).toBe(false);
      expect(result.errors).toContain("Website: Cloudflare API timeout");
      // Remaining steps should still complete
      expect(result.welcomeMessageSent).toBe(true);
      expect(result.postsGenerated).toBe(3);
      expect(result.digestScheduled).toBe(true);
      expect(result.seoScore).toBe(72);
    });

    it("continues pipeline when static HTML generation fails", async () => {
      vi.stubEnv("LOCALGENIUS_SITES_API_TOKEN", "");
      mockGenerateWebsite.mockRejectedValueOnce(new Error("Disk full"));

      const result = await runOnboardingPipeline(DEFAULT_INPUT);

      expect(result.websiteGenerated).toBe(false);
      expect(result.errors).toContain("Website: Disk full");
      // Other steps still work
      expect(result.welcomeMessageSent).toBe(true);
      expect(result.postsGenerated).toBe(3);
    });
  });

  // ─── Test 4: Welcome message is sent to the conversation ───────────────

  describe("welcome message", () => {
    it("sends a welcome message using AI-generated text", async () => {
      vi.stubEnv("LOCALGENIUS_SITES_API_TOKEN", "");

      const result = await runOnboardingPipeline(DEFAULT_INPUT);

      expect(result.welcomeMessageSent).toBe(true);
      // generate() called for the welcome message
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining(DEFAULT_INPUT.businessName),
          maxTokens: 250,
        })
      );
      // Message inserted into the database
      expect(mockInsert).toHaveBeenCalled();
      // Check that at least one insert contains the welcome message content
      const insertCalls = mockInsertValues.mock.calls;
      const welcomeInsert = insertCalls.find(
        (call: unknown[]) =>
          call[0] &&
          typeof call[0] === "object" &&
          "role" in (call[0] as Record<string, unknown>) &&
          (call[0] as Record<string, unknown>).role === "assistant" &&
          "conversationId" in (call[0] as Record<string, unknown>) &&
          (call[0] as Record<string, unknown>).conversationId === TEST_CONVERSATION.id
      );
      expect(welcomeInsert).toBeDefined();
    });

    it("records error but continues when welcome message fails", async () => {
      vi.stubEnv("LOCALGENIUS_SITES_API_TOKEN", "");
      mockGenerate.mockRejectedValueOnce(new Error("AI service unavailable"));

      const result = await runOnboardingPipeline(DEFAULT_INPUT);

      expect(result.welcomeMessageSent).toBe(false);
      expect(result.errors.some((e) => e.includes("Welcome:"))).toBe(true);
      // Pipeline still continues — posts should still be generated
      expect(result.postsGenerated).toBe(3);
    });
  });

  // ─── Test 5: Social posts are generated (3 posts) ──────────────────────

  describe("social post generation", () => {
    it("generates 3 social posts", async () => {
      vi.stubEnv("LOCALGENIUS_SITES_API_TOKEN", "");

      const result = await runOnboardingPipeline(DEFAULT_INPUT);

      expect(result.postsGenerated).toBe(3);
      expect(mockGenerateSocialPost).toHaveBeenCalledTimes(3);
    });

    it("passes business context to generateSocialPost", async () => {
      vi.stubEnv("LOCALGENIUS_SITES_API_TOKEN", "");

      await runOnboardingPipeline(DEFAULT_INPUT);

      expect(mockGenerateSocialPost).toHaveBeenCalledWith(
        expect.objectContaining({
          name: DEFAULT_INPUT.businessName,
          vertical: DEFAULT_INPUT.vertical,
          city: DEFAULT_INPUT.city,
        }),
        expect.any(String)
      );
    });

    it("stores posts as proposed actions", async () => {
      vi.stubEnv("LOCALGENIUS_SITES_API_TOKEN", "");

      await runOnboardingPipeline(DEFAULT_INPUT);

      // Find insert calls for actions (status: "proposed", actionType: "social_post")
      const actionInserts = mockInsertValues.mock.calls.filter(
        (call: unknown[]) =>
          call[0] &&
          typeof call[0] === "object" &&
          "status" in (call[0] as Record<string, unknown>) &&
          (call[0] as Record<string, unknown>).status === "proposed" &&
          (call[0] as Record<string, unknown>).actionType === "social_post"
      );
      expect(actionInserts).toHaveLength(3);
    });
  });

  // ─── Test 6: Returns correct completedSteps count ──────────────────────

  describe("completedSteps count", () => {
    it("returns 7 completedSteps when all steps succeed", async () => {
      vi.stubEnv("LOCALGENIUS_SITES_API_TOKEN", "");

      const result = await runOnboardingPipeline(DEFAULT_INPUT);

      expect(result.totalSteps).toBe(7);
      expect(result.completedSteps).toBe(7);
    });

    it("counts skipped Google review sync as completed", async () => {
      vi.stubEnv("LOCALGENIUS_SITES_API_TOKEN", "");

      const result = await runOnboardingPipeline({
        ...DEFAULT_INPUT,
        hasGoogleConnection: false,
      });

      // Step 3 (reviews) is skipped but counts as complete
      expect(result.completedSteps).toBe(7);
      expect(result.reviewsSynced).toBe(0);
    });

    it("decrements completedSteps for each failed step", async () => {
      vi.stubEnv("LOCALGENIUS_SITES_API_TOKEN", "");
      mockGenerateWebsite.mockRejectedValueOnce(new Error("fail"));
      mockGenerate.mockRejectedValueOnce(new Error("fail"));

      const result = await runOnboardingPipeline(DEFAULT_INPUT);

      // Website failed (-1), welcome failed (-1), rest ok = 5
      expect(result.completedSteps).toBe(5);
    });
  });

  // ─── Test 7: Returns errors array when steps fail ──────────────────────

  describe("errors array", () => {
    it("returns empty errors array when all steps succeed", async () => {
      vi.stubEnv("LOCALGENIUS_SITES_API_TOKEN", "");

      const result = await runOnboardingPipeline(DEFAULT_INPUT);

      expect(result.errors).toEqual([]);
    });

    it("collects errors from multiple failing steps", async () => {
      vi.stubEnv("LOCALGENIUS_SITES_API_TOKEN", "");
      mockGenerateWebsite.mockRejectedValueOnce(new Error("website broke"));
      mockGenerate.mockRejectedValueOnce(new Error("AI down"));
      mockRunAudit.mockRejectedValueOnce(new Error("SEO service timeout"));

      const result = await runOnboardingPipeline(DEFAULT_INPUT);

      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain("Website: website broke");
      expect(result.errors).toContain("Welcome: AI down");
      expect(result.errors).toContain("SEO: SEO service timeout");
    });

    it("returns early with error when no conversation found", async () => {
      vi.stubEnv("LOCALGENIUS_SITES_API_TOKEN", "");
      mockSelectLimit.mockResolvedValueOnce([]);

      const result = await runOnboardingPipeline(DEFAULT_INPUT);

      expect(result.errors).toContain("No conversation found — cannot send messages");
      expect(result.completedSteps).toBe(0);
      expect(result.websiteGenerated).toBe(false);
    });

    it("prefixes each error with the step name", async () => {
      vi.stubEnv("LOCALGENIUS_SITES_API_TOKEN", "");
      mockGenerateSocialPost.mockRejectedValueOnce(new Error("rate limited"));

      const result = await runOnboardingPipeline(DEFAULT_INPUT);

      const postError = result.errors.find((e) => e.startsWith("Posts:"));
      expect(postError).toBeDefined();
    });
  });

  // ─── Additional edge cases ─────────────────────────────────────────────

  describe("Google review sync", () => {
    it("syncs reviews when hasGoogleConnection is true", async () => {
      vi.stubEnv("LOCALGENIUS_SITES_API_TOKEN", "");

      const result = await runOnboardingPipeline({
        ...DEFAULT_INPUT,
        hasGoogleConnection: true,
      });

      expect(mockSyncReviews).toHaveBeenCalledWith(
        DEFAULT_INPUT.businessId,
        DEFAULT_INPUT.organizationId
      );
      expect(result.reviewsSynced).toBe(5);
    });

    it("does not call syncReviews when hasGoogleConnection is false", async () => {
      vi.stubEnv("LOCALGENIUS_SITES_API_TOKEN", "");

      await runOnboardingPipeline({
        ...DEFAULT_INPUT,
        hasGoogleConnection: false,
      });

      expect(mockSyncReviews).not.toHaveBeenCalled();
    });
  });

  describe("weekly digest scheduling", () => {
    it("schedules a weekly digest", async () => {
      vi.stubEnv("LOCALGENIUS_SITES_API_TOKEN", "");

      const result = await runOnboardingPipeline(DEFAULT_INPUT);

      expect(result.digestScheduled).toBe(true);
      // Check insert was called with weeklyDigests data
      const digestInsert = mockInsertValues.mock.calls.find(
        (call: unknown[]) =>
          call[0] &&
          typeof call[0] === "object" &&
          "metrics" in (call[0] as Record<string, unknown>) &&
          (call[0] as Record<string, string>).businessId === DEFAULT_INPUT.businessId
      );
      expect(digestInsert).toBeDefined();
    });
  });

  describe("SEO audit", () => {
    it("runs SEO audit and stores the score", async () => {
      vi.stubEnv("LOCALGENIUS_SITES_API_TOKEN", "");

      const result = await runOnboardingPipeline(DEFAULT_INPUT);

      expect(mockRunAudit).toHaveBeenCalledWith(
        DEFAULT_INPUT.businessId,
        DEFAULT_INPUT.organizationId
      );
      expect(result.seoScore).toBe(72);
    });
  });
});
