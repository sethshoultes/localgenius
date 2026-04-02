import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businessSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fullSync } from "@/services/meta-social";

/**
 * GET /api/cron/meta-sync
 * Syncs engagement metrics for all connected Meta (Facebook + Instagram) accounts.
 * Runs periodically. Secured with CRON_SECRET.
 *
 * Rate limit strategy: 200 calls/user/hour (Meta Graph API).
 * Each business sync uses ~2 API calls per recent post + 1 for auth.
 * With 50 posts per business, 100 businesses = ~10,100 calls spread
 * across the cron window — well within hourly limits.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
        { status: 401 }
      );
    }

    // Get all active Meta connections
    const connections = await db
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.platform, "meta"));

    const activeConnections = connections.filter(
      (c) => c.connectionStatus === "active"
    );

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const conn of activeConnections) {
      // Stagger requests: 500ms delay between businesses to respect rate limits
      if (synced > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Meta sync failed";
    return NextResponse.json({
      data: { success: false, error: message },
      meta: { timestamp: new Date().toISOString() },
    }, { status: 500 });
  }
}
