import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reviews, reviewResponses } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { verifyAuth } from "@/api/middleware/auth";

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  const searchParams = request.nextUrl.searchParams;
  const platform = searchParams.get("platform");

  const conditions = [eq(reviews.businessId, auth.businessId), eq(reviews.organizationId, auth.organizationId)];
  if (platform) conditions.push(eq(reviews.platform, platform));

  const allReviews = await db.select().from(reviews).where(and(...conditions)).orderBy(desc(reviews.reviewDate)).limit(50);

  const [summary] = await db.select({
    total: sql<number>`count(*)`,
    avgRating: sql<number>`avg(${reviews.rating})`,
    positive: sql<number>`count(*) filter (where ${reviews.sentiment} = 'positive')`,
    neutral: sql<number>`count(*) filter (where ${reviews.sentiment} = 'neutral')`,
    negative: sql<number>`count(*) filter (where ${reviews.sentiment} = 'negative')`,
  }).from(reviews).where(and(eq(reviews.businessId, auth.businessId), eq(reviews.organizationId, auth.organizationId)));

  const responses = await db.select({ reviewId: reviewResponses.reviewId }).from(reviewResponses).where(eq(reviewResponses.businessId, auth.businessId));
  const respondedIds = new Set(responses.map((r) => r.reviewId));

  return NextResponse.json({
    data: {
      reviews: allReviews.map((r) => ({ ...r, hasResponse: respondedIds.has(r.id) })),
      summary: {
        total: Number(summary?.total || 0),
        averageRating: Number(Number(summary?.avgRating || 0).toFixed(1)),
        pendingResponses: allReviews.filter((r) => !respondedIds.has(r.id)).length,
        sentimentBreakdown: { positive: Number(summary?.positive || 0), neutral: Number(summary?.neutral || 0), negative: Number(summary?.negative || 0) },
      },
    },
    meta: { timestamp: new Date().toISOString() },
  });
}
