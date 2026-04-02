/**
 * Typed Environment Variable Validator
 *
 * Validates all required env vars at startup. Throws clear error
 * messages pointing to setup docs if anything is missing.
 *
 * Usage: import { env } from '@/lib/env' — access validated vars.
 */

import { z } from "zod";

const envSchema = z.object({
  // ─── Required (app won't function without these) ────────────────────────
  DATABASE_URL: z
    .string({ required_error: "Missing DATABASE_URL. See docs/database-setup.md" })
    .min(1, "DATABASE_URL is empty. See docs/database-setup.md"),
  JWT_SECRET: z
    .string({ required_error: "Missing JWT_SECRET. Run: openssl rand -hex 32" })
    .min(32, "JWT_SECRET must be at least 32 characters"),

  // ─── AI (required for content generation) ───────────────────────────────
  ANTHROPIC_API_KEY: z
    .string({ required_error: "Missing ANTHROPIC_API_KEY. Get one at console.anthropic.com" })
    .min(1, "ANTHROPIC_API_KEY is empty"),

  // ─── Optional (app works without, features degraded) ───────────────────
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_BASE: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),

  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_REDIRECT_URI: z.string().optional(),

  YELP_API_KEY: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),

  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  ENCRYPTION_KEY: z.string().min(32).optional(),
  CRON_SECRET: z.string().optional(),

  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  NEXT_PUBLIC_DEMO_MODE: z.string().optional(),

  CORS_ALLOWED_ORIGIN: z.string().optional(),

  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  OTEL_SERVICE_NAME: z.string().default("localgenius"),

  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

/**
 * Get validated environment variables.
 * Parses on first call, caches result.
 * Throws with clear error message if required vars are missing.
 */
export function getEnv(): Env {
  if (_env) return _env;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const missing = result.error.issues
      .map((issue) => {
        const path = issue.path.join(".");
        return `  - ${path}: ${issue.message}`;
      })
      .join("\n");

    throw new Error(
      `\n\nEnvironment validation failed:\n${missing}\n\nSee .env.example for all required variables.\n`
    );
  }

  _env = result.data;
  return _env;
}

/**
 * Check which optional services are configured.
 * Used by the health endpoint to report integration status.
 */
export function getServiceStatus(): Record<string, "configured" | "not_configured"> {
  return {
    database: !!process.env.DATABASE_URL ? "configured" : "not_configured",
    ai: !!process.env.ANTHROPIC_API_KEY ? "configured" : "not_configured",
    stripe: !!process.env.STRIPE_SECRET_KEY ? "configured" : "not_configured",
    google: !!process.env.GOOGLE_CLIENT_ID ? "configured" : "not_configured",
    meta: !!process.env.META_APP_ID ? "configured" : "not_configured",
    yelp: !!process.env.YELP_API_KEY ? "configured" : "not_configured",
    email: !!process.env.RESEND_API_KEY ? "configured" : "not_configured",
    sms: !!process.env.TWILIO_ACCOUNT_SID ? "configured" : "not_configured",
    monitoring: !!process.env.SENTRY_DSN ? "configured" : "not_configured",
  };
}
