/**
 * LocalGenius API Client
 * Typed fetch wrapper for all endpoints.
 * Handles auth token storage and SSE streaming for AI responses.
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
  businessName: string;
  businessType: string;
  city: string;
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
// Token management
// ============================================================

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('lg_token');
}

function setToken(token: string): void {
  localStorage.setItem('lg_token', token);
}

function clearToken(): void {
  localStorage.removeItem('lg_token');
}

// ============================================================
// Fetch wrapper
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
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(body.error || `Request failed: ${response.status}`, response.status);
  }

  return response.json();
}

// Multipart form upload (for photos)
async function uploadForm<T>(
  endpoint: string,
  formData: FormData,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Do NOT set Content-Type — browser sets multipart boundary automatically
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new ApiError(body.error || 'Upload failed', response.status);
  }

  return response.json();
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
  const token = getToken();
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
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ content, stream: true }),
          signal: controller.signal,
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
              // Stream complete — parse the final message
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
                onComplete(parsed.message);
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

  // Return cancel function
  return () => controller.abort();
}

// ============================================================
// API functions
// ============================================================

// Auth
export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const data = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data;
}

export async function register(
  data: RegisterData,
): Promise<AuthResponse> {
  const result = await request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  setToken(result.token);
  return result;
}

export function logout(): void {
  clearToken();
}

// Conversations
export async function getConversation(
  id: string,
): Promise<Conversation> {
  return request<Conversation>(`/conversations/${id}`);
}

export async function createConversation(): Promise<Conversation> {
  return request<Conversation>('/conversations', { method: 'POST' });
}

export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<Message> {
  return request<Message>(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
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
  data: FormData,
): Promise<{ conversationId: string }> {
  return uploadForm<{ conversationId: string }>('/onboarding', data);
}

export { ApiError, getToken, clearToken };
