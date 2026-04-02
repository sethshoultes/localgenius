/**
 * Google Business Profile Integration
 * Spec: engineering/integration-plan.md Section 1
 *
 * Handles: OAuth connect, review sync, review response posting,
 * profile optimization, insights sync, token refresh.
 *
 * Rate limit: 60 req/min per project. Managed via caller (BullMQ queue).
 */

import { db } from "@/lib/db";
import {
  businessSettings,
  reviews,
  actions,
  analyticsEvents,
  businesses,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt } from "@/lib/encryption";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface GoogleReview {
  name: string; // resource name: accounts/{id}/locations/{id}/reviews/{id}
  reviewId: string;
  reviewer: {
    displayName: string;
    profilePhotoUrl?: string;
  };
  starRating: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: {
    comment: string;
    updateTime: string;
  };
}

interface GoogleReviewsResponse {
  reviews: GoogleReview[];
  averageRating: number;
  totalReviewCount: number;
  nextPageToken?: string;
}

interface GoogleInsightsResponse {
  locationMetrics: Array<{
    metricValues: Array<{
      metric: string;
      totalValue?: { value: string };
    }>;
  }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GOOGLE_API_BASE = "https://mybusinessbusinessinformation.googleapis.com/v1";
const GOOGLE_REVIEWS_BASE = "https://mybusiness.googleapis.com/v4";
const GOOGLE_OAUTH_BASE = "https://oauth2.googleapis.com";
const SCOPES = "https://www.googleapis.com/auth/business.manage";

const STAR_RATING_MAP: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

// ─── OAuth Flow ───────────────────────────────────────────────────────────────

/**
 * Generate the Google OAuth consent URL.
 * Redirect the owner here to start the connection.
 */
export function getOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: process.env.GOOGLE_REDIRECT_URI || "",
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange the OAuth authorization code for tokens.
 */
export async function exchangeCode(code: string): Promise<GoogleTokenResponse> {
  const response = await fetch(`${GOOGLE_OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || "",
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google token exchange failed: ${error}`);
  }

  return response.json();
}

/**
 * Store encrypted tokens in business_settings after OAuth callback.
 */
export async function storeConnection(
  businessId: string,
  organizationId: string,
  tokens: GoogleTokenResponse,
  accountId: string,
  locationId: string
) {
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await db
    .insert(businessSettings)
    .values({
      businessId,
      organizationId,
      platform: "google_business",
      accessToken: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      tokenExpiresAt: expiresAt,
      platformUserId: accountId,
      platformBusinessId: locationId,
      connectionStatus: "active",
      lastSyncedAt: new Date(),
      config: { accountId, locationId },
    })
    .onConflictDoUpdate({
      target: [businessSettings.businessId, businessSettings.platform],
      set: {
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
        tokenExpiresAt: expiresAt,
        connectionStatus: "active",
        platformUserId: accountId,
        platformBusinessId: locationId,
        config: { accountId, locationId },
        updatedAt: new Date(),
      },
    });
}

// ─── Token Management ─────────────────────────────────────────────────────────

/**
 * Get a valid access token for a business. Refreshes if expired.
 */
export async function getAccessToken(
  businessId: string
): Promise<{ token: string; locationId: string; accountId: string } | null> {
  const [conn] = await db
    .select()
    .from(businessSettings)
    .where(
      and(
        eq(businessSettings.businessId, businessId),
        eq(businessSettings.platform, "google_business")
      )
    )
    .limit(1);

  if (!conn || conn.connectionStatus !== "active" || !conn.accessToken) {
    return null;
  }

  // Check if token needs refresh (expires within 5 min)
  const now = new Date();
  const expiresAt = conn.tokenExpiresAt;
  const needsRefresh = expiresAt && expiresAt.getTime() - now.getTime() < 5 * 60 * 1000;

  if (needsRefresh && conn.refreshToken) {
    try {
      const refreshed = await refreshAccessToken(decrypt(conn.refreshToken));
      const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

      await db
        .update(businessSettings)
        .set({
          accessToken: encrypt(refreshed.access_token),
          tokenExpiresAt: newExpiresAt,
          updatedAt: new Date(),
        })
        .where(eq(businessSettings.id, conn.id));

      return {
        token: refreshed.access_token,
        locationId: conn.platformBusinessId || "",
        accountId: conn.platformUserId || "",
      };
    } catch {
      // Refresh failed — mark connection as expired
      await db
        .update(businessSettings)
        .set({ connectionStatus: "expired", updatedAt: new Date() })
        .where(eq(businessSettings.id, conn.id));
      return null;
    }
  }

  return {
    token: decrypt(conn.accessToken),
    locationId: conn.platformBusinessId || "",
    accountId: conn.platformUserId || "",
  };
}

/**
 * Refresh an expired access token using the refresh token.
 */
async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const response = await fetch(`${GOOGLE_OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token refresh failed: ${response.status}`);
  }

  return response.json();
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

/**
 * Fetch reviews from Google Business Profile.
 * Stores new reviews in the database, returns count synced.
 */
