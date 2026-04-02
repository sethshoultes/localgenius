/**
 * OAuth State Signing — HMAC-SHA256
 *
 * Prevents state forgery on OAuth callback routes.
 * An attacker cannot craft a valid state without the server secret.
 */

import { createHmac, timingSafeEqual } from "crypto";

interface OAuthState {
  businessId: string;
  organizationId: string;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required for OAuth state signing");
  return secret;
}

/**
 * Create a signed OAuth state parameter.
 * Format: base64url(JSON payload) + "." + hex(HMAC-SHA256)
 */
export function signState(data: OAuthState): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

/**
 * Verify and decode a signed OAuth state parameter.
 * Returns the decoded state or null if the signature is invalid.
 */
export function verifyState(state: string): OAuthState | null {
  const dotIndex = state.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const payload = state.slice(0, dotIndex);
  const sig = state.slice(dotIndex + 1);

  const expected = createHmac("sha256", getSecret()).update(payload).digest("hex");

  // Timing-safe comparison
  if (sig.length !== expected.length) return null;
  const valid = timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  if (!valid) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as OAuthState;
  } catch {
    return null;
  }
}
