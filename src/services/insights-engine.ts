/**
 * Insights Engine — The Intelligence Layer
 *
 * Analyzes historical business data and generates proactive recommendations.
 * This is Jensen's data moat: the longer Maria uses LocalGenius, the smarter
 * it gets about her business. Competitors can't replicate 52 weeks of
 * performance data and pattern recognition.
 *
 * Outputs ranked InsightCards for the conversation thread.
 */

import { db } from "@/lib/db";
import {
  businesses,
  reviews,
  contentItems,
  actions,
  analyticsEvents,
  attributionEvents,
  competitors,
  insightActions,
} from "@/db/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { generate } from "./ai";
import { getReviewTrends } from "./reviews";
import { getCompetitors } from "./competitor-monitor";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Insight {
  id: string;
  type: InsightType;
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  metric?: string;
  metricValue?: number;
  metricContext?: string;
  actionLabel?: string;
  actionType?: string;
  category: "content" | "reviews" | "seo" | "growth" | "engagement" | "competitor";
  createdAt: string;
}

type InsightType =
  | "content_timing"
  | "review_velocity_drop"
  | "review_unanswered"
  | "review_sentiment_shift"
  | "engagement_pattern"
  | "competitor_gap"
  | "competitor_win"
  | "attribution_signal"
  | "seo_opportunity"
  | "growth_milestone"
  | "churn_risk"
  | "ai_recommendation";

// ─── Engine ───────────────────────────────────────────────────────────────────

/**
 * Generate insights for a business based on all available data.
 * Returns ranked list — highest priority first.
 */
export async function generateInsights(
  businessId: string,
  organizationId: string
): Promise<Insight[]> {
  const [biz] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!biz) return [];

  const insights: Insight[] = [];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Run all analyses in parallel
  const [
    contentInsights,
    reviewInsights,
    engagementInsights,
    competitorInsights,
    attributionInsights,
    milestoneInsights,
  ] = await Promise.all([
    analyzeContentPerformance(businessId, thirtyDaysAgo),
    analyzeReviewHealth(businessId, organizationId, sevenDaysAgo),
    analyzeEngagement(businessId, sevenDaysAgo, thirtyDaysAgo),
    analyzeCompetitors(businessId),
    analyzeAttribution(businessId, sevenDaysAgo),
    checkMilestones(businessId),
  ]);

  insights.push(
    ...contentInsights,
    ...reviewInsights,
    ...engagementInsights,
    ...competitorInsights,
    ...attributionInsights,
    ...milestoneInsights
  );

  // Sort by priority then recency
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Add an AI-generated proactive recommendation if we have enough data
  if (insights.length >= 2) {
    const aiInsight = await generateAIRecommendation(biz, insights.slice(0, 5));
    if (aiInsight) insights.unshift(aiInsight);
  }

  return insights;
}

// ─── Content Performance Analysis ─────────────────────────────────────────────

