import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/api/middleware/auth";
import { runAudit } from "@/services/seo";

/**
 * GET /api/seo/audit
 * Returns SEO score (0-100), categorized findings, recommendations,
 * and AI-generated insights for the authenticated business.
 *
 * Categories: Profile Completeness, Reviews & Reputation,
 * Content & Social Signals, Search Performance.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth instanceof NextResponse) return auth;

    const audit = await runAudit(auth.businessId, auth.organizationId);

    return NextResponse.json({
      data: {
        score: audit.score.overall,
        grade:
          audit.score.overall >= 80 ? "A" :
          audit.score.overall >= 60 ? "B" :
          audit.score.overall >= 40 ? "C" :
          audit.score.overall >= 20 ? "D" : "F",
        categories: audit.score.categories,
        recommendations: audit.recommendations,
        aiInsights: audit.aiInsights,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SEO audit failed";
    return NextResponse.json(
      { error: { code: "AUDIT_FAILED", message } },
      { status: 500 }
    );
  }
}
