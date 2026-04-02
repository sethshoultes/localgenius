import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/api/middleware/auth";
import {
  generateInsights,
  trackInsightAction,
  getInsightHistory,
} from "@/services/insights-engine";

const trackSchema = z.object({
  insightId: z.string(),
  action: z.enum(["acted", "dismissed"]),
});

/**
 * GET /api/insights
 * Returns ranked insights for the authenticated business.
 * Highest priority first. Insights are generated fresh on each request
 * (cached per session in production).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth instanceof NextResponse) return auth;

    const insights = await generateInsights(auth.businessId, auth.organizationId);

    // Filter out dismissed insights
    const history = await getInsightHistory(auth.businessId);
    const dismissedIds = new Set(
      history.filter((h) => h.action === "dismissed").map((h) => h.insightId)
    );
    const filtered = insights.filter((i) => !dismissedIds.has(i.id));

    return NextResponse.json({
      data: {
        insights: filtered,
        total: filtered.length,
        byCategory: {
          content: filtered.filter((i) => i.category === "content").length,
          reviews: filtered.filter((i) => i.category === "reviews").length,
          seo: filtered.filter((i) => i.category === "seo").length,
          growth: filtered.filter((i) => i.category === "growth").length,
          engagement: filtered.filter((i) => i.category === "engagement").length,
          competitor: filtered.filter((i) => i.category === "competitor").length,
        },
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Insights generation failed";
    return NextResponse.json(
      { error: { code: "INSIGHTS_FAILED", message } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/insights
 * Track that an insight was acted-on or dismissed.
 * Used to improve future recommendation quality.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const validated = trackSchema.parse(body);

    await trackInsightAction(validated.insightId, auth.businessId, validated.action);

    return NextResponse.json({
      data: {
        tracked: true,
        insightId: validated.insightId,
        action: validated.action,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: error.errors } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Tracking failed" } },
      { status: 500 }
    );
  }
}
