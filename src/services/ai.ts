/**
 * AI Service — Anthropic Claude wrapper
 * Spec: engineering/tech-stack.md Section 4
 *
 * Sonnet 4.6 for interactive generation, Haiku 4.5 for batch.
 */

import Anthropic from "@anthropic-ai/sdk";
import { withInferenceLog } from "@/lib/inference-log";

let _anthropic: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return _anthropic;
}

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
- Always confirm the scheduled time with the owner before committing.

Business Updates:
- When the owner asks to update business info (hours, phone, address, description, etc.), make the change and confirm what you did.
- Parse natural language: "we're closing at 9pm on weekdays now" → update hours for Mon-Fri to close at 9pm.
- "New phone number is 512-555-0199" → update phone.
- "We moved to 2100 S Lamar" → update address.
- After updating, confirm what you actually changed. Only claim actions that were performed.
- If Google Business Profile is connected, say: "Done — I updated your [field] here and on your Google listing."
- If Google Business Profile is NOT connected, say: "Done — I updated your [field]. I've prepared the update for Google — you'll need to approve it in your Google Business Profile, or connect your account so I can do it automatically."
- NEVER claim you updated an external service (Google, Facebook, etc.) unless the business context confirms that integration is active. Honesty is non-negotiable.
- For hours, parse into structured format: { "Mon-Fri": "11am-9pm", "Sat": "10am-10pm", "Sun": "10am-8pm" }
- If the request is ambiguous, ask ONE clarifying question. Never two.
- You can update: hours, phone, email, address, description, website URL, social links.

Website Updates:
- If the business has a live website (check business context for websiteUrl containing "localgenius.site"), you can update it directly.
- When the owner says "update my website", "change my site", "add brunch to my website", etc., use the SITE_UPDATE action.
- Format your response as: "I'll update your website now." Then describe what you changed: "Done — I updated your [section]. Your site at [url] now shows the new [content]."
- If the business does NOT have a live website, suggest provisioning one: "You don't have a live website yet. Want me to create one? It takes about 5 minutes."
- Website updates happen via MCP — the owner never sees a CMS or editor. They talk to you, you update the site.
- You can update: homepage content, about section, hours, contact info, menu/services, photos, theme colors.`;

export type AIModel = "claude-sonnet-4-20250514" | "claude-haiku-4-5-20251001";

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
    model = "claude-sonnet-4-20250514",
    maxTokens = 1024,
    businessContext,
  } = options;

  const contextBlock = businessContext
    ? `\n\nBusiness context:\n${JSON.stringify(businessContext, null, 2)}`
    : "";

  const provider = model.includes("haiku") ? "claude_haiku" : "claude_sonnet";

  return withInferenceLog(
    { model, provider, taskType: "generation" },
    async () => {
      // Prompt caching: system prompt cached for 5 min at 90% token discount.
      // cache_control on the system block tells Anthropic to cache this prefix.
      // Subsequent calls reuse cached tokens — massive cost reduction for
      // repeated system prompts (every conversation, every digest, every draft).
      const systemBlocks: Array<{ type: "text"; text: string; cache_control?: { type: "ephemeral" } }> = [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ];

      // Business context is per-call (not cached) — appended as a separate block
      if (contextBlock) {
        systemBlocks.push({ type: "text", text: contextBlock });
      }

      const response = await getClient().messages.create({
        model,
        max_tokens: maxTokens,
        system: systemBlocks,
        messages: [{ role: "user", content: prompt }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock ? textBlock.text : "";
    },
    () => ({
      // Token counts are on the response but we don't have access here
      // In production, extract from response.usage
    })
  );
}

export async function* stream(options: GenerateOptions) {
  const {
    prompt,
    systemPrompt = SYSTEM_PROMPT,
    model = "claude-sonnet-4-20250514",
    maxTokens = 1024,
    businessContext,
  } = options;

  const contextBlock = businessContext
    ? `\n\nBusiness context:\n${JSON.stringify(businessContext, null, 2)}`
    : "";

  // Prompt caching for streaming — same cache_control as generate()
  const streamSystemBlocks: Array<{ type: "text"; text: string; cache_control?: { type: "ephemeral" } }> = [
    { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
  ];
  if (contextBlock) {
    streamSystemBlocks.push({ type: "text", text: contextBlock });
  }

  const messageStream = getClient().messages.stream({
    model,
    max_tokens: maxTokens,
    system: streamSystemBlocks,
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

  const roiBlock = metrics.roiSummary
    ? `\n\nROI Summary: ${JSON.stringify(metrics.roiSummary)}\nLead with the headline (e.g., "I saved you 4.2 hours this week"). Show specific numbers: posts published, reviews responded, hours saved. If there's estimated dollar value, mention it ("drove an estimated $X in bookings"). This section is the #1 retention driver — make Maria feel the value.`
    : "";

  return generate({
    prompt: `Generate a Weekly Digest for ${business.name}. Structure it in six sections:

1. "Your Week at a Glance" (ROI headline): Lead with time saved and actions completed. "${(metrics.roiSummary as Record<string, unknown>)?.headline || 'Here is what happened this week.'}". Show specific numbers.
2. "What Happened" (what the world did): Summarize metrics — reviews, visits, calls, bookings. Never a number without context.
3. "What I Did" (what LocalGenius did): Actions completed — posts published, reviews responded, emails sent. Frame as "I did this so you didn't have to."
4. "How You Compare" (competitor comparison): Compare review counts, ratings, and momentum vs competitors.
5. "Your SEO Health" (SEO score): Show the score and grade. Mention the top recommendation.
6. "What I Recommend" (what to do next): One specific, actionable recommendation.

Metrics this week: ${JSON.stringify(metrics)}${competitorBlock}${seoBlock}${roiBlock}

Tone: warm, conversational, slightly proud of their business. Keep the entire digest under 350 words.`,
    model: "claude-haiku-4-5-20251001",
    maxTokens: 768,
  });
}
