/**
 * Onboarding Pipeline — The Proof Moment Engine
 *
 * When Maria finishes onboarding, she immediately has:
 *   1. A live website
 *   2. A conversation with a welcome message
 *   3. Three suggested social posts in her thread
 *   4. Google reviews synced (if connected)
 *   5. A Weekly Digest scheduled for Sunday
 *   6. An SEO score with recommendations
 *   7. All events tracked for attribution
 *
 * This is what makes her tear up. This is what she texts her husband about.
 * Five minutes ago she had nothing. Now she has an employee.
 */

import { db } from "@/lib/db";
import {
  businesses,
  conversations,
  messages,
  actions,
  analyticsEvents,
  weeklyDigests,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateWebsite } from "./website-generator";
import { provisionSite as provisionCloudfareSite } from "./sites";
import { provisionDomain } from "./domain-provisioning";
import { generateSocialPost, generate } from "./ai";
import { syncReviews } from "./reviews";
import { runAudit } from "./seo";
import { logger } from "@/lib/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardingInput {
  businessId: string;
  organizationId: string;
  userId: string;
  businessName: string;
  vertical: string;
  city: string;
  state: string;
  address?: string | null;
  phone?: string | null;
  photos?: string[];
  priorityFocus?: string | null;
  hasGoogleConnection?: boolean;
}

