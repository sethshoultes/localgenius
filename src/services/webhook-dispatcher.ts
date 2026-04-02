/**
 * Webhook Dispatcher — External Events → Conversation Thread
 *
 * Closes the loop: when an external event arrives (new review, payment,
 * integration status change), this service creates the appropriate
 * message in the owner's conversation thread.
 *
 * Maria sees everything in one thread — external events are no exception.
 */

import { db } from "@/lib/db";
import {
  conversations,
  messages,
  businesses,
  organizations,
  reviews,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateReviewResponse } from "./ai";
import { sendNegativeReviewAlert } from "./email";

// ─── Types ────────────────────────────────────────────────────────────────────

type WebhookEventType =
  | "review.new"
  | "review.negative"
  | "payment.succeeded"
  | "payment.failed"
  | "subscription.activated"
  | "subscription.cancelled"
  | "subscription.changed"
  | "integration.connected"
  | "integration.disconnected"
  | "integration.error";

interface WebhookEvent {
  type: WebhookEventType;
  businessId: string;
  organizationId: string;
  data: Record<string, unknown>;
}

interface DispatchResult {
  messageId: string | null;
  emailSent: boolean;
  action: string;
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

/**
 * Dispatch a webhook event — creates a conversation message and
 * optionally sends email/push notifications.
 */
export async function dispatch(event: WebhookEvent): Promise<DispatchResult> {
  const handler = handlers[event.type];
  if (!handler) {
    return { messageId: null, emailSent: false, action: `unhandled:${event.type}` };
  }

  return handler(event);
}

// ─── Event Handlers ───────────────────────────────────────────────────────────

const handlers: Record<WebhookEventType, (event: WebhookEvent) => Promise<DispatchResult>> = {

  /**
   * New review received from Google/Yelp/Facebook.
   * Creates a thread message with the review + a drafted response.
   */
  "review.new": async (event) => {
    const { reviewerName, rating, reviewText, platform } = event.data as {
      reviewerName: string;
      rating: number;
      reviewText: string;
      platform: string;
    };

    const [biz] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, event.businessId))
      .limit(1);

    // Draft a response
    const draftResponse = await generateReviewResponse(
      { name: biz?.name || "your business" },
      { reviewerName, rating, reviewText }
    );

    const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
    const sentiment = rating >= 4 ? "positive" : rating === 3 ? "mixed" : "negative";

    const text = `New ${rating}-star review on ${platform} from ${reviewerName}:

${stars}
"${reviewText}"

${sentiment === "negative"
    ? "This one needs your attention. I've drafted a response — take a look and edit if you'd like."
    : sentiment === "mixed"
      ? "A mixed review. I've drafted a response that acknowledges the feedback."
      : "A great review! I've drafted a quick thank-you."}

My suggested response:
"${draftResponse}"`;

    const messageId = await createThreadMessage(
      event.businessId,
      event.organizationId,
      text,
      "action_card",
      {
        actionType: "review_response",
        reviewData: { reviewerName, rating, reviewText, platform },
        draftResponse,
        status: "pending_approval",
      }
    );

