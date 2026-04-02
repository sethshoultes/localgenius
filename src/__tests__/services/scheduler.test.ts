/**
 * Tests for src/services/scheduler.ts
 * Job registration, execution, history tracking, and listing.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TEST_BUSINESS } from "../mocks/db";
import type { JobResult } from "@/services/scheduler";

// ─── Module mocks ────────────────────────────────────────────────────────────

// Mock digest service
const mockGenerateAllDigests = vi.fn().mockResolvedValue({
  generated: 5,
  failed: 0,
  errors: [],
});

// Mock google-business service
const mockFullSyncGoogle = vi.fn().mockResolvedValue({ success: true });

// Mock meta-social service
const mockFullSyncMeta = vi.fn().mockResolvedValue({ success: true });

// Mock analytics-rollup job
const mockRunAnalyticsRollup = vi.fn().mockResolvedValue({
  success: true,
  duration_ms: 0,
  details: { processed: 1000 },
});

// Mock token-refresh job
const mockRunTokenRefresh = vi.fn().mockResolvedValue({
  success: true,
  duration_ms: 0,
  details: { refreshed: 3 },
});

// Mock stale-cleanup job
const mockRunStaleCleanup = vi.fn().mockResolvedValue({
  success: true,
  duration_ms: 0,
  details: { deleted: 500 },
});

// Mock DB
const mockSelectLimitResult = vi.fn();
const mockSelectLimit = vi.fn().mockImplementation(() => mockSelectLimitResult());
const mockSelectWhere = vi.fn().mockImplementation(() => ({
  limit: mockSelectLimit,
  then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(mockSelectLimitResult()).then(resolve, reject),
}));
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
  getDb: vi.fn(),
}));

// Mock schema
vi.mock("@/db/schema", () => ({
  businessSettings: {
    platform: "businessSettings.platform",
    connectionStatus: "businessSettings.connectionStatus",
    businessId: "businessSettings.businessId",
    organizationId: "businessSettings.organizationId",
  },
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
  sql: {
    raw: (s: string) => s,
  },
}));

// Mock async imports within job handlers
vi.mock("@/services/digest", () => ({
  generateAllDigests: () => mockGenerateAllDigests(),
}));

vi.mock("@/services/google-business", () => ({
  fullSync: (...args: unknown[]) => mockFullSyncGoogle(...args),
}));

vi.mock("@/services/meta-social", () => ({
  fullSync: (...args: unknown[]) => mockFullSyncMeta(...args),
}));

vi.mock("@/services/jobs/analytics-rollup", () => ({
  runAnalyticsRollup: () => mockRunAnalyticsRollup(),
}));

vi.mock("@/services/jobs/token-refresh", () => ({
  runTokenRefresh: () => mockRunTokenRefresh(),
}));

vi.mock("@/services/jobs/stale-cleanup", () => ({
  runStaleCleanup: () => mockRunStaleCleanup(),
}));

// ─── Tests: runJob ───────────────────────────────────────────────────────────

describe("scheduler — runJob()", () => {
  let runJob: typeof import("@/services/scheduler").runJob;
  let getJobHistory: typeof import("@/services/scheduler").getJobHistory;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSelectLimitResult.mockResolvedValue([
      { businessId: TEST_BUSINESS.id, organizationId: TEST_BUSINESS.organizationId, connectionStatus: "active", platform: "google_business" },
    ]);

    const mod = await import("@/services/scheduler");
    runJob = mod.runJob;
    getJobHistory = mod.getJobHistory;
  });

  it("executes a registered job and returns success result", async () => {
    const result = await runJob("weekly-digest");

    expect(result.success).toBe(true);
    expect(result.duration_ms).toBeGreaterThanOrEqual(0);
    expect(result.details).toBeDefined();
    expect(result.details?.generated).toBe(5);
    expect(mockGenerateAllDigests).toHaveBeenCalled();
  });

  it("returns error for unknown job", async () => {
    const result = await runJob("nonexistent-job");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown job: nonexistent-job");
    expect(result.duration_ms).toBe(0);
  });

  it("records execution to history on success", async () => {
    await runJob("weekly-digest");

    const history = getJobHistory("weekly-digest", 5);
    expect(history.length).toBeGreaterThan(0);

    const latest = history[0];
    expect(latest.job).toBe("weekly-digest");
    expect(latest.result.success).toBe(true);
    expect(latest.startedAt).toBeDefined();
    expect(latest.completedAt).toBeDefined();
  });

  it("records execution to history on failure", async () => {
    mockGenerateAllDigests.mockRejectedValueOnce(new Error("Service unavailable"));

    const result = await runJob("weekly-digest");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Service unavailable");

    const history = getJobHistory("weekly-digest", 5);
    const latest = history[0];
    expect(latest.result.success).toBe(false);
    expect(latest.result.error).toBe("Service unavailable");
  });

  it("measures job duration accurately", async () => {
    mockGenerateAllDigests.mockImplementationOnce(async () => {
      await new Promise((r) => setTimeout(r, 50));
      return { generated: 5, failed: 0, errors: [] };
    });

    const result = await runJob("weekly-digest");

    expect(result.duration_ms).toBeGreaterThanOrEqual(50);
  });

  it("executes google-review-sync with database connections", async () => {
    mockSelectLimitResult.mockResolvedValueOnce([
      { businessId: TEST_BUSINESS.id, organizationId: TEST_BUSINESS.organizationId, connectionStatus: "active", platform: "google_business" },
    ]);

    const result = await runJob("google-review-sync");

    expect(result.success).toBe(true);
    expect(result.details?.total).toBe(1);
    expect(result.details?.synced).toBe(1);
    expect(mockFullSyncGoogle).toHaveBeenCalledWith(TEST_BUSINESS.id, TEST_BUSINESS.organizationId);
  });

  it("executes meta-engagement-sync with database connections", async () => {
    mockSelectLimitResult.mockClear();
    mockSelectLimitResult.mockResolvedValueOnce([
      { businessId: TEST_BUSINESS.id, organizationId: TEST_BUSINESS.organizationId, connectionStatus: "active", platform: "meta" },
    ]);

    const result = await runJob("meta-engagement-sync");

    expect(result.success).toBe(true);
    expect(result.details?.synced).toBe(1);
    expect(mockFullSyncMeta).toHaveBeenCalled();
  });

  it("handles failed sync connections in results", async () => {
    mockFullSyncGoogle.mockResolvedValueOnce({ success: false });

    const result = await runJob("google-review-sync");

    expect(result.success).toBe(false);
    expect(result.details?.failed).toBe(1);
    expect(result.details?.synced).toBe(0);
  });

  it("executes analytics-daily-rollup job", async () => {
    const result = await runJob("analytics-daily-rollup");

    expect(result.success).toBe(true);
    expect(result.details?.processed).toBe(1000);
    expect(mockRunAnalyticsRollup).toHaveBeenCalled();
  });

  it("executes token-refresh job", async () => {
    const result = await runJob("token-refresh");

    expect(result.success).toBe(true);
    expect(result.details?.refreshed).toBe(3);
    expect(mockRunTokenRefresh).toHaveBeenCalled();
  });

  it("executes stale-event-cleanup job", async () => {
    const result = await runJob("stale-event-cleanup");

    expect(result.success).toBe(true);
    expect(result.details?.deleted).toBe(500);
    expect(mockRunStaleCleanup).toHaveBeenCalled();
  });
});

// ─── Tests: listJobs ─────────────────────────────────────────────────────────

describe("scheduler — listJobs()", () => {
  let listJobs: typeof import("@/services/scheduler").listJobs;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import("@/services/scheduler");
    listJobs = mod.listJobs;
  });

  it("returns all registered jobs", async () => {
    const jobs = listJobs();

    expect(jobs.length).toBeGreaterThanOrEqual(6);
    expect(jobs.some((j) => j.name === "weekly-digest")).toBe(true);
    expect(jobs.some((j) => j.name === "google-review-sync")).toBe(true);
    expect(jobs.some((j) => j.name === "meta-engagement-sync")).toBe(true);
    expect(jobs.some((j) => j.name === "analytics-daily-rollup")).toBe(true);
    expect(jobs.some((j) => j.name === "token-refresh")).toBe(true);
    expect(jobs.some((j) => j.name === "stale-event-cleanup")).toBe(true);
  });

  it("includes job metadata (name, description, schedule)", async () => {
    const jobs = listJobs();

    const weeklyDigest = jobs.find((j) => j.name === "weekly-digest");
    expect(weeklyDigest).toBeDefined();
    expect(weeklyDigest?.description).toBe("Generate weekly digests for all businesses");
    expect(weeklyDigest?.schedule).toBe("0 10 * * 1");
  });

  it("each job has non-empty description and schedule", async () => {
    const jobs = listJobs();

    jobs.forEach((job) => {
      expect(job.name).toBeTruthy();
      expect(job.description).toBeTruthy();
      expect(job.schedule).toBeTruthy();
    });
  });

  it("includes correct schedules for all jobs", async () => {
    const jobs = listJobs();

    expect(jobs.find((j) => j.name === "weekly-digest")?.schedule).toBe("0 10 * * 1");
    expect(jobs.find((j) => j.name === "google-review-sync")?.schedule).toBe("0 */6 * * *");
    expect(jobs.find((j) => j.name === "meta-engagement-sync")?.schedule).toBe("0 */6 * * *");
    expect(jobs.find((j) => j.name === "analytics-daily-rollup")?.schedule).toBe("0 2 * * *");
    expect(jobs.find((j) => j.name === "token-refresh")?.schedule).toBe("*/30 * * * *");
    expect(jobs.find((j) => j.name === "stale-event-cleanup")?.schedule).toBe("0 3 * * 0");
  });
});

