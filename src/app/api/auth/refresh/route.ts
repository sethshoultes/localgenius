import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";
import { issueAccessToken, type AuthContext } from "@/api/middleware/auth";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);

const COOKIE_NAME = "lg_session";
const COOKIE_MAX_AGE = 15 * 60; // 15 minutes

/**
 * POST /api/auth/refresh
 * Refreshes the JWT session. Reads the current cookie, verifies it,
 * issues a new token, and sets a fresh cookie.
 */
export async function POST(request: NextRequest) {
  const cookie = request.cookies.get(COOKIE_NAME);

  if (!cookie?.value) {
    return NextResponse.json(
      { error: { code: "NO_SESSION", message: "No session to refresh" } },
      { status: 401 }
    );
  }

  try {
    // Verify the existing token (allow expired tokens for refresh — grace period)
    let payload: jose.JWTPayload;
    try {
      const result = await jose.jwtVerify(cookie.value, JWT_SECRET);
      payload = result.payload;
    } catch (err) {
      // If token is expired but otherwise valid, still refresh (grace period of 30 min)
      if (err instanceof jose.errors.JWTExpired) {
        const decoded = jose.decodeJwt(cookie.value);
        const expiredAt = (decoded.exp || 0) * 1000;
        const gracePeriod = 30 * 60 * 1000; // 30 minutes
        if (Date.now() - expiredAt > gracePeriod) {
          return NextResponse.json(
            { error: { code: "SESSION_EXPIRED", message: "Session expired. Please log in again." } },
            { status: 401 }
          );
        }
        payload = decoded;
      } else {
        return NextResponse.json(
          { error: { code: "INVALID_SESSION", message: "Invalid session" } },
          { status: 401 }
        );
      }
    }

    const authContext: AuthContext = {
      userId: payload.sub as string,
      organizationId: payload.org as string,
      businessId: payload.biz as string,
      plan: (payload.plan as AuthContext["plan"]) || "base",
    };

    const newToken = await issueAccessToken(authContext);

    const response = NextResponse.json({
      data: { refreshed: true },
      meta: { timestamp: new Date().toISOString() },
    });

    response.cookies.set(COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: { code: "REFRESH_FAILED", message: "Session refresh failed" } },
      { status: 500 }
    );
  }
}
