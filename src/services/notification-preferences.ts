/**
 * Notification Preferences Service
 *
 * Lets the owner choose email, SMS, or push for each notification type.
 * Stored in business_settings with platform = 'notification_prefs'.
 */

import { db } from "@/lib/db";
import { businessSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// Notification types and their channels
export interface NotificationPreferences {
  [notificationType: string]: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  negative_review: { email: true, sms: true, push: true },
  positive_review: { email: false, sms: false, push: false },
  weekly_digest: { email: true, sms: false, push: true },
  booking: { email: true, sms: true, push: true },
  payment_success: { email: true, sms: false, push: false },
  payment_failed: { email: true, sms: true, push: true },
  campaign_results: { email: false, sms: false, push: true },
  integration_error: { email: true, sms: false, push: true },
};

/**
 * Get notification preferences for a business.
 * Returns defaults if none are stored.
 */
export async function getNotificationPreferences(
  businessId: string
): Promise<NotificationPreferences> {
  const [settings] = await db
    .select()
    .from(businessSettings)
    .where(
      and(
        eq(businessSettings.businessId, businessId),
        eq(businessSettings.platform, "notification_prefs")
      )
    )
    .limit(1);

  if (!settings?.config) return DEFAULT_PREFERENCES;

  // Merge stored prefs with defaults (in case new notification types were added)
  const stored = settings.config as NotificationPreferences;
  return { ...DEFAULT_PREFERENCES, ...stored };
}

/**
 * Update notification preferences for a business.
 * Partial update — only changes the types included in the update.
 */
export async function updateNotificationPreferences(
  businessId: string,
  organizationId: string,
  updates: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const current = await getNotificationPreferences(businessId);
  const merged: NotificationPreferences = { ...current };
  for (const [key, value] of Object.entries(updates)) {
    if (value) merged[key] = value;
  }

  await db
    .insert(businessSettings)
    .values({
      businessId,
      organizationId,
      platform: "notification_prefs",
      config: merged,
      connectionStatus: "active",
    })
    .onConflictDoUpdate({
      target: [businessSettings.businessId, businessSettings.platform],
      set: {
        config: merged,
        updatedAt: new Date(),
      },
    });

  return merged;
}

/**
 * Get available notification types with descriptions.
 */
export function getNotificationTypes() {
  return [
    { type: "negative_review", label: "Negative review alerts", description: "When you receive a 1-3 star review", default: { email: true, sms: true, push: true } },
    { type: "positive_review", label: "Positive review notifications", description: "When you receive a 4-5 star review", default: { email: false, sms: false, push: false } },
    { type: "weekly_digest", label: "Weekly digest", description: "Monday morning summary of your week", default: { email: true, sms: false, push: true } },
    { type: "booking", label: "New bookings", description: "When a customer books through your site", default: { email: true, sms: true, push: true } },
    { type: "payment_success", label: "Payment confirmations", description: "When your monthly payment is processed", default: { email: true, sms: false, push: false } },
    { type: "payment_failed", label: "Payment issues", description: "When a payment fails", default: { email: true, sms: true, push: true } },
    { type: "campaign_results", label: "Campaign results", description: "When an email or social campaign completes", default: { email: false, sms: false, push: true } },
    { type: "integration_error", label: "Connection issues", description: "When a platform connection needs attention", default: { email: true, sms: false, push: true } },
  ];
}
