/**
 * Demo Conversation — Maria's first week with LocalGenius.
 *
 * A pre-built conversation history that showcases every card type.
 * Used in demo mode to show investors the full experience.
 *
 * Timeline: Monday onboarding → Friday end of first week.
 * Each message tells the story of Maria going from overwhelmed
 * to handled.
 */

import type { ThreadMessage } from '@/components/conversation/ConversationThread';

export const DEMO_CONVERSATION: ThreadMessage[] = [
  // ============================================================
  // MONDAY — Onboarding day
  // ============================================================

  {
    id: 'demo-1',
    type: 'system_message',
    content:
      "Welcome, Maria. I'm LocalGenius — your marketing employee. Your website is live at mariaskitchenatx.com, your Google listing is updated, and I posted your first photo to Instagram. I'll handle things from here. Just tell me what you need.",
    timestamp: 'Monday 10:15am',
  },

  // Social post approval — the first interaction
  {
    id: 'demo-2',
    type: 'approval_card',
    content:
      "Here's a post for your lunch special. I'll put it on Instagram and Facebook at 11:30am — right before the lunch crowd starts searching.",
    timestamp: 'Monday 10:20am',
    metadata: {
      title: 'Social post: Lunch special 🌮',
      primaryLabel: 'Schedule for 11:30am',
      secondaryLabel: 'Edit',
      status: 'approved',
      platform: 'instagram',
      actionId: 'demo-action-1',
    },
  },

  // Published confirmation
  {
    id: 'demo-3',
    type: 'published_card',
    content:
      'Nothing beats a slow Tuesday with fresh guacamole and good company. Come see us on South Lamar — your table is ready. 🌮',
    timestamp: 'Monday 11:30am',
    metadata: {
      title: 'Lunch special post',
      platform: 'instagram',
      postUrl: 'https://instagram.com/p/demo',
    },
  },

  // ============================================================
  // TUESDAY — First review response
  // ============================================================

  // Positive review alert
  {
    id: 'demo-4',
    type: 'review_alert_card',
    content: 'Best brisket tacos in Austin! The guacamole is incredible too. My family and I will definitely be back.',
    timestamp: 'Tuesday 2:15pm',
    metadata: {
      reviewerName: 'Jake R.',
      rating: 5,
      platform: 'google',
      draftResponse:
        "Thanks, Jake — glad you loved the brisket tacos. They're Maria's favorite too. See you and the family next time.",
      reviewId: 'demo-review-1',
    },
  },

  // Maria's first typed message
  {
    id: 'demo-5',
    type: 'user_message',
    content: 'That response looks perfect, send it!',
    timestamp: 'Tuesday 2:18pm',
  },

  {
    id: 'demo-6',
    type: 'system_message',
    content: "Sent. Jake's response is live on Google. I'll keep handling the positive ones — I'll flag anything 3 stars or below for you.",
    timestamp: 'Tuesday 2:18pm',
  },

  // ============================================================
  // WEDNESDAY — Negative review (the 10pm moment)
  // ============================================================

  {
    id: 'demo-7',
    type: 'review_alert_card',
    content: 'Food was okay but we waited 40 minutes. Disappointed.',
    timestamp: 'Wednesday 9:47pm',
    metadata: {
      reviewerName: 'Sarah M.',
      rating: 2,
      platform: 'google',
      draftResponse:
        "Sarah, I'm sorry about the wait last Tuesday. We had an unusually busy night and your experience didn't reflect what we aim for. I'd love to make it up to you — next time you visit, ask for Maria.",
      reviewId: 'demo-review-2',
    },
  },

  {
    id: 'demo-8',
    type: 'user_message',
    content: "Good response but change 'last Tuesday' to 'that evening' — I'm not sure when she came in",
    timestamp: 'Wednesday 9:52pm',
  },

  {
    id: 'demo-9',
    type: 'system_message',
    content:
      "Updated and sent. Here's what went out: \"Sarah, I'm sorry about the wait that evening. We had an unusually busy night and your experience didn't reflect what we aim for. I'd love to make it up to you — next time you visit, ask for Maria.\"",
    timestamp: 'Wednesday 9:52pm',
  },

  // ============================================================
  // THURSDAY — Scheduled post + settings change
  // ============================================================

  {
    id: 'demo-10',
    type: 'user_message',
    content: 'Post something about our fish tacos on Friday around lunchtime',
    timestamp: 'Thursday 3:00pm',
  },

  {
    id: 'demo-11',
    type: 'scheduled_card',
    content:
      'Friday called. It wants you to try the fish tacos. Crispy, fresh, and waiting for you on South Lamar. 🐟',
    timestamp: 'Thursday 3:02pm',
    metadata: {
      title: 'Social post: Fish tacos Friday',
      platform: 'instagram',
      scheduledTime: 'Friday at 11:30am',
    },
  },

  // Settings change via conversation
  {
    id: 'demo-12',
    type: 'user_message',
    content: "We're changing our Sunday hours — now open 10am to 8pm instead of 9pm",
    timestamp: 'Thursday 4:15pm',
  },

  {
    id: 'demo-13',
    type: 'settings_card',
    content: "Got it. Here are your current hours — I've updated Sunday. Save to push the change to your website and Google listing.",
    timestamp: 'Thursday 4:15pm',
    metadata: {
      title: 'Update business hours',
      status: 'approved',
      fields: [
        { key: 'mon-thu', label: 'Mon–Thu', value: '11am – 9pm', type: 'text' as const },
        { key: 'fri-sat', label: 'Fri–Sat', value: '11am – 10pm', type: 'text' as const },
        { key: 'sun', label: 'Sunday', value: '10am – 8pm', type: 'text' as const },
      ],
    },
  },

  // ============================================================
  // FRIDAY — Insight + Report
  // ============================================================

  // Proactive insight
  {
    id: 'demo-14',
    type: 'insight_card',
    content: '',
    timestamp: 'Friday 9:00am',
    metadata: {
      insight:
        'Your Tuesday lunch posts get 34% more engagement than weekend posts. Tuesday at 11:30am is your sweet spot.',
      suggestion:
        'Want me to schedule a recurring Tuesday lunch post? I\'ll draft a new one each week featuring your specials.',
    },
  },

  // Report card — end of first week
  {
    id: 'demo-15',
    type: 'report_card',
    content:
      'Your fish tacos post just went live. 47 people have seen it in the first hour — already your second-best post this week.',
    timestamp: 'Friday 11:45am',
  },

  // ============================================================
  // MONDAY (WEEK 2) — First Weekly Digest
  // ============================================================

  {
    id: 'demo-16',
    type: 'system_message',
    content:
      "Good morning, Maria. Your Weekly Digest is ready — tap the Digest tab to see your full report. Quick summary: 340 website visits (up 12%), 4 new reviews (all 4+ stars), and 23 bookings. Your best week since you started. I'll keep it going.",
    timestamp: 'Monday 7:00am',
  },

  // Maria's reaction
  {
    id: 'demo-17',
    type: 'user_message',
    content: 'This is incredible. My husband can\'t believe it.',
    timestamp: 'Monday 7:04am',
  },

  {
    id: 'demo-18',
    type: 'system_message',
    content:
      "That's what I like to hear. I've got three posts queued for this week, two review responses ready, and I'm keeping an eye on your Google ranking. You're at #4 for \"Mexican food Austin\" — let's get you to #3.",
    timestamp: 'Monday 7:04am',
  },
];

/**
 * Returns messages up to a specific point in the timeline.
 * Useful for progressive demo — show messages appearing one by one.
 */
export function getDemoMessagesUpTo(count: number): ThreadMessage[] {
  return DEMO_CONVERSATION.slice(0, Math.min(count, DEMO_CONVERSATION.length));
}

/**
 * Returns all demo messages.
 */
export function getAllDemoMessages(): ThreadMessage[] {
  return [...DEMO_CONVERSATION];
}
