/**
 * Mock for @/services/ai
 *
 * Returns realistic generated content without calling Anthropic.
 */

import { vi } from "vitest";

export const MOCK_GENERATED_TEXT = "Here is some helpful marketing advice tailored for your local business.";

export const MOCK_SOCIAL_POST = "Craving something delicious? Stop by Test Biz Inc in Austin today! Our chef has cooked up something special just for you. #Austin #LocalEats #FreshFood #SupportLocal #TestBiz";

export const MOCK_REVIEW_RESPONSE = "Thank you so much, Jane! We are thrilled to hear you enjoyed the food and our staff. We look forward to welcoming you back soon!";

export const MOCK_EMAIL_CAMPAIGN = "Subject: We miss you at Test Biz Inc!\n\nHi there,\n\nIt has been a while since your last visit and we have some exciting things happening. Stop by this week for our new seasonal menu.\n\nSee you soon,\nThe Test Biz Inc Team";

export const MOCK_WEBSITE_CONTENT = "# Welcome to Test Biz Inc\n\nAustin's favorite neighborhood restaurant.\n\n## About Us\nWe serve fresh, locally-sourced meals with a smile.\n\n## Visit Us Today\nBook your table now and taste the difference.";

export const MOCK_DIGEST_NARRATIVE = "Great week for Test Biz Inc! You received 5 new reviews averaging 4.2 stars. I published 3 social posts and responded to 5 reviews on your behalf. This week, I recommend posting a behind-the-scenes photo of your kitchen — those always get the most engagement.";

export const mockGenerate = vi.fn().mockResolvedValue(MOCK_GENERATED_TEXT);
export const mockGenerateSocialPost = vi.fn().mockResolvedValue(MOCK_SOCIAL_POST);
export const mockGenerateReviewResponse = vi.fn().mockResolvedValue(MOCK_REVIEW_RESPONSE);
export const mockGenerateDigestNarrative = vi.fn().mockResolvedValue(MOCK_DIGEST_NARRATIVE);

export function resetAiMocks() {
  mockGenerate.mockClear().mockResolvedValue(MOCK_GENERATED_TEXT);
  mockGenerateSocialPost.mockClear().mockResolvedValue(MOCK_SOCIAL_POST);
  mockGenerateReviewResponse.mockClear().mockResolvedValue(MOCK_REVIEW_RESPONSE);
  mockGenerateDigestNarrative.mockClear().mockResolvedValue(MOCK_DIGEST_NARRATIVE);
}
