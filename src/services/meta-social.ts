/**
 * Meta Graph API Integration (Instagram + Facebook)
 * Spec: engineering/integration-plan.md Section 2
 *
 * Handles: OAuth connect, token management, publishing to Facebook & Instagram,
 * engagement metrics sync, token refresh.
 *
 * Rate limit: 200 calls/user/hour. 25 content publishes/day/user.
 *
 * IMPORTANT: Instagram requires a PUBLIC image URL for media containers.
 * Images must be uploaded to R2 (or another public CDN) before publishing.
 */

import { db } from "@/lib/db";
import { businessSettings, analyticsEvents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt } from "@/lib/encryption";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface MetaLongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // ~5184000 (60 days)
}

interface MetaPageInfo {
  id: string;
  name: string;
  access_token: string; // page-specific token
}

interface MetaPagesResponse {
  data: MetaPageInfo[];
}

interface MetaPublishResult {
  id: string;
  postUrl: string;
  platform: "instagram" | "facebook";
  success: boolean;
  error?: string;
}

interface PostContent {
  text: string;
  imageUrl?: string;
}

interface PostInsights {
  reach?: number;
  impressions?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const META_GRAPH_BASE = "https://graph.facebook.com/v19.0";
const META_OAUTH_BASE = "https://www.facebook.com/v19.0/dialog/oauth";
const SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_read_engagement",
  "pages_manage_posts",
].join(",");

const WATERMARK = "\n\nPosted by LocalGenius";

// ─── OAuth Flow ───────────────────────────────────────────────────────────────

/**
 * Generate the Facebook Login OAuth URL.
 * Redirect the owner here to start the Meta connection.
 */
export function getOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID || "",
    redirect_uri: process.env.META_REDIRECT_URI || "",
    response_type: "code",
    scope: SCOPES,
    state,
  });

  return `${META_OAUTH_BASE}?${params.toString()}`;
}

/**
 * Exchange the OAuth authorization code for a short-lived token,
 * then exchange that for a long-lived token (60-day expiry).
 */
