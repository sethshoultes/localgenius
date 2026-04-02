/**
 * Social Posting Service
 * Spec: engineering/api-design.md Section 4.2 (Meta Graph API)
 *
 * Generates and publishes social content to Instagram + Facebook.
 * Includes "Posted by LocalGenius" watermark per product-led growth strategy.
 *
 * Uses meta-social.ts for real Meta Graph API calls when credentials available,
 * falls back to mock for development without API keys.
 */

import { db } from "@/lib/db";
import { actions, contentItems, businesses, businessSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateSocialPost } from "./ai";
import {
  publishToFacebook,
  publishToInstagram,
  getAccessToken as getMetaToken,
} from "./meta-social";

interface PostResult {
  id: string;
  postUrl: string;
  platform: "instagram" | "facebook";
  success: boolean;
  error?: string;
  live: boolean; // true = real API call, false = mock
}

const WATERMARK = "\n\nPosted by LocalGenius";

/**
 * Generate a social media post for a business.
 */
export async function generatePost(
  businessId: string,
  topic: string,
  platform: "instagram" | "facebook" = "instagram"
): Promise<{ text: string; platform: string }> {
  const [biz] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!biz) throw new Error("Business not found");

  const text = await generateSocialPost(
    { name: biz.name, vertical: biz.vertical, city: biz.city },
    topic
  );

  return {
    text: text + WATERMARK,
    platform,
  };
}

/**
 * Publish a post to Instagram or Facebook.
 * Uses real Meta Graph API when credentials are available,
 * falls back to mock for development.
 */
export async function publishPost(
  businessId: string,
  platform: "instagram" | "facebook",
  content: { text: string; imageUrl?: string }
): Promise<PostResult> {
  // Check if business has Meta credentials
  const metaAuth = await getMetaToken(businessId);

  if (metaAuth) {
    // Real Meta API call
    try {
      if (platform === "instagram" && content.imageUrl) {
        const result = await publishToInstagram(businessId, {
          text: content.text,
          imageUrl: content.imageUrl,
        });
        return {
          id: result.id,
          postUrl: `https://instagram.com/p/${result.id}`,
          platform: "instagram",
          success: result.success,
          error: result.error,
          live: true,
        };
      } else {
        const result = await publishToFacebook(businessId, {
          text: content.text,
          imageUrl: content.imageUrl,
        });
        return {
          id: result.id,
          postUrl: `https://facebook.com/${result.id}`,
          platform: "facebook",
          success: result.success,
          error: result.error,
          live: true,
        };
      }
    } catch (error) {
      return {
        id: "",
        postUrl: "",
        platform,
        success: false,
        error: error instanceof Error ? error.message : "Publishing failed",
        live: true,
      };
    }
  }

  // No credentials — mock for development
  const mockId = `dev_${platform}_${Date.now()}`;
  return {
    id: mockId,
    postUrl: platform === "instagram"
      ? `https://instagram.com/p/${mockId}`
      : `https://facebook.com/post/${mockId}`,
    platform,
    success: true,
    live: false,
  };
}

/**
 * Full flow: generate content → store → create action → publish.
 */
export async function createAndPublishPost(
  businessId: string,
  organizationId: string,
  topic: string,
  platform: "instagram" | "facebook" = "instagram",
  autoPublish: boolean = false
) {
  const post = await generatePost(businessId, topic, platform);

  // Store generated content
  const [content] = await db
    .insert(contentItems)
    .values({
      businessId,
      organizationId,
      contentType: "social_post",
      content: { text: post.text, platform: post.platform },
      aiModel: "claude-sonnet-4-20250514",
    })
    .returning();

  // Create action
  const [action] = await db
    .insert(actions)
    .values({
      businessId,
      organizationId,
      actionType: "social_post",
      status: autoPublish ? "completed" : "proposed",
      content: {
        contentItemId: content.id,
        text: post.text,
        platform: post.platform,
      },
      autoApproved: autoPublish,
      executedAt: autoPublish ? new Date() : undefined,
    })
    .returning();

  let publishResult: PostResult | null = null;

  if (autoPublish) {
    publishResult = await publishPost(businessId, platform, { text: post.text });

    if (publishResult.success) {
      await db
        .update(actions)
        .set({
          externalId: publishResult.id,
          externalPlatform: platform,
          executedAt: new Date(),
        })
        .where(eq(actions.id, action.id));
    }
  }

  return {
    content,
    action,
    published: publishResult?.success || false,
    postUrl: publishResult?.postUrl || null,
    live: publishResult?.live || false,
  };
}