async function analyzeContentPerformance(
  businessId: string,
  since: Date
): Promise<Insight[]> {
  const insights: Insight[] = [];

  // Analyze posting frequency by day of week
  const dayPerformance = await db
    .select({
      dayOfWeek: sql<number>`extract(dow from ${contentItems.createdAt})`,
      count: sql<number>`count(*)`,
    })
    .from(contentItems)
    .where(
      and(
        eq(contentItems.businessId, businessId),
        eq(contentItems.contentType, "social_post"),
        gte(contentItems.createdAt, since)
      )
    )
    .groupBy(sql`extract(dow from ${contentItems.createdAt})`);

  if (dayPerformance.length >= 3) {
    const best = dayPerformance.reduce((a, b) =>
      Number(a.count) > Number(b.count) ? a : b
    );
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const bestDay = dayNames[Number(best.dayOfWeek)] || "midweek";

    insights.push({
      id: `content_timing_${Date.now()}`,
      type: "content_timing",
      priority: "medium",
      title: `Your ${bestDay} posts perform best`,
      description: `Posts published on ${bestDay} get the most engagement. Consider scheduling your most important content for ${bestDay}s.`,
      metric: "best_posting_day",
      metricValue: Number(best.count),
      metricContext: `${Number(best.count)} posts on ${bestDay}s in the last 30 days`,
      actionLabel: `Schedule a ${bestDay} post`,
      actionType: "schedule_post",
      category: "content",
      createdAt: new Date().toISOString(),
    });
  }

  // Check posting consistency
  const [postCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(contentItems)
    .where(
      and(
        eq(contentItems.businessId, businessId),
        eq(contentItems.contentType, "social_post"),
        gte(contentItems.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      )
    );

  const weeklyPosts = Number(postCount?.count || 0);
  if (weeklyPosts < 2) {
    insights.push({
      id: `content_consistency_${Date.now()}`,
      type: "content_timing",
      priority: "high",
      title: "Posting frequency dropped",
      description: `Only ${weeklyPosts} post${weeklyPosts === 1 ? "" : "s"} this week. Consistent posting (3+/week) keeps you visible in feeds and search.`,
      metric: "weekly_posts",
      metricValue: weeklyPosts,
      metricContext: "Target: 3+ posts per week",
      actionLabel: "Generate a post now",
      actionType: "generate_post",
      category: "content",
      createdAt: new Date().toISOString(),
    });
  }

  return insights;
}

// ─── Review Health Analysis ───────────────────────────────────────────────────

async function analyzeReviewHealth(
  businessId: string,
  organizationId: string,
  since: Date
): Promise<Insight[]> {
  const insights: Insight[] = [];

  // Check for unanswered reviews
  const [unanswered] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(reviews)
    .where(
      and(
        eq(reviews.businessId, businessId),
        sql`${reviews.id} NOT IN (SELECT review_id FROM review_responses)`
      )
    );

  const unansweredCount = Number(unanswered?.count || 0);
  if (unansweredCount > 0) {
    insights.push({
      id: `review_unanswered_${Date.now()}`,
      type: "review_unanswered",
      priority: unansweredCount >= 3 ? "high" : "medium",
      title: `${unansweredCount} review${unansweredCount === 1 ? "" : "s"} waiting for a response`,
      description: `Responding to reviews improves your Google ranking and shows customers you care. I've drafted responses — just approve them.`,
      metric: "unanswered_reviews",
      metricValue: unansweredCount,
      actionLabel: "View & respond",
      actionType: "respond_reviews",
      category: "reviews",
      createdAt: new Date().toISOString(),
    });
  }

  // Check review velocity trend
  const trends = await getReviewTrends(businessId, 30);
  if (trends.velocityPerWeek < 1 && trends.totalReviews > 5) {
    insights.push({
      id: `review_velocity_${Date.now()}`,
      type: "review_velocity_drop",
      priority: "medium",
      title: "Review momentum is slowing",
      description: `You're averaging ${trends.velocityPerWeek} reviews per week. A "we'd love your feedback" email to recent customers could help.`,
      metric: "review_velocity",
      metricValue: trends.velocityPerWeek,
      metricContext: "Target: 2+ reviews/week",
      actionLabel: "Send review request",
      actionType: "email_campaign",
      category: "reviews",
      createdAt: new Date().toISOString(),
    });
  }

  // Check for negative sentiment trend
  const [recentNegative] = await db
    .select({ count: sql<number>`count(*)` })
    .from(reviews)
    .where(
      and(
        eq(reviews.businessId, businessId),
        eq(reviews.sentiment, "negative"),
        gte(reviews.reviewDate, since)
      )
    );

  if (Number(recentNegative?.count || 0) >= 2) {
    insights.push({
      id: `review_sentiment_${Date.now()}`,
      type: "review_sentiment_shift",
      priority: "high",
      title: "Multiple negative reviews this week",
      description: `${Number(recentNegative?.count)} negative reviews in the last 7 days. Check if there's a recurring theme — I can analyze the common topics.`,
      metric: "negative_reviews_7d",
      metricValue: Number(recentNegative?.count),
      actionLabel: "Analyze review themes",
      actionType: "analyze_reviews",
      category: "reviews",
      createdAt: new Date().toISOString(),
    });
  }

  return insights;
}

// ─── Engagement Analysis ──────────────────────────────────────────────────────

async function analyzeEngagement(
  businessId: string,
  weekAgo: Date,
  monthAgo: Date
): Promise<Insight[]> {
  const insights: Insight[] = [];

  // Compare this week vs last week
  const twoWeeksAgo = new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [thisWeek] = await db
    .select({ count: sql<number>`count(*)` })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.businessId, businessId),
        eq(analyticsEvents.eventType, "page_view"),
        gte(analyticsEvents.occurredAt, weekAgo)
      )
    );

  const [lastWeek] = await db
    .select({ count: sql<number>`count(*)` })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.businessId, businessId),
        eq(analyticsEvents.eventType, "page_view"),
        gte(analyticsEvents.occurredAt, twoWeeksAgo),
        sql`${analyticsEvents.occurredAt} < ${weekAgo}`
      )
    );

  const thisWeekCount = Number(thisWeek?.count || 0);
  const lastWeekCount = Number(lastWeek?.count || 0);

  if (lastWeekCount > 0) {
    const change = ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100;
    if (change > 20) {
      insights.push({
        id: `engagement_up_${Date.now()}`,
        type: "engagement_pattern",
        priority: "low",
        title: `Website traffic up ${Math.round(change)}% this week`,
        description: `${thisWeekCount} visits this week vs ${lastWeekCount} last week. Something's working — keep it up.`,
        metric: "traffic_change_pct",
        metricValue: Math.round(change),
        category: "engagement",
        createdAt: new Date().toISOString(),
      });
    } else if (change < -20) {
      insights.push({
        id: `engagement_down_${Date.now()}`,
        type: "engagement_pattern",
        priority: "medium",
        title: `Website traffic down ${Math.abs(Math.round(change))}%`,
        description: `${thisWeekCount} visits this week vs ${lastWeekCount} last week. A social post or email campaign could help drive traffic back up.`,
        metric: "traffic_change_pct",
        metricValue: Math.round(change),
        actionLabel: "Create a campaign",
        actionType: "generate_post",
        category: "engagement",
        createdAt: new Date().toISOString(),
      });
    }
  }

  return insights;
}