export async function exchangeCode(code: string): Promise<{
  accessToken: string;
  expiresIn: number;
  pages: MetaPageInfo[];
  igUserId: string | null;
}> {
  // Step 1: Exchange code for short-lived token
  const shortLivedParams = new URLSearchParams({
    client_id: process.env.META_APP_ID || "",
    client_secret: process.env.META_APP_SECRET || "",
    redirect_uri: process.env.META_REDIRECT_URI || "",
    code,
  });

  const shortLivedResponse = await fetch(
    `${META_GRAPH_BASE}/oauth/access_token?${shortLivedParams.toString()}`
  );

  if (!shortLivedResponse.ok) {
    const error = await shortLivedResponse.text();
    throw new Error(`Meta token exchange failed: ${error}`);
  }

  const shortLived: MetaTokenResponse = await shortLivedResponse.json();

  // Step 2: Exchange short-lived token for long-lived token (60 days)
  const longLivedParams = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID || "",
    client_secret: process.env.META_APP_SECRET || "",
    fb_exchange_token: shortLived.access_token,
  });

  const longLivedResponse = await fetch(
    `${META_GRAPH_BASE}/oauth/access_token?${longLivedParams.toString()}`
  );

  if (!longLivedResponse.ok) {
    const error = await longLivedResponse.text();
    throw new Error(`Meta long-lived token exchange failed: ${error}`);
  }

  const longLived: MetaLongLivedTokenResponse = await longLivedResponse.json();

  // Step 3: Get connected pages (with page-level tokens)
  const pagesResponse = await fetch(
    `${META_GRAPH_BASE}/me/accounts?access_token=${longLived.access_token}`
  );

  if (!pagesResponse.ok) {
    throw new Error("Failed to fetch connected Facebook pages");
  }

  const pagesData: MetaPagesResponse = await pagesResponse.json();

  // Step 4: Get Instagram Business Account ID from the first connected page
  let igUserId: string | null = null;

  if (pagesData.data.length > 0) {
    const page = pagesData.data[0];
    const igResponse = await fetch(
      `${META_GRAPH_BASE}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
    );

    if (igResponse.ok) {
      const igData = await igResponse.json();
      igUserId = igData.instagram_business_account?.id || null;
    }
  }

  return {
    accessToken: longLived.access_token,
    expiresIn: longLived.expires_in,
    pages: pagesData.data,
    igUserId,
  };
}

/**
 * Store encrypted Meta tokens in business_settings after OAuth callback.
 */
export async function storeConnection(
  businessId: string,
  organizationId: string,
  tokens: { accessToken: string; expiresIn: number },
  pageId: string,
  igUserId: string | null
) {
  const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

  await db
    .insert(businessSettings)
    .values({
      businessId,
      organizationId,
      platform: "meta",
      accessToken: encrypt(tokens.accessToken),
      refreshToken: null, // Meta uses long-lived tokens, no refresh token
      tokenExpiresAt: expiresAt,
      platformUserId: igUserId || "",
      platformBusinessId: pageId,
      connectionStatus: "active",
      lastSyncedAt: new Date(),
      config: { pageId, igUserId },
    })
    .onConflictDoUpdate({
      target: [businessSettings.businessId, businessSettings.platform],
      set: {
        accessToken: encrypt(tokens.accessToken),
        tokenExpiresAt: expiresAt,
        connectionStatus: "active",
        platformUserId: igUserId || "",
        platformBusinessId: pageId,
        config: { pageId, igUserId },
        updatedAt: new Date(),
      },
    });
}

// ─── Token Management ─────────────────────────────────────────────────────────

/**
 * Get a valid access token for a business. Auto-refreshes long-lived token
 * if within 7 days of expiry (Meta allows refreshing before expiry).
 *
 * Meta long-lived tokens last 60 days. They can be refreshed for another
 * 60 days as long as the current token has not expired.
 */
export async function getAccessToken(
  businessId: string
): Promise<{ token: string; pageId: string; igUserId: string } | null> {
  const [conn] = await db
    .select()
    .from(businessSettings)
    .where(
      and(
        eq(businessSettings.businessId, businessId),
        eq(businessSettings.platform, "meta")
      )
    )
    .limit(1);

  if (!conn || conn.connectionStatus !== "active" || !conn.accessToken) {
    return null;
  }

  const now = new Date();
  const expiresAt = conn.tokenExpiresAt;
  // Refresh if within 7 days of expiry
  const needsRefresh =
    expiresAt && expiresAt.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000;

  if (needsRefresh) {
    try {
      const currentToken = decrypt(conn.accessToken);
      const refreshed = await refreshLongLivedToken(currentToken);
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
        pageId: conn.platformBusinessId || "",
        igUserId: conn.platformUserId || "",
      };
    } catch {
      // If token has fully expired, mark connection as expired
      if (expiresAt && expiresAt.getTime() < now.getTime()) {
        await db
          .update(businessSettings)
          .set({ connectionStatus: "expired", updatedAt: new Date() })
          .where(eq(businessSettings.id, conn.id));
        return null;
      }
      // Token is still valid but refresh failed; return current token
    }
  }

  const config = conn.config as { pageId?: string; igUserId?: string } | null;

  return {
    token: decrypt(conn.accessToken),
    pageId: config?.pageId || conn.platformBusinessId || "",
    igUserId: config?.igUserId || conn.platformUserId || "",
  };
}

/**
 * Refresh a long-lived token for another 60 days.
 * This only works while the current token is still valid.
 */
async function refreshLongLivedToken(
  currentToken: string
): Promise<MetaLongLivedTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID || "",
    client_secret: process.env.META_APP_SECRET || "",
    fb_exchange_token: currentToken,
  });

  const response = await fetch(
    `${META_GRAPH_BASE}/oauth/access_token?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Meta token refresh failed: ${response.status}`);
  }

  return response.json();
}

// ─── Publishing: Facebook ────────────────────────────────────────────────────

/**
 * Publish a post to a Facebook Page.
 * POST /{page-id}/feed
 */
export async function publishToFacebook(
  businessId: string,
  content: PostContent
): Promise<MetaPublishResult> {
  const auth = await getAccessToken(businessId);
  if (!auth) {
    return {
      id: "",
      postUrl: "",
      platform: "facebook",
      success: false,
      error: "No active Meta connection",
    };
  }

  const text = content.text + WATERMARK;

  const body: Record<string, string> = {
    message: text,
    access_token: auth.token,
  };

  if (content.imageUrl) {
    // Use photo endpoint for image posts
    const response = await fetch(`${META_GRAPH_BASE}/${auth.pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: content.imageUrl,
        caption: text,
        access_token: auth.token,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return {
        id: "",
        postUrl: "",
        platform: "facebook",
        success: false,
        error: `Facebook photo publish failed: ${errorData}`,
      };
    }

    const data = await response.json();
    return {
      id: data.id,
      postUrl: `https://facebook.com/${data.id}`,
      platform: "facebook",
      success: true,
    };
  }

  // Text-only post
  const response = await fetch(`${META_GRAPH_BASE}/${auth.pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.text();
    return {
      id: "",
      postUrl: "",
      platform: "facebook",
      success: false,
      error: `Facebook publish failed: ${errorData}`,
    };
  }

  const data = await response.json();
  return {
    id: data.id,
    postUrl: `https://facebook.com/${data.id}`,
    platform: "facebook",
    success: true,
  };
}

