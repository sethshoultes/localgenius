/**
 * Webhook Verification
 *
 * Verifies incoming webhook signatures from external services.
 * Rejects unverified requests to prevent spoofing.
 */

import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify a Stripe webhook signature.
 * Uses Stripe's v1 signature scheme: t=timestamp,v1=signature
 *
 * In practice, use stripe.webhooks.constructEvent() from the SDK
 * (see src/services/stripe.ts). This is a standalone fallback
 * for environments where the SDK isn't available.
 */
export function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  secret: string
): boolean {
  const elements = signatureHeader.split(",");
  const timestamp = elements
    .find((e) => e.startsWith("t="))
    ?.slice(2);
  const signature = elements
    .find((e) => e.startsWith("v1="))
    ?.slice(3);

  if (!timestamp || !signature) return false;

  // Reject events older than 5 minutes (replay protection)
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (age > 300) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  // Timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Verify a Google push notification.
 * Google Business Profile API uses a channel token for push notifications.
 * The token is set when creating the watch subscription.
 */
export function verifyGooglePushNotification(
  channelToken: string | null,
  expectedToken: string
): boolean {
  if (!channelToken) return false;

  // Timing-safe comparison
  try {
    return timingSafeEqual(
      Buffer.from(channelToken),
      Buffer.from(expectedToken)
    );
  } catch {
    return false;
  }
}

/**
 * Generic HMAC-SHA256 webhook verification.
 * Works for services that sign payloads with HMAC (SendGrid, custom webhooks).
 */
export function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: "sha256" | "sha1" = "sha256"
): boolean {
  const expected = createHmac(algorithm, secret)
    .update(payload)
    .digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}
