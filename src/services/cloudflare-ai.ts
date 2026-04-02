/**
 * Cloudflare Workers AI Client
 *
 * Calls the hybrid AI endpoints on Cloudflare for commodity tasks.
 * Claude handles conversation, Cloudflare handles everything else.
 *
 * Architecture:
 *   LocalGenius UI → this client → Cloudflare AI Worker
 *                                        ↓
 *                                   Whisper (transcription)
 *                                   Llama 3.1 8B (drafts)
 *                                   DistilBERT (sentiment)
 *                                   SDXL (images)
 */

// ─── Configuration ─────────────────────────────────────────────────────────

function getCloudflareAIConfig() {
  const baseUrl =
    process.env.NEXT_PUBLIC_CLOUDFLARE_AI_URL ||
    "https://sites.localgenius.company";
  const apiToken = process.env.LOCALGENIUS_SITES_API_TOKEN;

  return { baseUrl, apiToken };
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface TranscriptionResponse {
  text: string;
  duration_ms: number;
}

interface DraftResponse {
  text: string;
}

interface SentimentResponse {
  label: "positive" | "negative";
  score: number;
}

interface SentimentBatchItem {
  text: string;
  label: string;
  score: number;
}

// ─── API Client ────────────────────────────────────────────────────────────

async function cloudflareAiCall<T>(
  path: string,
  options: { method?: string; body?: unknown; multipart?: boolean } = {}
): Promise<T> {
  const { baseUrl, apiToken } = getCloudflareAIConfig();

  if (!apiToken) {
    throw new Error("LOCALGENIUS_SITES_API_TOKEN is not configured");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiToken}`,
  };

  let body: BodyInit | undefined;

  if (options.multipart) {
    // For multipart requests (FormData), don't set Content-Type
    // the browser/fetch will set it with the boundary
    body = options.body as FormData;
  } else if (options.body) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers,
    body,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(
      `Cloudflare AI API error ${res.status}: ${
        (errBody as { error?: string }).error || res.statusText
      }`
    );
  }

  return res.json() as Promise<T>;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Transcribe audio using Whisper model.
 * Returns the transcribed text and duration in milliseconds.
 */
export async function transcribeAudio(
  audio: Blob
): Promise<{ text: string; duration_ms: number }> {
  const formData = new FormData();
  formData.append("audio", audio, "audio.webm");

  return cloudflareAiCall<TranscriptionResponse>("/api/voice/transcribe", {
    method: "POST",
    body: formData,
    multipart: true,
  });
}

/**
 * Generate a content draft using Llama 3.1 8B.
 * Examples:
 *   - type: "social_post", prompt: "Write a promotional post about our summer sale"
 *   - type: "email", prompt: "Welcome email for new customers", businessContext: { industry: "salon", tone: "warm" }
 *   - type: "landing_page", prompt: "Hero section copy for a local plumber"
 */
export async function generateDraft(
  type: string,
  prompt: string,
  businessContext?: object
): Promise<{ text: string }> {
  return cloudflareAiCall<DraftResponse>("/api/content/draft", {
    method: "POST",
    body: {
      type,
      prompt,
      context: businessContext,
    },
  });
}

/**
 * Analyze sentiment of a single text using DistilBERT.
 * Returns label ("positive" or "negative") and confidence score (0-1).
 */
export async function analyzeSentiment(
  text: string
): Promise<{ label: "positive" | "negative"; score: number }> {
  return cloudflareAiCall<SentimentResponse>("/api/sentiment/analyze", {
    method: "POST",
    body: { text },
  });
}

/**
 * Analyze sentiment of multiple texts in batch.
 * More efficient than calling analyzeSentiment multiple times.
 * Returns array of { text, label, score } objects.
 */
export async function analyzeSentimentBatch(
  texts: string[]
): Promise<Array<{ text: string; label: string; score: number }>> {
  return cloudflareAiCall<SentimentBatchItem[]>(
    "/api/sentiment/analyze-batch",
    {
      method: "POST",
      body: { texts },
    }
  );
}

/**
 * Generate an image using SDXL model.
 * Returns base64-encoded PNG image.
 */
export async function generateImage(prompt: string): Promise<string> {
  interface ImageResponse {
    image: string; // base64
  }

  const response = await cloudflareAiCall<ImageResponse>(
    "/api/image/generate",
    {
      method: "POST",
      body: { prompt },
    }
  );

  return response.image;
}
