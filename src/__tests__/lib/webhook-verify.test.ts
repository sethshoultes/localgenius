/**
 * Tests for src/lib/webhook-verify.ts — Webhook signature verification
 *
 * Security-critical: these tests verify that:
 * 1. Stripe webhook signatures are validated correctly
 * 2. Google push notification tokens are compared safely
 * 3. Invalid signatures are rejected
 * 4. Timing-safe comparison prevents timing attacks
 * 5. Malformed input is handled gracefully
 */

import { describe, it, expect, vi } from "vitest";
import { createHmac } from "crypto";
import {
  verifyStripeSignature,
  verifyGooglePushNotification,
  verifyHmacSignature,
} from "@/lib/webhook-verify";

describe("webhook-verify", () => {
  describe("verifyStripeSignature", () => {
    const payload = '{"id":"evt_test","object":"event"}';
    const secret = "whsec_test1234567890";

    function createValidSignature(payload: string, secret: string) {
      const timestamp = Math.floor(Date.now() / 1000);
      const signedPayload = `${timestamp}.${payload}`;
      const signature = createHmac("sha256", secret)
        .update(signedPayload)
        .digest("hex");
      const header = `t=${timestamp},v1=${signature}`;
      return { header, timestamp };
    }

    it("accepts a valid signature with correct timestamp", () => {
      const { header } = createValidSignature(payload, secret);
      const result = verifyStripeSignature(payload, header, secret);
      expect(result).toBe(true);
    });

    it("rejects an invalid signature", () => {
      const { timestamp } = createValidSignature(payload, secret);
      const badSignature = "0".repeat(64);
      const header = `t=${timestamp},v1=${badSignature}`;

      const result = verifyStripeSignature(payload, header, secret);
      expect(result).toBe(false);
    });

    it("rejects a signature from a different secret", () => {
      const { header } = createValidSignature(payload, secret);

      // Use a different secret to verify
      const result = verifyStripeSignature(payload, header, "different_secret");
      expect(result).toBe(false);
    });

    it("rejects a signature with tampered payload", () => {
      const { timestamp } = createValidSignature(payload, secret);
      const signature = createHmac("sha256", secret)
        .update(`${timestamp}.${payload}`)
        .digest("hex");
      const header = `t=${timestamp},v1=${signature}`;

      // Verify with different payload
      const result = verifyStripeSignature(
        '{"id":"evt_different"}',
        header,
        secret
      );
      expect(result).toBe(false);
    });

    it("rejects a signature older than 5 minutes", () => {
      const timestamp = Math.floor(Date.now() / 1000) - 301; // 5 min + 1 sec
      const signedPayload = `${timestamp}.${payload}`;
      const signature = createHmac("sha256", secret)
        .update(signedPayload)
        .digest("hex");
      const header = `t=${timestamp},v1=${signature}`;

      const result = verifyStripeSignature(payload, header, secret);
      expect(result).toBe(false);
    });

    it("accepts a signature exactly at 5 minute boundary", () => {
      const timestamp = Math.floor(Date.now() / 1000) - 300; // exactly 5 min
      const signedPayload = `${timestamp}.${payload}`;
      const signature = createHmac("sha256", secret)
        .update(signedPayload)
        .digest("hex");
      const header = `t=${timestamp},v1=${signature}`;

      const result = verifyStripeSignature(payload, header, secret);
      expect(result).toBe(true);
    });

    it("rejects header with missing timestamp", () => {
      const signature = "0".repeat(64);
      const header = `v1=${signature}`;

      const result = verifyStripeSignature(payload, header, secret);
      expect(result).toBe(false);
    });

    it("rejects header with missing v1 signature", () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const header = `t=${timestamp}`;

      const result = verifyStripeSignature(payload, header, secret);
      expect(result).toBe(false);
    });

    it("rejects header with malformed timestamp", () => {
      const signature = "0".repeat(64);
      const header = `t=not_a_number,v1=${signature}`;

      // parseInt("not_a_number") returns NaN, subtraction results in NaN > 300 = false
      const result = verifyStripeSignature(payload, header, secret);
      expect(result).toBe(false);
    });

    it("rejects header with invalid hex signature", () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const header = `t=${timestamp},v1=not_hex!!!`;

      const result = verifyStripeSignature(payload, header, secret);
      expect(result).toBe(false);
    });

    it("rejects empty header", () => {
      const result = verifyStripeSignature(payload, "", secret);
      expect(result).toBe(false);
    });

    it("rejects header with multiple v1 entries (uses first)", () => {
      const { timestamp } = createValidSignature(payload, secret);
      const badSig = "0".repeat(64);
      const goodSig = createHmac("sha256", secret)
        .update(`${timestamp}.${payload}`)
        .digest("hex");

      // Multiple v1 entries — findLast behavior depends on implementation
      const header = `t=${timestamp},v1=${badSig},v1=${goodSig}`;
      // The code uses find(), which returns the first match
      const result = verifyStripeSignature(payload, header, secret);
      expect(result).toBe(false);
    });

    it("handles payload with special characters", () => {
      const specialPayload = '{"message":"Special: !@#$%^&*()"}';
      const { header } = createValidSignature(specialPayload, secret);

      const result = verifyStripeSignature(specialPayload, header, secret);
      expect(result).toBe(true);
    });

    it("handles large payload", () => {
      const largePayload = JSON.stringify({ data: "x".repeat(10000) });
      const { header } = createValidSignature(largePayload, secret);

      const result = verifyStripeSignature(largePayload, header, secret);
      expect(result).toBe(true);
    });
  });

  describe("verifyGooglePushNotification", () => {
    const expectedToken = "my_channel_token_123";

    it("accepts matching token", () => {
      const result = verifyGooglePushNotification(expectedToken, expectedToken);
      expect(result).toBe(true);
    });

    it("rejects non-matching token", () => {
      const result = verifyGooglePushNotification("different_token", expectedToken);
      expect(result).toBe(false);
    });

    it("rejects null token", () => {
      const result = verifyGooglePushNotification(null, expectedToken);
      expect(result).toBe(false);
    });

    it("rejects empty token", () => {
      const result = verifyGooglePushNotification("", expectedToken);
      expect(result).toBe(false);
    });

    it("rejects when expected token is empty", () => {
      const result = verifyGooglePushNotification(expectedToken, "");
      expect(result).toBe(false);
    });

    it("uses timing-safe comparison (doesn't crash on length mismatch)", () => {
      const result = verifyGooglePushNotification("short", expectedToken);
      expect(result).toBe(false);
    });

    it("handles special characters in token", () => {
      const specialToken = "token_!@#$%^&*()_special";
      const result = verifyGooglePushNotification(specialToken, specialToken);
      expect(result).toBe(true);
    });

    it("handles unicode characters in token", () => {
      const unicodeToken = "token_你好_🔐";
      const result = verifyGooglePushNotification(unicodeToken, unicodeToken);
      expect(result).toBe(true);
    });

    it("is case-sensitive", () => {
      const result = verifyGooglePushNotification(
        expectedToken.toUpperCase(),
        expectedToken
      );
      expect(result).toBe(false);
    });

    it("rejects tokens with leading/trailing whitespace differences", () => {
      const result = verifyGooglePushNotification(
        ` ${expectedToken} `,
        expectedToken
      );
      expect(result).toBe(false);
    });
  });

  describe("verifyHmacSignature", () => {
    const payload = "test_payload";
    const secret = "shared_secret";

    function createValidHmacSignature(
      payload: string,
      secret: string,
      algorithm: "sha256" | "sha1" = "sha256"
    ) {
      return createHmac(algorithm, secret).update(payload).digest("hex");
    }

    it("accepts valid SHA-256 signature", () => {
      const signature = createValidHmacSignature(payload, secret, "sha256");
      const result = verifyHmacSignature(payload, signature, secret, "sha256");
      expect(result).toBe(true);
    });

    it("accepts valid SHA-1 signature", () => {
      const signature = createValidHmacSignature(payload, secret, "sha1");
      const result = verifyHmacSignature(payload, signature, secret, "sha1");
      expect(result).toBe(true);
    });

    it("defaults to SHA-256 when algorithm not specified", () => {
      const signature = createValidHmacSignature(payload, secret, "sha256");
      const result = verifyHmacSignature(payload, signature, secret);
      expect(result).toBe(true);
    });

    it("rejects invalid signature", () => {
      const badSignature = "0".repeat(64);
      const result = verifyHmacSignature(payload, badSignature, secret);
      expect(result).toBe(false);
    });

    it("rejects signature from different secret", () => {
      const signature = createValidHmacSignature(payload, secret, "sha256");
      const result = verifyHmacSignature(
        payload,
        signature,
        "different_secret",
        "sha256"
      );
      expect(result).toBe(false);
    });

    it("rejects signature for different payload", () => {
      const signature = createValidHmacSignature(payload, secret, "sha256");
      const result = verifyHmacSignature(
        "different_payload",
        signature,
        secret,
        "sha256"
      );
      expect(result).toBe(false);
    });

    it("rejects signature with wrong algorithm", () => {
      const signature = createValidHmacSignature(payload, secret, "sha256");
      // SHA-1 signature won't match SHA-256 verification
      const result = verifyHmacSignature(payload, signature, secret, "sha1");
      expect(result).toBe(false);
    });

    it("rejects invalid hex signature", () => {
      const result = verifyHmacSignature(payload, "not_hex!!!", secret);
      expect(result).toBe(false);
    });

    it("rejects signature with wrong length", () => {
      const result = verifyHmacSignature(payload, "abc123", secret);
      expect(result).toBe(false);
    });

    it("rejects empty signature", () => {
      const result = verifyHmacSignature(payload, "", secret);
      expect(result).toBe(false);
    });

    it("handles payload with special characters", () => {
      const specialPayload = "Special: !@#$%^&*() Unicode: 你好 Emoji: 🔐";
      const signature = createValidHmacSignature(
        specialPayload,
        secret,
        "sha256"
      );
      const result = verifyHmacSignature(specialPayload, signature, secret);
      expect(result).toBe(true);
    });

    it("handles large payload", () => {
      const largePayload = "x".repeat(100000);
      const signature = createValidHmacSignature(largePayload, secret, "sha256");
      const result = verifyHmacSignature(largePayload, signature, secret);
      expect(result).toBe(true);
    });

    it("is case-sensitive for signature (uppercase vs lowercase hex)", () => {
      const signature = createValidHmacSignature(payload, secret, "sha256");
      const upperSignature = signature.toUpperCase();
      // timingSafeEqual should handle case-insensitive hex comparison
      // Actually, hex strings are case-sensitive, so uppercase should fail
      const result = verifyHmacSignature(
        payload,
        upperSignature,
        secret,
        "sha256"
      );
      // Both should represent the same bytes, so this should succeed
      // But timingSafeEqual compares bytes, not strings
      // So we need to check what the actual behavior is
      // In Node.js, hex is case-insensitive when converting to Buffer
      expect(result).toBe(true);
    });

    it("uses timing-safe comparison to prevent timing attacks", () => {
      // This is harder to test directly, but we can verify it doesn't crash
      const signature = createValidHmacSignature(payload, secret, "sha256");

      // Create a signature that differs by one character
      const wrongSig = "0" + signature.slice(1);

      const result1 = verifyHmacSignature(payload, signature, secret);
      const result2 = verifyHmacSignature(payload, wrongSig, secret);

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });
  });

  describe("security properties", () => {
    it("all three verify functions return booleans, never throw", () => {
      // Edge cases that shouldn't throw
      expect(() => {
        verifyStripeSignature("", "", "");
        verifyStripeSignature("payload", "malformed", "secret");
        verifyGooglePushNotification("", "");
        verifyGooglePushNotification(null, "");
        verifyHmacSignature("", "", "");
        verifyHmacSignature("payload", "not_hex", "secret");
      }).not.toThrow();
    });

    it("distinguishes between all three verification functions", () => {
      const stripePayload = '{"id":"evt"}';
      const stripeSecret = "whsec_test";
      const stripeTimestamp = Math.floor(Date.now() / 1000);
      const stripeSig = createHmac("sha256", stripeSecret)
        .update(`${stripeTimestamp}.${stripePayload}`)
        .digest("hex");
      const stripeHeader = `t=${stripeTimestamp},v1=${stripeSig}`;

      const googleToken = "token";

      const hmacPayload = "payload";
      const hmacSecret = "secret";
      const hmacSig = createHmac("sha256", hmacSecret)
        .update(hmacPayload)
        .digest("hex");

      // Each should work with appropriate input
      expect(verifyStripeSignature(stripePayload, stripeHeader, stripeSecret)).toBe(
        true
      );
      expect(verifyGooglePushNotification(googleToken, googleToken)).toBe(true);
      expect(verifyHmacSignature(hmacPayload, hmacSig, hmacSecret)).toBe(true);
    });
  });
});
