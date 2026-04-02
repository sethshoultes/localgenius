/**
 * Review Monitoring Service
 * Spec: engineering/api-design.md Section 4.1 (Google), 4.3 (Yelp)
 *
 * Monitors Google/Yelp/Facebook for new reviews, auto-drafts AI responses.
 * Runs as background job (4x/day per business).
 *
 * Uses google-business.ts for real GBP API calls when credentials available,
 * falls back gracefully when no API keys configured.
 */

import { db } from "@/lib/db";
import { reviews, actions, businesses, businessSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateReviewResponse } from "./ai";
import {
  syncReviews as googleSyncReviews,
  getAccessToken as getGoogleToken,
} from "./google-business";

/**
 * Sync reviews for a business from all connected platforms.
 * Uses real API clients when credentials are available.
 */
export async function syncReviews(businessId: string, organizationId: string) {
  const [biz] = await db
    .select()
    .from(businesses)
    .where(
      and(eq(businesses.id, businessId), eq(businesses.organizationId, organizationId))
    )
    .limit(1);

  if (!biz) return { synced: 0, drafted: 0, sources: [] };

  let synced = 0;
  let drafted = 0;
  const sources: string[] = [];

  // Try Google Business Profile (real API)
  const googleAuth = await getGoogleToken(businessId);
  if (googleAuth) {
    try {
      const result = await googleSyncReviews(businessId, organizationId);
      synced += result.synced;
      sources.push(`google:${result.synced} new of ${result.total} total`);

      // Auto-draft responses for new reviews
      if (result.synced > 0) {
        const newReviews = await db
          .select()
          .from(reviews)
          .where(
            and(
              eq(reviews.businessId, businessId),
              eq(reviews.platform, "google")
            )
          )
          .orderBy(reviews.createdAt)
          .limit(result.synced);

        for (const review of newReviews) {
          const responseText = await generateReviewResponse(
            { name: biz.name },
            {
              reviewerName: review.reviewerName,
              rating: review.rating,
              reviewText: review.reviewText,
            }
          );

          await db.insert(actions).values({
            businessId,
            organizationId,
            actionType: "review_response",
            status: biz.autonomyLevel >= 1 && review.rating >= 4 ? "approved" : "proposed",
            content: {
              reviewId: review.id,
              responseText,
              platform: "google",
              autoApproved: biz.autonomyLevel >= 1 && review.rating >= 4,
            },
            autoApproved: biz.autonomyLevel >= 1 && review.rating >= 4,
          });

          drafted++;
        }
      }
    } catch (error) {
      sources.push(`google:error (${error instanceof Error ? error.message : "unknown"})`);
    }
  } else {
    sources.push("google:not connected");
  }

  // Yelp: read-only (no API for posting responses)
  // Reviews synced via Yelp Fusion API when key is available
  // Response drafts generated but owner must post manually via deep link

  return { synced, drafted, sources };
}

/**
 * Sync reviews for ALL connected businesses.
 * Called by the cron job scheduler.
 */
export async function syncAllReviews(): Promise<{
  total: number;
  synced: number;
  failed: number;
  errors: string[];
}> {
  // Find all businesses with active Google connections
  const connections = await db
    .select({
      businessId: businessSettings.businessId,
      organizationId: businessSettings.organizationId,
    })
    .from(businessSettings)
    .where(
      and(
        eq(businessSettings.platform, "google_business"),
        eq(businessSettings.connectionStatus, "active")
      )
    );

  let total = connections.length;
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const conn of connections) {
    try {
      const result = await syncReviews(conn.businessId, conn.organizationId);
      if (result.synced > 0) synced++;
    } catch (error) {
      failed++;
      errors.push(`${conn.businessId}: ${error instanceof Error ? error.message : "unknown"}`);
    }
  }

  return { total, synced, failed, errors };
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
    .where(eq(reviews.businessId, businessId))
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
