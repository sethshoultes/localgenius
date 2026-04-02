/**
 * Social Posting Service
 * Spec: engineering/api-design.md Section 4.2 (Meta Graph API)
 *
 * Generates and publishes social content to Instagram + Facebook.
 * Includes "Posted by LocalGenius" watermark per product-led growth strategy.
 */

import { db } from "@/lib/db";
import { actions, contentItems, businesses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateSocialPost } from "./ai";

// Mock Meta Graph API response structure
interface MetaPostResult {
  id: string;
  postUrl: string;
  platform: "instagram" | "facebook";
  success: boolean;
  error?: string;
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
 * Publish a post to Instagram or Facebook via Meta Graph API.
 * Currently mocked — returns structured response matching the real API.
 */
export async function publishPost(
  platform: "instagram" | "facebook",
  content: { text: string; imageUrl?: string },
  _credentials: { accessToken: string; pageId: string }
): Promise<MetaPostResult> {
  // TODO: Replace with real Meta Graph API calls
  // Instagram: POST /{ig-user-id}/media → POST /{ig-user-id}/media_publish
  // Facebook: POST /{page-id}/feed
  // Rate limit: 200 calls/user/hour

  // Mock successful response
  const mockId = `mock_${platform}_${Date.now()}`;

  return {
    id: mockId,
    postUrl:
      platform === "instagram"
        ? `https://instagram.com/p/${mockId}`
        : `https://facebook.com/post/${mockId}`,
    platform,
    success: true,
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
      aiModel: "claude-sonnet-4-6-20250514",
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

  let publishResult: MetaPostResult | null = null;

  if (autoPublish) {
    // In production: retrieve credentials from business_settings
    publishResult = await publishPost(
      platform,
      { text: post.text },
      { accessToken: "mock", pageId: "mock" }
    );

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
  };
}
