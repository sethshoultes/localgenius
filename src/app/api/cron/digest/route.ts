import { NextRequest, NextResponse } from "next/server";
import { generateAllDigests } from "@/services/digest";

/**
 * Cron endpoint: Generate Weekly Digests for all businesses.
 * Spec: infrastructure.md — runs Monday 5:00 AM per timezone.
 * Secured with CRON_SECRET env var.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
      { status: 401 }
    );
  }

  try {
    const result = await generateAllDigests();

    return NextResponse.json({
      data: {
        generated: result.generated,
        failed: result.failed,
        errors: result.errors,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Digest generation failed";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