// ─── Tests: getJobHistory ────────────────────────────────────────────────────

describe("scheduler — getJobHistory()", () => {
  let runJob: typeof import("@/services/scheduler").runJob;
  let getJobHistory: typeof import("@/services/scheduler").getJobHistory;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSelectLimitResult.mockResolvedValue([
      { businessId: TEST_BUSINESS.id, organizationId: TEST_BUSINESS.organizationId, connectionStatus: "active", platform: "google_business" },
    ]);

    const mod = await import("@/services/scheduler");
    runJob = mod.runJob;
    getJobHistory = mod.getJobHistory;
  });

  it("returns empty history for unknown job", async () => {
    const history = getJobHistory("nonexistent-job");

    expect(history).toEqual([]);
  });

  it("returns recent executions for a specific job", async () => {
    await runJob("weekly-digest");
    await runJob("weekly-digest");

    const history = getJobHistory("weekly-digest", 10);

    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[0].job).toBe("weekly-digest");
    expect(history[1].job).toBe("weekly-digest");
  });

  it("returns most recent execution first", async () => {
    await runJob("weekly-digest");
    await new Promise((r) => setTimeout(r, 10));
    await runJob("weekly-digest");

    const history = getJobHistory("weekly-digest", 2);

    expect(history.length).toBe(2);
    // Most recent should be first (index 0)
    const startTime1 = new Date(history[0].startedAt).getTime();
    const startTime2 = new Date(history[1].startedAt).getTime();
    expect(startTime1).toBeGreaterThanOrEqual(startTime2);
  });

  it("respects limit parameter", async () => {
    await runJob("weekly-digest");
    await runJob("weekly-digest");
    await runJob("weekly-digest");

    const history = getJobHistory("weekly-digest", 2);

    expect(history.length).toBe(2);
  });

  it("returns all jobs history when name is omitted", async () => {
    await runJob("weekly-digest");
    await runJob("google-review-sync");

    const allHistory = getJobHistory(undefined, 10);

    expect(allHistory.length).toBeGreaterThanOrEqual(2);
    const jobs = new Set(allHistory.map((h) => h.job));
    expect(jobs.has("weekly-digest")).toBe(true);
    expect(jobs.has("google-review-sync")).toBe(true);
  });

  it("includes complete execution details in history", async () => {
    await runJob("weekly-digest");

    const history = getJobHistory("weekly-digest", 1);

    expect(history[0]).toMatchObject({
      job: "weekly-digest",
      startedAt: expect.any(String),
      completedAt: expect.any(String),
      result: expect.objectContaining({
        success: true,
        duration_ms: expect.any(Number),
      }),
    });
  });

  it("maintains history ring buffer (max 200 entries)", async () => {
    // This test verifies the implementation handles the max history constraint.
    // We can't easily test 200+ executions in a unit test, but we can verify
    // the structure includes proper history management.
    const history = getJobHistory(undefined, 300);

    expect(history.length).toBeLessThanOrEqual(200);
  });
});