    return { messageId, emailSent: false, action: `review_${sentiment}` };
  },

  /**
   * Negative review (1-3 stars) — higher urgency, sends email alert.
   */
  "review.negative": async (event) => {
    const result = await handlers["review.new"](event);

    // Also send email alert
    const { reviewerName, rating, reviewText, platform } = event.data as {
      reviewerName: string;
      rating: number;
      reviewText: string;
      platform: string;
    };

    const [biz] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, event.businessId))
      .limit(1);

    // Get owner email
    const [user] = await db
      .select()
      .from(db._.fullSchema.users)
      .where(eq(db._.fullSchema.users.businessId, event.businessId))
      .limit(1);

    let emailSent = false;
    if (user?.email && biz) {
      try {
        await sendNegativeReviewAlert(user.email, biz.name, {
          platform,
          rating,
          reviewerName,
          text: reviewText,
        });
        emailSent = true;
      } catch {
        // Email failure is not critical — thread message already created
      }
    }

    return { ...result, emailSent, action: "review_negative_alerted" };
  },

  /**
   * Stripe: payment succeeded.
   */
  "payment.succeeded": async (event) => {
    const { amount, period } = event.data as { amount?: string; period?: string };

    const text = `Payment confirmed${amount ? ` — ${amount}` : ""}. Your subscription is active${period ? ` through ${period}` : ""}. I'm on it — here's to another great month.`;

    const messageId = await createThreadMessage(
      event.businessId,
      event.organizationId,
      text,
      "report"
    );

    return { messageId, emailSent: false, action: "payment_confirmed" };
  },

  /**
   * Stripe: payment failed.
   */
  "payment.failed": async (event) => {
    const text = `Heads up — your latest payment didn't go through. Your account is still active for now, but you'll want to update your payment method so I can keep working for you.

Tap here to update your payment: [Update Payment]`;

    const messageId = await createThreadMessage(
      event.businessId,
      event.organizationId,
      text,
      "action_card",
      { actionType: "billing_update", status: "needs_attention" }
    );

    return { messageId, emailSent: false, action: "payment_failed_notified" };
  },

  /**
   * Stripe: subscription activated (new or reactivated).
   */
  "subscription.activated": async (event) => {
    const { plan } = event.data as { plan: string };

    const text = plan === "pro"
      ? `Welcome to Pro! You now have access to email campaigns, local SEO optimization, and advanced analytics. I'll put these to work for you this week.`
      : `You're all set on the Base plan. I'll handle your social posts, reviews, and weekly digest. Let's get to work.`;

    const messageId = await createThreadMessage(
      event.businessId,
      event.organizationId,
      text,
      "report"
    );

    return { messageId, emailSent: false, action: `subscription_${plan}` };
  },

  /**
   * Stripe: subscription cancelled.
   */
  "subscription.cancelled": async (event) => {
    const text = `Your subscription has been cancelled. I'll keep your data safe — if you ever want to come back, everything will be right where you left it.

It was a pleasure working with you. Your business deserves great marketing.`;

    const messageId = await createThreadMessage(
      event.businessId,
      event.organizationId,
      text,
      "report"
    );

    return { messageId, emailSent: false, action: "subscription_cancelled" };
  },

  /**
   * Stripe: plan changed (upgrade or downgrade).
   */
  "subscription.changed": async (event) => {
    const { oldPlan, newPlan } = event.data as { oldPlan: string; newPlan: string };
    const upgraded = newPlan === "pro";

    const text = upgraded
      ? `You've upgraded to Pro! New capabilities unlocked: email/SMS campaigns, local SEO agent, and benchmark analytics. I'll start optimizing your Google presence this week.`
      : `Plan updated to Base. I'll continue handling your social posts, reviews, and weekly digest. Let me know if you want to upgrade again anytime.`;

    const messageId = await createThreadMessage(
      event.businessId,
      event.organizationId,
      text,
      "report"
    );

    return { messageId, emailSent: false, action: `plan_${upgraded ? "upgraded" : "downgraded"}` };
  },

  /**
   * External platform connected (Google, Meta).
   */
  "integration.connected": async (event) => {
    const { platform } = event.data as { platform: string };

    const platformName =
      platform === "google_business" ? "Google Business Profile"
        : platform === "meta" ? "Instagram and Facebook"
          : platform;

    const text = `${platformName} connected! I can now manage your reviews, posts, and analytics on that platform. I'll start syncing your data right away.`;

    const messageId = await createThreadMessage(
      event.businessId,
      event.organizationId,
      text,
      "report"
    );

    return { messageId, emailSent: false, action: `connected_${platform}` };
  },

  /**
   * Integration disconnected (token expired, revoked).
   */
  "integration.disconnected": async (event) => {
    const { platform, reason } = event.data as { platform: string; reason?: string };

    const platformName =
      platform === "google_business" ? "Google Business Profile"
        : platform === "meta" ? "Instagram and Facebook"
          : platform;

    const text = `Your ${platformName} connection needs to be refreshed${reason ? ` (${reason})` : ""}. I can't post or sync until it's reconnected.

Tap here to reconnect: [Reconnect ${platformName}]`;

    const messageId = await createThreadMessage(
      event.businessId,
      event.organizationId,
      text,
      "action_card",
      { actionType: "reconnect", platform, status: "needs_attention" }
    );

    return { messageId, emailSent: false, action: `disconnected_${platform}` };
  },

  /**
   * Integration error (API failure, rate limit).
   */
  "integration.error": async (event) => {
    const { platform, error: errorMsg } = event.data as { platform: string; error?: string };

    const platformName =
      platform === "google_business" ? "Google"
        : platform === "meta" ? "Instagram/Facebook"
          : platform;

    const text = `I'm having a temporary issue with ${platformName} — ${errorMsg || "their service is having problems"}. I'll keep trying and let you know when it's resolved. Your scheduled posts are saved and will publish when the connection is back.`;

    const messageId = await createThreadMessage(
      event.businessId,
      event.organizationId,
      text,
      "text"
    );

    return { messageId, emailSent: false, action: `error_${platform}` };
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Create a message in the business's conversation thread.
 */
async function createThreadMessage(
  businessId: string,
  organizationId: string,
  text: string,
  contentType: "text" | "action_card" | "report" | "digest" = "text",
  metadata?: Record<string, unknown>
): Promise<string | null> {
  // Find the conversation for this business
  const [convo] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.businessId, businessId))
    .limit(1);

  if (!convo) return null;

  const content: Record<string, unknown> = { text };
  if (metadata) {
    Object.assign(content, metadata);
  }

  const [msg] = await db
    .insert(messages)
    .values({
      conversationId: convo.id,
      businessId,
      organizationId,
      role: "assistant",
      contentType,
      content,
    })
    .returning();

  return msg?.id || null;
}
