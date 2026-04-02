'use client';

import Link from 'next/link';
import ConversationThread, { ThreadMessage } from '@/components/conversation/ConversationThread';

/**
 * Demo Page — Interactive product walkthrough
 *
 * Shows a read-only conversation thread with sample data demonstrating:
 * - System messages (setup & insights)
 * - Approval cards (social posts)
 * - Review alerts (handling reviews)
 * - User messages (asking questions)
 * - Insight cards (analytics)
 * - Settings updates
 *
 * Non-interactive: no input bar, no send button. Pure visual demo.
 */

// Sample demo conversation — Maria's first day with LocalGenius
const DEMO_MESSAGES: ThreadMessage[] = [
  // Welcome message
  {
    id: 'demo-1',
    type: 'system_message',
    content:
      "Good morning, Maria. I've scanned your Google listing and set up your social accounts. Your website is ready. Here's what's happening this week.",
    timestamp: 'Monday 10:15am',
  },

  // Approval card — social post
  {
    id: 'demo-2',
    type: 'approval_card',
    content:
      "Perfect timing — lunch rush is starting in 45 minutes. I'll post this to Instagram and Facebook at 11:30am.",
    timestamp: 'Monday 10:20am',
    metadata: {
      title: 'Social post: Fresh lunch specials 🌮',
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

  // Review alert — positive
  {
    id: 'demo-4',
    type: 'review_alert_card',
    content:
      'Best brisket tacos in Austin! The guacamole is incredible too. My family and I will definitely be back.',
    timestamp: 'Monday 2:15pm',
    metadata: {
      reviewerName: 'Jake R.',
      rating: 5,
      platform: 'google',
      draftResponse:
        "Thanks, Jake — glad you loved the brisket tacos. They're Maria's favorite too. See you and the family next time.",
      reviewId: 'demo-review-1',
    },
  },

  // User message — approving response
  {
    id: 'demo-5',
    type: 'user_message',
    content: 'Send that response — it sounds perfect.',
    timestamp: 'Monday 2:18pm',
  },

  // System message — confirmation
  {
    id: 'demo-6',
    type: 'system_message',
    content:
      "Sent. I'll handle all the positive reviews automatically. I'll flag anything 3 stars or below so you can decide how to respond.",
    timestamp: 'Monday 2:18pm',
  },

  // Insight card
  {
    id: 'demo-7',
    type: 'insight_card',
    content: '',
    timestamp: 'Monday 6:30pm',
    metadata: {
      insight: 'You got 340 visits today. That\'s 12% higher than yesterday.',
      suggestion: 'Your Google listing appears in 23 new search terms. Consider adding those to your menu or promotional materials.',
    },
  },

  // User message — asking about performance
  {
    id: 'demo-8',
    type: 'user_message',
    content: 'Anything else I should know about this week?',
    timestamp: 'Wednesday 9:45am',
  },

  // Settings update confirmation
  {
    id: 'demo-9',
    type: 'system_message',
    content:
      'You have 47 new reviews across Google and Yelp this week. Your response rate is 96% — that\'s 4x the industry average. Keep it up.',
    timestamp: 'Wednesday 9:46am',
  },

  // Another insight
  {
    id: 'demo-10',
    type: 'insight_card',
    content: '',
    timestamp: 'Wednesday 10:00am',
    metadata: {
      insight: 'Your busiest day is Friday between 6-9pm. Consider a special offer then.',
      suggestion: 'Try: "Friday night special: Margaritas $4, Appetizers 50% off 6-7pm"',
    },
  },
];

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-warm-white">
      {/* Hero Section */}
      <section className="px-screen-margin py-16 lg:py-24 max-w-[1120px] mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-[2.25rem] leading-[1.1] font-semibold text-charcoal tracking-tight sm:text-[2.75rem] lg:text-[3.5rem]">
            This is what your business
            <br />
            <span className="text-terracotta">looks like on LocalGenius</span>
          </h1>
          <p className="text-body text-slate mt-6 max-w-[480px] mx-auto lg:text-[1.125rem] lg:leading-relaxed">
            Experience how LocalGenius handles your reviews, social posts, and business insights — all in one conversation.
          </p>
        </div>

        {/* Phone Mockup with Conversation Thread */}
        <div className="flex justify-center mb-16">
          <div className="w-[300px] sm:w-[320px]">
            <div className="rounded-[24px] overflow-hidden border-[3px] border-charcoal/10 shadow-lg bg-warm-white">
              {/* Status bar */}
              <div className="bg-charcoal px-5 pt-3 pb-2 flex items-center justify-between">
                <span className="text-small text-white/60">9:41</span>
                <div className="flex gap-1">
                  <div className="w-4 h-2 bg-white/40 rounded-sm" />
                  <div className="w-1.5 h-2 bg-white/40 rounded-sm" />
                </div>
              </div>

              {/* Header */}
              <div className="px-4 py-3 bg-white border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="text-h2 text-charcoal">Maria's Kitchen</span>
                <span className="text-caption text-sage block">Everything's handled</span>
              </div>

              {/* Conversation thread — read-only, non-interactive */}
              <div className="min-h-[500px] max-h-[600px] flex flex-col bg-white">
                <ConversationThread
                  messages={DEMO_MESSAGES}
                  isLoading={false}
                  onApprove={undefined}
                  onEdit={undefined}
                  onSettingsSave={undefined}
                />
              </div>

              {/* No input bar — this is a read-only demo */}
              <div className="px-4 py-3 bg-cream border-t flex items-center justify-center" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="text-caption text-slate-light italic">Demo mode — read-only</span>
              </div>

              {/* Bottom nav */}
              <div className="flex items-center justify-around py-2 bg-white border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex flex-col items-center gap-0.5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" className="text-terracotta">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span className="text-small text-terracotta">Thread</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                    <polyline points="16 7 22 7 22 13" />
                  </svg>
                  <span className="text-small text-slate">Digest</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <p className="text-h2 text-charcoal mb-6">
            Ready to take back your time?
          </p>
          <Link
            href="/welcome"
            className="inline-flex items-center justify-center min-h-tap-primary px-10 bg-terracotta text-white font-semibold rounded-sm hover:bg-terracotta-hover active:bg-terracotta-active transition-colors no-underline text-body"
          >
            Get started in 5 minutes
          </Link>
          <p className="text-caption text-slate mt-4">
            No credit card required. No contracts. No setup fees.
          </p>
        </div>
      </section>

      {/* Value Props */}
      <section className="px-screen-margin py-16 bg-cream">
        <div className="max-w-[1120px] mx-auto">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="text-display text-gold mb-2">12,400+</div>
              <h3 className="text-h2 text-charcoal mb-2">Reviews handled</h3>
              <p className="text-body text-slate">
                A bad review at 10pm doesn't ruin your night anymore.
              </p>
            </div>

            <div className="text-center">
              <div className="text-display text-terracotta mb-2">8,200+</div>
              <h3 className="text-h2 text-charcoal mb-2">Posts created</h3>
              <p className="text-body text-slate">
                "Post about our lunch special." That's all it takes.
              </p>
            </div>

            <div className="text-center">
              <div className="text-display text-sage mb-2">2,100+</div>
              <h3 className="text-h2 text-charcoal mb-2">Digests delivered</h3>
              <p className="text-body text-slate">
                Every Monday. 90 seconds. What happened, what's next.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why It Works */}
      <section className="px-screen-margin py-16 max-w-[720px] mx-auto">
        <h2 className="text-h1 text-charcoal text-center mb-12 sm:text-[1.5rem]">
          Why LocalGenius works
        </h2>

        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-terracotta text-white flex items-center justify-center font-semibold flex-shrink-0 text-small">
              1
            </div>
            <div>
              <h3 className="text-h2 text-charcoal mb-1">No learning curve</h3>
              <p className="text-body text-slate">
                You don't need to learn new software. Just talk like you're texting a colleague.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-terracotta text-white flex items-center justify-center font-semibold flex-shrink-0 text-small">
              2
            </div>
            <div>
              <h3 className="text-h2 text-charcoal mb-1">Everything in one place</h3>
              <p className="text-body text-slate">
                Reviews, social posts, analytics, updates — all in your conversation thread. No tabs. No dashboards.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-terracotta text-white flex items-center justify-center font-semibold flex-shrink-0 text-small">
              3
            </div>
            <div>
              <h3 className="text-h2 text-charcoal mb-1">Decides when to ask for approval</h3>
              <p className="text-body text-slate">
                Big decisions get your approval first. Everything else just happens. You're never surprised.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-screen-margin py-16 text-center bg-cream">
        <div className="max-w-[480px] mx-auto">
          <h2 className="text-h1 text-charcoal sm:text-[1.5rem] mb-4">
            This could be your business by tonight.
          </h2>
          <p className="text-body text-slate mb-8">
            Five minutes from signup to your first automated review response. Guaranteed.
          </p>
          <Link
            href="/welcome"
            className="inline-flex items-center justify-center min-h-tap-primary px-10 bg-terracotta text-white font-semibold rounded-sm hover:bg-terracotta-hover active:bg-terracotta-active transition-colors no-underline text-body"
          >
            Get started free
          </Link>
        </div>
      </section>
    </div>
  );
}
