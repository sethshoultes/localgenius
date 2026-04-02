/**
 * Next.js Middleware — runs on every API request.
 * Applies rate limiting and extracts auth context for rate limit tiers.
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, addRateLimitHeaders } from "@/api/middleware/rate-limit";
import * as jose from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);

export async function middleware(request: NextRequest) {
  // Only apply to API routes (skip static assets, pages)
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Skip rate limiting for health checks and webhooks
  const skipPaths = ["/api/health", "/api/billing/webhook"];
  if (skipPaths.some((p) => request.nextUrl.pathname === p)) {
    return NextResponse.next();
  }

  // Try to extract user ID from JWT for rate limit keying
  let userId: string | undefined;
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const { payload } = await jose.jwtVerify(
        authHeader.slice(7),
        JWT_SECRET
      );
      userId = payload.sub as string;
    } catch {
      // Invalid token — treat as unauthenticated for rate limiting
      // Auth middleware in the route handler will return 401
    }
  }

  // Check rate limit
  const limited = checkRateLimit(request, userId);
  if (limited) return limited;

  // Proceed with rate limit headers on response
  const response = NextResponse.next();
  return addRateLimitHeaders(response, request, userId);
}

export const config = {
  matcher: "/api/:path*",
};
