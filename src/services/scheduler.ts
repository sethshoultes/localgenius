/**
 * Centralized Scheduled Jobs Manager
 *
 * Single registry for all cron jobs. Each job is a named handler that
 * returns a structured JobResult. The universal cron endpoint
 * (/api/cron/run) dispatches jobs through this scheduler.
 *
 * Job history is stored in-memory for now — upgrade to a DB table
 * (e.g. job_executions) when persistence across deploys is needed.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface JobResult {
  success: boolean;
  duration_ms: number;
  details?: Record<string, unknown>;
  error?: string;
}

export interface Job {
  name: string;
  description: string;
  handler: () => Promise<JobResult>;
  schedule: string; // cron expression
}

interface JobHistoryEntry {
  job: string;
  startedAt: string;
  completedAt: string;
  result: JobResult;
}

// ─── In-memory history ring buffer ───────────────────────────────────────────

const MAX_HISTORY = 200;
const history: JobHistoryEntry[] = [];

function pushHistory(entry: JobHistoryEntry) {
  history.unshift(entry);
  if (history.length > MAX_HISTORY) {
    history.length = MAX_HISTORY;
  }
}

// ─── Registry ────────────────────────────────────────────────────────────────

const registry = new Map<string, Job>();

function register(job: Job) {
  registry.set(job.name, job);
}

// ─── Job definitions ─────────────────────────────────────────────────────────

register({
  name: "weekly-digest",
  description: "Generate weekly digests for all businesses",
  schedule: "0 10 * * 1", // Monday 10:00 UTC
  handler: async (): Promise<JobResult> => {
    const { generateAllDigests } = await import("@/services/digest");
    const result = await generateAllDigests();
    return {
      success: result.failed === 0,
      duration_ms: 0, // filled by runJob wrapper
      details: {
        generated: result.generated,
        failed: result.failed,
        errors: result.errors.slice(0, 10),
      },
    };
  },
});

register({
  name: "google-review-sync",
  description: "Sync Google reviews for all connected accounts",
  schedule: "0 */6 * * *", // every 6 hours
  handler: async (): Promise<JobResult> => {
    const { db } = await import("@/lib/db");
    const { businessSettings } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const { fullSync } = await import("@/services/google-business");

    const connections = await db
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.platform, "google_business"));

    const active = connections.filter((c) => c.connectionStatus === "active");

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const conn of active) {
      if (synced > 0) {
        await new Promise((r) => setTimeout(r, 1000));
      }
      const result = await fullSync(conn.businessId, conn.organizationId);
      if (result.success) {
        synced++;
      } else {
        failed++;
        errors.push(`business ${conn.businessId}`);
      }
    }

    return {
      success: failed === 0,
      duration_ms: 0,
      details: { total: active.length, synced, failed, errors: errors.slice(0, 10) },
    };
  },
});

register({
  name: "meta-engagement-sync",
  description: "Sync Meta post engagement for all connected accounts",
  schedule: "0 */6 * * *", // every 6 hours
  handler: async (): Promise<JobResult> => {
    const { db } = await import("@/lib/db");
    const { businessSettings } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const { fullSync } = await import("@/services/meta-social");

    const connections = await db
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.platform, "meta"));

    const active = connections.filter((c) => c.connectionStatus === "active");

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const conn of active) {
      if (synced > 0) {
        await new Promise((r) => setTimeout(r, 500));
      }
      const result = await fullSync(conn.businessId, conn.organizationId);
      if (result.success) {
        synced++;
      } else {
        failed++;
        errors.push(`business ${conn.businessId}`);
      }
    }

    return {
      success: failed === 0,
      duration_ms: 0,
      details: { total: active.length, synced, failed, errors: errors.slice(0, 10) },
    };
  },
});

register({
  name: "analytics-daily-rollup",
  description: "Aggregate daily analytics into business_metrics",
  schedule: "0 2 * * *", // daily at 2:00 UTC
  handler: async (): Promise<JobResult> => {
    const { runAnalyticsRollup } = await import("@/services/jobs/analytics-rollup");
    return runAnalyticsRollup();
  },
});

register({
  name: "token-refresh",
  description: "Proactively refresh OAuth tokens expiring within 60 minutes",
  schedule: "*/30 * * * *", // every 30 minutes
  handler: async (): Promise<JobResult> => {
    const { runTokenRefresh } = await import("@/services/jobs/token-refresh");
    return runTokenRefresh();
  },
});

register({
  name: "stale-event-cleanup",
  description: "Prune analytics_events older than 13 months",
  schedule: "0 3 * * 0", // Sunday 3:00 UTC
  handler: async (): Promise<JobResult> => {
    const { runStaleCleanup } = await import("@/services/jobs/stale-cleanup");
    return runStaleCleanup();
  },
});

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Run a specific job by name.
 * Logs start/end/duration and stores the result in history.
 */
export async function runJob(name: string): Promise<JobResult> {
  const job = registry.get(name);
  if (!job) {
    return {
      success: false,
      duration_ms: 0,
      error: `Unknown job: ${name}`,
    };
  }

  const startedAt = new Date();
  console.log(`[scheduler] Starting job "${name}" at ${startedAt.toISOString()}`);

  try {
    const result = await job.handler();
    const completedAt = new Date();
    const duration_ms = completedAt.getTime() - startedAt.getTime();

    const finalResult: JobResult = { ...result, duration_ms };

    pushHistory({
      job: name,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      result: finalResult,
    });

    console.log(
      `[scheduler] Job "${name}" completed in ${duration_ms}ms — success=${finalResult.success}`
    );

    return finalResult;
  } catch (error) {
    const completedAt = new Date();
    const duration_ms = completedAt.getTime() - startedAt.getTime();
    const message = error instanceof Error ? error.message : "Unknown error";

    const failResult: JobResult = {
      success: false,
      duration_ms,
      error: message,
    };

    pushHistory({
      job: name,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      result: failResult,
    });

    console.error(`[scheduler] Job "${name}" failed after ${duration_ms}ms: ${message}`);

    return failResult;
  }
}

/**
 * Return all registered jobs with their schedule and description.
 */
export function listJobs(): Array<{
  name: string;
  description: string;
  schedule: string;
}> {
  return Array.from(registry.values()).map((j) => ({
    name: j.name,
    description: j.description,
    schedule: j.schedule,
  }));
}

/**
 * Return recent execution history for a specific job (or all jobs).
 */
export function getJobHistory(
  name?: string,
  limit: number = 20
): JobHistoryEntry[] {
  const filtered = name ? history.filter((h) => h.job === name) : history;
  return filtered.slice(0, limit);
}
