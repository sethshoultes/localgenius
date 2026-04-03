/**
 * Next.js Root Middleware — Unified Request Pipeline
 *
 * Handles both page routes and API routes:
 *   Pages: cookie-based auth, redirect to /login if unauthenticated
 *   API: Bearer token OR cookie auth, rate limiting, tenant scoping, CORS
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, addRateLimitHeaders } from "@/api/middleware/rate-limit";
import * as jose from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);

const COOKIE_NAME = "lg_session";

// ─── Route Classification ─────────────────────────────────────────────────────

// Public pages — no auth required
const PUBLIC_PAGES = ["/", "/about", "/pricing", "/demo", "/site", "/sites", "/privacy", "/terms", "/login", "/register", "/landing", "/welcome", "/forgot-password", "/reset-password"];

// Public page patterns — checked with startsWith
const PUBLIC_PAGE_PATTERNS = ["/site/"];

// Public API routes — no auth required
const PUBLIC_API_ROUTES = [
  "/api/health",
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/logout",
  "/api/auth/session",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

// Webhook routes — authenticated via signatures, not JWT
const WEBHOOK_ROUTES = [
  "/api/billing/webhook",
  "/api/webhooks/stripe",
  "/api/webhooks/google",
];

// Cron routes — authenticated via CRON_SECRET
const CRON_ROUTES = [
  "/api/cron/digest",
  "/api/cron/google-sync",
  "/api/cron/meta-sync",
  "/api/cron/run",
];

// OAuth callbacks — authenticated via state parameter
const OAUTH_CALLBACK_ROUTES = [
  "/api/integrations/google/callback",
  "/api/integrations/meta/callback",
];

const WEBSITE_ROUTES_PREFIX = "/api/website/";

function isPublicAPI(pathname: string): boolean {
  return (
    PUBLIC_API_ROUTES.includes(pathname) ||
    WEBHOOK_ROUTES.includes(pathname) ||
    CRON_ROUTES.includes(pathname) ||
    OAUTH_CALLBACK_ROUTES.includes(pathname) ||
    pathname.startsWith(WEBSITE_ROUTES_PREFIX)
  );
}

function isPublicPage(pathname: string): boolean {
  return (
    PUBLIC_PAGES.includes(pathname) ||
    PUBLIC_PAGE_PATTERNS.some((pattern) => pathname.startsWith(pattern)) ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  );
}

function skipRateLimit(pathname: string): boolean {
  return (
    pathname === "/api/health" ||
    WEBHOOK_ROUTES.includes(pathname) ||
    pathname.startsWith(WEBSITE_ROUTES_PREFIX)
  );
}

// ─── JWT Extraction ───────────────────────────────────────────────────────────

async function extractAuth(request: NextRequest): Promise<{
  userId?: string;
  orgId?: string;
  bizId?: string;
}> {
  // Try Bearer token first (API clients, mobile app)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const { payload } = await jose.jwtVerify(authHeader.slice(7), JWT_SECRET);
      return {
        userId: payload.sub as string,
        orgId: payload.org as string,
        bizId: payload.biz as string,
      };
    } catch {
      // Fall through to cookie
    }
  }

  // Try httpOnly session cookie (browser)
  const cookie = request.cookies.get(COOKIE_NAME);
  if (cookie?.value) {
    try {
      const { payload } = await jose.jwtVerify(cookie.value, JWT_SECRET);
      return {
        userId: payload.sub as string,
        orgId: payload.org as string,
        bizId: payload.biz as string,
      };
    } catch {
      // Cookie expired or invalid
    }
  }

  return {};
}

// ─── Middleware Pipeline ──────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ─── Page Routes ────────────────────────────────────────────────────────
  if (!pathname.startsWith("/api/")) {
    // Public pages pass through (includes unknown routes → Next.js 404)
    if (isPublicPage(pathname)) {
      return NextResponse.next();
    }

    // Only protect specific app routes — everything else passes through
    // to Next.js (which shows 404 for unknown pages)
    const PROTECTED_PREFIXES = ["/app", "/digest"];
    const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

    if (!isProtected) {
      // Unknown route — let Next.js handle it (will show 404)
      return NextResponse.next();
    }

    // Protected pages: check cookie, redirect to /login if no session
    const { userId } = await extractAuth(request);
    if (!userId) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // ─── API Routes ─────────────────────────────────────────────────────────

  // CORS Preflight
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": process.env.CORS_ALLOWED_ORIGIN || "https://localgenius.company",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Extract auth from Bearer token or cookie
  const { userId, orgId, bizId } = await extractAuth(request);

  // Rate limiting
  if (!skipRateLimit(pathname)) {
    const limited = checkRateLimit(request, userId);
    if (limited) return limited;
  }

  // Auth enforcement for protected API routes
  if (!isPublicAPI(pathname) && !userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  // Build response with context headers
  const response = NextResponse.next();

  if (userId) {
    response.headers.set("x-user-id", userId);
    if (orgId) response.headers.set("x-org-id", orgId);
    if (bizId) response.headers.set("x-biz-id", bizId);
  }

  response.headers.set(
    "Access-Control-Allow-Origin",
    process.env.CORS_ALLOWED_ORIGIN || "https://localgenius.company"
  );

  if (!skipRateLimit(pathname)) {
    addRateLimitHeaders(response, request, userId);
  }

  return response;
}

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
