'use client';

import { useState } from 'react';
import Button from '../shared/Button';

/**
 * InsightCard — Proactive intelligence from LocalGenius.
 *
 * Appears when the system notices a pattern worth sharing.
 * "Your Tuesday lunch posts get 34% more engagement than weekend posts."
 * Sage background distinguishes it from regular messages and approval cards.
 */

interface InsightCardProps {
  insight: string;
  suggestion: string;
  onAccept: () => void;
  onDismiss: () => void;
  timestamp: string;
}

export default function InsightCard({
  insight,
  suggestion,
  onAccept,
  onDismiss,
  timestamp,
}: InsightCardProps) {
  const [status, setStatus] = useState<'active' | 'accepted' | 'dismissed'>('active');

  if (status === 'dismissed') return null;

  if (status === 'accepted') {
    return (
      <article className="animate-in rounded-md bg-sage-light p-card-padding flex items-center gap-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-sage flex-shrink-0">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="text-body text-sage-text font-semibold">Got it — I&apos;ll handle that.</span>
      </article>
    );
  }

  return (
    <article
      className="animate-in rounded-md bg-sage-light p-card-padding flex flex-col gap-card-gap"
      aria-label={`Insight: ${insight}`}
    >
      {/* Insight icon + label */}
      <div className="flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sage-text flex-shrink-0">
          <path d="M12 2v1" /><path d="M12 21v1" /><path d="m4.93 4.93.7.7" /><path d="m17.66 17.66.7.7" /><path d="M2 12h1" /><path d="M21 12h1" /><path d="m4.93 19.07.7-.7" /><path d="m17.66 6.34.7-.7" />
          <circle cx="12" cy="12" r="4" />
        </svg>
        <span className="text-caption text-sage-text uppercase tracking-[0.1em] font-semibold">
          Insight
        </span>
      </div>

      {/* The insight */}
      <p className="text-body text-charcoal">{insight}</p>

      {/* The suggestion */}
      <p className="text-body text-charcoal-soft">{suggestion}</p>

      {/* Actions */}
      <div className="flex gap-3">
        <div className="flex-[3]">
          <Button
            variant="primary"
            label="Sounds good"
            fullWidth
            onClick={() => {
              setStatus('accepted');
              onAccept();
            }}
          />
        </div>
        <div className="flex-[2]">
          <Button
            variant="ghost"
            label="Not now"
            fullWidth
            onClick={() => {
              setStatus('dismissed');
              onDismiss();
            }}
          />
        </div>
      </div>

      <span className="text-caption text-sage-text/60">{timestamp}</span>
    </article>
  );
}
