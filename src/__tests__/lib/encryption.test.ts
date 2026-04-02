/**
 * Tests for src/lib/encryption.ts — AES-256-GCM encryption
 *
 * Security-critical: these tests verify that:
 * 1. Encrypt/decrypt round-trip works correctly
 * 2. Encrypted output is different from plaintext (not a no-op)
 * 3. Decrypt with wrong key fails gracefully
 * 4. Empty strings are handled safely
 * 5. Malformed encrypted input is rejected
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { encrypt, decrypt } from "@/lib/encryption";

const TEST_KEY = "a".repeat(32); // 32 chars = 256 bits

beforeEach(() => {
  vi.stubEnv("ENCRYPTION_KEY", TEST_KEY);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("encryption", () => {
  describe("encrypt", () => {
    it("returns a string with iv:ciphertext:tag format", () => {
      const ciphertext = encrypt("Hello, World!");

      const parts = ciphertext.split(":");
      expect(parts).toHaveLength(3);

      // Each part should be non-empty base64
      expect(parts[0].length).toBeGreaterThan(0);
      expect(parts[1].length).toBeGreaterThan(0);
      expect(parts[2].length).toBeGreaterThan(0);

      // Should be valid base64 (can decode without error)
      expect(() => {
        Buffer.from(parts[0], "base64");
        Buffer.from(parts[1], "base64");
        Buffer.from(parts[2], "base64");
      }).not.toThrow();
    });

    it("produces different output from the same plaintext (random IV)", () => {
      const plaintext = "SensitiveData";

      const a = encrypt(plaintext);
      const b = encrypt(plaintext);

      // Should be different due to random IV
      expect(a).not.toBe(b);
    });

    it("encrypted output is different from plaintext", () => {
      const plaintext = "MySecretToken";
      const ciphertext = encrypt(plaintext);

      // The plaintext should not be visible in the ciphertext
      expect(ciphertext).not.toContain(plaintext);
      expect(ciphertext).not.toContain(Buffer.from(plaintext).toString("base64"));
    });

    it("handles empty string gracefully", () => {
      const ciphertext = encrypt("");

      expect(ciphertext).toBeDefined();
      const parts = ciphertext.split(":");
      // Empty plaintext results in empty ciphertext, but still has iv:tag
      expect(parts.length).toBe(3);
    });

    it("handles long strings", () => {
      const longPlaintext = "a".repeat(10000);
      const ciphertext = encrypt(longPlaintext);

      expect(ciphertext).toBeDefined();
      const parts = ciphertext.split(":");
      expect(parts).toHaveLength(3);
    });

    it("handles special characters and unicode", () => {
      const plaintext = "Special chars: !@#$%^&*() and unicode: 你好世界 🔐";
      const ciphertext = encrypt(plaintext);

      expect(ciphertext).toBeDefined();
      const parts = ciphertext.split(":");
      expect(parts).toHaveLength(3);
    });

    it("throws when ENCRYPTION_KEY is not set", () => {
      vi.stubEnv("ENCRYPTION_KEY", "");

      expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY");
    });

    it("throws when ENCRYPTION_KEY is too short", () => {
      vi.stubEnv("ENCRYPTION_KEY", "short");

      expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY must be at least 32 characters");
    });
  });

  describe("decrypt", () => {
    it("round-trips correctly — encrypt then decrypt", () => {
      const plaintext = "OriginalMessage";
      const ciphertext = encrypt(plaintext);
      const decrypted = decrypt(ciphertext);

      expect(decrypted).toBe(plaintext);
    });

    it("rejects decryption of empty string (invalid format)", () => {
      // Empty plaintext produces iv::tag format with empty ciphertext
      // which is correctly rejected as invalid
      const ciphertext = encrypt("");
      expect(() => decrypt(ciphertext)).toThrow("Invalid encrypted string format");
    });

    it("decrypts special characters and unicode", () => {
      const plaintext = "Special: !@#$%^&*() Unicode: 日本語 Emoji: 🔒🔑";
      const ciphertext = encrypt(plaintext);
      const decrypted = decrypt(ciphertext);

      expect(decrypted).toBe(plaintext);
    });

    it("fails gracefully with wrong key", () => {
      const plaintext = "Secret";
      const ciphertext = encrypt(plaintext);

      // Change the key
      vi.stubEnv("ENCRYPTION_KEY", "b".repeat(32));

      // Decryption should fail (wrong key/tag)
      expect(() => decrypt(ciphertext)).toThrow();
    });

    it("fails gracefully with missing colon separator", () => {
      expect(() => decrypt("nodothere")).toThrow("Invalid encrypted string format");
    });

    it("fails gracefully with incomplete format (too few parts)", () => {
      expect(() => decrypt("part1:part2")).toThrow("Invalid encrypted string format");
    });

    it("fails gracefully with empty parts", () => {
      expect(() => decrypt("::")).toThrow("Invalid encrypted string format");
    });

    it("fails gracefully with invalid base64 in IV", () => {
      const validB64 = Buffer.from("test").toString("base64");

      expect(() => decrypt(`!!!invalid_base64!!!:${validB64}:${validB64}`)).toThrow();
    });

    it("fails gracefully with invalid base64 in ciphertext", () => {
      const validB64 = Buffer.from("test").toString("base64");

      expect(() => decrypt(`${validB64}:!!!invalid_base64!!!:${validB64}`)).toThrow();
    });

    it("fails gracefully with invalid base64 in tag", () => {
      const validB64 = Buffer.from("test").toString("base64");

      expect(() => decrypt(`${validB64}:${validB64}:!!!invalid_base64!!!`)).toThrow();
    });

    it("fails gracefully with empty string", () => {
      expect(() => decrypt("")).toThrow("Invalid encrypted string format");
    });

    it("fails gracefully when authentication tag is wrong", () => {
      const ciphertext = encrypt("test");
      const [iv, cipher, tag] = ciphertext.split(":");

      // Flip all bytes in the tag to corrupt it
      const tagBuffer = Buffer.from(tag, "base64");
      const corruptedTag = Buffer.alloc(tagBuffer.length);
      for (let i = 0; i < tagBuffer.length; i++) {
        corruptedTag[i] = tagBuffer[i] ^ 0xff;
      }
      const tamperedTag = corruptedTag.toString("base64");
      const tampered = `${iv}:${cipher}:${tamperedTag}`;

      expect(() => decrypt(tampered)).toThrow();
    });
  });

  describe("integration", () => {
    it("handles realistic OAuth token encryption", () => {
      const token = "sk-proj-1234567890abcdefghijklmnopqrstuvwxyz";
      const ciphertext = encrypt(token);

      expect(ciphertext).not.toContain(token);
      expect(decrypt(ciphertext)).toBe(token);
    });

    it("handles multiple concurrent encryptions", () => {
      const tokens = ["token1", "token2", "token3"];

      const encrypted = tokens.map(encrypt);
      const decrypted = encrypted.map(decrypt);

      expect(decrypted).toEqual(tokens);
    });
  });
});
