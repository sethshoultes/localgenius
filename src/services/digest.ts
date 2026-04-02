/**
 * Weekly Digest Generator
 * Spec: engineering/data-model.md (Weekly Digests), product-design.md Section 4
 *
 * Generates the 3-act narrative:
 *   Act 1: "Here's what happened" (what the world did)
 *   Act 2: "Here's what I did" (what LocalGenius did)
 *   Act 3: "Here's what I recommend" (what to do next)
 *
 * Uses Claude Haiku 4.5 for batch generation (cost optimization).
 */

import { db } from "@/lib/db";
import {
  businesses,
  weeklyDigests,
  reviews,
  actions,
  messages,
} from "@/db/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { generateDigestNarrative } from "./ai";
import { getWeeklyAggregates, getAttributionSummary } from "./analytics";
import { getReviewTrends } from "./reviews";

interface DigestData {
  business: { id: string; name: string; vertical: string; city: string };
  metrics: Record<string, number>;
  actionsCompleted: Record<string, number>;
  reviewTrends: Record<string, number>;
  attribution: Record<string, number>;
  narrative: string;
}

/**
 * Generate a Weekly Digest for a single business.
 */
export async function generateDigest(
  businessId: string,
  organizationId: string
): Promise<DigestData | null> {
  const [biz] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!biz) return null;

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Gather all metrics
  const metrics = await getWeeklyAggregates(businessId, 1);
  const attribution = await getAttributionSummary(businessId, 7);
  const reviewTrends = await getReviewTrends(businessId, 7);

  // Count actions completed this week
  const [actionCounts] = await db
    .select({
      total: sql<number>`count(*)`,
      socialPosts: sql<number>`count(*) filter (where ${actions.actionType} = 'social_post')`,
      reviewResponses: sql<number>`count(*) filter (where ${actions.actionType} = 'review_response')`,
      emailCampaigns: sql<number>`count(*) filter (where ${actions.actionType} = 'email_campaign')`,
      seoUpdates: sql<number>`count(*) filter (where ${actions.actionType} = 'seo_optimization')`,
      gbpUpdates: sql<number>`count(*) filter (where ${actions.actionType} = 'gbp_update')`,
    })
    .from(actions)
    .where(
      and(
        eq(actions.businessId, businessId),
        eq(actions.status, "completed"),
        gte(actions.executedAt, oneWeekAgo)
      )
    );

  const actionsCompleted = {
    total: Number(actionCounts?.total || 0),
    socialPosts: Number(actionCounts?.socialPosts || 0),
    reviewResponses: Number(actionCounts?.reviewResponses || 0),
    emailCampaigns: Number(actionCounts?.emailCampaigns || 0),
    seoUpdates: Number(actionCounts?.seoUpdates || 0),
    gbpUpdates: Number(actionCounts?.gbpUpdates || 0),
  };

  // Generate the narrative using AI
  const narrative = await generateDigestNarrative(
    { name: biz.name },
    {
      ...metrics,
      ...actionsCompleted,
      averageRating: reviewTrends.recentAverageRating,
      totalReviews: reviewTrends.totalReviews,
      newReviews: reviewTrends.recentReviews,
      attributedOutcomes: attribution.directActions + attribution.correlatedOutcomes,
    }
  );

  // Store the digest
  const now = new Date();
  await db.insert(weeklyDigests).values({
    businessId,
    organizationId,
    periodStart: oneWeekAgo,
    periodEnd: now,
    metrics,
    actionsCompleted,
    recommendations: { narrative },
  });

  // Also store as a message in the conversation thread
  const [convo] = await db
    .select()
    .from(db._.fullSchema.conversations)
    .where(eq(db._.fullSchema.conversations.businessId, businessId))
    .limit(1);

  if (convo) {
    await db.insert(messages).values({
      conversationId: convo.id,
      businessId,
      organizationId,
      role: "assistant",
      contentType: "digest",
      content: {
        narrative,
        metrics,
        actionsCompleted,
        reviewTrends,
        periodStart: oneWeekAgo.toISOString(),
        periodEnd: now.toISOString(),
      },
      aiModel: "claude-haiku-4-5-20251001",
    });
  }

  return {
    business: {
      id: biz.id,
      name: biz.name,
      vertical: biz.vertical,
      city: biz.city,
    },
    metrics,
    actionsCompleted,
    reviewTrends,
    attribution,
    narrative,
  };
}

/**
 * Generate digests for all active businesses.
 * Called by the cron endpoint (Monday 5:00 AM per timezone).
 */
export async function generateAllDigests(): Promise<{
  generated: number;
  failed: number;
  errors: string[];
}> {
  const allBusinesses = await db
    .select()
    .from(businesses)
    .where(sql`${businesses.deletedAt} IS NULL AND ${businesses.onboardingCompletedAt} IS NOT NULL`);

  let generated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const biz of allBusinesses) {
    try {
      await generateDigest(biz.id, biz.organizationId);
      generated++;
    } catch (error) {
      failed++;
      errors.push(
        `${biz.name} (${biz.id}): ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return { generated, failed, errors };
}
