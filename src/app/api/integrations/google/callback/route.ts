import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, storeConnection } from "@/services/google-business";

/**
 * GET /api/integrations/google/callback
 * Handles Google OAuth callback. Exchanges code for tokens, stores encrypted.
 *
 * In production, redirects back to the mobile app with a success/error deep link.
 * For now, returns JSON.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.json(
      { error: { code: "OAUTH_DENIED", message: `Google OAuth error: ${error}` } },
      { status: 400 }
    );
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: { code: "INVALID_CALLBACK", message: "Missing code or state" } },
      { status: 400 }
    );
  }

  try {
    // Decode state to get business context
    const stateData = JSON.parse(
      Buffer.from(state, "base64url").toString("utf-8")
    ) as { businessId: string; organizationId: string };

    // Exchange authorization code for tokens
    const tokens = await exchangeCode(code);

    // For a real implementation, we'd list accounts and locations here
    // to let the owner select which GBP listing to connect.
    // For now, we use placeholder IDs that get replaced on first sync.
    const accountId = "pending_account_selection";
    const locationId = "pending_location_selection";

    // Store encrypted tokens
    await storeConnection(
      stateData.businessId,
      stateData.organizationId,
      tokens,
      accountId,
      locationId
    );

    // In production: redirect to app deep link
    // localgenius://integrations/google/success
    return NextResponse.json({
      data: {
        status: "connected",
        platform: "google_business",
        message: "Google Business Profile connected successfully.",
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth callback failed";
    return NextResponse.json(
      { error: { code: "OAUTH_FAILED", message } },
      { status: 500 }
    );
  }
}
