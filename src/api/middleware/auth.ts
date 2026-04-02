/**
 * JWT Authentication Middleware
 *
 * Spec: engineering/api-design.md Section 2.1
 *
 * Verifies JWT access token from Authorization header.
 * Extracts tenant context (org_id, business_id, plan) for RLS enforcement.
 * Access tokens are short-lived (15 min). Refresh via /auth/refresh.
 */

import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";

export interface AuthContext {
  userId: string;
  organizationId: string;
  businessId: string;
  plan: "base" | "pro" | "franchise";
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);

/**
 * Verify JWT and extract auth context.
 * Returns AuthContext on success, NextResponse error on failure.
 */
export async function verifyAuth(
  request: NextRequest
): Promise<AuthContext | NextResponse> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Missing or invalid Authorization header",
        },
      },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);

  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);

    // JWT payload spec (api-design.md Section 2.1):
    // { sub: user_uuid, org: organization_uuid, biz: business_uuid, plan: "base"|"pro" }
    if (!payload.sub || !payload.org || !payload.biz) {
      return NextResponse.json(
        { error: { code: "INVALID_TOKEN", message: "Malformed token payload" } },
        { status: 401 }
      );
    }

    return {
      userId: payload.sub as string,
      organizationId: payload.org as string,
      businessId: payload.biz as string,
      plan: (payload.plan as AuthContext["plan"]) || "base",
    };
  } catch {
    return NextResponse.json(
      { error: { code: "TOKEN_EXPIRED", message: "Access token expired" } },
      { status: 401 }
    );
  }
}

/**
 * Issue a new JWT access token.
 * Used by /auth/login and /auth/refresh.
 */
export async function issueAccessToken(context: AuthContext): Promise<string> {
  return new jose.SignJWT({
    sub: context.userId,
    org: context.organizationId,
    biz: context.businessId,
    plan: context.plan,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(JWT_SECRET);
}

/**
 * Issue a refresh token (30-day expiry).
 * Refresh tokens use rotation — each use invalidates the old token.
 */
export async function issueRefreshToken(userId: string): Promise<string> {
  return new jose.SignJWT({ sub: userId, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}
