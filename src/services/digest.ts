/**
 * Weekly Digest Generator
 * Spec: engineering/data-model.md (Weekly Digests), product-design.md Section 4
 *
 * Generates the 5-section narrative:
 *   1. "What Happened" — metrics summary (reviews, visits, calls, bookings)
 *   2. "What I Did" — actions completed (posts, review responses, emails)
 *   3. "How You Compare" — competitor comparison (ratings, review counts)
 *   4. "Your SEO Health" — SEO score, grade, top recommendation
 *   5. "What I Recommend" — AI recommendations informed by all data
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
import { getCompetitorDigestSection } from "./competitor-monitor";
import { runAudit } from "./seo";

interface DigestData {
  business: { id: string; name: string; vertical: string; city: string };
  metrics: Record<string, number>;
  actionsCompleted: Record<string, number>;
  reviewTrends: Record<string, number>;
  attribution: Record<string, number>;
  competitorContext: Record<string, unknown> | null;
  seoScore: { overall: number; grade: string; topRecommendation: string } | null;
  roiSummary: {
    timeSavedMinutes: number;
    timeSavedHours: number;
    actionsCompleted: number;
    reviewsResponded: number;
    postsPublished: number;
    ratingChange: number;
    estimatedValueDollars: number;
    headline: string;
  };
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

  // Gather competitor comparison data (if any competitors are tracked)
  const competitorSection = await getCompetitorDigestSection(businessId);
  const competitorContext = competitorSection
    ? {
        businessRating: competitorSection.businessRating,
        businessReviewCount: competitorSection.businessReviewCount,
        businessReviewDelta: competitorSection.businessReviewDelta,
        competitors: competitorSection.competitors.map((c) => ({
          name: c.competitorName,
          rating: c.competitorRating,
          reviewCount: c.competitorReviewCount,
          reviewDelta: c.competitorReviewDelta,
        })),
        summary: competitorSection.summary,
      }
    : null;

  // Run SEO audit for the SEO Health section
  let seoScore: DigestData["seoScore"] = null;
  try {
    const audit = await runAudit(businessId, organizationId);
    const overall = audit.score.overall;
    const grade =
      overall >= 90 ? "A" : overall >= 80 ? "B" : overall >= 70 ? "C" : overall >= 60 ? "D" : "F";
    const topRecommendation =
      audit.recommendations[0]?.description || "Keep up the great work!";
    seoScore = { overall, grade, topRecommendation };
  } catch {
    // SEO audit is non-critical — digest still generates without it
  }

  // ─── ROI Metrics (Jensen #3) ──────────────────────────────────────────────
  // Estimate time saved based on actions completed.
  // Industry averages: social post = 25 min, review response = 10 min,
  // email campaign = 45 min, SEO audit = 60 min, GBP update = 15 min.
  const TIME_PER_ACTION_MINUTES: Record<string, number> = {
    socialPosts: 25,
    reviewResponses: 10,
    emailCampaigns: 45,
    seoUpdates: 60,
    gbpUpdates: 15,
  };

  const timeSavedMinutes = Object.entries(TIME_PER_ACTION_MINUTES).reduce(
    (total, [key, minutes]) => total + (actionsCompleted[key as keyof typeof actionsCompleted] as number || 0) * minutes,
    0
  );

  const timeSavedHours = Math.round(timeSavedMinutes / 60 * 10) / 10;
  const estimatedValueCents = attribution.estimatedValueCents || 0;

  const roiSummary = {
    timeSavedMinutes,
    timeSavedHours,
    actionsCompleted: actionsCompleted.total,
    reviewsResponded: actionsCompleted.reviewResponses,
    postsPublished: actionsCompleted.socialPosts,
    ratingChange: reviewTrends.ratingTrend || 0,
    estimatedValueDollars: Math.round(estimatedValueCents / 100),
    headline: timeSavedHours >= 1
      ? `LocalGenius saved you ${timeSavedHours} hours this week`
      : `LocalGenius handled ${actionsCompleted.total} tasks for you this week`,
  };

  // Generate the narrative using AI (now includes competitor + SEO + ROI context)
  const narrativeMetrics: Record<string, unknown> = {
    ...metrics,
    ...actionsCompleted,
    averageRating: reviewTrends.recentAverageRating,
    totalReviews: reviewTrends.totalReviews,
    newReviews: reviewTrends.recentReviews,
    attributedOutcomes: attribution.directActions + attribution.correlatedOutcomes,
    roiSummary,
  };

  if (competitorContext) {
    narrativeMetrics.competitorContext = competitorContext;
  }

  if (seoScore) {
    narrativeMetrics.seoScore = seoScore;
  }

  const narrative = await generateDigestNarrative(
    { name: biz.name },
    narrativeMetrics
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
    recommendations: { narrative, seoScore, competitorContext, roiSummary },
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
        competitorContext,
        seoScore,
        roiSummary,
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
    competitorContext,
    seoScore,
    roiSummary,
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
