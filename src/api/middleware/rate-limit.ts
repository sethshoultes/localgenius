/**
 * Rate Limiting Middleware
 * Spec: engineering/api-design.md Section 6
 *
 * In-memory sliding window rate limiter. Upgrade to Redis (Upstash) for production.
 *
 * Limits:
 *   - Authenticated users: 60 req/min
 *   - Unauthenticated: 10 req/min
 *   - AI generation endpoints: 5 req/min (expensive — market-fit.md: AI costs under 15%)
 */

import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store. Replace with Redis in production for multi-instance support.
const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 60 seconds
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const TIER_CONFIGS: Record<string, RateLimitConfig> = {
  authenticated: { maxRequests: 60, windowMs: 60_000 },
  unauthenticated: { maxRequests: 10, windowMs: 60_000 },
  ai_generation: { maxRequests: 5, windowMs: 60_000 },
  auth_endpoints: { maxRequests: 10, windowMs: 15 * 60_000 },
};

// Paths that use the AI generation rate limit (expensive operations)
const AI_PATHS = [
  "/api/content/generate",
  "/api/conversations/", // POST to conversations triggers AI
];

// Auth paths get stricter limits (brute force protection)
const AUTH_PATHS = ["/api/auth/login", "/api/auth/register"];

/**
 * Determine the rate limit tier for a request.
 */
function getTier(pathname: string, isAuthenticated: boolean): string {
  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    return "auth_endpoints";
  }
  if (AI_PATHS.some((p) => pathname.startsWith(p)) && isAuthenticated) {
    return "ai_generation";
  }
  return isAuthenticated ? "authenticated" : "unauthenticated";
}

/**
 * Get a rate limit key from the request.
 * Uses user ID for authenticated, IP for unauthenticated.
 */
function getKey(request: NextRequest, userId?: string): string {
  if (userId) return `user:${userId}`;

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `ip:${ip}`;
}

/**
 * Check rate limit. Returns null if allowed, NextResponse if limited.
 */
export function checkRateLimit(
  request: NextRequest,
  userId?: string
): NextResponse | null {
  cleanup();

  const pathname = request.nextUrl.pathname;
  const isAuthenticated = !!userId;
  const tier = getTier(pathname, isAuthenticated);
  const config = TIER_CONFIGS[tier];
  const key = `${tier}:${getKey(request, userId)}`;

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // New window
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return null;
  }

  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: `Too many requests. Try again in ${retryAfter} seconds.`,
          retryAfter,
        },
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(config.maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(entry.resetAt / 1000)),
        },
      }
    );
  }

  entry.count++;
  return null;
}

/**
 * Add rate limit headers to a successful response.
 */
export function addRateLimitHeaders(
  response: NextResponse,
  request: NextRequest,
  userId?: string
): NextResponse {
  const pathname = request.nextUrl.pathname;
  const isAuthenticated = !!userId;
  const tier = getTier(pathname, isAuthenticated);
  const config = TIER_CONFIGS[tier];
  const key = `${tier}:${getKey(request, userId)}`;

  const entry = store.get(key);
  const remaining = entry
    ? Math.max(0, config.maxRequests - entry.count)
    : config.maxRequests;

  response.headers.set("X-RateLimit-Limit", String(config.maxRequests));
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  if (entry) {
    response.headers.set(
      "X-RateLimit-Reset",
      String(Math.ceil(entry.resetAt / 1000))
    );
  }

  return response;
}
