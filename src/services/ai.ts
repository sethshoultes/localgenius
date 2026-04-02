/**
 * AI Service — Anthropic Claude wrapper
 * Spec: engineering/tech-stack.md Section 4
 *
 * Sonnet 4.6 for interactive generation, Haiku 4.5 for batch.
 */

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are LocalGenius, an AI marketing assistant for local businesses. You speak like a capable, warm colleague — not a chatbot. You are the employee they always needed but could never afford.

Rules:
- Never say "AI-powered", "platform", "solution", or "streamline"
- Use the business owner's name when you know it
- Keep responses concise — the owner is busy
- When proposing actions (social posts, review responses), present them as drafts for approval
- For social posts, write in the business's voice, not yours
- Always include specific numbers when reporting results
- Tone: warm, confident, competent. Not cute, not corporate.`;

export type AIModel = "claude-sonnet-4-6-20250514" | "claude-haiku-4-5-20251001";

interface GenerateOptions {
  prompt: string;
  systemPrompt?: string;
  model?: AIModel;
  maxTokens?: number;
  businessContext?: Record<string, unknown>;
}

export async function generate(options: GenerateOptions): Promise<string> {
  const {
    prompt,
    systemPrompt = SYSTEM_PROMPT,
    model = "claude-sonnet-4-6-20250514",
    maxTokens = 1024,
    businessContext,
  } = options;

  const contextBlock = businessContext
    ? `\n\nBusiness context:\n${JSON.stringify(businessContext, null, 2)}`
    : "";

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt + contextBlock,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock ? textBlock.text : "";
}

export async function* stream(options: GenerateOptions) {
  const {
    prompt,
    systemPrompt = SYSTEM_PROMPT,
    model = "claude-sonnet-4-6-20250514",
    maxTokens = 1024,
    businessContext,
  } = options;

  const contextBlock = businessContext
    ? `\n\nBusiness context:\n${JSON.stringify(businessContext, null, 2)}`
    : "";

  const messageStream = anthropic.messages.stream({
    model,
    max_tokens: maxTokens,
    system: systemPrompt + contextBlock,
    messages: [{ role: "user", content: prompt }],
  });

  for await (const event of messageStream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}

export async function generateSocialPost(
  business: { name: string; vertical: string; city: string },
  topic: string
): Promise<string> {
  return generate({
    prompt: `Write a social media post for ${business.name}, a ${business.vertical} in ${business.city}. Topic: ${topic}. Write in their voice — warm, local, authentic. Include 3-5 relevant hashtags. Keep it under 280 characters for the main text.`,
    maxTokens: 512,
  });
}

export async function generateReviewResponse(
  business: { name: string },
  review: { reviewerName: string | null; rating: number; reviewText: string | null }
): Promise<string> {
  return generate({
    prompt: `Draft a response to this review for ${business.name}:
Rating: ${review.rating}/5
Reviewer: ${review.reviewerName || "Anonymous"}
Review: "${review.reviewText || "(no text)"}"

Guidelines:
- Thank them by name if available
- For positive reviews (4-5 stars): brief, grateful, personal
- For negative reviews (1-3 stars): empathetic, acknowledge the issue, offer to make it right
- Never be defensive
- Keep it under 150 words`,
    maxTokens: 256,
  });
}

export async function generateDigestNarrative(
  business: { name: string },
  metrics: Record<string, unknown>
): Promise<string> {
  return generate({
    prompt: `Generate a Weekly Digest for ${business.name}. Structure it in three acts:

Act 1 — "Here's what happened" (what the world did): Summarize the metrics in plain language. Never a number without context.
Act 2 — "Here's what I did" (what LocalGenius did): List actions taken this week.
Act 3 — "Here's what I recommend" (what to do next): One specific, actionable recommendation.

Metrics this week: ${JSON.stringify(metrics)}

Tone: warm, conversational, slightly proud of their business. Keep the entire digest under 200 words.`,
    model: "claude-haiku-4-5-20251001",
    maxTokens: 512,
  });
}