export async function syncReviews(
  businessId: string,
  organizationId: string
): Promise<{ synced: number; total: number }> {
  const auth = await getAccessToken(businessId);
  if (!auth) return { synced: 0, total: 0 };

  const url = `${GOOGLE_REVIEWS_BASE}/accounts/${auth.accountId}/locations/${auth.locationId}/reviews`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${auth.token}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google reviews fetch failed: ${response.status} ${errorText}`);
  }

  const data: GoogleReviewsResponse = await response.json();
  let synced = 0;

  for (const gr of data.reviews || []) {
    // Check if we already have this review
    const [existing] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(
        and(
          eq(reviews.businessId, businessId),
          eq(reviews.platform, "google"),
          eq(reviews.externalReviewId, gr.reviewId)
        )
      )
      .limit(1);

    if (existing) continue;

    const rating = STAR_RATING_MAP[gr.starRating] || 3;
    const sentiment = rating >= 4 ? "positive" : rating === 3 ? "neutral" : "negative";

    await db.insert(reviews).values({
      businessId,
      organizationId,
      platform: "google",
      externalReviewId: gr.reviewId,
      reviewerName: gr.reviewer.displayName,
      rating,
      reviewText: gr.comment || null,
      reviewDate: new Date(gr.createTime),
      sentiment: sentiment as "positive" | "neutral" | "negative",
      keyTopics: [],
    });

    // Record analytics event for attribution
    await db.insert(analyticsEvents).values({
      businessId,
      organizationId,
      eventType: "review_received",
      source: "google_business_sync",
      metadata: { rating, reviewId: gr.reviewId },
      occurredAt: new Date(gr.createTime),
    });

    synced++;
  }

  // Update last synced timestamp
  await db
    .update(businessSettings)
    .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(businessSettings.businessId, businessId),
        eq(businessSettings.platform, "google_business")
      )
    );

  return { synced, total: data.totalReviewCount };
}

/**
 * Post a review response to Google Business Profile.
 */
export async function postReviewResponse(
  businessId: string,
  googleReviewName: string,
  responseText: string
): Promise<boolean> {
  const auth = await getAccessToken(businessId);
  if (!auth) return false;

  const url = `${GOOGLE_REVIEWS_BASE}/${googleReviewName}/reply`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ comment: responseText }),
  });

  return response.ok;
}

// ─── Insights ─────────────────────────────────────────────────────────────────

/**
 * Pull business insights from Google (search impressions, calls, directions).
 * Stores as analytics events for attribution.
 */
export async function syncInsights(
  businessId: string,
  organizationId: string
): Promise<Record<string, number>> {
  const auth = await getAccessToken(businessId);
  if (!auth) return {};

  const endDate = new Date();
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const url = `${GOOGLE_REVIEWS_BASE}/accounts/${auth.accountId}/locations/${auth.locationId}/reportInsights`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      locationNames: [`accounts/${auth.accountId}/locations/${auth.locationId}`],
      basicRequest: {
        metricRequests: [
          { metric: "QUERIES_DIRECT" },
          { metric: "QUERIES_INDIRECT" },
          { metric: "ACTIONS_PHONE" },
          { metric: "ACTIONS_DRIVING_DIRECTIONS" },
          { metric: "ACTIONS_WEBSITE" },
        ],
        timeRange: {
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      },
    }),
  });

  if (!response.ok) return {};

  const data: GoogleInsightsResponse = await response.json();
  const metrics: Record<string, number> = {};

  const metricEventMap: Record<string, string> = {
    QUERIES_DIRECT: "search_impression",
    QUERIES_INDIRECT: "search_impression",
    ACTIONS_PHONE: "phone_call",
    ACTIONS_DRIVING_DIRECTIONS: "direction_request",
    ACTIONS_WEBSITE: "page_view",
  };

  for (const location of data.locationMetrics || []) {
    for (const mv of location.metricValues || []) {
      const value = parseInt(mv.totalValue?.value || "0", 10);
      const eventType = metricEventMap[mv.metric];

      if (eventType && value > 0) {
        metrics[mv.metric] = value;

        await db.insert(analyticsEvents).values({
          businessId,
          organizationId,
          eventType,
          source: "google_business_insights",
          metadata: { metric: mv.metric, value, period: "7d" },
          occurredAt: new Date(),
        });
      }
    }
  }

  return metrics;
}

// ─── Profile Optimization ─────────────────────────────────────────────────────

/**
 * Update the Google Business Profile (description, hours, categories).
 */
export async function updateProfile(
  businessId: string,
  updates: {
    description?: string;
    websiteUrl?: string;
    phoneNumber?: string;
  }
): Promise<boolean> {
  const auth = await getAccessToken(businessId);
  if (!auth) return false;

  const url = `${GOOGLE_API_BASE}/accounts/${auth.accountId}/locations/${auth.locationId}`;

  const updateMask: string[] = [];
  const body: Record<string, unknown> = {};

  if (updates.description) {
    body.profile = { description: updates.description };
    updateMask.push("profile.description");
  }
  if (updates.websiteUrl) {
    body.websiteUri = updates.websiteUrl;
    updateMask.push("websiteUri");
  }
  if (updates.phoneNumber) {
    body.phoneNumbers = { primaryPhone: updates.phoneNumber };
    updateMask.push("phoneNumbers.primaryPhone");
  }

  const response = await fetch(`${url}?updateMask=${updateMask.join(",")}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return response.ok;
}

// ─── Full Sync (called by cron) ───────────────────────────────────────────────

/**
 * Run a complete sync for a single business:
 * 1. Refresh token if needed (handled by getAccessToken)
 * 2. Sync reviews
 * 3. Sync insights
 *
 * Called 4x/day per business via BullMQ queue.
 */
export async function fullSync(
  businessId: string,
  organizationId: string
): Promise<{
  reviews: { synced: number; total: number };
  insights: Record<string, number>;
  success: boolean;
}> {
  try {
    const reviewResult = await syncReviews(businessId, organizationId);
    const insightResult = await syncInsights(businessId, organizationId);

    return {
      reviews: reviewResult,
      insights: insightResult,
      success: true,
    };
  } catch (error) {
    // Log error but don't throw — let the cron continue with other businesses
    console.error(
      `Google sync failed for business ${businessId}:`,
      error instanceof Error ? error.message : error
    );

    return {
      reviews: { synced: 0, total: 0 },
      insights: {},
      success: false,
    };
  }
}
