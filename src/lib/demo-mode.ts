/**
 * LocalGenius Demo Mode
 *
 * Intercepts all API calls when NEXT_PUBLIC_DEMO_MODE=true and returns
 * realistic mock responses so anyone can run the app without a database
 * or API keys.
 *
 * Usage at the page level:
 *   import { isDemoMode, demoApi } from '@/lib/demo-mode';
 *   const api = isDemoMode() ? demoApi : realApi;
 */

import type {
  AuthResponse,
  Message,
  Conversation,
  GeneratedContent,
  Review,
  DigestData,
  AnalyticsData,
  DiscoveryResult,
  RevealData,
  RegisterData,
} from './api';

import {
  DEMO_AUTH,
  DEMO_CONVERSATION_ID,
  DEMO_CONVERSATION,
  DEMO_MESSAGES,
  DEMO_REVIEWS,
  DEMO_DIGEST,
  DEMO_ANALYTICS,
  DEMO_DISCOVERY,
  DEMO_REVEAL,
  DEMO_GENERATED_CONTENT,
  STREAM_RESPONSE_LUNCH,
  STREAM_RESPONSE_GENERIC,
} from './demo-data';

// ============================================================
// Environment check
// ============================================================

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

// ============================================================
// Helpers
// ============================================================

/** Simulate network latency (50-150ms) */
function delay(ms?: number): Promise<void> {
  const t = ms ?? 50 + Math.random() * 100;
  return new Promise((resolve) => setTimeout(resolve, t));
}

/** Generate a unique-ish ID for new messages */
function uid(): string {
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================
// Auth mocks
// ============================================================

async function login(
  _email: string,
  _password: string,
): Promise<AuthResponse> {
  await delay();
  if (typeof window !== 'undefined') {
    localStorage.setItem('lg_token', DEMO_AUTH.token);
  }
  return { ...DEMO_AUTH };
}

async function register(_data: RegisterData): Promise<AuthResponse> {
  await delay();
  if (typeof window !== 'undefined') {
    localStorage.setItem('lg_token', DEMO_AUTH.token);
  }
  return { ...DEMO_AUTH };
}

function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('lg_token');
  }
}

// ============================================================
// Conversation mocks
// ============================================================

async function getConversation(_id: string): Promise<Conversation> {
  await delay();
  return {
    ...DEMO_CONVERSATION,
    messages: [...DEMO_MESSAGES],
  };
}

async function createConversation(): Promise<Conversation> {
  await delay();
  return {
    id: DEMO_CONVERSATION_ID,
    businessId: DEMO_CONVERSATION.businessId,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function sendMessage(
  conversationId: string,
  content: string,
): Promise<Message> {
  await delay(200);
  const isLunchRelated =
    /lunch|special|brisket|taco/i.test(content);

  const responseContent = isLunchRelated
    ? STREAM_RESPONSE_LUNCH
    : STREAM_RESPONSE_GENERIC;

  return {
    id: uid(),
    conversationId,
    role: 'assistant',
    content: responseContent,
    type: 'text',
    createdAt: new Date().toISOString(),
  };
}

// ============================================================
// Streaming mock
// ============================================================

function streamMessage(
  conversationId: string,
  content: string,
  onChunk: (chunk: string) => void,
  onComplete: (message: Message) => void,
  onError: (error: Error) => void,
): () => void {
  let cancelled = false;

  const isLunchRelated =
    /lunch|special|brisket|taco/i.test(content);

  const responseText = isLunchRelated
    ? STREAM_RESPONSE_LUNCH
    : STREAM_RESPONSE_GENERIC;

  const words = responseText.split(' ');

  (async () => {
    try {
      // Small initial delay to feel natural
      await delay(100);

      for (let i = 0; i < words.length; i++) {
        if (cancelled) return;

        const chunk = i === 0 ? words[i] : ' ' + words[i];
        onChunk(chunk);

        // 30ms delay between words
        await new Promise((resolve) => setTimeout(resolve, 30));
      }

      if (cancelled) return;

      onComplete({
        id: uid(),
        conversationId,
        role: 'assistant',
        content: responseText,
        type: 'text',
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      if (!cancelled) {
        onError(err as Error);
      }
    }
  })();

  return () => {
    cancelled = true;
  };
}

// ============================================================
// Content mocks
// ============================================================

async function generateContent(
  type: GeneratedContent['type'],
  _context: Record<string, string>,
): Promise<GeneratedContent> {
  await delay(300);
  return {
    ...DEMO_GENERATED_CONTENT,
    id: uid(),
    type,
  };
}

async function publishContent(
  contentId: string,
): Promise<GeneratedContent> {
  await delay(200);
  return {
    ...DEMO_GENERATED_CONTENT,
    id: contentId,
    status: 'published',
  };
}

// ============================================================
// Reviews mocks
// ============================================================

async function getReviews(): Promise<Review[]> {
  await delay();
  return [...DEMO_REVIEWS];
}

async function respondToReview(
  reviewId: string,
  response: string,
): Promise<Review> {
  await delay(200);
  const review = DEMO_REVIEWS.find((r) => r.id === reviewId);
  return {
    ...(review || DEMO_REVIEWS[0]),
    id: reviewId,
    draftResponse: response,
    responseStatus: 'sent',
  };
}

// ============================================================
// Digest mock
// ============================================================

async function getDigest(): Promise<DigestData> {
  await delay();
  return { ...DEMO_DIGEST };
}

// ============================================================
// Analytics mock
// ============================================================

async function getAnalytics(): Promise<AnalyticsData> {
  await delay();
  return { ...DEMO_ANALYTICS };
}

// ============================================================
// Onboarding mocks
// ============================================================

async function discoverBusiness(
  _businessName: string,
  _city: string,
): Promise<DiscoveryResult> {
  await delay(400);
  return { ...DEMO_DISCOVERY };
}

async function generateReveal(
  _businessName: string,
  _businessType: string,
  _description: string,
): Promise<RevealData> {
  await delay(600);
  return { ...DEMO_REVEAL };
}

async function completeOnboarding(
  _data: FormData,
): Promise<{ conversationId: string }> {
  await delay(500);
  return { conversationId: DEMO_CONVERSATION_ID };
}

// ============================================================
// Unified demo API — mirrors every export from api.ts
// ============================================================

export const demoApi = {
  // Auth
  login,
  register,
  logout,

  // Conversations
  getConversation,
  createConversation,
  sendMessage,
  streamMessage,

  // Content
  generateContent,
  publishContent,

  // Reviews
  getReviews,
  respondToReview,

  // Digest
  getDigest,

  // Analytics
  getAnalytics,

  // Onboarding
  discoverBusiness,
  generateReveal,
  completeOnboarding,
} as const;

export default demoApi;
