import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/api/middleware/auth";
import { recordLead, getAttributionReport } from "@/services/lead-attribution";

const recordSchema = z.object({
  eventType: z.string(),
  source: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * GET /api/attribution
 * Returns the lead attribution report for the authenticated business.
 * Shows: total leads, by source, by action, trend, estimated value.
 * This is what Kevin sees: "LocalGenius generated 12 calls this month."
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth instanceof NextResponse) return auth;

    const period = request.nextUrl.searchParams.get("period") || "30";
    const daysBack = Math.min(parseInt(period, 10), 90);

    const report = await getAttributionReport(auth.businessId, daysBack);

    return NextResponse.json({
      data: { report },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Attribution report failed";
    return NextResponse.json(
      { error: { code: "ATTRIBUTION_FAILED", message } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/attribution
 * Record a lead event with automatic attribution to LocalGenius actions.
 * Used by: website tracking pixel, call tracking webhook, booking system.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const validated = recordSchema.parse(body);

    const result = await recordLead(
      auth.businessId,
      auth.organizationId,
      validated.eventType,
      validated.source,
      validated.metadata || {}
    );

    return NextResponse.json(
      {
        data: {
          eventId: result.eventId,
          attributedTo: result.attributedTo,
          estimatedValueCents: result.valueCents,
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid event", details: error.errors } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Lead recording failed" } },
      { status: 500 }
    );
  }
}
