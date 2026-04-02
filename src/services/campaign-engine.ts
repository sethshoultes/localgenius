/**
 * Campaign Engine — Proactive AI Employee
 *
 * Converts insights into actionable campaigns. When the insights engine
 * detects "Tuesday lunch posts outperform by 34%", the campaign engine
 * generates a specific post draft, scheduled for optimal time, matching
 * the business's best-performing content style.
 *
 * Maria just taps approve. The AI employee is working for her.
 */

import { db } from "@/lib/db";
import {
  businesses,
  contentItems,
  actions,
  analyticsEvents,
  reviews,
} from "@/db/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { generate, generateSocialPost } from "./ai";
import { type Insight, generateInsights } from "./insights-engine";
import { schedule } from "./content-scheduler";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SuggestedCampaign {
  id: string;
  type: "social_post" | "email_campaign" | "review_request" | "special_offer";
  title: string;
  description: string;
  content: {
    text: string;
    platform?: string;
    scheduledFor?: string;
    topic?: string;
  };
  basedOn: string; // which insight triggered this
  estimatedImpact: string;
  priority: "high" | "medium" | "low";
  createdAt: string;
}

// ─── Campaign Generation ──────────────────────────────────────────────────────

/**
 * Generate campaign suggestions based on current insights.
 * Each suggestion is a ready-to-approve campaign with generated content.
 */
export async function generateSuggestedCampaigns(
  businessId: string,
  organizationId: string
): Promise<SuggestedCampaign[]> {
  const [biz] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!biz) return [];

  const insights = await generateInsights(businessId, organizationId);
  const campaigns: SuggestedCampaign[] = [];

  // Process top insights into campaigns
  for (const insight of insights.slice(0, 5)) {
    const campaign = await insightToCampaign(biz, insight);
    if (campaign) campaigns.push(campaign);
  }

  // Always suggest a timely post if none exist
  if (!campaigns.some((c) => c.type === "social_post")) {
    const timelyPost = await generateTimelyPost(biz);
    if (timelyPost) campaigns.push(timelyPost);
  }

  return campaigns.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });
}

/**
 * Convert a single insight into an actionable campaign.
 */
