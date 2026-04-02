/**
 * Tests for src/lib/oauth-state.ts — HMAC-SHA256 OAuth state signing
 *
 * Security-critical: these tests verify that:
 * 1. Signed state round-trips correctly
 * 2. Tampered state is rejected
 * 3. Forged state (different secret) is rejected
 * 4. Malformed input is handled safely
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Set JWT_SECRET before importing the module
const TEST_SECRET = "a".repeat(32) + "b".repeat(32);

beforeEach(() => {
  vi.stubEnv("JWT_SECRET", TEST_SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// Dynamic import so env is set before module loads
async function getModule() {
  // Clear module cache to pick up fresh env
  const mod = await import("@/lib/oauth-state");
  return mod;
}

describe("oauth-state", () => {
  const validState = {
    businessId: "biz-uuid-001",
    organizationId: "org-uuid-001",
  };

  describe("signState", () => {
    it("returns a string with payload.signature format", async () => {
      const { signState } = await getModule();
      const signed = signState(validState);

      expect(signed).toContain(".");
      const parts = signed.split(".");
      expect(parts).toHaveLength(2);
      expect(parts[0].length).toBeGreaterThan(0);
      expect(parts[1].length).toBe(64); // SHA-256 hex = 64 chars
    });

    it("produces deterministic output for same input", async () => {
      const { signState } = await getModule();
      const a = signState(validState);
      const b = signState(validState);
      expect(a).toBe(b);
    });

    it("produces different output for different input", async () => {
      const { signState } = await getModule();
      const a = signState(validState);
      const b = signState({ businessId: "biz-uuid-002", organizationId: "org-uuid-002" });
      expect(a).not.toBe(b);
    });

    it("throws when JWT_SECRET is not set", async () => {
      vi.stubEnv("JWT_SECRET", "");
      // Need fresh import to pick up empty secret
      const { signState } = await getModule();
      // getSecret checks process.env directly so empty string is falsy
      expect(() => signState(validState)).toThrow("JWT_SECRET");
    });
  });

  describe("verifyState", () => {
    it("round-trips correctly — sign then verify", async () => {
      const { signState, verifyState } = await getModule();
      const signed = signState(validState);
      const result = verifyState(signed);

      expect(result).not.toBeNull();
      expect(result!.businessId).toBe(validState.businessId);
      expect(result!.organizationId).toBe(validState.organizationId);
    });

    it("rejects tampered payload", async () => {
      const { signState, verifyState } = await getModule();
      const signed = signState(validState);
      const [payload, sig] = signed.split(".");

      // Flip a character in the payload
      const tampered = payload.slice(0, -1) + (payload.slice(-1) === "A" ? "B" : "A");
      const result = verifyState(`${tampered}.${sig}`);
      expect(result).toBeNull();
    });

    it("rejects tampered signature", async () => {
      const { signState, verifyState } = await getModule();
      const signed = signState(validState);
      const [payload] = signed.split(".");

      // Replace signature with a fake one
      const fakeSig = "0".repeat(64);
      const result = verifyState(`${payload}.${fakeSig}`);
      expect(result).toBeNull();
    });

    it("rejects state signed with a different secret", async () => {
      const { signState } = await getModule();
      const signed = signState(validState);

      // Change the secret
      vi.stubEnv("JWT_SECRET", "c".repeat(64));
      const { verifyState } = await getModule();
      const result = verifyState(signed);
      expect(result).toBeNull();
    });

    it("rejects string with no dot separator", async () => {
      const { verifyState } = await getModule();
      expect(verifyState("nodothere")).toBeNull();
    });

    it("rejects empty string", async () => {
      const { verifyState } = await getModule();
      expect(verifyState("")).toBeNull();
    });

    it("rejects state with valid signature but invalid JSON payload", async () => {
      const { verifyState } = await getModule();
      // Create a signed state with garbage payload
      const { createHmac } = await import("crypto");
      const garbagePayload = Buffer.from("not-json").toString("base64url");
      const sig = createHmac("sha256", TEST_SECRET).update(garbagePayload).digest("hex");
      const result = verifyState(`${garbagePayload}.${sig}`);
      // Should return the parsed object or null if not valid JSON
      // "not-json" is a valid string in JSON terms when base64-decoded, but it's not an object
      // The function will return it as-is since JSON.parse succeeds for strings
      // Actually "not-json" is not valid JSON, so it should return null
      expect(result).toBeNull();
    });

    it("rejects signature with wrong length", async () => {
      const { signState, verifyState } = await getModule();
      const signed = signState(validState);
      const [payload] = signed.split(".");

      // Signature too short
      const result = verifyState(`${payload}.abcdef`);
      expect(result).toBeNull();
    });
  });
});