// ─── Competitor Analysis ──────────────────────────────────────────────────────

async function analyzeCompetitors(businessId: string): Promise<Insight[]> {
  const insights: Insight[] = [];

  const tracked = await getCompetitors(businessId);
  if (tracked.length === 0) return insights;

  for (const comp of tracked) {
    const rating = Number(comp.googleRating || 0);
    const prevRating = Number(comp.lastRating || 0);
    const reviewCount = Number(comp.googleReviewCount || 0);
    const prevReviewCount = Number(comp.lastReviewCount || 0);
    const reviewDelta = reviewCount - prevReviewCount;

    // Competitor gaining reviews fast
    if (reviewDelta > 10) {
      insights.push({
        id: `competitor_reviews_${comp.id}`,
        type: "competitor_gap",
        priority: "medium",
        title: `${comp.competitorName} gained ${reviewDelta} reviews recently`,
        description: `They now have ${reviewCount} reviews. Ask happy customers for reviews to stay competitive.`,
        metric: "competitor_review_delta",
        metricValue: reviewDelta,
        actionLabel: "Request reviews",
        actionType: "email_campaign",
        category: "competitor",
        createdAt: new Date().toISOString(),
      });
    }

    // You're winning on rating
    if (rating > 0 && prevRating > 0 && rating < prevRating) {
      insights.push({
        id: `competitor_win_${comp.id}`,
        type: "competitor_win",
        priority: "low",
        title: `${comp.competitorName}'s rating dropped to ${rating}`,
        description: `Their rating fell from ${prevRating} to ${rating}. Your quality is showing — keep delivering great experiences.`,
        category: "competitor",
        createdAt: new Date().toISOString(),
      });
    }
  }

  return insights;
}

// ─── Attribution Analysis ─────────────────────────────────────────────────────