// ─── Publishing: Instagram ───────────────────────────────────────────────────

/**
 * Publish a post to Instagram via the Content Publishing API.
 * Two-step process:
 *   1. POST /{ig-user-id}/media — create media container
 *   2. POST /{ig-user-id}/media_publish — publish the container
 *
 * IMPORTANT: Instagram requires a publicly accessible image URL.
 * Images must be uploaded to R2 (or another public CDN) before calling this.
 * Instagram does NOT support text-only posts — imageUrl is required.
 */
export async function publishToInstagram(
  businessId: string,
  content: PostContent & { imageUrl: string }
): Promise<MetaPublishResult> {
  const auth = await getAccessToken(businessId);
  if (!auth || !auth.igUserId) {
    return {
      id: "",
      postUrl: "",
      platform: "instagram",
      success: false,
      error: auth
        ? "No Instagram Business Account connected"
        : "No active Meta connection",
    };
  }

  if (!content.imageUrl) {
    return {
      id: "",
      postUrl: "",
      platform: "instagram",
      success: false,
      error: "Instagram requires a public image URL",
    };
  }

  const caption = content.text + WATERMARK;

  // Step 1: Create media container
  const containerResponse = await fetch(
    `${META_GRAPH_BASE}/${auth.igUserId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: content.imageUrl,
        caption,
        access_token: auth.token,
      }),
    }
  );

  if (!containerResponse.ok) {
    const errorData = await containerResponse.text();
    return {
      id: "",
      postUrl: "",
      platform: "instagram",
      success: false,
      error: `Instagram container creation failed: ${errorData}`,
    };
  }

  const container = await containerResponse.json();
  const containerId: string = container.id;

  // Step 2: Publish the container
  const publishResponse = await fetch(
    `${META_GRAPH_BASE}/${auth.igUserId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: auth.token,
      }),
    }
  );

  if (!publishResponse.ok) {
    const errorData = await publishResponse.text();
    return {
      id: "",
      postUrl: "",
      platform: "instagram",
      success: false,
      error: `Instagram publish failed: ${errorData}`,
    };
  }

  const published = await publishResponse.json();
  return {
    id: published.id,
    postUrl: `https://instagram.com/p/${published.id}`,
    platform: "instagram",
    success: true,
  };
}

// ─── Insights ─────────────────────────────────────────────────────────────────

/**
 * Get engagement metrics for a specific post.
 * Facebook: /{post-id}?fields=insights.metric(post_impressions,post_engaged_users,...)
 * Instagram: /{media-id}/insights?metric=reach,impressions,...
 */
