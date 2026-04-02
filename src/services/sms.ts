/**
 * SMS Notification Service — Twilio
 *
 * Transactional SMS for time-sensitive notifications:
 *   - Negative review alert (immediate)
 *   - Weekly digest summary (link to full digest)
 *   - Booking confirmation
 *
 * Respects owner notification preferences (stored in business_settings).
 */

import twilio from "twilio";
import { db } from "@/lib/db";
import { businesses, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getNotificationPreferences } from "./notification-preferences";

let _client: twilio.Twilio | null = null;

function getClient(): twilio.Twilio {
  if (!_client) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN required");
    _client = twilio(sid, token);
  }
  return _client;
}

const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER || "";

interface SMSResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

async function send(to: string, body: string): Promise<SMSResult> {
  try {
    const client = getClient();
    const message = await client.messages.create({
      body,
      from: FROM_NUMBER,
      to,
    });
    return { success: true, messageSid: message.sid };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "SMS send failed",
    };
  }
}

/**
 * Check if the owner wants SMS for this notification type.
 */
async function shouldSendSMS(
  businessId: string,
  notificationType: string
): Promise<{ send: boolean; phone: string | null }> {
  const prefs = await getNotificationPreferences(businessId);
  const pref = prefs[notificationType];
  if (!pref?.sms) return { send: false, phone: null };

  const [user] = await db
    .select({ phone: users.phone })
    .from(users)
    .where(eq(users.businessId, businessId))
    .limit(1);

  return { send: !!user?.phone, phone: user?.phone || null };
}

/**
 * Negative review alert — immediate SMS.
 * "⚠️ New 2-star review on Google from Lisa W. Open LocalGenius to respond."
 */
export async function sendNegativeReviewSMS(
  businessId: string,
  review: { platform: string; rating: number; reviewerName: string }
): Promise<SMSResult> {
  const { send: ok, phone } = await shouldSendSMS(businessId, "negative_review");
  if (!ok || !phone) return { success: false, error: "SMS not enabled or no phone" };

  const [biz] = await db
    .select({ name: businesses.name })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  const body = `${biz?.name || "Your business"}: New ${review.rating}-star review on ${review.platform} from ${review.reviewerName}. I've drafted a response — open LocalGenius to review it.`;

  return send(phone, body);
}

/**
 * Weekly digest summary SMS with link.
 * "📊 Your week: 8 new reviews (4.6 avg), 340 visits, 23 bookings. Full digest: [link]"
 */
export async function sendDigestSummarySMS(
  businessId: string,
  metrics: {
    reviewCount: number;
    avgRating: number;
    websiteVisits: number;
    bookings: number;
  },
  digestUrl?: string
): Promise<SMSResult> {
  const { send: ok, phone } = await shouldSendSMS(businessId, "weekly_digest");
  if (!ok || !phone) return { success: false, error: "SMS not enabled or no phone" };

  let body = `Your week: ${metrics.reviewCount} new reviews (${metrics.avgRating} avg), ${metrics.websiteVisits} visits, ${metrics.bookings} bookings.`;
  if (digestUrl) body += ` Full digest: ${digestUrl}`;

  return send(phone, body);
}

/**
 * Booking confirmation SMS.
 * "✅ New booking for Maria's Kitchen: John D. on Friday at 7pm (party of 4)."
 */
export async function sendBookingConfirmationSMS(
  businessId: string,
  booking: { customerName: string; date: string; time: string; partySize?: number }
): Promise<SMSResult> {
  const { send: ok, phone } = await shouldSendSMS(businessId, "booking");
  if (!ok || !phone) return { success: false, error: "SMS not enabled or no phone" };

  const [biz] = await db
    .select({ name: businesses.name })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  const partyInfo = booking.partySize ? ` (party of ${booking.partySize})` : "";
  const body = `New booking for ${biz?.name || "your business"}: ${booking.customerName} on ${booking.date} at ${booking.time}${partyInfo}.`;

  return send(phone, body);
}
