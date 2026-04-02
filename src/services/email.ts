/**
 * Email Service — Resend transactional email
 *
 * Handles all outbound transactional emails: welcome, digest, alerts, billing.
 * Uses React email templates rendered server-side by Resend.
 *
 * Lazy-initialized client (same pattern as db.ts).
 */

import { Resend } from "resend";
import { WelcomeEmail } from "@/components/email/WelcomeEmail";
import { DigestEmail } from "@/components/email/DigestEmail";
import { ReviewAlertEmail } from "@/components/email/ReviewAlertEmail";
import { SubscriptionEmail } from "@/components/email/SubscriptionEmail";
import { PaymentFailedEmail } from "@/components/email/PaymentFailedEmail";

// ─── Client (lazy init) ──────────────────────────────────────────────────────

let resend: Resend | null = null;

function getClient(): Resend {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const FROM_ADDRESS = "LocalGenius <hello@localgenius.com>";

// ─── Types ───────────────────────────────────────────────────────────────────

interface EmailResult {
  success: true;
  messageId: string;
}

interface EmailError {
  success: false;
  error: string;
}

type SendResult = EmailResult | EmailError;

export interface DigestData {
  metrics: Record<string, unknown>;
  narrative: string;
}

export interface ReviewData {
  platform: string;
  rating: number;
  reviewerName: string;
  text: string;
}

// ─── Send Helpers ────────────────────────────────────────────────────────────

async function send(options: {
  to: string;
  subject: string;
  react: React.ReactElement;
}): Promise<SendResult> {
  try {
    const { data, error } = await getClient().emails.send({
      from: FROM_ADDRESS,
      to: options.to,
      subject: options.subject,
      react: options.react,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id ?? "" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    return { success: false, error: message };
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Sent after onboarding is complete.
 */
export async function sendWelcomeEmail(
  to: string,
  businessName: string
): Promise<SendResult> {
  return send({
    to,
    subject: `Welcome to LocalGenius, ${businessName}`,
    react: WelcomeEmail({ businessName }),
  });
}

/**
 * Monday morning weekly summary.
 */
export async function sendWeeklyDigestEmail(
  to: string,
  businessName: string,
  digestData: DigestData
): Promise<SendResult> {
  return send({
    to,
    subject: `Your week in review — ${businessName}`,
    react: DigestEmail({ businessName, digestData }),
  });
}

/**
 * Immediate alert for 1-3 star reviews.
 */
export async function sendNegativeReviewAlert(
  to: string,
  businessName: string,
  review: ReviewData
): Promise<SendResult> {
  return send({
    to,
    subject: `New ${review.rating}-star review on ${review.platform} — ${businessName}`,
    react: ReviewAlertEmail({ businessName, review }),
  });
}

/**
 * Sent after successful Stripe checkout.
 */
export async function sendSubscriptionConfirmation(
  to: string,
  businessName: string,
  plan: string,
  amount: number
): Promise<SendResult> {
  return send({
    to,
    subject: `You're all set — ${plan} plan confirmed`,
    react: SubscriptionEmail({ businessName, plan: plan as "base" | "pro", amount: `$${amount}` }),
  });
}

/**
 * Sent after invoice.payment_failed webhook.
 */
export async function sendPaymentFailedNotice(
  to: string,
  businessName: string
): Promise<SendResult> {
  return send({
    to,
    subject: "Heads up — we couldn't process your payment",
    react: PaymentFailedEmail({ businessName }),
  });
}
