'use client';

import { useState, useEffect } from 'react';
import WeeklyDigest from '@/components/digest/WeeklyDigest';
import ErrorBanner from '@/components/shared/ErrorBanner';
import { DigestSkeleton } from '@/components/shared/Skeleton';
import { getDigest, type DigestData } from '@/lib/api';


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
      setLoadState('error');
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
