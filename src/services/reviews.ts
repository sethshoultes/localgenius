/**
 * Review Monitoring Service
 * Spec: engineering/api-design.md Section 4.1 (Google), 4.3 (Yelp)
 *
 * Monitors Google/Yelp/Facebook for new reviews, auto-drafts AI responses.
 * Runs as background job (4x/day per business).
 */

import { db } from "@/lib/db";
import { reviews, actions, businesses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateReviewResponse } from "./ai";

// Mock Google Places API response structure
interface GoogleReview {
  reviewId: string;
  reviewer: { displayName: string };
  starRating: number;
  comment: string;
  createTime: string;
}

interface GoogleReviewsResponse {
  reviews: GoogleReview[];
  totalReviewCount: number;
  averageRating: number;
}

/**
 * Fetch reviews from Google Business Profile API.
 * In production, this calls the real GBP API.
 * Currently returns mock data structured like the real API response.
 */
export async function fetchGoogleReviews(
  _platformBusinessId: string
): Promise<GoogleReviewsResponse> {
  // TODO: Replace with real Google Business Profile API call
  // GET accounts/{accountId}/locations/{locationId}/reviews
  // Rate limit: 60 req/min. Batch to 4x/day per business.
  return {
    reviews: [],
    totalReviewCount: 0,
    averageRating: 0,
  };
}

/**
 * Sync reviews for a business — detect new ones, draft AI responses.
 */
export async function syncReviews(businessId: string, organizationId: string) {
  const [biz] = await db
    .select()
    .from(businesses)
    .where(
      and(eq(businesses.id, businessId), eq(businesses.organizationId, organizationId))
    )
    .limit(1);

  if (!biz) return { synced: 0, drafted: 0 };

  // In production: fetch from Google/Yelp/Facebook APIs
  const googleReviews = await fetchGoogleReviews(businessId);

  let synced = 0;
  let drafted = 0;

  for (const gr of googleReviews.reviews) {
    // Check if we already have this review
    const existing = await db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.businessId, businessId),
          eq(reviews.platform, "google"),
          eq(reviews.externalReviewId, gr.reviewId)
        )
      )
      .limit(1);

    if (existing.length > 0) continue;

    // Store new review
    const sentiment =
      gr.starRating >= 4 ? "positive" : gr.starRating === 3 ? "neutral" : "negative";

    const [newReview] = await db
      .insert(reviews)
      .values({
        businessId,
        organizationId,
        platform: "google",
        externalReviewId: gr.reviewId,
        reviewerName: gr.reviewer.displayName,
        rating: gr.starRating,
        reviewText: gr.comment,
        reviewDate: new Date(gr.createTime),
        sentiment,
        keyTopics: [],
      })
      .returning();

    synced++;

    // Auto-draft a response
    const responseText = await generateReviewResponse(
      { name: biz.name },
      {
        reviewerName: gr.reviewer.displayName,
        rating: gr.starRating,
        reviewText: gr.comment,
      }
    );

    // Store as proposed action (pending owner approval)
    await db.insert(actions).values({
      businessId,
      organizationId,
      actionType: "review_response",
      status: biz.autonomyLevel >= 1 && gr.starRating >= 4 ? "approved" : "proposed",
      content: {
        reviewId: newReview.id,
        responseText,
        platform: "google",
        autoApproved: biz.autonomyLevel >= 1 && gr.starRating >= 4,
      },
      autoApproved: biz.autonomyLevel >= 1 && gr.starRating >= 4,
    });

    drafted++;
  }

  return { synced, drafted };
}

/**
 * Compute review velocity and sentiment trends for a business.
 * Used by Weekly Digest and analytics.
 */
export async function getReviewTrends(
  businessId: string,
  daysBack: number = 30
) {
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  const recentReviews = await db
    .select()
    .from(reviews)
    .where(
      and(
        eq(reviews.businessId, businessId),
        eq(reviews.platform, "google")
      )
    )
    .orderBy(reviews.reviewDate);

  const recent = recentReviews.filter(
    (r) => r.reviewDate && r.reviewDate >= since
  );

  const totalCount = recentReviews.length;
  const recentCount = recent.length;
  const avgRating =
    recentReviews.length > 0
      ? recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length
      : 0;
  const recentAvgRating =
    recent.length > 0
      ? recent.reduce((sum, r) => sum + r.rating, 0) / recent.length
      : 0;

  return {
    totalReviews: totalCount,
    recentReviews: recentCount,
    averageRating: Number(avgRating.toFixed(1)),
    recentAverageRating: Number(recentAvgRating.toFixed(1)),
    ratingTrend: recentAvgRating - avgRating,
    velocityPerWeek: Number(((recentCount / daysBack) * 7).toFixed(1)),
  };
}
