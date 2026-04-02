import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, storeConnection } from "@/services/meta-social";

/**
 * GET /api/integrations/meta/callback
 * Handles Meta OAuth callback. Exchanges code for long-lived token, stores encrypted.
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
      {
        error: {
          code: "OAUTH_DENIED",
          message: `Meta OAuth error: ${error}`,
        },
      },
      { status: 400 }
    );
  }

  if (!code || !state) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_CALLBACK",
          message: "Missing code or state",
        },
      },
      { status: 400 }
    );
  }

  try {
    // Decode state to get business context
    const stateData = JSON.parse(
      Buffer.from(state, "base64url").toString("utf-8")
    ) as { businessId: string; organizationId: string };

    // Exchange authorization code for long-lived token + page info
    const result = await exchangeCode(code);

    if (result.pages.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: "NO_PAGES",
            message:
              "No Facebook Pages found. Please connect a Facebook Page to use this integration.",
          },
        },
        { status: 400 }
      );
    }

    // Use the first connected page. In production, let the user select.
    const page = result.pages[0];

    // Store encrypted tokens
    await storeConnection(
      stateData.businessId,
      stateData.organizationId,
      { accessToken: result.accessToken, expiresIn: result.expiresIn },
      page.id,
      result.igUserId
    );

    // In production: redirect to app deep link
    // localgenius://integrations/meta/success
    return NextResponse.json({
      data: {
        status: "connected",
        platform: "meta",
        page: { id: page.id, name: page.name },
        instagramConnected: !!result.igUserId,
        message: "Meta (Facebook + Instagram) connected successfully.",
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "OAuth callback failed";
    return NextResponse.json(
      { error: { code: "OAUTH_FAILED", message } },
      { status: 500 }
    );
  }
}