async function analyzeAttribution(
  businessId: string,
  since: Date
): Promise<Insight[]> {
  const insights: Insight[] = [];

  const [attrData] = await db
    .select({
      directCount: sql<number>`count(*) filter (where ${attributionEvents.confidence} = 'direct')`,
      totalValue: sql<number>`coalesce(sum(${attributionEvents.valueCents}), 0)`,
    })
    .from(attributionEvents)
    .where(
      and(
        eq(attributionEvents.businessId, businessId),
        gte(attributionEvents.occurredAt, since)
      )
    );

  const directActions = Number(attrData?.directCount || 0);
  if (directActions >= 5) {
    const totalValue = Number(attrData?.totalValue || 0);
    insights.push({
      id: `attribution_roi_${Date.now()}`,
      type: "attribution_signal",
      priority: "low",
      title: `LocalGenius drove ${directActions} trackable outcomes this week`,
      description: totalValue > 0
        ? `${directActions} customer actions directly linked to your posts, reviews, and profile — estimated value: $${(totalValue / 100).toFixed(0)}.`
        : `${directActions} customer actions (calls, visits, bookings) directly linked to your marketing activity.`,
      metric: "attributed_outcomes",
      metricValue: directActions,
      category: "growth",
      createdAt: new Date().toISOString(),
    });
  }

  return insights;
}

// ─── Milestone Detection ──────────────────────────────────────────────────────

async function checkMilestones(businessId: string): Promise<Insight[]> {
  const insights: Insight[] = [];

  const [reviewTotal] = await db
    .select({ count: sql<number>`count(*)` })
    .from(reviews)
    .where(eq(reviews.businessId, businessId));

  const count = Number(reviewTotal?.count || 0);
  const milestones = [25, 50, 100, 200, 500];

  for (const milestone of milestones) {
    if (count >= milestone && count < milestone + 3) {
      insights.push({
        id: `milestone_reviews_${milestone}`,
        type: "growth_milestone",
        priority: "low",
        title: `You hit ${milestone} reviews!`,
        description: milestone >= 100
          ? `${milestone} reviews puts you in the top 10% of local businesses. That's a real competitive advantage.`
          : `${milestone} reviews and counting. Every review builds trust with new customers.`,
        metric: "total_reviews",
        metricValue: count,
        category: "growth",
        createdAt: new Date().toISOString(),
      });
      break;
    }
  }

  return insights;
}

// ─── AI Recommendation ────────────────────────────────────────────────────────

async function generateAIRecommendation(
  biz: { name: string; vertical: string; city: string },
  topInsights: Insight[]
): Promise<Insight | null> {
  try {
    const insightSummary = topInsights
      .map((i) => `${i.priority}: ${i.title} — ${i.description}`)
      .join("\n");

    const recommendation = await generate({
      prompt: `You are LocalGenius, analyzing ${biz.name} (${biz.vertical} in ${biz.city}). Based on these insights:

${insightSummary}

Write ONE specific, actionable recommendation (2 sentences max). Be warm and direct. Start with what to do, not why. Example: "Schedule a photo post of your lunch special for Tuesday at 11am — your Tuesday posts get 34% more engagement."`,
      maxTokens: 150,
      model: "claude-haiku-4-5-20251001",
    });

    return {
      id: `ai_rec_${Date.now()}`,
      type: "ai_recommendation",
      priority: "high",
      title: "My recommendation for this week",
      description: recommendation.trim(),
      actionLabel: "Let's do it",
      actionType: "conversation",
      category: "growth",
      createdAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// ─── Insight Tracking (Database-Backed) ──────────────────────────────────────
// Jensen Issue #6: replaced in-memory Map with database persistence.
// State now survives restarts and scales across instances.

/**
 * Mark an insight as acted-on or dismissed. Persists to database.
 */
export async function trackInsightAction(
  insightId: string,
  businessId: string,
  action: "acted" | "dismissed"
): Promise<void> {
  await db
    .insert(insightActions)
    .values({
      insightId,
      businessId,
      action,
      actedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [insightActions.insightId, insightActions.businessId],
      set: { action, actedAt: new Date() },
    });
}

/**
 * Get insight action history for a business.
 */
export async function getInsightHistory(
  businessId: string
): Promise<Array<{ insightId: string; action: string; actedAt: Date }>> {
  return db
    .select({
      insightId: insightActions.insightId,
      action: insightActions.action,
      actedAt: insightActions.actedAt,
    })
    .from(insightActions)
    .where(eq(insightActions.businessId, businessId))
    .orderBy(desc(insightActions.actedAt));
}
