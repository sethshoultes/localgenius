import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { reviews, reviewResponses, actions, businesses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyAuth } from "@/api/middleware/auth";
import { generateReviewResponse } from "@/services/ai";

const respondSchema = z.object({
  responseText: z.string().min(1).max(2000).optional(),
  useAiDraft: z.boolean().default(true),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (auth instanceof NextResponse) return auth;
    const { id: reviewId } = await params;
    const body = await request.json();
    const validated = respondSchema.parse(body);

    const [review] = await db.select().from(reviews)
      .where(and(eq(reviews.id, reviewId), eq(reviews.organizationId, auth.organizationId)))
      .limit(1);
    if (!review) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Review not found" } }, { status: 404 });

    let responseText = validated.responseText || "";
    if (validated.useAiDraft && !responseText) {
      const [biz] = await db.select().from(businesses).where(eq(businesses.id, auth.businessId)).limit(1);
      responseText = await generateReviewResponse(
        { name: biz?.name || "the business" },
        { reviewerName: review.reviewerName, rating: review.rating, reviewText: review.reviewText }
      );
    }

    const [action] = await db.insert(actions).values({
      businessId: auth.businessId, organizationId: auth.organizationId,
      actionType: "review_response", status: "completed",
      content: { reviewId, responseText, platform: review.platform },
      executedAt: new Date(),
    }).returning();

    const [response] = await db.insert(reviewResponses).values({
      reviewId, businessId: auth.businessId, organizationId: auth.organizationId,
      actionId: action.id, responseText,
      postedAt: new Date(), postedToPlatform: review.platform !== "yelp",
    }).returning();

    return NextResponse.json({
      data: { response: { ...response, platform: review.platform, needsManualPosting: review.platform === "yelp" } },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid data", details: error.errors } }, { status: 400 });
    const message = error instanceof Error ? error.message : "Failed to respond";
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message } }, { status: 500 });
  }
}
