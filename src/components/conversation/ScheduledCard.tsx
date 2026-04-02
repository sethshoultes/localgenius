'use client';

import { useState } from 'react';
import Button from '../shared/Button';

/**
 * ScheduledCard — Shows a scheduled post with time, platform, and cancel option.
 *
 * "Scheduled for Thursday at 5pm on Instagram"
 * with a clock icon, preview, and Cancel button.
 */

interface ScheduledCardProps {
  title: string;
  description: string;
  scheduledTime: string;
  platform: 'instagram' | 'facebook' | 'google';
  preview?: React.ReactNode;
  onCancel: () => void;
  timestamp: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  google: 'Google',
};

export default function ScheduledCard({
  title,
  description,
  scheduledTime,
  platform,
  preview,
  onCancel,
  timestamp,
}: ScheduledCardProps) {
  const [cancelled, setCancelled] = useState(false);

  if (cancelled) {
    return (
      <div className="card-subtle animate-in flex items-center gap-2 py-3">
        <span className="text-body text-slate">Cancelled: {title}</span>
        <button
          onClick={() => setCancelled(false)}
          className="text-caption text-terracotta-text ml-auto min-h-tap-min flex items-center"
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <article
      className="card animate-in flex flex-col gap-card-gap"
      aria-label={`Scheduled: ${title} for ${scheduledTime}`}
    >
      {/* Header with clock icon */}
      <div className="flex items-center gap-2">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-terracotta flex-shrink-0"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="text-h2 text-charcoal">{title}</span>
      </div>

      {/* Schedule details */}
      <div className="flex items-center gap-2 text-body">
        <span className="text-charcoal font-semibold">{scheduledTime}</span>
        <span className="text-slate">on {PLATFORM_LABELS[platform]}</span>
      </div>

      {/* Description */}
      <p className="text-body text-charcoal">{description}</p>

      {/* Preview */}
      {preview && (
        <div className="rounded-sm overflow-hidden">{preview}</div>
      )}

      {/* Cancel action */}
      <div className="flex gap-3">
        <div className="flex-[3]">
          <div className="flex items-center gap-2 py-3 text-body font-semibold text-sage-text">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-sage"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Scheduled
          </div>
        </div>
        <div className="flex-[2]">
          <Button
            variant="ghost"
            label="Cancel"
            size="small"
            onClick={() => {
              setCancelled(true);
              onCancel();
            }}
            fullWidth
          />
        </div>
      </div>

      <span className="text-caption text-slate">{timestamp}</span>
    </article>
  );
}
