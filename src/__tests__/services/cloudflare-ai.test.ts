/**
 * Tests for src/services/cloudflare-ai.ts — Cloudflare Workers AI Client
 *
 * Tests the hybrid AI client that calls Whisper, Llama, DistilBERT, SDXL
 * endpoints on Cloudflare Workers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock fetch ─────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("LOCALGENIUS_SITES_API_TOKEN", "test-cf-token");
  vi.stubEnv("NEXT_PUBLIC_CLOUDFLARE_AI_URL", "https://cf-ai.test");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ─── transcribeAudio ────────────────────────────────────────────────────────

describe("transcribeAudio", () => {
  it("sends audio blob and returns transcription", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ text: "Update my hours to 9-5", duration_ms: 1200 }),
    });

    const { transcribeAudio } = await import("@/services/cloudflare-ai");
    const blob = new Blob(["fake audio"], { type: "audio/webm" });
    const result = await transcribeAudio(blob);

    expect(result.text).toBe("Update my hours to 9-5");
    expect(result.duration_ms).toBe(1200);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://cf-ai.test/api/voice/transcribe",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("throws when API token not configured", async () => {
    vi.stubEnv("LOCALGENIUS_SITES_API_TOKEN", "");

    const { transcribeAudio } = await import("@/services/cloudflare-ai");
    const blob = new Blob(["audio"], { type: "audio/webm" });
    await expect(transcribeAudio(blob)).rejects.toThrow("not configured");
  });

  it("throws on API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({ error: "Whisper model overloaded" }),
    });

    const { transcribeAudio } = await import("@/services/cloudflare-ai");
    const blob = new Blob(["audio"], { type: "audio/webm" });
    await expect(transcribeAudio(blob)).rejects.toThrow("Whisper model overloaded");
  });
});

// ─── generateDraft ──────────────────────────────────────────────────────────

describe("generateDraft", () => {
  it("generates content draft with business context", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ text: "Summer specials are here! 🌮" }),
    });

    const { generateDraft } = await import("@/services/cloudflare-ai");
    const result = await generateDraft("social_post", "Write a summer promo", { industry: "restaurant" });

    expect(result.text).toContain("Summer specials");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://cf-ai.test/api/content/draft",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("social_post"),
      })
    );
  });

  it("works without business context", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ text: "Draft content" }),
    });

    const { generateDraft } = await import("@/services/cloudflare-ai");
    const result = await generateDraft("email", "Welcome email");
    expect(result.text).toBe("Draft content");
  });
});

// ─── analyzeSentiment ───────────────────────────────────────────────────────

describe("analyzeSentiment", () => {
  it("classifies positive text", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ label: "positive", score: 0.95 }),
    });

    const { analyzeSentiment } = await import("@/services/cloudflare-ai");
    const result = await analyzeSentiment("The food was amazing!");

    expect(result.label).toBe("positive");
    expect(result.score).toBeGreaterThan(0.9);
  });

  it("classifies negative text", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ label: "negative", score: 0.87 }),
    });

    const { analyzeSentiment } = await import("@/services/cloudflare-ai");
    const result = await analyzeSentiment("Terrible service, never coming back");

    expect(result.label).toBe("negative");
    expect(result.score).toBeGreaterThan(0.8);
  });
});

// ─── analyzeSentimentBatch ──────────────────────────────────────────────────

describe("analyzeSentimentBatch", () => {
  it("classifies multiple texts in one call", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        { text: "Great!", label: "positive", score: 0.95 },
        { text: "Awful.", label: "negative", score: 0.88 },
      ]),
    });

    const { analyzeSentimentBatch } = await import("@/services/cloudflare-ai");
    const results = await analyzeSentimentBatch(["Great!", "Awful."]);

    expect(results).toHaveLength(2);
    expect(results[0].label).toBe("positive");
    expect(results[1].label).toBe("negative");
  });
});

// ─── generateImage ──────────────────────────────────────────────────────────

describe("generateImage", () => {
  it("returns base64 image from SDXL", async () => {
    const fakeBase64 = "iVBORw0KGgoAAAANS...fakeImageData";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ image: fakeBase64 }),
    });

    const { generateImage } = await import("@/services/cloudflare-ai");
    const result = await generateImage("A cozy restaurant interior");

    expect(result).toBe(fakeBase64);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://cf-ai.test/api/image/generate",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("cozy restaurant"),
      })
    );
  });

  it("throws on generation failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      json: () => Promise.resolve({ error: "SDXL queue full" }),
    });

    const { generateImage } = await import("@/services/cloudflare-ai");
    await expect(generateImage("test prompt")).rejects.toThrow("SDXL queue full");
  });
});

// ─── Configuration ──────────────────────────────────────────────────────────

describe("configuration", () => {
  it("uses default URL when NEXT_PUBLIC_CLOUDFLARE_AI_URL not set", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOUDFLARE_AI_URL", "");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ label: "positive", score: 0.9 }),
    });

    const { analyzeSentiment } = await import("@/services/cloudflare-ai");
    await analyzeSentiment("test");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("sites.localgenius.company"),
      expect.anything()
    );
  });

  it("includes Bearer token in all requests", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ text: "draft" }),
    });

    const { generateDraft } = await import("@/services/cloudflare-ai");
    await generateDraft("email", "test");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-cf-token",
        }),
      })
    );
  });
});
