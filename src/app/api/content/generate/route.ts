import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { contentItems, actions, businesses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyAuth } from "@/api/middleware/auth";
import { generate, generateSocialPost, generateReviewResponse } from "@/services/ai";

const generateSchema = z.object({
  type: z.enum(["social_post", "review_response", "email_campaign", "website_content"]),
  topic: z.string().optional(),
  reviewData: z.object({ reviewerName: z.string().nullable(), rating: z.number(), reviewText: z.string().nullable() }).optional(),
  platform: z.enum(["instagram", "facebook", "google", "email", "sms"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const validated = generateSchema.parse(body);

    const [biz] = await db.select().from(businesses).where(eq(businesses.id, auth.businessId)).limit(1);
    if (!biz) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Business not found" } }, { status: 404 });

    let generatedText: string;
    switch (validated.type) {
      case "social_post":
        generatedText = await generateSocialPost({ name: biz.name, vertical: biz.vertical, city: biz.city }, validated.topic || "a great day at the business");
        break;
      case "review_response":
        if (!validated.reviewData) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "reviewData required" } }, { status: 400 });
        generatedText = await generateReviewResponse({ name: biz.name }, validated.reviewData);
        break;
      case "email_campaign":
        generatedText = await generate({ prompt: `Write a short email campaign for ${biz.name} (${biz.vertical} in ${biz.city}). Topic: ${validated.topic || "we miss you"}. Include subject line and body. Under 150 words.`, maxTokens: 512 });
        break;
      case "website_content":
        generatedText = await generate({ prompt: `Write website copy for ${biz.name}, a ${biz.vertical} in ${biz.city}, ${biz.state}. Include: hero headline, about section, CTA. Warm, local, confident.`, maxTokens: 512 });
        break;
      default:
        generatedText = "";
    }

    const [content] = await db.insert(contentItems).values({
      businessId: auth.businessId, organizationId: auth.organizationId,
      contentType: validated.type, content: { text: generatedText, platform: validated.platform, topic: validated.topic },
      aiModel: "claude-sonnet-4-6-20250514",
    }).returning();

    const actionType = validated.type === "email_campaign" ? "email_campaign" as const : validated.type === "review_response" ? "review_response" as const : "social_post" as const;
    const [action] = await db.insert(actions).values({
      businessId: auth.businessId, organizationId: auth.organizationId,
      actionType, status: "proposed",
      content: { contentItemId: content.id, text: generatedText, platform: validated.platform },
    }).returning();

    return NextResponse.json({ data: { contentItem: content, action: { id: action.id, status: action.status, type: action.actionType } }, meta: { timestamp: new Date().toISOString() } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid request", details: error.errors } }, { status: 400 });
    const message = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: { code: "GENERATION_FAILED", message } }, { status: 500 });
  }
}
