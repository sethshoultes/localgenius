/**
 * Token Refresh Job
 *
 * Proactively refreshes OAuth tokens that expire within 60 minutes.
 * Covers both Google Business Profile (short-lived refresh tokens)
 * and Meta (long-lived token re-exchange).
 *
 * Runs every 30 minutes to ensure no token silently expires.
 */

import type { JobResult } from "@/services/scheduler";

export async function runTokenRefresh(): Promise<JobResult> {
  const { db } = await import("@/lib/db");
  const { businessSettings } = await import("@/db/schema");
  const { sql } = await import("drizzle-orm");

  // Find all active connections with tokens expiring within 60 minutes
  const expiringThreshold = new Date(Date.now() + 60 * 60 * 1000);

  const expiring = await db
    .select()
    .from(businessSettings)
    .where(
      sql`${businessSettings.connectionStatus} = 'active'
          AND ${businessSettings.tokenExpiresAt} IS NOT NULL
          AND ${businessSettings.tokenExpiresAt} < ${expiringThreshold}`
    );

  let refreshed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const conn of expiring) {
    try {
      if (conn.platform === "google_business") {
        // Google: call getAccessToken which auto-refreshes when token is near expiry
        const { getAccessToken } = await import("@/services/google-business");
        const result = await getAccessToken(conn.businessId);
        if (result) {
          refreshed++;
        } else {
          failed++;
          errors.push(`google:${conn.businessId} — token refresh returned null`);
        }
      } else if (conn.platform === "meta") {
        // Meta: call getAccessToken which auto-refreshes long-lived tokens
        const { getAccessToken } = await import("@/services/meta-social");
        const result = await getAccessToken(conn.businessId);
        if (result) {
          refreshed++;
        } else {
          failed++;
          errors.push(`meta:${conn.businessId} — token refresh returned null`);
        }
      }
      // Other platforms: skip for now
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push(`${conn.platform}:${conn.businessId} — ${message}`);
    }
  }

  return {
    success: failed === 0,
    duration_ms: 0,
    details: {
      expiringSoon: expiring.length,
      refreshed,
      failed,
      errors: errors.slice(0, 10),
    },
  };
}
