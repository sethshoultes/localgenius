/**
 * Tests for src/services/ai.ts — Anthropic Claude wrapper
 *
 * The AI service is the core of LocalGenius. Every conversation,
 * social post, review response, and digest flows through this module.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Anthropic SDK ─────────────────────────────────────────────────────

const mockCreate = vi.fn();
const mockStream = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: mockCreate,
        stream: mockStream,
      },
    })),
  };
});

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
});

describe("generate", () => {
  it("calls Claude with correct parameters", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Generated response" }],
    });

    const { generate } = await import("@/services/ai");
    const result = await generate({ prompt: "Write a tagline" });

    expect(result).toBe("Generated response");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: "Write a tagline" }],
      })
    );
  });

  it("uses custom model when specified", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Haiku response" }],
    });

    const { generate } = await import("@/services/ai");
    await generate({
      prompt: "Quick summary",
      model: "claude-haiku-4-5-20251001",
      maxTokens: 256,
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
      })
    );
  });

  it("appends business context to system prompt", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Contextualized response" }],
    });

    const { generate } = await import("@/services/ai");
    await generate({
      prompt: "Help me",
      businessContext: { name: "Maria's Kitchen", city: "Austin" },
    });

    // System is now an array of blocks with prompt caching
    const call = mockCreate.mock.calls[0][0];
    expect(call.system).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "text", text: expect.stringContaining("Maria's Kitchen") }),
    ]));
  });

  it("uses custom system prompt when provided", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Custom response" }],
    });

    const { generate } = await import("@/services/ai");
    await generate({
      prompt: "test",
      systemPrompt: "You are a custom assistant.",
    });

    // System blocks include cache_control for prompt caching
    const call = mockCreate.mock.calls[0][0];
    expect(call.system[0]).toEqual(
      expect.objectContaining({
        type: "text",
        text: "You are a custom assistant.",
        cache_control: { type: "ephemeral" },
      })
    );
  });

  it("returns empty string when no text block in response", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "tool_use", id: "tool-1", name: "test", input: {} }],
    });

    const { generate } = await import("@/services/ai");
    const result = await generate({ prompt: "test" });
    expect(result).toBe("");
  });

  it("propagates API errors", async () => {
    mockCreate.mockRejectedValueOnce(new Error("API rate limit exceeded"));

    const { generate } = await import("@/services/ai");
    await expect(generate({ prompt: "test" })).rejects.toThrow("API rate limit exceeded");
  });
});

describe("generateSocialPost", () => {
  it("generates a social post with business context", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Fresh carnitas today! 🌮 #AustinEats #TexMex" }],
    });

    const { generateSocialPost } = await import("@/services/ai");
    const result = await generateSocialPost(
      { name: "Maria's Kitchen", vertical: "restaurant", city: "Austin" },
      "weekly specials"
    );

    expect(result).toContain("carnitas");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: expect.stringContaining("Maria's Kitchen"),
          },
        ],
      })
    );
  });
});

describe("generateReviewResponse", () => {
  it("generates response for positive review", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Thank you, Rosa! We're so glad you enjoyed the mole." }],
    });

    const { generateReviewResponse } = await import("@/services/ai");
    const result = await generateReviewResponse(
      { name: "Maria's Kitchen" },
      { reviewerName: "Rosa M.", rating: 5, reviewText: "Best mole in Austin!" }
    );

    expect(result).toContain("Rosa");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: expect.stringContaining("5/5"),
          },
        ],
      })
    );
  });

  it("handles anonymous reviewer", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Thank you for visiting!" }],
    });

    const { generateReviewResponse } = await import("@/services/ai");
    await generateReviewResponse(
      { name: "Maria's Kitchen" },
      { reviewerName: null, rating: 3, reviewText: null }
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          {
            role: "user",
            content: expect.stringContaining("Anonymous"),
          },
        ],
      })
    );
  });
});

describe("generateDigestNarrative", () => {
  it("generates a digest with competitor context", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Great week for Maria's Kitchen! 5 new reviews..." }],
    });

    const { generateDigestNarrative } = await import("@/services/ai");
    const result = await generateDigestNarrative(
      { name: "Maria's Kitchen" },
      {
        reviewsReceived: 5,
        averageRating: 4.6,
        competitorContext: { rivalRating: 4.2, rivalReviews: 80 },
        seoScore: { overall: 72, grade: "B" },
      }
    );

    expect(result).toContain("Maria's Kitchen");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 768,
        messages: [
          {
            role: "user",
            content: expect.stringContaining("How You Compare"),
          },
        ],
      })
    );
  });

  it("skips competitor section when no data", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Your weekly update..." }],
    });

    const { generateDigestNarrative } = await import("@/services/ai");
    await generateDigestNarrative(
      { name: "Test Biz" },
      { reviewsReceived: 0 }
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          {
            role: "user",
            content: expect.stringContaining("skip the 'How You Compare' section"),
          },
        ],
      })
    );
  });

  it("includes SEO score when available", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "SEO score: 85/100" }],
    });

    const { generateDigestNarrative } = await import("@/services/ai");
    await generateDigestNarrative(
      { name: "Test Biz" },
      { seoScore: { overall: 85, grade: "A" } }
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          {
            role: "user",
            content: expect.stringContaining("Your SEO Health"),
          },
        ],
      })
    );
  });
});
