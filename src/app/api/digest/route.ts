import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { weeklyDigests, reviews, actions, analyticsEvents, businesses } from "@/db/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { verifyAuth } from "@/api/middleware/auth";
import { generateDigestNarrative } from "@/services/ai";

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  const generateNew = request.nextUrl.searchParams.get("generate") === "true";

  if (generateNew) {
    const [biz] = await db.select().from(businesses).where(eq(businesses.id, auth.businessId)).limit(1);
    if (!biz) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Business not found" } }, { status: 404 });

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [reviewStats] = await db.select({
      count: sql<number>`count(*)`, avgRating: sql<number>`avg(${reviews.rating})`,
    }).from(reviews).where(and(eq(reviews.businessId, auth.businessId), gte(reviews.reviewDate, oneWeekAgo)));

    const [actionStats] = await db.select({
      completed: sql<number>`count(*) filter (where ${actions.status} = 'completed')`,
      socialPosts: sql<number>`count(*) filter (where ${actions.actionType} = 'social_post' and ${actions.status} = 'completed')`,
      reviewResponses: sql<number>`count(*) filter (where ${actions.actionType} = 'review_response' and ${actions.status} = 'completed')`,
    }).from(actions).where(and(eq(actions.businessId, auth.businessId), gte(actions.createdAt, oneWeekAgo)));

    const [eventStats] = await db.select({
      pageViews: sql<number>`count(*) filter (where ${analyticsEvents.eventType} = 'page_view')`,
      phoneCalls: sql<number>`count(*) filter (where ${analyticsEvents.eventType} = 'phone_call')`,
      bookings: sql<number>`count(*) filter (where ${analyticsEvents.eventType} = 'booking')`,
    }).from(analyticsEvents).where(and(eq(analyticsEvents.businessId, auth.businessId), gte(analyticsEvents.occurredAt, oneWeekAgo)));

    const metrics = {
      reviewsReceived: Number(reviewStats?.count || 0), averageRating: Number(Number(reviewStats?.avgRating || 0).toFixed(1)),
      actionsCompleted: Number(actionStats?.completed || 0), socialPostsPublished: Number(actionStats?.socialPosts || 0),
      reviewsResponded: Number(actionStats?.reviewResponses || 0), websiteVisits: Number(eventStats?.pageViews || 0),
      phoneCalls: Number(eventStats?.phoneCalls || 0), bookings: Number(eventStats?.bookings || 0),
    };

    const narrative = await generateDigestNarrative({ name: biz.name }, metrics);
    const now = new Date();

    const [digest] = await db.insert(weeklyDigests).values({
      businessId: auth.businessId, organizationId: auth.organizationId,
      periodStart: oneWeekAgo, periodEnd: now,
      metrics, actionsCompleted: { socialPosts: metrics.socialPostsPublished, reviewResponses: metrics.reviewsResponded, total: metrics.actionsCompleted },
      recommendations: { narrative },
    }).returning();

    return NextResponse.json({ data: { digest: { ...digest, narrative } }, meta: { timestamp: new Date().toISOString() } });
  }

  const digests = await db.select().from(weeklyDigests)
    .where(and(eq(weeklyDigests.businessId, auth.businessId), eq(weeklyDigests.organizationId, auth.organizationId)))
    .orderBy(desc(weeklyDigests.periodStart)).limit(10);

  return NextResponse.json({ data: { digests }, meta: { timestamp: new Date().toISOString() } });
}
