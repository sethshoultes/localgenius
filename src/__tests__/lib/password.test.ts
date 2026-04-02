/**
 * Tests for src/lib/password.ts — PBKDF2 password hashing
 *
 * Security-critical: verifies:
 * 1. Hash/verify round-trip works
 * 2. Wrong password is rejected
 * 3. Different salts produce different hashes
 * 4. Timing-safe comparison is used (malformed input doesn't crash)
 */

import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password", () => {
  describe("hashPassword", () => {
    it("returns salt:hash format", async () => {
      const hash = await hashPassword("TestPassword123!");
      expect(hash).toContain(":");
      const [salt, hashPart] = hash.split(":");
      expect(salt).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(hashPart).toHaveLength(128); // 64 bytes = 128 hex chars
    });

    it("produces different hashes for the same password (random salt)", async () => {
      const a = await hashPassword("SamePassword");
      const b = await hashPassword("SamePassword");
      expect(a).not.toBe(b);
    });
  });

  describe("verifyPassword", () => {
    it("returns true for correct password", async () => {
      const hash = await hashPassword("CorrectHorse");
      const result = await verifyPassword("CorrectHorse", hash);
      expect(result).toBe(true);
    });

    it("returns false for wrong password", async () => {
      const hash = await hashPassword("CorrectHorse");
      const result = await verifyPassword("WrongHorse", hash);
      expect(result).toBe(false);
    });

    it("returns false for empty password against a real hash", async () => {
      const hash = await hashPassword("RealPassword");
      const result = await verifyPassword("", hash);
      expect(result).toBe(false);
    });

    it("returns false for malformed stored hash (no colon)", async () => {
      const result = await verifyPassword("anything", "nocolonhere");
      expect(result).toBe(false);
    });

    it("returns false for malformed stored hash (empty parts)", async () => {
      const result = await verifyPassword("anything", ":");
      expect(result).toBe(false);
    });

    it("returns false for stored hash with wrong length", async () => {
      const result = await verifyPassword("anything", "abcd:efgh");
      expect(result).toBe(false);
    });
  });
});
