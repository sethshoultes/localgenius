import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getServiceStatus } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — Deep health check
 *
 * Returns structured status for every subsystem:
 * database connectivity, AI availability, integration status.
 * Used by BetterUptime monitoring and deploy verification.
 */
export async function GET() {
  const services = getServiceStatus();

  // Check database connectivity
  let dbStatus: "connected" | "disconnected" | "not_configured" = "not_configured";
  if (services.database === "configured") {
    try {
      const { getDb } = await import("@/lib/db");
      const db = getDb();
      await db.execute(sql`SELECT 1`);
      dbStatus = "connected";
    } catch {
      dbStatus = "disconnected";
    }
  }

  // Check AI service
  let aiStatus: "ready" | "no_key" | "error" = "no_key";
  if (services.ai === "configured") {
    try {
      // Verify the SDK can initialize (doesn't make an API call)
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      aiStatus = "ready";
    } catch {
      aiStatus = "error";
    }
  }

  const overall =
    dbStatus === "connected" && aiStatus === "ready"
      ? "healthy"
      : dbStatus === "connected" || aiStatus === "ready"
        ? "degraded"
        : services.database === "not_configured"
          ? "unconfigured"
          : "unhealthy";

  return NextResponse.json({
    data: {
      status: overall,
      version: "0.1.0",
      timestamp: new Date().toISOString(),
      database: dbStatus,
      ai: aiStatus,
      integrations: {
        google: services.google,
        meta: services.meta,
        stripe: services.stripe,
        yelp: services.yelp,
        email: services.email,
        sms: services.sms,
      },
      monitoring: services.monitoring,
    },
  });
}
