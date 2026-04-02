import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/api/middleware/auth";
import { getOAuthUrl } from "@/services/google-business";

/**
 * GET /api/integrations/google/connect
 * Initiates Google Business Profile OAuth flow.
 * State param encodes business_id for callback routing.
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  // Encode business context in state for callback
  const state = Buffer.from(
    JSON.stringify({
      businessId: auth.businessId,
      organizationId: auth.organizationId,
    })
  ).toString("base64url");

  const url = getOAuthUrl(state);

  return NextResponse.json({
    data: { url },
    meta: { timestamp: new Date().toISOString() },
  });
}
