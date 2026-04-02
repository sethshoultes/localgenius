/**
 * Stale Event Cleanup Job
 *
 * Deletes analytics_events where occurred_at is older than 13 months.
 * Keeps the analytics_events table lean for query performance.
 * Benchmark aggregates (anonymized) are retained indefinitely.
 *
 * Runs weekly on Sunday at 3:00 AM UTC.
 */

import type { JobResult } from "@/services/scheduler";

export async function runStaleCleanup(): Promise<JobResult> {
  const { db } = await import("@/lib/db");
  const { analyticsEvents } = await import("@/db/schema");
  const { lt } = await import("drizzle-orm");

  // 13 months ago
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 13);

  const deleted = await db
    .delete(analyticsEvents)
    .where(lt(analyticsEvents.occurredAt, cutoff))
    .returning({ id: analyticsEvents.id });

  const count = deleted.length;

  console.log(
    `[stale-cleanup] Deleted ${count} analytics_events older than ${cutoff.toISOString().slice(0, 10)}`
  );

  return {
    success: true,
    duration_ms: 0,
    details: {
      deletedCount: count,
      cutoffDate: cutoff.toISOString().slice(0, 10),
    },
  };
}
