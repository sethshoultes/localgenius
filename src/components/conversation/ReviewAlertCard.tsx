'use client';

import { useState } from 'react';
import Button from '../shared/Button';

/**
 * ReviewAlertCard — New review arrived via webhook.
 *
 * Shows the review with star rating, reviewer name, text preview.
 * "See AI Response" expands to show the draft.
 * "Respond Now" opens the draft for editing before sending.
 * Negative reviews (1-2 stars) get a subtle urgent border.
 */

interface ReviewAlertCardProps {
  reviewerName: string;
  rating: number;
  reviewText: string;
  platform: 'google' | 'yelp';
  draftResponse: string;
  onApproveResponse: (response: string) => void;
  onEditResponse: (response: string) => void;
  timestamp: string;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= rating ? 'text-gold' : 'text-slate-light'}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </span>
  );
}

export default function ReviewAlertCard({
  reviewerName,
  rating,
  reviewText,
  platform,
  draftResponse,
  onApproveResponse,
  onEditResponse,
  timestamp,
}: ReviewAlertCardProps) {
  const [showDraft, setShowDraft] = useState(false);
  const [editedResponse, setEditedResponse] = useState(draftResponse);
  const [isEditing, setIsEditing] = useState(false);
  const [sent, setSent] = useState(false);

  const isNegative = rating <= 2;
  const isWarning = rating === 3;

  if (sent) {
    return (
      <article className="card animate-in flex items-center gap-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-sage flex-shrink-0">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="text-body text-sage-text font-semibold">
          Response sent to {reviewerName}
        </span>
      </article>
    );
  }

  return (
    <article
      className={[
        'card animate-in flex flex-col gap-card-gap',
        isNegative ? 'border-l-[3px] border-error' : '',
        isWarning ? 'border-l-[3px] border-gold' : '',
      ].join(' ')}
      aria-label={`New ${rating}-star review from ${reviewerName}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-body">{platform === 'google' ? '🔍' : '📍'}</span>
        <span className="text-h2 text-charcoal">New review from {reviewerName}</span>
        {isNegative && (
          <span className="text-caption text-error font-semibold ml-auto">Needs your attention</span>
        )}
      </div>

      {/* Rating */}
      <Stars rating={rating} />

      {/* Review text */}
      <p className="text-body text-charcoal italic leading-relaxed">&ldquo;{reviewText}&rdquo;</p>

      {/* Draft response (expandable) */}
      {showDraft && (
        <div className="bg-cream rounded-md p-4 flex flex-col gap-3">
          <span className="text-caption text-slate font-semibold">My draft response:</span>
          {isEditing ? (
            <textarea
              value={editedResponse}
              onChange={(e) => setEditedResponse(e.target.value)}
              className="w-full min-h-[88px] px-4 py-3 text-body text-charcoal bg-warm-white rounded-md border border-transparent focus:border-terracotta outline-none transition-colors duration-fast resize-none"
              aria-label="Edit review response"
            />
          ) : (
            <p className="text-body text-charcoal">{editedResponse}</p>
          )}

          <div className="flex gap-3">
            <div className="flex-[3]">
              <Button
                variant="primary"
                label={isEditing ? 'Send' : 'Send this response'}
                fullWidth
                onClick={() => {
                  setSent(true);
                  onApproveResponse(editedResponse);
                }}
              />
            </div>
            <div className="flex-[2]">
              {isEditing ? (
                <Button
                  variant="ghost"
                  label="Cancel"
                  fullWidth
                  onClick={() => {
                    setIsEditing(false);
                    setEditedResponse(draftResponse);
                  }}
                />
              ) : (
                <Button
                  variant="secondary"
                  label="Edit first"
                  fullWidth
                  onClick={() => setIsEditing(true)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action buttons (before draft is shown) */}
      {!showDraft && (
        <div className="flex gap-3">
          <div className="flex-[3]">
            <Button
              variant="primary"
              label="See AI Response"
              fullWidth
              onClick={() => setShowDraft(true)}
            />
          </div>
          <div className="flex-[2]">
            <Button
              variant="secondary"
              label="Respond Now"
              fullWidth
              onClick={() => {
                setShowDraft(true);
                setIsEditing(true);
              }}
            />
          </div>
        </div>
      )}

      <span className="text-caption text-slate">{timestamp}</span>
    </article>
  );
}
