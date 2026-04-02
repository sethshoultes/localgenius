import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { analyticsEvents, attributionEvents, benchmarkAggregates, businesses } from "@/db/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { verifyAuth } from "@/api/middleware/auth";

const recordEventSchema = z.object({
  eventType: z.string(),
  source: z.string(),
  metadata: z.record(z.unknown()).optional(),
  occurredAt: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const validated = recordEventSchema.parse(body);

    const [event] = await db.insert(analyticsEvents).values({
      businessId: auth.businessId, organizationId: auth.organizationId,
      eventType: validated.eventType, source: validated.source,
      metadata: validated.metadata || {},
      occurredAt: validated.occurredAt ? new Date(validated.occurredAt) : new Date(),
    }).returning();

    return NextResponse.json({ data: { event }, meta: { timestamp: new Date().toISOString() } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid event", details: error.errors } }, { status: 400 });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to record event" } }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  const period = request.nextUrl.searchParams.get("period") || "weekly";
  const daysBack = period === "monthly" ? 30 : 7;
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  const [eventAgg] = await db.select({
    pageViews: sql<number>`count(*) filter (where ${analyticsEvents.eventType} = 'page_view')`,
    phoneCalls: sql<number>`count(*) filter (where ${analyticsEvents.eventType} = 'phone_call')`,
    bookings: sql<number>`count(*) filter (where ${analyticsEvents.eventType} = 'booking')`,
    reviewsReceived: sql<number>`count(*) filter (where ${analyticsEvents.eventType} = 'review_received')`,
    socialEngagement: sql<number>`count(*) filter (where ${analyticsEvents.eventType} = 'social_engagement')`,
  }).from(analyticsEvents).where(and(eq(analyticsEvents.businessId, auth.businessId), gte(analyticsEvents.occurredAt, since)));

  const [attrAgg] = await db.select({
    directCount: sql<number>`count(*) filter (where ${attributionEvents.confidence} = 'direct')`,
    correlatedCount: sql<number>`count(*) filter (where ${attributionEvents.confidence} = 'correlated')`,
    totalValue: sql<number>`coalesce(sum(${attributionEvents.valueCents}), 0)`,
  }).from(attributionEvents).where(and(eq(attributionEvents.businessId, auth.businessId), gte(attributionEvents.occurredAt, since)));

  const [biz] = await db.select().from(businesses).where(eq(businesses.id, auth.businessId)).limit(1);
  let benchmarks = null;
  if (biz) {
    const sizeBucket = !biz.employeeCount || biz.employeeCount <= 5 ? "1-5" : biz.employeeCount <= 15 ? "6-15" : "16-50";
    const rows = await db.select().from(benchmarkAggregates)
      .where(and(eq(benchmarkAggregates.vertical, biz.vertical), eq(benchmarkAggregates.city, biz.city.toLowerCase()), eq(benchmarkAggregates.sizeBucket, sizeBucket), sql`${benchmarkAggregates.sampleSize} >= 5`))
      .orderBy(desc(benchmarkAggregates.periodStart)).limit(10);
    if (rows.length > 0) benchmarks = rows;
  }

  return NextResponse.json({
    data: {
      period,
      metrics: { websiteVisits: Number(eventAgg?.pageViews || 0), phoneCalls: Number(eventAgg?.phoneCalls || 0), bookings: Number(eventAgg?.bookings || 0), reviewsReceived: Number(eventAgg?.reviewsReceived || 0), socialEngagement: Number(eventAgg?.socialEngagement || 0) },
      attribution: { directActions: Number(attrAgg?.directCount || 0), correlatedOutcomes: Number(attrAgg?.correlatedCount || 0), estimatedValueCents: Number(attrAgg?.totalValue || 0) },
      benchmarks,
    },
    meta: { timestamp: new Date().toISOString() },
  });
}
