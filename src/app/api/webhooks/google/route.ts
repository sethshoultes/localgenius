import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businessSettings, reviews as reviewsTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyGooglePushNotification } from "@/lib/webhook-verify";
import { dispatch } from "@/services/webhook-dispatcher";
import { syncReviews } from "@/services/google-business";

/**
 * POST /api/webhooks/google
 * Receives Google Business Profile push notifications.
 * Triggered when reviews are added/updated on a connected GBP listing.
 *
 * Google sends a notification with:
 *   - X-Goog-Channel-Token: the token we set when creating the watch
 *   - X-Goog-Resource-State: "sync" (initial), "update" (changed), "exists" (new)
 */
export async function POST(request: NextRequest) {
  const channelToken = request.headers.get("x-goog-channel-token");
  const resourceState = request.headers.get("x-goog-resource-state") || "";

  // Verify the notification is from Google — fail closed
  const expectedToken = process.env.GOOGLE_WEBHOOK_TOKEN;
  if (!expectedToken) {
    return NextResponse.json(
      { error: { code: "NOT_CONFIGURED", message: "Google webhook token not configured" } },
      { status: 503 }
    );
  }
  if (!channelToken || !verifyGooglePushNotification(channelToken, expectedToken)) {
    return NextResponse.json(
      { error: { code: "INVALID_TOKEN", message: "Invalid channel token" } },
      { status: 401 }
    );
  }

  // Initial sync notification — just acknowledge
  if (resourceState === "sync") {
    return NextResponse.json({ data: { received: true, action: "sync_acknowledged" } });
  }

  try {
    // Find the business from the channel token or resource ID
    // In production: map channel ID to business ID via stored watch metadata
    const channelId = request.headers.get("x-goog-channel-id") || "";

    // Find the business with a Google connection
    const [conn] = await db
      .select()
      .from(businessSettings)
      .where(
        and(
          eq(businessSettings.platform, "google_business"),
          eq(businessSettings.connectionStatus, "active")
        )
      )
      .limit(1);

    if (!conn) {
      return NextResponse.json({ data: { received: true, action: "no_connection" } });
    }

    // Sync reviews to pick up the new one
    const syncResult = await syncReviews(conn.businessId, conn.organizationId);

    // If new reviews were synced, dispatch notifications to the thread
    if (syncResult.synced > 0) {
      // Get the most recently synced reviews
      const newReviews = await db
        .select()
        .from(reviewsTable)
        .where(eq(reviewsTable.businessId, conn.businessId))
        .orderBy(reviewsTable.createdAt)
        .limit(syncResult.synced);

      for (const review of newReviews) {
        const eventType = review.rating <= 3 ? "review.negative" : "review.new";

        await dispatch({
          type: eventType as "review.new" | "review.negative",
          businessId: conn.businessId,
          organizationId: conn.organizationId,
          data: {
            reviewerName: review.reviewerName || "A customer",
            rating: review.rating,
            reviewText: review.reviewText || "",
            platform: review.platform,
            reviewId: review.id,
          },
        });
      }
    }

    return NextResponse.json({
      data: {
        received: true,
        reviewsSynced: syncResult.synced,
        total: syncResult.total,
      },
    });
  } catch (error) {
    console.error("Google webhook error:", error);
    // Return 200 to prevent Google from retrying on our errors
    return NextResponse.json({
      data: { received: true, error: error instanceof Error ? error.message : "Processing error" },
    });
  }
}
