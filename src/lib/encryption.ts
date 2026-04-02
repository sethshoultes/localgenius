/**
 * Token encryption for OAuth credentials at rest.
 * Uses AES-256-GCM via Node.js crypto module.
 *
 * Tokens stored in business_settings.access_token / refresh_token
 * are encrypted before write and decrypted on read.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error("ENCRYPTION_KEY must be at least 32 characters");
  }
  return Buffer.from(key.slice(0, 32), "utf-8");
}

/**
 * Encrypt a plaintext string. Returns base64-encoded `iv:ciphertext:tag`.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${encrypted}:${tag.toString("base64")}`;
}

/**
 * Decrypt a string produced by encrypt(). Returns plaintext.
 */
export function decrypt(encryptedStr: string): string {
  const [ivB64, ciphertextB64, tagB64] = encryptedStr.split(":");
  if (!ivB64 || !ciphertextB64 || !tagB64) {
    throw new Error("Invalid encrypted string format");
  }

  const key = getKey();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertextB64, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
