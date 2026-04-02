/**
 * Lead Attribution Service — The Kevin-the-Plumber Retention Feature
 *
 * Tracks: where did this customer call come from? Google listing?
 * Instagram post? Website? Maps phone calls, website clicks, and
 * bookings back to specific LocalGenius actions.
 *
 * This is what keeps Kevin from churning — he sees:
 * "LocalGenius generated 12 calls this month."
 *
 * Attribution layers (from data-model.md):
 *   Direct: API tracking (click → action)
 *   Correlated: temporal proximity (post published → calls increase)
 *   Aggregate: monthly trends (overall improvement since joining)
 */

import { db } from "@/lib/db";
import {
  attributionEvents,
  analyticsEvents,
  actions,
  businesses,
} from "@/db/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LeadSource {
  source: string;
  channel: string;
  count: number;
  estimatedValueCents: number;
}

export interface AttributionReport {
  period: string;
  totalLeads: number;
  totalEstimatedValueCents: number;
  bySource: LeadSource[];
  byAction: ActionAttribution[];
  trend: {
    thisMonth: number;
    lastMonth: number;
    changePercent: number;
  };
  headline: string; // "LocalGenius generated 12 calls this month"
}

interface ActionAttribution {
  actionId: string;
  actionType: string;
  description: string;
  leadsGenerated: number;
  valueCents: number;
}

// ─── Lead Value Estimation ────────────────────────────────────────────────────

// Estimated value per lead type by vertical (cents)
const LEAD_VALUES: Record<string, Record<string, number>> = {
  restaurant: {
    phone_call: 2500,       // $25 avg ticket from a call
    booking: 5000,          // $50 avg reservation value
    direction_request: 1500, // $15 (lower intent than call)
    form_submission: 3000,
    website_visit: 200,      // $2 (low intent, high volume)
  },
  salon: {
    phone_call: 5000,       // $50 avg service
    booking: 7500,          // $75 avg booking
    direction_request: 2000,
    form_submission: 5000,
    website_visit: 300,
  },
  dental: {
    phone_call: 15000,      // $150 avg new patient value
    booking: 20000,         // $200 new patient
    form_submission: 12000,
    website_visit: 500,
  },
  home_services: {
    phone_call: 20000,      // $200 avg job
    booking: 25000,
    form_submission: 15000,
    website_visit: 400,
  },
  default: {
    phone_call: 5000,
    booking: 7500,
    direction_request: 2000,
    form_submission: 3000,
    website_visit: 250,
  },
};

function getLeadValue(vertical: string, eventType: string): number {
  const verticalValues = LEAD_VALUES[vertical] || LEAD_VALUES.default;
  return verticalValues[eventType] || verticalValues.website_visit || 250;
}

// ─── Attribution Tracking ─────────────────────────────────────────────────────

/**
 * Record a lead event and attribute it to a LocalGenius action.
 */
export async function recordLead(
  businessId: string,
  organizationId: string,
  eventType: string,
  source: string,
  metadata: Record<string, unknown> = {}
): Promise<{ eventId: string; attributedTo: string | null; valueCents: number }> {
  const [biz] = await db
    .select({ vertical: businesses.vertical })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  const valueCents = getLeadValue(biz?.vertical || "default", eventType);

  // Record the analytics event
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

  // Attempt attribution to a recent action
  const attributedActionId = await findAttributableAction(
    businessId,
    eventType,
    source
  );

  // Store attribution event
  await db.insert(attributionEvents).values({
    businessId,
    organizationId,
    actionId: attributedActionId,
    eventType,
    confidence: attributedActionId ? (source === "direct" ? "direct" : "correlated") : "aggregate",
    valueCents,
    metadata: { source, ...metadata },
    occurredAt: new Date(),
  });

  return {
    eventId: event.id,
    attributedTo: attributedActionId,
    valueCents,
  };
}

/**
 * Find the most likely LocalGenius action that caused this lead.
 */
