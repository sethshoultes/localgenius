import { NextResponse } from "next/server";

/**
 * Health check endpoint.
 * Used by BetterUptime monitoring (infrastructure.md).
 */
export async function GET() {
  return NextResponse.json({
    data: {
      status: "ok",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
    },
  });
}
