/**
 * LocalGenius API Client
 * Typed fetch wrapper for all endpoints.
 * Uses httpOnly session cookies for auth (set by /api/auth/login).
 * Handles SSE streaming for AI responses.
 */

const API_BASE = '/api';

// ============================================================
// Types
// ============================================================

export interface AuthResponse {
  token: string;
  user: { id: string; email: string; businessName: string };
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  businessName: string;
  businessType: string;
  city: string;
  state: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'approval' | 'report' | 'review';
  metadata?: {
    title?: string;
    description?: string;
    primaryLabel?: string;
    secondaryLabel?: string;
    status?: 'pending' | 'approved' | 'dismissed' | 'published' | 'scheduled';
    reviewId?: string;
    contentId?: string;
    platform?: string;
    fields?: { key: string; label: string; value: string; type?: 'text' | 'tel' | 'url' | 'textarea'; placeholder?: string }[];
  };
  createdAt: string;
}

export interface Conversation {
  id: string;
  businessId: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedContent {
  id: string;
  type: 'social_post' | 'review_response' | 'email' | 'website_copy';
  content: string;
  imageUrl?: string;
  platform?: string;
  status: 'draft' | 'approved' | 'published' | 'scheduled';
}

export interface Review {
  id: string;
  platform: 'google' | 'yelp';
  reviewerName: string;
  rating: number;
  text: string;
  draftResponse: string;
  responseStatus: 'pending' | 'approved' | 'sent' | 'auto_sent';
  createdAt: string;
}

export interface DigestData {
  businessName: string;
  ownerName: string;
  weekOf: string;
  highlights: { label: string; value: string; change?: string }[];
  actions: { description: string }[];
  recommendation: {
    text: string;
    actionType: string;
    actionId?: string;
  } | null;
  trendData: { date: string; value: number }[];
  trendMetric: string;
}

export interface AnalyticsData {
  websiteVisits: number;
  websiteVisitsChange: number;
  reviewCount: number;
  averageRating: number;
  socialImpressions: number;
  bookings: number;
  leadCalls: number;
}

export interface OnboardingData {
  businessName: string;
  businessType: string;
  city: string;
  photos: File[];
  description: string;
  priority: 'seo' | 'reviews' | 'social';
}

export interface DiscoveryResult {
  businessName: string;
  address: string;
  googleRating: number | null;
  reviewCount: number;
  yelpStatus: string;
  photoCount: number;
  instagramStatus: string;
  websiteStatus: string;
  competitors: { name: string; rating: number; reviewCount: number }[];
}

export interface RevealData {
  websitePreviewUrl: string;
  businessDescription: string;
  tagline: string;
  socialPostDraft: string;
  socialPostImageUrl: string;
  googleOptimizations: string[];
  suggestedCampaign: string;
}

// ============================================================
// Fetch wrapper — cookie-based auth
// ============================================================

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // send httpOnly session cookie
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(body.error?.message || body.error || `Request failed: ${response.status}`, response.status);
  }

  return response.json();
}

// Multipart form upload (for photos)
async function uploadForm<T>(
  endpoint: string,
  formData: FormData,
): Promise<T> {
  // Do NOT set Content-Type — browser sets multipart boundary automatically
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new ApiError(body.error?.message || 'Upload failed', response.status);
  }

  return response.json();
}

// ============================================================
// Normalize DB message → client Message type
// DB stores: { role: "owner"|"assistant", content: { text: "..." }, contentType: "text"|"action_card" }
// Client needs: { role: "user"|"assistant", content: "string", type: "text"|"approval" }
// ============================================================

interface DbMessage {
  id: string;
  conversationId: string;
  role: string;
  contentType: string;
  content: { text?: string } | string;
  aiModel?: string | null;
  createdAt: string;
  metadata?: Message['metadata'];
}

function normalizeMessage(msg: DbMessage): Message {
  const content = typeof msg.content === 'string'
    ? msg.content
    : (msg.content as { text?: string })?.text || '';

  return {
    id: msg.id,
    conversationId: msg.conversationId,
    role: msg.role === 'owner' ? 'user' : 'assistant',
    content,
    type: msg.contentType === 'action_card' ? 'approval' : 'text',
    metadata: msg.metadata,
    createdAt: typeof msg.createdAt === 'string' ? msg.createdAt : new Date(msg.createdAt).toISOString(),
  };
}

// ============================================================
// SSE streaming for AI responses
// ============================================================

