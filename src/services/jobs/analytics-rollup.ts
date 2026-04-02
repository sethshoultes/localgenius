/**
 * Analytics Daily Rollup Job
 *
 * Queries analytics_events from the previous day, computes aggregates
 * per business (event counts by type), and writes them to the
 * business_metrics table for fast dashboard reads.
 *
 * Since business_metrics does not yet exist as a schema table, this job
 * writes rollup rows using a raw SQL upsert. When the table is formally
 * added to the Drizzle schema, swap to the typed insert.
 */

import type { JobResult } from "@/services/scheduler";

export async function runAnalyticsRollup(): Promise<JobResult> {
  const { db } = await import("@/lib/db");
  const { analyticsEvents } = await import("@/db/schema");
  const { sql, eq, and, gte, lt } = await import("drizzle-orm");

  // Determine the date range for "yesterday" in UTC
  const now = new Date();
  const dayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1)
  );
  const dayEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  // Aggregate event counts per business per event_type
  const rows = await db
    .select({
      businessId: analyticsEvents.businessId,
      organizationId: analyticsEvents.organizationId,
      eventType: analyticsEvents.eventType,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(analyticsEvents)
    .where(
      and(
        gte(analyticsEvents.occurredAt, dayStart),
        lt(analyticsEvents.occurredAt, dayEnd)
      )
    )
    .groupBy(
      analyticsEvents.businessId,
      analyticsEvents.organizationId,
      analyticsEvents.eventType
    );

  if (rows.length === 0) {
    return {
      success: true,
      duration_ms: 0,
      details: { date: dayStart.toISOString().slice(0, 10), businessesRolled: 0, rowsWritten: 0 },
    };
  }

  // Group by business to build a metrics JSON per business
  const byBusiness = new Map<
    string,
    { organizationId: string; metrics: Record<string, number> }
  >();

  for (const row of rows) {
    let entry = byBusiness.get(row.businessId);
    if (!entry) {
      entry = { organizationId: row.organizationId, metrics: {} };
      byBusiness.set(row.businessId, entry);
    }
    entry.metrics[row.eventType] = Number(row.count);
  }

  // Write rollup rows — using raw SQL since business_metrics may not exist
  // as a Drizzle table yet. The table schema:
  //   business_metrics(id uuid PK, business_id uuid, organization_id uuid,
  //     date date, metrics jsonb, created_at timestamptz)
  let written = 0;
  const dateStr = dayStart.toISOString().slice(0, 10);

  for (const [businessId, { organizationId, metrics }] of byBusiness) {
    await db.execute(sql`
      INSERT INTO business_metrics (id, business_id, organization_id, date, metrics, created_at)
      VALUES (
        gen_random_uuid(),
        ${businessId},
        ${organizationId},
        ${dateStr}::date,
        ${JSON.stringify(metrics)}::jsonb,
        now()
      )
      ON CONFLICT (business_id, date)
      DO UPDATE SET metrics = EXCLUDED.metrics
    `);
    written++;
  }

  return {
    success: true,
    duration_ms: 0,
    details: {
      date: dateStr,
      businessesRolled: byBusiness.size,
      rowsWritten: written,
      eventRows: rows.length,
    },
  };
}