interface PipelineResult {
  websiteGenerated: boolean;
  welcomeMessageSent: boolean;
  postsGenerated: number;
  reviewsSynced: number;
  digestScheduled: boolean;
  seoScore: number | null;
  totalSteps: number;
  completedSteps: number;
  errors: string[];
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

/**
 * Execute the full onboarding pipeline.
 * Each step is independent — failures don't block subsequent steps.
 * Maria sees results immediately; background tasks complete async.
 */
export async function runOnboardingPipeline(
  input: OnboardingInput
): Promise<PipelineResult> {
  const result: PipelineResult = {
    websiteGenerated: false,
    welcomeMessageSent: false,
    postsGenerated: 0,
    reviewsSynced: 0,
    digestScheduled: false,
    seoScore: null,
    totalSteps: 7,
    completedSteps: 0,
    errors: [],
  };

  const start = Date.now();

  logger.info("Onboarding pipeline started", {
    businessId: input.businessId,
    route: "onboarding-pipeline",
  });

  // Get the conversation for this business
  const [convo] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.businessId, input.businessId))
    .limit(1);

  if (!convo) {
    result.errors.push("No conversation found — cannot send messages");
    return result;
  }

  // ─── Step 1: Provision Live Website (Cloudflare Sites) ─────────────────
  // Try Cloudflare-powered Emdash site first. Falls back to static HTML
  // if Sites infrastructure isn't configured or provisioning fails.
  try {
    if (process.env.LOCALGENIUS_SITES_API_TOKEN) {
      // Cloudflare Sites — real CMS-powered website with MCP updates
      const site = await provisionCloudfareSite(input.businessId, input.organizationId);
      result.websiteGenerated = true;
      result.completedSteps++;
      await recordEvent(input, "website_generated", { source: "onboarding", type: "cloudflare_sites", url: site.siteUrl });
      logger.info("Pipeline: Cloudflare site provisioned", { businessId: input.businessId, siteUrl: site.siteUrl });
    } else {
      // Fallback: static HTML generator (no MCP, no CMS)
      await generateWebsite(input.businessId, input.organizationId, {
        name: input.businessName,
        vertical: input.vertical,
        city: input.city,
        state: input.state,
        address: input.address,
        phone: input.phone,
        photos: input.photos,
      });
      result.websiteGenerated = true;
      result.completedSteps++;
      await recordEvent(input, "website_generated", { source: "onboarding", type: "static_html" });
      logger.info("Pipeline: static website generated (Sites not configured)", { businessId: input.businessId });
    }
  } catch (err) {
    result.errors.push(`Website: ${errorMsg(err)}`);
    logger.error("Pipeline: website generation failed", {
      businessId: input.businessId,
      error: errorMsg(err),
    });
  }

  // ─── Step 1b: Provision Subdomain + Email Domain ───────────────────────
  // Non-blocking: failures don't affect the rest of onboarding.
  try {
    const domainResult = await provisionDomain(input.businessId, input.organizationId);
    if (domainResult.dnsProvisioned) {
      logger.info("Pipeline: subdomain provisioned", {
        businessId: input.businessId,
        subdomain: domainResult.subdomain,
        siteUrl: domainResult.siteUrl,
      });
    }
    if (domainResult.errors.length > 0) {
      logger.warn("Pipeline: domain provisioning partial", {
        businessId: input.businessId,
        errors: domainResult.errors,
      });
    }
  } catch (err) {
    // Non-blocking — domain provisioning is a nice-to-have
    logger.error("Pipeline: domain provisioning failed", {
      businessId: input.businessId,
      error: errorMsg(err),
    });
  }

  // ─── Step 2: Welcome Message ────────────────────────────────────────────
  try {
    const welcomeText = await generate({
      prompt: `You are LocalGenius, welcoming ${input.businessName} (a ${input.vertical} in ${input.city}, ${input.state}). Write a warm, brief welcome message (3-4 sentences). Tell them:
1. Their website is live
2. You've already started working on their online presence
3. What they can expect this week (first social post, review responses, weekly digest on Sunday)
4. They can just talk to you like an employee — type anything

Don't say "AI" or "platform". Be warm, confident, specific to their business type.`,
      maxTokens: 250,
    });

    await db.insert(messages).values({
      conversationId: convo.id,
      businessId: input.businessId,
      organizationId: input.organizationId,
      role: "assistant",
      contentType: "text",
      content: { text: welcomeText },
      aiModel: "claude-sonnet-4-20250514",
    });

    result.welcomeMessageSent = true;
    result.completedSteps++;
  } catch (err) {
    result.errors.push(`Welcome: ${errorMsg(err)}`);
  }

  // ─── Step 3: Google Review Sync ─────────────────────────────────────────
  if (input.hasGoogleConnection) {
    try {
      const syncResult = await syncReviews(input.businessId, input.organizationId);
      result.reviewsSynced = syncResult.synced;
      result.completedSteps++;

      if (syncResult.synced > 0) {
        await db.insert(messages).values({
          conversationId: convo.id,
          businessId: input.businessId,
          organizationId: input.organizationId,
          role: "assistant",
          contentType: "text",
          content: {
            text: `I found ${syncResult.synced} reviews on Google. I've drafted responses for the ones that need attention — check them out when you're ready.`,
          },
        });
      }
    } catch (err) {
      result.errors.push(`Reviews: ${errorMsg(err)}`);
    }
  } else {
    result.completedSteps++; // Skip counts as complete
  }

  // ─── Step 4: Generate 3 Social Post Suggestions ─────────────────────────
  try {
    const topics = getTopicsForVertical(input.vertical, input.priorityFocus);

    const posts: string[] = [];
    for (const topic of topics.slice(0, 3)) {
      const text = await generateSocialPost(
        { name: input.businessName, vertical: input.vertical, city: input.city },
        topic
      );
      posts.push(text);

      // Store as proposed action
      await db.insert(actions).values({
        businessId: input.businessId,
        organizationId: input.organizationId,
        actionType: "social_post",
        status: "proposed",
        content: { text: text + "\n\nPosted by LocalGenius", platform: "instagram", topic },
      });
    }

    result.postsGenerated = posts.length;
    result.completedSteps++;

    // Notify in thread
    await db.insert(messages).values({
      conversationId: convo.id,
      businessId: input.businessId,
      organizationId: input.organizationId,
      role: "assistant",
      contentType: "action_card",
      content: {
        text: `I created ${posts.length} social posts for you — based on what works for ${input.vertical}s in ${input.city}. Take a look and approve the ones you like. I'll post them for you.`,
        actionType: "social_posts_batch",
        postCount: posts.length,
        status: "pending_approval",
      },
    });

    await recordEvent(input, "content_generated", {
      source: "onboarding",
      count: posts.length,
    });
  } catch (err) {
    result.errors.push(`Posts: ${errorMsg(err)}`);
  }

  // ─── Step 5: Schedule First Weekly Digest ───────────────────────────────
  try {
    const nextSunday = getNextSunday();

    await db.insert(weeklyDigests).values({
      businessId: input.businessId,
      organizationId: input.organizationId,
      periodStart: new Date(),
      periodEnd: nextSunday,
      metrics: { scheduled: true, firstDigest: true },
      actionsCompleted: {},
      recommendations: {
        narrative: "Your first Weekly Digest will arrive Sunday morning with a full recap of your first week.",
      },
    });

    result.digestScheduled = true;
    result.completedSteps++;

    await recordEvent(input, "digest_scheduled", { source: "onboarding", scheduledFor: nextSunday.toISOString() });
  } catch (err) {
    result.errors.push(`Digest: ${errorMsg(err)}`);
  }

  // ─── Step 6: Initial SEO Audit ──────────────────────────────────────────
  try {
    const audit = await runAudit(input.businessId, input.organizationId);
    result.seoScore = audit.score.overall;
    result.completedSteps++;

    const grade =
      audit.score.overall >= 80 ? "A" :
      audit.score.overall >= 60 ? "B" :
      audit.score.overall >= 40 ? "C" :
      audit.score.overall >= 20 ? "D" : "F";

    const topRec = audit.recommendations[0];

    await db.insert(messages).values({
      conversationId: convo.id,
      businessId: input.businessId,
      organizationId: input.organizationId,
      role: "assistant",
      contentType: "report",
      content: {
        text: `Your SEO score is ${audit.score.overall}/100 (grade: ${grade}). ${audit.aiInsights}${topRec ? `\n\nTop recommendation: ${topRec.title} — ${topRec.description}` : ""}`,
        seoScore: audit.score.overall,
        grade,
      },
    });

    await recordEvent(input, "seo_audit_completed", { source: "onboarding", score: audit.score.overall });
  } catch (err) {
    result.errors.push(`SEO: ${errorMsg(err)}`);
  }

  // ─── Step 7: Record Onboarding Complete Event ───────────────────────────
  try {
    await recordEvent(input, "onboarding_completed", {
      source: "pipeline",
      completedSteps: result.completedSteps,
      totalSteps: result.totalSteps,
      durationMs: Date.now() - start,
    });
    result.completedSteps++;
  } catch (err) {
    result.errors.push(`Event: ${errorMsg(err)}`);
  }

  logger.info("Onboarding pipeline complete", {
    businessId: input.businessId,
    durationMs: Date.now() - start,
    completedSteps: result.completedSteps,
    totalSteps: result.totalSteps,
    errors: result.errors.length,
  });

  return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTopicsForVertical(vertical: string, focus?: string | null): string[] {
  const topicMap: Record<string, string[]> = {
    restaurant: [
      "our most popular dish — the one regulars can't stop ordering",
      "behind the scenes in our kitchen",
      "what makes us different from every other restaurant on the block",
    ],
    salon: [
      "a stunning before-and-after transformation",
      "meet our team — the people behind the magic",
      "our most-requested service this month",
    ],
    dental: [
      "tips for keeping your smile healthy between visits",
      "meet our team — we promise we're friendly",
      "a patient success story (with permission)",
    ],
    home_services: [
      "a recent job we're proud of — before and after",
      "seasonal maintenance tips from our experts",
      "why our customers keep coming back",
    ],
    default: [
      "what makes our business special",
      "meet the team behind the work",
      "a happy customer story",
    ],
  };

  return topicMap[vertical] || topicMap.default;
}

function getNextSunday(): Date {
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  const nextSunday = new Date(now.getTime() + daysUntilSunday * 24 * 60 * 60 * 1000);
  nextSunday.setHours(7, 0, 0, 0); // 7am local
  return nextSunday;
}

async function recordEvent(
  input: OnboardingInput,
  eventType: string,
  metadata: Record<string, unknown>
) {
  await db.insert(analyticsEvents).values({
    businessId: input.businessId,
    organizationId: input.organizationId,
    eventType,
    source: "onboarding_pipeline",
    metadata,
    occurredAt: new Date(),
  });
}

function errorMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