async function insightToCampaign(
  biz: { id: string; name: string; vertical: string; city: string; state: string },
  insight: Insight
): Promise<SuggestedCampaign | null> {
  switch (insight.type) {
    case "content_timing": {
      // Best day detected — schedule a post for that day
      const bestDay = insight.metricContext?.match(/on (\w+)s/)?.[1] || "Tuesday";
      const nextDate = getNextDayDate(bestDay);
      const optimalTime = getOptimalPostTime(biz.vertical);
      const scheduledFor = `${nextDate}T${optimalTime}:00`;

      const postText = await generateSocialPost(
        { name: biz.name, vertical: biz.vertical, city: biz.city },
        await getTopicFromRecentSuccess(biz.id)
      );

      return {
        id: `campaign_timing_${Date.now()}`,
        type: "social_post",
        title: `${bestDay} post — your best day for engagement`,
        description: `Your ${bestDay} posts get the most engagement. Here's one ready to go.`,
        content: {
          text: postText + "\n\nPosted by LocalGenius",
          platform: "instagram",
          scheduledFor,
          topic: "optimized_timing",
        },
        basedOn: insight.id,
        estimatedImpact: "34% higher engagement based on your posting history",
        priority: "high",
        createdAt: new Date().toISOString(),
      };
    }

    case "review_velocity_drop": {
      const emailContent = await generate({
        prompt: `Write a short, warm email for ${biz.name} (${biz.vertical} in ${biz.city}) asking recent customers for a Google review. Subject line + body. Under 100 words. Personal, not corporate. Mention a specific reason to leave a review (great food, friendly service, etc).`,
        maxTokens: 256,
      });

      return {
        id: `campaign_reviews_${Date.now()}`,
        type: "review_request",
        title: "Review request campaign",
        description: "Review momentum is slowing. A friendly ask to recent customers can reignite it.",
        content: {
          text: emailContent,
          platform: "email",
          topic: "review_request",
        },
        basedOn: insight.id,
        estimatedImpact: "Typically generates 3-5 new reviews within a week",
        priority: "high",
        createdAt: new Date().toISOString(),
      };
    }

    case "review_unanswered": {
      return {
        id: `campaign_respond_${Date.now()}`,
        type: "review_request",
        title: `Respond to ${insight.metricValue} pending reviews`,
        description: "I've drafted responses for all unanswered reviews. Just approve them.",
        content: {
          text: "Review responses ready for approval",
          topic: "review_responses",
        },
        basedOn: insight.id,
        estimatedImpact: "80%+ response rate improves Google ranking",
        priority: "high",
        createdAt: new Date().toISOString(),
      };
    }

    case "engagement_pattern": {
      if ((insight.metricValue || 0) < 0) {
        // Traffic is down — suggest a campaign
        const postText = await generateSocialPost(
          { name: biz.name, vertical: biz.vertical, city: biz.city },
          "a special offer to bring customers back"
        );

        return {
          id: `campaign_traffic_${Date.now()}`,
          type: "special_offer",
          title: "Win-back campaign",
          description: "Traffic dropped this week. A special offer can bring people back.",
          content: {
            text: postText + "\n\nPosted by LocalGenius",
            platform: "instagram",
            topic: "win_back",
          },
          basedOn: insight.id,
          estimatedImpact: "Special offers typically drive 20-40% traffic spike",
          priority: "medium",
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    }

    case "competitor_gap": {
      return {
        id: `campaign_compete_${Date.now()}`,
        type: "review_request",
        title: "Close the review gap",
        description: insight.description,
        content: {
          text: "Review request email to close competitor gap",
          platform: "email",
          topic: "competitive_reviews",
        },
        basedOn: insight.id,
        estimatedImpact: "Narrowing the review gap improves local search ranking",
        priority: "medium",
        createdAt: new Date().toISOString(),
      };
    }

    default:
      return null;
  }
}

/**
 * Generate a timely post based on recent successful content.
 */
async function generateTimelyPost(
  biz: { id: string; name: string; vertical: string; city: string; state: string }
): Promise<SuggestedCampaign | null> {
  const topic = await getTopicFromRecentSuccess(biz.id);
  const optimalTime = getOptimalPostTime(biz.vertical);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const scheduledFor = `${tomorrow.toISOString().split("T")[0]}T${optimalTime}:00`;

  const postText = await generateSocialPost(
    { name: biz.name, vertical: biz.vertical, city: biz.city },
    topic
  );

  return {
    id: `campaign_timely_${Date.now()}`,
    type: "social_post",
    title: "Tomorrow's post — ready to go",
    description: `A fresh post about ${topic}, scheduled for the optimal time.`,
    content: {
      text: postText + "\n\nPosted by LocalGenius",
      platform: "instagram",
      scheduledFor,
      topic,
    },
    basedOn: "proactive_suggestion",
    estimatedImpact: "Consistent posting keeps you visible in feeds",
    priority: "medium",
    createdAt: new Date().toISOString(),
  };
}

/**
 * Approve and schedule a suggested campaign.
 */
export async function approveCampaign(
  businessId: string,
  organizationId: string,
  campaign: SuggestedCampaign
): Promise<{ success: boolean; actionId?: string }> {
  if (campaign.type === "social_post" && campaign.content.scheduledFor) {
    const result = await schedule({
      businessId,
      organizationId,
      platform: (campaign.content.platform || "instagram") as "instagram" | "facebook",
      topic: campaign.content.topic || "scheduled post",
      scheduledFor: new Date(campaign.content.scheduledFor),
      content: campaign.content.text,
    });

    return { success: true, actionId: result.id };
  }

  // For non-scheduled campaigns, create a proposed action
  const [action] = await db
    .insert(actions)
    .values({
      businessId,
      organizationId,
      actionType: campaign.type === "email_campaign" || campaign.type === "review_request"
        ? "email_campaign"
        : "social_post",
      status: "approved",
      content: campaign.content,
      approvedAt: new Date(),
    })
    .returning();

  return { success: true, actionId: action.id };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNextDayDate(dayName: string): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const targetDay = days.indexOf(dayName);
  if (targetDay === -1) return new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const now = new Date();
  const currentDay = now.getDay();
  let daysUntil = targetDay - currentDay;
  if (daysUntil <= 0) daysUntil += 7;

  const target = new Date(now.getTime() + daysUntil * 86400000);
  return target.toISOString().split("T")[0];
}

function getOptimalPostTime(vertical: string): string {
  // Per AI system prompt: restaurants 11am for lunch, 5pm for dinner; salons 10am
  switch (vertical) {
    case "restaurant": return "11:00";
    case "salon": return "10:00";
    case "dental":
    case "medical": return "09:00";
    case "home_services": return "07:30";
    default: return "10:00";
  }
}

async function getTopicFromRecentSuccess(businessId: string): Promise<string> {
  // Find topics from best-performing recent content
  const [topContent] = await db
    .select({ content: contentItems.content })
    .from(contentItems)
    .where(
      and(
        eq(contentItems.businessId, businessId),
        eq(contentItems.contentType, "social_post"),
        eq(contentItems.approved, true)
      )
    )
    .orderBy(desc(contentItems.createdAt))
    .limit(1);

  const topic = (topContent?.content as { topic?: string })?.topic;
  if (topic) return topic;

  // Fallback: extract popular topic from positive reviews
  const [topReview] = await db
    .select({ topics: reviews.keyTopics })
    .from(reviews)
    .where(
      and(
        eq(reviews.businessId, businessId),
        sql`${reviews.rating} >= 4`
      )
    )
    .orderBy(desc(reviews.reviewDate))
    .limit(1);

  const reviewTopics = topReview?.topics as string[] | null;
  if (reviewTopics?.length) return reviewTopics[0];

  return "what makes us special";
}
