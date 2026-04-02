/**
 * LocalGenius Demo Mode — Mock Data Constants
 *
 * All mock data for the demo mode lives here,
 * keeping demo-mode.ts focused on interception logic.
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
} from './api';

// ============================================================
// IDs
// ============================================================

export const DEMO_USER_ID = 'demo-user-001';
export const DEMO_BUSINESS_ID = 'demo-biz-001';
export const DEMO_CONVERSATION_ID = 'demo-conv-001';
export const DEMO_TOKEN = 'demo-token-local-genius-2026';

// ============================================================
// Auth
// ============================================================

export const DEMO_AUTH: AuthResponse = {
  token: DEMO_TOKEN,
  user: {
    id: DEMO_USER_ID,
    email: 'maria@mariaskitchenatx.com',
    businessName: "Maria's Kitchen",
  },
};

// ============================================================
// Conversation Messages
// ============================================================

function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60_000).toISOString();
}

export const DEMO_MESSAGES: Message[] = [
  {
    id: 'msg-demo-001',
    conversationId: DEMO_CONVERSATION_ID,
    role: 'assistant',
    content:
      "Good morning, Maria! I'm LocalGenius \u2014 your marketing employee. I handle your social media, reviews, website updates, and local SEO so you can focus on running your restaurant. Let me show you what I've already set up.",
    type: 'text',
    createdAt: minutesAgo(12),
  },
  {
    id: 'msg-demo-002',
    conversationId: DEMO_CONVERSATION_ID,
    role: 'assistant',
    content:
      'Your site is live at mariaskitchenatx.com \u2014 3 people have already visited today. I also claimed your Google Business Profile and connected your Instagram account.',
    type: 'text',
    createdAt: minutesAgo(10),
  },
  {
    id: 'msg-demo-003',
    conversationId: DEMO_CONVERSATION_ID,
    role: 'assistant',
    content:
      "Thanks, Jake \u2014 glad you loved the brisket tacos. They're Maria's favorite too. See you next time!",
    type: 'approval',
    metadata: {
      title: 'Review response for Jake R. \u2b50\u2b50\u2b50\u2b50\u2b50',
      description:
        'Jake left a 5-star review on Google mentioning the brisket tacos and guacamole. Here\'s a draft response.',
      primaryLabel: 'Send Response',
      secondaryLabel: 'Edit',
      status: 'pending',
      reviewId: 'rev-demo-001',
    },
    createdAt: minutesAgo(7),
  },
  {
    id: 'msg-demo-004',
    conversationId: DEMO_CONVERSATION_ID,
    role: 'assistant',
    content:
      "\ud83c\udf2e Tuesday Lunch Special \ud83c\udf2e\n\nOur brisket tacos are back with a twist \u2014 green chile queso on top. $12 plate with rice, beans & a drink. Today only, 11am\u20132pm.\n\n\ud83d\udccd Maria's Kitchen \u2022 2847 S Lamar, Austin\n#AustinFood #TexMex #LunchSpecial",
    type: 'approval',
    metadata: {
      title: 'Social post: Tuesday lunch special',
      description:
        "Here's a post for your lunch special. I'll put it on Instagram and Facebook at 11:30am.",
      primaryLabel: 'Approve & Schedule',
      secondaryLabel: 'Edit',
      status: 'pending',
      platform: 'instagram',
      contentId: 'content-demo-001',
    },
    createdAt: minutesAgo(4),
  },
  {
    id: 'msg-demo-005',
    conversationId: DEMO_CONVERSATION_ID,
    role: 'assistant',
    content:
      'Your lunch special post reached 234 people and got 12 likes. 3 people clicked through to your menu. That\u2019s 40% more reach than last week\u2019s post.',
    type: 'report',
    metadata: {
      title: 'Lunch special results',
      description: 'Performance report for the Tuesday lunch special post.',
    },
    createdAt: minutesAgo(1),
  },
];

export const DEMO_CONVERSATION: Conversation = {
  id: DEMO_CONVERSATION_ID,
  businessId: DEMO_BUSINESS_ID,
  messages: DEMO_MESSAGES,
  createdAt: minutesAgo(15),
  updatedAt: minutesAgo(1),
};

// ============================================================
// Streaming Responses
// ============================================================

export const STREAM_RESPONSE_LUNCH =
  "Great idea! I'll put together a lunch special post for today. I'll feature the brisket tacos with a photo from last week's shoot and schedule it for 11:30am on Instagram and Facebook. I'll send you a draft to approve in just a moment.";

export const STREAM_RESPONSE_GENERIC =
  "Got it. I'll take care of that. Here's what I'm working on \u2014 I'll have a draft ready for you to review in a few minutes. In the meantime, your website and social accounts are all running smoothly.";

// ============================================================
// Reviews
// ============================================================

export const DEMO_REVIEWS: Review[] = [
  {
    id: 'rev-demo-001',
    platform: 'google',
    reviewerName: 'Jake R.',
    rating: 5,
    text: 'Best brisket tacos in Austin! The guacamole is incredible too. We come here every weekend now.',
    draftResponse:
      "Thanks, Jake \u2014 glad you loved the brisket tacos. They're Maria's favorite too. See you next time!",
    responseStatus: 'pending',
    createdAt: minutesAgo(120),
  },
  {
    id: 'rev-demo-002',
    platform: 'google',
    reviewerName: 'Sarah M.',
    rating: 2,
    text: 'Food was okay but we waited 40 minutes for our order. Not great for a weekday lunch.',
    draftResponse:
      "Sarah, I'm sorry about the wait \u2014 that's not the experience we want for you. Weekday lunches have been busier lately and we're adding staff to keep up. If you give us another shot, ask for Maria and we'll make sure you're taken care of.",
    responseStatus: 'pending',
    createdAt: minutesAgo(300),
  },
  {
    id: 'rev-demo-003',
    platform: 'google',
    reviewerName: 'Mike T.',
    rating: 5,
    text: "My family's new favorite spot. Kids loved the quesadillas and the staff was so friendly. The patio is perfect.",
    draftResponse:
      "Mike, that means the world to us! We love seeing families here. The patio is Maria's favorite spot too \u2014 glad the kids had a great time. See y'all again soon!",
    responseStatus: 'pending',
    createdAt: minutesAgo(500),
  },
  {
    id: 'rev-demo-004',
    platform: 'yelp',
    reviewerName: 'Priya K.',
    rating: 4,
    text: 'Great food, wish they were open later on weekends. The mole enchiladas are outstanding.',
    draftResponse:
      "Thanks, Priya! We hear you on the weekend hours \u2014 we're looking into extending them soon. So glad you enjoyed the mole enchiladas \u2014 that recipe has been in the family for three generations.",
    responseStatus: 'pending',
    createdAt: minutesAgo(700),
  },
  {
    id: 'rev-demo-005',
    platform: 'google',
    reviewerName: 'Carlos D.',
    rating: 5,
    text: 'Authentic Tex-Mex like my abuela used to make. The salsa verde is perfection. This place is a hidden gem.',
    draftResponse:
      "Carlos, that's the best compliment we could get. Maria learned most of her recipes from her grandmother too. Thanks for finding us \u2014 tell your friends, we love being a hidden gem but we wouldn't mind a few more visitors!",
    responseStatus: 'pending',
    createdAt: minutesAgo(1000),
  },
];

// ============================================================
// Digest
// ============================================================

export const DEMO_DIGEST: DigestData = {
  businessName: "Maria's Kitchen",
  ownerName: 'Maria',
  weekOf: '2026-03-23',
  highlights: [
    { label: 'Website visits', value: '340', change: '+12%' },
    { label: 'New Google reviews', value: '4', change: 'All 4+ stars' },
    { label: 'Bookings', value: '23', change: '+8%' },
    { label: 'Social reach', value: '1,240', change: '+34%' },
  ],
  actions: [
    { description: 'Posted 3 times on Instagram and 2 times on Facebook.' },
    { description: 'Tuesday lunch special post reached 456 people.' },
    { description: 'Responded to 4 new Google reviews.' },
    { description: 'Updated Google Business Profile hours for Easter weekend.' },
  ],
  recommendation: {
    text: "You haven't sent an email to past customers in 6 weeks. A short note about your new spring menu could bring back regulars. Want me to draft one?",
    actionType: 'email_campaign',
    actionId: 'action-email-spring-menu',
  },
  trendData: [
    { date: '2026-03-02', value: 210 },
    { date: '2026-03-09', value: 245 },
    { date: '2026-03-16', value: 305 },
    { date: '2026-03-23', value: 340 },
  ],
  trendMetric: 'Website Visits',
};

// ============================================================
// Analytics
// ============================================================

export const DEMO_ANALYTICS: AnalyticsData = {
  websiteVisits: 340,
  websiteVisitsChange: 12,
  reviewCount: 28,
  averageRating: 4.3,
  socialImpressions: 1240,
  bookings: 23,
  leadCalls: 9,
};

// ============================================================
// Discovery (onboarding)
// ============================================================

export const DEMO_DISCOVERY: DiscoveryResult = {
  businessName: "Maria's Kitchen",
  address: '2847 S Lamar Blvd, Austin, TX 78704',
  googleRating: 4.3,
  reviewCount: 28,
  yelpStatus: 'claimed',
  photoCount: 14,
  instagramStatus: 'connected',
  websiteStatus: 'none',
  competitors: [
    { name: 'Rosie\u2019s Tamale House', rating: 4.5, reviewCount: 312 },
    { name: 'El Primo Taco', rating: 4.1, reviewCount: 187 },
    { name: 'Casa Linda Tex-Mex', rating: 3.9, reviewCount: 94 },
  ],
};

// ============================================================
// Reveal (onboarding)
// ============================================================

export const DEMO_REVEAL: RevealData = {
  websitePreviewUrl: '/demo/preview-marias-kitchen.png',
  businessDescription:
    "Family-owned Tex-Mex restaurant in South Austin serving scratch-made recipes passed down through three generations. Known for brisket tacos, handmade guacamole, and a welcoming patio.",
  tagline: 'Three generations of flavor. One neighborhood kitchen.',
  socialPostDraft:
    "\ud83c\udf2e We're Maria's Kitchen \u2014 a family-run Tex-Mex spot on S. Lamar. Everything is made from scratch, from our brisket tacos to our salsa verde. Come hungry, leave happy.\n\n\ud83d\udccd 2847 S Lamar Blvd, Austin\n#AustinEats #TexMex #SouthAustin #MariasKitchen",
  socialPostImageUrl: '/demo/social-marias-kitchen.png',
  googleOptimizations: [
    'Added business hours and holiday schedule',
    'Updated business category to "Tex-Mex Restaurant"',
    'Uploaded 6 high-quality food photos',
    'Added menu link to Google Business Profile',
    'Enabled messaging and booking features',
  ],
  suggestedCampaign:
    'Launch week Instagram campaign: 5 posts showcasing top dishes with a "mention this post for free guac" offer to drive foot traffic.',
};

// ============================================================
// Generated Content
// ============================================================

export const DEMO_GENERATED_CONTENT: GeneratedContent = {
  id: 'content-demo-001',
  type: 'social_post',
  content:
    "\ud83c\udf2e Tuesday Lunch Special \ud83c\udf2e\n\nOur brisket tacos are back with a twist \u2014 green chile queso on top. $12 plate with rice, beans & a drink. Today only, 11am\u20132pm.\n\n\ud83d\udccd Maria's Kitchen \u2022 2847 S Lamar, Austin\n#AustinFood #TexMex #LunchSpecial",
  platform: 'instagram',
  status: 'draft',
};
