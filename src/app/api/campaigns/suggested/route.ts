import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/api/middleware/auth";
import { generateSuggestedCampaigns, approveCampaign } from "@/services/campaign-engine";

/**
 * GET /api/campaigns/suggested
 * Returns AI-generated campaign suggestions based on business data patterns.
 * Each suggestion includes ready-to-approve content.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth instanceof NextResponse) return auth;

    const campaigns = await generateSuggestedCampaigns(
      auth.businessId,
      auth.organizationId
    );

    return NextResponse.json({
      data: {
        campaigns,
        count: campaigns.length,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Campaign generation failed";
    return NextResponse.json(
      { error: { code: "CAMPAIGN_FAILED", message } },
      { status: 500 }
    );
  }
}

const approveSchema = z.object({
  campaignId: z.string(),
  campaign: z.object({
    id: z.string(),
    type: z.enum(["social_post", "email_campaign", "review_request", "special_offer"]),
    title: z.string(),
    description: z.string(),
    content: z.object({
      text: z.string(),
      platform: z.string().optional(),
      scheduledFor: z.string().optional(),
      topic: z.string().optional(),
    }),
    basedOn: z.string(),
    estimatedImpact: z.string(),
    priority: z.enum(["high", "medium", "low"]),
    createdAt: z.string(),
  }),
});

/**
 * POST /api/campaigns/suggested
 * Approve a suggested campaign — schedules or executes it.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const validated = approveSchema.parse(body);

    const result = await approveCampaign(
      auth.businessId,
      auth.organizationId,
      validated.campaign
    );

    return NextResponse.json({
      data: {
        approved: result.success,
        actionId: result.actionId,
        campaign: validated.campaign.title,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid campaign", details: error.errors } },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Campaign approval failed";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
