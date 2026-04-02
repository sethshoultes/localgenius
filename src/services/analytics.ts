/**
 * Analytics & Attribution Service
 * Spec: engineering/data-model.md (Attribution Events, Benchmark Aggregates)
 *
 * Implements the 3-layer attribution model:
 *   Layer 1: Direct (API tracking — social engagement, email opens)
 *   Layer 2: Correlated (temporal — GBP optimization → calls increase)
 *   Layer 3: Aggregate (monthly trends — overall business improvement)
 */

import { db } from "@/lib/db";
import {
  analyticsEvents,
  attributionEvents,
  benchmarkAggregates,
  actions,
  businesses,
} from "@/db/schema";
import { eq, and, gte, sql, desc } from "drizzle-orm";

/**
 * Record an analytics event and attempt attribution.
 */
export async function recordEvent(
  businessId: string,
  organizationId: string,
  eventType: string,
  source: string,
  metadata: Record<string, unknown> = {}
) {
  const [event] = await db
    .insert(analyticsEvents)
    .values({
      businessId,
      organizationId,
      eventType,
      source,
      metadata,
      occurredAt: new Date(),
    })
    .returning();

  // Attempt direct attribution — find the most recent relevant action
  await attemptAttribution(businessId, organizationId, eventType, event.id);

  // Dual-write to benchmarks (anonymized)
  await updateBenchmarks(businessId, eventType);

  return event;
}

/**
 * Layer 1 & 2: Attempt to attribute an event to a LocalGenius action.
 */
async function attemptAttribution(
  businessId: string,
  organizationId: string,
  eventType: string,
  _eventId: string
) {
  // Find the most recent completed action that could have caused this event
  const attributionMap: Record<string, { actionTypes: string[]; windowHours: number; confidence: "direct" | "correlated" }> = {
    social_engagement: {
      actionTypes: ["social_post"],
      windowHours: 72,
      confidence: "direct",
    },
    page_view: {
      actionTypes: ["social_post", "seo_optimization", "gbp_update"],
      windowHours: 168,
      confidence: "correlated",
    },
    phone_call: {
      actionTypes: ["gbp_update", "seo_optimization"],
      windowHours: 168,
      confidence: "correlated",
    },
    booking: {
      actionTypes: ["email_campaign", "social_post", "seo_optimization"],
      windowHours: 336,
      confidence: "correlated",
    },
    review_received: {
      actionTypes: ["email_campaign"],
      windowHours: 336,
      confidence: "correlated",
    },
  };

  const mapping = attributionMap[eventType];
  if (!mapping) return;

  const windowStart = new Date(
    Date.now() - mapping.windowHours * 60 * 60 * 1000
  );

  // Find the most recent matching action within the window
  const [recentAction] = await db
    .select()
    .from(actions)
    .where(
      and(
        eq(actions.businessId, businessId),
        eq(actions.status, "completed"),
        gte(actions.executedAt, windowStart),
        sql`${actions.actionType} = ANY(ARRAY[${sql.raw(mapping.actionTypes.map((t) => `'${t}'`).join(","))}]::action_type[])`
      )
    )
    .orderBy(desc(actions.executedAt))
    .limit(1);

  if (recentAction) {
    await db.insert(attributionEvents).values({
      businessId,
      organizationId,
      actionId: recentAction.id,
      eventType,
      confidence: mapping.confidence,
      attributionWindowHours: mapping.windowHours,
      occurredAt: new Date(),
    });
  }
}

/**
 * Dual-write: update anonymized benchmark aggregates.
 * No PII, no business_id. Survives account deletion.
 */
async function updateBenchmarks(businessId: string, eventType: string) {
  const [biz] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!biz) return;

  const sizeBucket =
    !biz.employeeCount || biz.employeeCount <= 5
      ? "1-5"
      : biz.employeeCount <= 15
        ? "6-15"
        : "16-50";

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  // Upsert the benchmark aggregate
  await db
    .insert(benchmarkAggregates)
    .values({
      vertical: biz.vertical,
      city: biz.city.toLowerCase(),
      sizeBucket,
      periodType: "weekly",
      periodStart: weekStart,
      metricName: eventType,
      metricValue: "1",
      sampleSize: 1,
    })
    .onConflictDoUpdate({
      target: [
        benchmarkAggregates.vertical,
        benchmarkAggregates.city,
        benchmarkAggregates.sizeBucket,
        benchmarkAggregates.periodType,
        benchmarkAggregates.periodStart,
        benchmarkAggregates.metricName,
      ],
      set: {
        metricValue: sql`${benchmarkAggregates.metricValue}::numeric + 1`,
        sampleSize: sql`${benchmarkAggregates.sampleSize} + 1`,
      },
    });
}

/**
 * Compute weekly aggregates for a business.
 * Used by Weekly Digest generation.
 */
export async function getWeeklyAggregates(
  businessId: string,
  weeksBack: number = 1
) {
  const since = new Date(
    Date.now() - weeksBack * 7 * 24 * 60 * 60 * 1000
  );

  const [agg] = await db
    .select({
      pageViews: sql<number>`count(*) filter (where ${analyticsEvents.eventType} = 'page_view')`,
      phoneCalls: sql<number>`count(*) filter (where ${analyticsEvents.eventType} = 'phone_call')`,
      bookings: sql<number>`count(*) filter (where ${analyticsEvents.eventType} = 'booking')`,
      socialEngagement: sql<number>`count(*) filter (where ${analyticsEvents.eventType} = 'social_engagement')`,
      reviewsReceived: sql<number>`count(*) filter (where ${analyticsEvents.eventType} = 'review_received')`,
    })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.businessId, businessId),
        gte(analyticsEvents.occurredAt, since)
      )
    );

  return {
    websiteVisits: Number(agg?.pageViews || 0),
    phoneCalls: Number(agg?.phoneCalls || 0),
    bookings: Number(agg?.bookings || 0),
    socialEngagement: Number(agg?.socialEngagement || 0),
    reviewsReceived: Number(agg?.reviewsReceived || 0),
  };
}

/**
 * Get attribution summary for a business over a period.
 */
export async function getAttributionSummary(
  businessId: string,
  daysBack: number = 7
) {
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  const [agg] = await db
    .select({
      directCount: sql<number>`count(*) filter (where ${attributionEvents.confidence} = 'direct')`,
      correlatedCount: sql<number>`count(*) filter (where ${attributionEvents.confidence} = 'correlated')`,
      totalValue: sql<number>`coalesce(sum(${attributionEvents.valueCents}), 0)`,
    })
    .from(attributionEvents)
    .where(
      and(
        eq(attributionEvents.businessId, businessId),
        gte(attributionEvents.occurredAt, since)
      )
    );

  return {
    directActions: Number(agg?.directCount || 0),
    correlatedOutcomes: Number(agg?.correlatedCount || 0),
    estimatedValueCents: Number(agg?.totalValue || 0),
  };
}
