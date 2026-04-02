import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/api/middleware/auth";
import { getOAuthUrl } from "@/services/meta-social";
import { signState } from "@/lib/oauth-state";

/**
 * GET /api/integrations/meta/connect
 * Initiates Meta (Facebook + Instagram) OAuth flow.
 * State param is HMAC-signed to prevent forgery on callback.
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  // Sign business context into state — verified on callback
  const state = signState({
    businessId: auth.businessId,
    organizationId: auth.organizationId,
  });

  const url = getOAuthUrl(state);

  return NextResponse.json({
    data: { url },
    meta: { timestamp: new Date().toISOString() },
  });
}