async function findAttributableAction(
  businessId: string,
  eventType: string,
  source: string
): Promise<string | null> {
  // Attribution windows by source and event type
  const windowHours: Record<string, number> = {
    google_business: 168,    // 7 days — GBP optimization has long tail
    instagram: 72,           // 3 days — social posts are ephemeral
    facebook: 72,
    email: 336,              // 14 days — email campaigns have long tail
    website: 168,            // 7 days
    direct: 24,              // 1 day — direct referral
  };

  const window = windowHours[source] || 168;
  const windowStart = new Date(Date.now() - window * 60 * 60 * 1000);

  // Map lead sources to action types that could have caused them
  const sourceToActions: Record<string, string[]> = {
    google_business: ["gbp_update", "seo_optimization", "review_response"],
    instagram: ["social_post"],
    facebook: ["social_post"],
    email: ["email_campaign", "sms_campaign"],
    website: ["social_post", "seo_optimization", "gbp_update"],
  };

  const relevantActions = sourceToActions[source] || ["social_post", "gbp_update"];

  const [recentAction] = await db
    .select({ id: actions.id })
    .from(actions)
    .where(
      and(
        eq(actions.businessId, businessId),
        eq(actions.status, "completed"),
        gte(actions.executedAt, windowStart),
        sql`${actions.actionType} IN (${sql.raw(relevantActions.map(a => `'${a}'`).join(","))})`
      )
    )
    .orderBy(desc(actions.executedAt))
    .limit(1);

  return recentAction?.id || null;
}

// ─── Attribution Reports ──────────────────────────────────────────────────────

/**
 * Generate a lead attribution report for a business.
 * This is what Kevin sees: "LocalGenius generated 12 calls this month."
 */
