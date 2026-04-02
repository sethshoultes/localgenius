import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businessSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fullSync } from "@/services/google-business";

/**
 * GET /api/cron/google-sync
 * Syncs reviews + insights for all connected Google Business Profile accounts.
 * Runs 4x/day (every 6 hours). Secured with CRON_SECRET.
 *
 * Rate limit strategy: 60 req/min Google quota.
 * Each business sync uses ~3 API calls. At 300 businesses = 900 calls.
 * Spread across 15 minutes = 60 calls/min. Just at the limit.
 * Above 300 businesses: stagger sync into 2 batches.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
      { status: 401 }
    );
  }

  // Get all active Google connections
  const connections = await db
    .select()
    .from(businessSettings)
    .where(
      eq(businessSettings.platform, "google_business")
    );

  const activeConnections = connections.filter(
    (c) => c.connectionStatus === "active"
  );

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const conn of activeConnections) {
    // Stagger requests: 1-second delay between businesses to stay under rate limit
    if (synced > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const result = await fullSync(conn.businessId, conn.organizationId);

    if (result.success) {
      synced++;
    } else {
      failed++;
      errors.push(`business ${conn.businessId}`);
    }
  }

  return NextResponse.json({
    data: {
      total: activeConnections.length,
      synced,
      failed,
      errors: errors.slice(0, 10), // limit error list
      timestamp: new Date().toISOString(),
    },
  });
}
