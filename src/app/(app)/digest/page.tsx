'use client';

import { useState, useEffect } from 'react';
import WeeklyDigest from '@/components/digest/WeeklyDigest';
import ErrorBanner from '@/components/shared/ErrorBanner';
import { DigestSkeleton } from '@/components/shared/Skeleton';
import { getDigest, type DigestData } from '@/lib/api';

const MOCK_DIGEST: DigestData = {
  businessName: "Maria's Kitchen",
  ownerName: 'Maria',
  weekOf: 'March 24 – 30, 2026',
  highlights: [
    { label: 'website visits', value: '340', change: 'up 12%' },
    { label: 'new Google reviews', value: '4', change: 'all 4+ stars' },
    { label: 'bookings through your site', value: '23' },
  ],
  actions: [
    { description: 'Posted 3 times on Instagram and twice on Facebook.' },
    { description: 'Your Tuesday lunch special post reached 456 people — your best-performing post this month.' },
    { description: 'Responded to all 4 new reviews.' },
    { description: 'Updated your Google Business Profile with your new Saturday hours.' },
  ],
  recommendation: {
    text: "You haven't sent an email to past customers in 6 weeks. Want me to send a 'thinking of you' message to customers who haven't visited in 30+ days? I've drafted one for you.",
    actionType: 'email_campaign',
    actionId: 'campaign-001',
  },
  trendData: [
    { date: '2026-03-03', value: 210 },
    { date: '2026-03-10', value: 245 },
    { date: '2026-03-17', value: 305 },
    { date: '2026-03-24', value: 340 },
  ],
  trendMetric: 'Website visits',
};

type LoadState = 'loading' | 'loaded' | 'error' | 'empty';

export default function DigestPage() {
  const [digest, setDigest] = useState<DigestData | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');

  const loadDigest = async () => {
    setLoadState('loading');
    try {
      const data = await getDigest();
      setDigest(data);
      setLoadState('loaded');
    } catch {
      // Fallback to mock data for demo
      setDigest(MOCK_DIGEST);
      setLoadState('loaded');
    }
  };

  useEffect(() => {
    loadDigest();
  }, []);

  if (loadState === 'loading') {
    return <DigestSkeleton />;
  }

  if (loadState === 'error') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-screen-margin">
        <ErrorBanner
          message="Couldn't load your digest right now."
          onRetry={loadDigest}
        />
      </div>
    );
  }

  // Empty state — first week, no digest yet
  if (!digest || loadState === 'empty') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-screen-margin text-center">
        <div className="w-16 h-16 rounded-full bg-gold-light flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        </div>
        <h2>Your first digest is on its way.</h2>
        <p className="text-body text-slate max-w-[320px]">
          I&apos;m gathering data on your business this week. Your first Weekly Digest will arrive Monday at 7am.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <WeeklyDigest
        businessName={digest.businessName}
        ownerName={digest.ownerName}
        weekOf={digest.weekOf}
        highlights={digest.highlights}
        actions={digest.actions}
        recommendation={
          digest.recommendation
            ? {
                text: digest.recommendation.text,
                primaryAction: { label: 'Send It', onPress: () => {} },
                secondaryAction: { label: 'Skip', onPress: () => {} },
              }
            : null
        }
      />
    </div>
  );
}