export async function getAttributionReport(
  businessId: string,
  daysBack: number = 30
): Promise<AttributionReport> {
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  const lastMonthStart = new Date(since.getTime() - daysBack * 24 * 60 * 60 * 1000);

  // This month's leads
  const thisMonthLeads = await db
    .select({
      eventType: attributionEvents.eventType,
      confidence: attributionEvents.confidence,
      count: sql<number>`count(*)`,
      totalValue: sql<number>`coalesce(sum(${attributionEvents.valueCents}), 0)`,
    })
    .from(attributionEvents)
    .where(
      and(
        eq(attributionEvents.businessId, businessId),
        gte(attributionEvents.occurredAt, since)
      )
    )
    .groupBy(attributionEvents.eventType, attributionEvents.confidence);

  // Last month's leads for trend
  const [lastMonthTotal] = await db
    .select({ count: sql<number>`count(*)` })
    .from(attributionEvents)
    .where(
      and(
        eq(attributionEvents.businessId, businessId),
        gte(attributionEvents.occurredAt, lastMonthStart),
        sql`${attributionEvents.occurredAt} < ${since}`
      )
    );

  // Leads by source
  const bySourceData = await db
    .select({
      source: sql<string>`(${attributionEvents.metadata}->>'source')`,
      count: sql<number>`count(*)`,
      totalValue: sql<number>`coalesce(sum(${attributionEvents.valueCents}), 0)`,
    })
    .from(attributionEvents)
    .where(
      and(
        eq(attributionEvents.businessId, businessId),
        gte(attributionEvents.occurredAt, since)
      )
    )
    .groupBy(sql`(${attributionEvents.metadata}->>'source')`);

  // Top actions by attribution
  const topActions = await db
    .select({
      actionId: attributionEvents.actionId,
      actionType: actions.actionType,
      count: sql<number>`count(*)`,
      totalValue: sql<number>`coalesce(sum(${attributionEvents.valueCents}), 0)`,
    })
    .from(attributionEvents)
    .innerJoin(actions, eq(attributionEvents.actionId, actions.id))
    .where(
      and(
        eq(attributionEvents.businessId, businessId),
        gte(attributionEvents.occurredAt, since),
        sql`${attributionEvents.actionId} IS NOT NULL`
      )
    )
    .groupBy(attributionEvents.actionId, actions.actionType)
    .orderBy(desc(sql`count(*)`))
    .limit(5);

  // Compute totals
  const totalLeads = thisMonthLeads.reduce((sum, r) => sum + Number(r.count), 0);
  const totalValue = thisMonthLeads.reduce((sum, r) => sum + Number(r.totalValue), 0);
  const lastMonthCount = Number(lastMonthTotal?.count || 0);
  const changePercent = lastMonthCount > 0
    ? Math.round(((totalLeads - lastMonthCount) / lastMonthCount) * 100)
    : totalLeads > 0 ? 100 : 0;

  // Generate headline
  const leadTypes: string[] = [];
  const phoneCalls = thisMonthLeads.filter(r => r.eventType === "phone_call").reduce((s, r) => s + Number(r.count), 0);
  const bookings = thisMonthLeads.filter(r => r.eventType === "booking").reduce((s, r) => s + Number(r.count), 0);
  const visits = thisMonthLeads.filter(r => r.eventType === "page_view" || r.eventType === "website_visit").reduce((s, r) => s + Number(r.count), 0);

  if (phoneCalls > 0) leadTypes.push(`${phoneCalls} call${phoneCalls !== 1 ? "s" : ""}`);
  if (bookings > 0) leadTypes.push(`${bookings} booking${bookings !== 1 ? "s" : ""}`);
  if (visits > 0) leadTypes.push(`${visits} website visit${visits !== 1 ? "s" : ""}`);

  const headline = leadTypes.length > 0
    ? `LocalGenius generated ${leadTypes.join(", ")} this month.`
    : `Tracking your leads — data will appear as customers interact with your presence.`;

  return {
    period: `${daysBack} days`,
    totalLeads,
    totalEstimatedValueCents: totalValue,
    bySource: bySourceData.map(r => ({
      source: r.source || "unknown",
      channel: mapSourceToChannel(r.source || ""),
      count: Number(r.count),
      estimatedValueCents: Number(r.totalValue),
    })),
    byAction: topActions.map(r => ({
      actionId: r.actionId || "",
      actionType: r.actionType || "",
      description: describeAction(r.actionType || ""),
      leadsGenerated: Number(r.count),
      valueCents: Number(r.totalValue),
    })),
    trend: {
      thisMonth: totalLeads,
      lastMonth: lastMonthCount,
      changePercent,
    },
    headline,
  };
}

/**
 * Get a one-line attribution summary for the Weekly Digest.
 */
export async function getDigestAttributionLine(
  businessId: string
): Promise<string> {
  const report = await getAttributionReport(businessId, 7);

  if (report.totalLeads === 0) {
    return "I'm tracking your leads — you'll see results here as customers find you online.";
  }

  const valueDollars = (report.totalEstimatedValueCents / 100).toFixed(0);
  const trendEmoji = report.trend.changePercent > 0 ? "📈" : report.trend.changePercent < 0 ? "📉" : "➡️";

  return `${report.headline} Estimated value: $${valueDollars}. ${trendEmoji} ${report.trend.changePercent >= 0 ? "+" : ""}${report.trend.changePercent}% vs last period.`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapSourceToChannel(source: string): string {
  const map: Record<string, string> = {
    google_business: "Google Search & Maps",
    instagram: "Instagram",
    facebook: "Facebook",
    email: "Email Campaign",
    website: "Your Website",
    direct: "Direct Referral",
    yelp: "Yelp",
  };
  return map[source] || source;
}

function describeAction(actionType: string): string {
  const map: Record<string, string> = {
    social_post: "Social media post",
    gbp_update: "Google profile optimization",
    seo_optimization: "SEO improvement",
    review_response: "Review response",
    email_campaign: "Email campaign",
    sms_campaign: "SMS campaign",
  };
  return map[actionType] || actionType;
}