export function streamMessage(
  conversationId: string,
  content: string,
  onChunk: (chunk: string) => void,
  onComplete: (message: Message) => void,
  onError: (error: Error) => void,
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch(
        `${API_BASE}/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify({ content, stream: true }),
          signal: controller.signal,
          credentials: 'include',
        },
      );

      if (!response.ok) {
        throw new ApiError('Stream failed', response.status);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              onComplete({
                id: `msg-${Date.now()}`,
                conversationId,
                role: 'assistant',
                content: fullContent,
                type: 'text',
                createdAt: new Date().toISOString(),
              });
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.chunk) {
                fullContent += parsed.chunk;
                onChunk(parsed.chunk);
              }
              // Handle structured messages (approval cards, etc.)
              if (parsed.message) {
                onComplete(normalizeMessage(parsed.message));
                return;
              }
            } catch {
              // Partial JSON, skip
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        onError(err as Error);
      }
    }
  })();

  return () => controller.abort();
}

// ============================================================
// API functions
// ============================================================

// Auth (login/register/logout now handled by auth-client.ts with cookies)
// These are kept for backward compatibility but prefer auth-client.ts

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const resp = await request<{ data: { user: AuthResponse['user']; accessToken: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return { token: resp.data.accessToken, user: resp.data.user };
}

export async function register(
  data: RegisterData,
): Promise<AuthResponse> {
  const resp = await request<{ data: { user: AuthResponse['user']; accessToken: string } }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return { token: resp.data.accessToken, user: resp.data.user };
}

export function logout(): void {
  fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
}

// Conversations — uses auth context to find the business's conversation
export async function getConversation(): Promise<Conversation> {
  const resp = await request<{ data: { conversation: { id: string; businessId: string; createdAt: string }; messages: DbMessage[] } }>('/conversations');
  const conv = resp.data.conversation;
  return {
    id: conv.id,
    businessId: conv.businessId,
    messages: resp.data.messages.map(normalizeMessage),
    createdAt: conv.createdAt,
    updatedAt: conv.createdAt,
  };
}

export async function createConversation(): Promise<Conversation> {
  return request<Conversation>('/conversations', { method: 'POST' });
}

export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<Message> {
  const resp = await request<{ data: { ownerMessage: DbMessage; assistantMessage: DbMessage } }>(
    `/conversations/${conversationId}/messages`,
    { method: 'POST', body: JSON.stringify({ content }) },
  );
  return normalizeMessage(resp.data.assistantMessage);
}

// Content
export async function generateContent(
  type: GeneratedContent['type'],
  context: Record<string, string>,
): Promise<GeneratedContent> {
  return request<GeneratedContent>('/content/generate', {
    method: 'POST',
    body: JSON.stringify({ type, context }),
  });
}

export async function publishContent(
  contentId: string,
): Promise<GeneratedContent> {
  return request<GeneratedContent>(`/content/${contentId}/publish`, {
    method: 'POST',
  });
}

// Actions
export interface ActionApprovalResult {
  actionId: string;
  status: 'completed' | 'failed';
  published?: boolean;
  postUrl?: string;
  live?: boolean;
  executed?: boolean;
}

export async function approveAction(
  actionId: string,
): Promise<ActionApprovalResult> {
  return request<ActionApprovalResult>(`/actions/${actionId}/approve`, {
    method: 'POST',
  });
}

// Reviews
export async function getReviews(): Promise<Review[]> {
  return request<Review[]>('/reviews');
}

export async function respondToReview(
  reviewId: string,
  response: string,
): Promise<Review> {
  return request<Review>(`/reviews/${reviewId}/respond`, {
    method: 'POST',
    body: JSON.stringify({ response }),
  });
}

// Digest
export async function getDigest(): Promise<DigestData> {
  return request<DigestData>('/digest');
}

// Analytics
export async function getAnalytics(): Promise<AnalyticsData> {
  return request<AnalyticsData>('/analytics');
}

// Onboarding
export async function discoverBusiness(
  businessName: string,
  city: string,
): Promise<DiscoveryResult> {
  return request<DiscoveryResult>(
    `/onboarding/discover?name=${encodeURIComponent(businessName)}&city=${encodeURIComponent(city)}`,
  );
}

export async function generateReveal(
  businessName: string,
  businessType: string,
  description: string,
): Promise<RevealData> {
  return request<RevealData>('/onboarding/reveal', {
    method: 'POST',
    body: JSON.stringify({ businessName, businessType, description }),
  });
}

export async function completeOnboarding(
  data: {
    businessName: string;
    businessType: string;
    city: string;
    description: string;
    priority: string;
  },
): Promise<{ conversationId: string }> {
  // Complete onboarding via JSON — the API expects { step: "complete", data: {...} }
  const resp = await request<{ data: { pipeline: { conversationId?: string } } }>('/onboarding', {
    method: 'POST',
    body: JSON.stringify({ step: 'complete', data }),
  });
  // The pipeline doesn't return conversationId directly — fetch it from GET /onboarding
  const status = await request<{ data: { conversationId: string | null } }>('/onboarding');
  return { conversationId: status.data.conversationId || '' };
}

// Website
export interface GeneratedWebsite {
  site: {
    html: string;
    metadata: { title: string; description: string; generatedAt: string };
    previewUrl: string;
  };
}

export async function generateWebsite(
  description?: string,
  photos?: string[],
  hours?: Record<string, string>,
): Promise<GeneratedWebsite> {
  return request<GeneratedWebsite>('/website/generate', {
    method: 'POST',
    body: JSON.stringify({ description, photos, hours }),
  });
}

export function getWebsitePreviewUrl(businessId: string): string {
  return `${API_BASE}/website/${businessId}`;
}

export { ApiError };
