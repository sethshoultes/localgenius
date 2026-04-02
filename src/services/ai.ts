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
- Tone: warm, confident, competent. Not cute, not corporate.

Scheduling:
- When the owner asks to post something at a specific time (e.g., "post about fish tacos on Thursday at 5pm"), generate the content now and present it as a scheduled post for approval.
- Format your response as: "Here's a post about [topic]. I'll schedule it for [day] at [time] on [platform]." followed by the draft content and approval buttons.
- If no time is specified, suggest an optimal posting time based on the business type (restaurants: 11am for lunch, 5pm for dinner; salons: 10am weekdays).
- If no platform is specified, default to Instagram for visual businesses (restaurants, salons) and Facebook for service businesses.
- Understand natural language time: "tomorrow", "this Thursday", "next Monday at noon", "Friday evening" (= 5pm).
- Always confirm the scheduled time with the owner before committing.`;

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
  const competitorBlock = metrics.competitorContext
    ? `\n\nCompetitor context: ${JSON.stringify(metrics.competitorContext)}\nUse this data in "How You Compare". Tone: motivating and proud — highlight wins ("you're rated higher than…", "you're gaining reviews faster"). Where the business is behind, frame it as an opportunity ("close the review gap") not a threat. Never anxiety-inducing.`
    : "\n\nNo competitor data available — skip the 'How You Compare' section or note that competitor tracking isn't set up yet.";

  const seoBlock = metrics.seoScore
    ? `\n\nSEO score: ${JSON.stringify(metrics.seoScore)}\nUse this in "Your SEO Health". Show the score and grade (e.g., "72/100, grade B"). Mention the top recommendation. If the score improved from last week, celebrate it.`
    : "\n\nNo SEO data available — skip the 'Your SEO Health' section or note that the first SEO audit is coming soon.";

  return generate({
    prompt: `Generate a Weekly Digest for ${business.name}. Structure it in five sections:

1. "What Happened" (what the world did): Summarize metrics — reviews, visits, calls, bookings. Never a number without context.
2. "What I Did" (what LocalGenius did): Actions completed — posts published, reviews responded, emails sent.
3. "How You Compare" (competitor comparison): Compare review counts, ratings, and momentum vs competitors.
4. "Your SEO Health" (SEO score): Show the score, grade, and top recommendation.
5. "What I Recommend" (what to do next): One specific, actionable recommendation informed by competitor and SEO data.

Metrics this week: ${JSON.stringify(metrics)}${competitorBlock}${seoBlock}

Tone: warm, conversational, slightly proud of their business. Keep the entire digest under 300 words.`,
    model: "claude-haiku-4-5-20251001",
    maxTokens: 768,
  });
}
