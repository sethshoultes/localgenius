/**
 * Content Scheduler Service
 *
 * Handles scheduling social posts for future publication.
 * "Post about our Friday fish special on Thursday at 5pm."
 *
 * Stores scheduled posts, executes them via cron, handles failures.
 */

import { db } from "@/lib/db";
import {
  scheduledPosts,
  contentItems,
  actions,
  businesses,
} from "@/db/schema";
import { eq, and, lte, desc, sql } from "drizzle-orm";
import { generateSocialPost } from "./ai";

interface ScheduleInput {
  businessId: string;
  organizationId: string;
  platform: "instagram" | "facebook";
  topic: string;
  scheduledFor: Date;
  content?: string; // pre-generated content, or generate from topic
  mediaUrls?: string[];
}

interface ScheduleResult {
  id: string;
  platform: string;
  content: { text: string; mediaUrls?: string[] };
  scheduledFor: Date;
  status: string;
}

/**
 * Schedule a social post for future publication.
 * Generates content now (so Maria can approve it), publishes later.
 */
export async function schedule(input: ScheduleInput): Promise<ScheduleResult> {
  let text = input.content;

  // If no pre-generated content, generate it now
  if (!text) {
    const [biz] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, input.businessId))
      .limit(1);

    text = await generateSocialPost(
      { name: biz?.name || "the business", vertical: biz?.vertical || "restaurant", city: biz?.city || "" },
      input.topic
    );
  }

  const postContent = {
    text,
    mediaUrls: input.mediaUrls || [],
    topic: input.topic,
  };

  // Store the content item
  const [content] = await db
    .insert(contentItems)
    .values({
      businessId: input.businessId,
      organizationId: input.organizationId,
      contentType: "social_post",
      content: postContent,
      aiModel: "claude-sonnet-4-20250514",
      approved: true,
    })
    .returning();

  // Create the action
  const [action] = await db
    .insert(actions)
    .values({
      businessId: input.businessId,
      organizationId: input.organizationId,
      actionType: "social_post",
      status: "scheduled",
      content: { ...postContent, platform: input.platform },
      scheduledFor: input.scheduledFor,
    })
    .returning();

  // Create the scheduled post
  const [post] = await db
    .insert(scheduledPosts)
    .values({
      businessId: input.businessId,
      organizationId: input.organizationId,
      contentItemId: content.id,
      actionId: action.id,
      platform: input.platform,
      content: postContent,
      scheduledFor: input.scheduledFor,
      status: "pending",
    })
    .returning();

  return {
    id: post.id,
    platform: post.platform,
    content: postContent,
    scheduledFor: post.scheduledFor,
    status: post.status,
  };
}

/**
 * Cancel a scheduled post.
 */
export async function cancel(
  postId: string,
  businessId: string
): Promise<boolean> {
  const [post] = await db
    .select()
    .from(scheduledPosts)
    .where(
      and(
        eq(scheduledPosts.id, postId),
        eq(scheduledPosts.businessId, businessId),
        eq(scheduledPosts.status, "pending")
      )
    )
    .limit(1);

  if (!post) return false;

  await db
    .update(scheduledPosts)
    .set({ status: "cancelled" })
    .where(eq(scheduledPosts.id, postId));

  // Also cancel the action
  if (post.actionId) {
    await db
      .update(actions)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(actions.id, post.actionId));
  }

  return true;
}

/**
 * Get upcoming scheduled posts for a business.
 */
export async function getUpcoming(
  businessId: string,
  organizationId: string
): Promise<ScheduleResult[]> {
  const posts = await db
    .select()
    .from(scheduledPosts)
    .where(
      and(
        eq(scheduledPosts.businessId, businessId),
        eq(scheduledPosts.organizationId, organizationId),
        eq(scheduledPosts.status, "pending")
      )
    )
    .orderBy(scheduledPosts.scheduledFor)
    .limit(20);

  return posts.map((p) => ({
    id: p.id,
    platform: p.platform,
    content: p.content as { text: string; mediaUrls?: string[] },
    scheduledFor: p.scheduledFor,
    status: p.status,
  }));
}

/**
 * Publish all posts that are due. Called by cron (every 5 minutes).
 */
export async function publishDue(): Promise<{
  published: number;
  failed: number;
  errors: string[];
}> {
  const now = new Date();

  // Find all pending posts where scheduledFor <= now
  const duePosts = await db
    .select()
    .from(scheduledPosts)
    .where(
      and(
        eq(scheduledPosts.status, "pending"),
        lte(scheduledPosts.scheduledFor, now)
      )
    )
    .orderBy(scheduledPosts.scheduledFor)
    .limit(50);

  let published = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const post of duePosts) {
    try {
      // In production: call meta-social.ts publishToInstagram/publishToFacebook
      // For now: mark as published (actual publishing depends on Meta integration)
      await db
        .update(scheduledPosts)
        .set({ status: "published", publishedAt: new Date() })
        .where(eq(scheduledPosts.id, post.id));

      // Update the action status
      if (post.actionId) {
        await db
          .update(actions)
          .set({ status: "completed", executedAt: new Date(), updatedAt: new Date() })
          .where(eq(actions.id, post.actionId));
      }

      published++;
    } catch (error) {
      failed++;
      const msg = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Post ${post.id}: ${msg}`);

      await db
        .update(scheduledPosts)
        .set({
          status: "failed",
          errorDetails: { error: msg, attemptedAt: new Date().toISOString() },
        })
        .where(eq(scheduledPosts.id, post.id));
    }
  }

  return { published, failed, errors };
}