export async function getPostInsights(
  businessId: string,
  postId: string,
  platform: "instagram" | "facebook"
): Promise<PostInsights> {
  const auth = await getAccessToken(businessId);
  if (!auth) return {};

  if (platform === "facebook") {
    const response = await fetch(
      `${META_GRAPH_BASE}/${postId}?fields=insights.metric(post_impressions,post_engaged_users,post_reactions_like_total)&access_token=${auth.token}`
    );

    if (!response.ok) return {};

    const data = await response.json();
    const metrics: PostInsights = {};

    for (const insight of data.insights?.data || []) {
      switch (insight.name) {
        case "post_impressions":
          metrics.impressions = insight.values?.[0]?.value || 0;
          break;
        case "post_engaged_users":
          metrics.reach = insight.values?.[0]?.value || 0;
          break;
        case "post_reactions_like_total":
          metrics.likes = insight.values?.[0]?.value || 0;
          break;
      }
    }

    // Also get comment/share counts from the post object itself
    const postResponse = await fetch(
      `${META_GRAPH_BASE}/${postId}?fields=comments.summary(true),shares&access_token=${auth.token}`
    );

    if (postResponse.ok) {
      const postData = await postResponse.json();
      metrics.comments = postData.comments?.summary?.total_count || 0;
      metrics.shares = postData.shares?.count || 0;
    }

    return metrics;
  }

  // Instagram insights
  const response = await fetch(
    `${META_GRAPH_BASE}/${postId}/insights?metric=reach,impressions,likes,comments,saved,shares&access_token=${auth.token}`
  );

  if (!response.ok) return {};

  const data = await response.json();
  const metrics: PostInsights = {};

  for (const insight of data.data || []) {
    switch (insight.name) {
      case "reach":
        metrics.reach = insight.values?.[0]?.value || 0;
        break;
      case "impressions":
        metrics.impressions = insight.values?.[0]?.value || 0;
        break;
      case "likes":
        metrics.likes = insight.values?.[0]?.value || 0;
        break;
      case "comments":
        metrics.comments = insight.values?.[0]?.value || 0;
        break;
      case "saved":
        metrics.saves = insight.values?.[0]?.value || 0;
        break;
      case "shares":
        metrics.shares = insight.values?.[0]?.value || 0;
        break;
    }
  }

  return metrics;
}

// ─── Full Sync (called by cron) ───────────────────────────────────────────────

/**
 * Sync engagement metrics for recent posts for a single business.
 * Looks up recent actions with externalPlatform = "instagram" | "facebook"
 * and pulls fresh insights for each.
 *
 * Called periodically via /api/cron/meta-sync.
 */
export async function fullSync(
  businessId: string,
  organizationId: string
): Promise<{
  postsSynced: number;
  success: boolean;
}> {
  try {
    const auth = await getAccessToken(businessId);
    if (!auth) return { postsSynced: 0, success: false };

    // Import actions here to avoid circular dependency at module level
    const { actions } = await import("@/db/schema");

    // Get recent published posts (last 30 days) for this business
    const recentActions = await db
      .select()
      .from(actions)
      .where(
        and(
          eq(actions.businessId, businessId),
          eq(actions.actionType, "social_post"),
          eq(actions.status, "completed")
        )
      )
      .limit(50);

    let synced = 0;

    for (const action of recentActions) {
      if (!action.externalId || !action.externalPlatform) continue;

      const platform = action.externalPlatform as "instagram" | "facebook";
      if (platform !== "instagram" && platform !== "facebook") continue;

      const insights = await getPostInsights(businessId, action.externalId, platform);

      if (Object.keys(insights).length > 0) {
        await db.insert(analyticsEvents).values({
          businessId,
          organizationId,
          eventType: "social_engagement",
          source: `meta_${platform}_insights`,
          metadata: {
            postId: action.externalId,
            platform,
            ...insights,
          },
          occurredAt: new Date(),
        });
        synced++;
      }
    }

    // Update last synced timestamp
    await db
      .update(businessSettings)
      .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(businessSettings.businessId, businessId),
          eq(businessSettings.platform, "meta")
        )
      );

    return { postsSynced: synced, success: true };
  } catch (error) {
    console.error(
      `Meta sync failed for business ${businessId}:`,
      error instanceof Error ? error.message : error
    );

    return { postsSynced: 0, success: false };
  }
}
