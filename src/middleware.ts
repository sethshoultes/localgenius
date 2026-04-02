/**
 * Next.js Root Middleware — Unified Request Pipeline
 *
 * Runs on every API request. Consolidates:
 *   1. Public route bypass (no auth needed)
 *   2. Rate limiting (tier-based)
 *   3. Auth verification (JWT → user context)
 *   4. Tenant scoping (org_id for RLS)
 *   5. CORS headers
 *
 * Protected routes require auth. Public routes pass through.
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, addRateLimitHeaders } from "@/api/middleware/rate-limit";
import * as jose from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);

// ─── Route Classification ─────────────────────────────────────────────────────

// Public routes — no auth required
const PUBLIC_ROUTES = [
  "/api/health",
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/refresh",
];

// Webhook routes — authenticated via signatures, not JWT
const WEBHOOK_ROUTES = [
  "/api/billing/webhook",
  "/api/webhooks/stripe",
  "/api/webhooks/google",
];

// Cron routes — authenticated via CRON_SECRET, not JWT
const CRON_ROUTES = [
  "/api/cron/digest",
  "/api/cron/google-sync",
  "/api/cron/meta-sync",
  "/api/cron/run",
];

// OAuth callback routes — authenticated via state parameter
const OAUTH_CALLBACK_ROUTES = [
  "/api/integrations/google/callback",
  "/api/integrations/meta/callback",
];

// Public website routes — served to customers, no auth
const WEBSITE_ROUTES_PREFIX = "/api/website/";

function isPublic(pathname: string): boolean {
  return (
    PUBLIC_ROUTES.includes(pathname) ||
    WEBHOOK_ROUTES.includes(pathname) ||
    CRON_ROUTES.includes(pathname) ||
    OAUTH_CALLBACK_ROUTES.includes(pathname) ||
    pathname.startsWith(WEBSITE_ROUTES_PREFIX)
  );
}

function skipRateLimit(pathname: string): boolean {
  return (
    pathname === "/api/health" ||
    WEBHOOK_ROUTES.includes(pathname) ||
    pathname.startsWith(WEBSITE_ROUTES_PREFIX)
  );
}

// ─── Middleware Pipeline ──────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Only process API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // ─── Step 1: CORS Preflight ──────────────────────────────────────────────
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": process.env.CORS_ALLOWED_ORIGIN || "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // ─── Step 2: Rate Limiting ───────────────────────────────────────────────
  let userId: string | undefined;
  let orgId: string | undefined;
  let bizId: string | undefined;

  // Extract JWT claims for rate limit keying + auth
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const { payload } = await jose.jwtVerify(authHeader.slice(7), JWT_SECRET);
      userId = payload.sub as string;
      orgId = payload.org as string;
      bizId = payload.biz as string;
    } catch {
      // Token invalid or expired — will be handled below
    }
  }

  if (!skipRateLimit(pathname)) {
    const limited = checkRateLimit(request, userId);
    if (limited) return limited;
  }

  // ─── Step 3: Auth Enforcement ────────────────────────────────────────────
  if (!isPublic(pathname) && !userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  // ─── Step 4: Build Response with Headers ─────────────────────────────────
  const response = NextResponse.next();

  // Inject auth context as headers for route handlers
  // This avoids re-verifying JWT in every route handler
  if (userId) {
    response.headers.set("x-user-id", userId);
    if (orgId) response.headers.set("x-org-id", orgId);
    if (bizId) response.headers.set("x-biz-id", bizId);
  }

  // CORS headers
  response.headers.set(
    "Access-Control-Allow-Origin",
    process.env.CORS_ALLOWED_ORIGIN || "*"
  );

  // Rate limit headers
  if (!skipRateLimit(pathname)) {
    addRateLimitHeaders(response, request, userId);
  }

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
