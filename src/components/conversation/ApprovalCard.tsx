'use client';

import { useState } from 'react';
import Button from '../shared/Button';
import { publishContent, respondToReview, ApiError } from '@/lib/api';

type ApprovalStatus = 'pending' | 'approved' | 'dismissed' | 'published' | 'scheduled' | 'error';

interface ApprovalCardProps {
  title: string;
  description: string;
  preview?: React.ReactNode;
  primaryAction: { label: string; onPress: () => void };
  secondaryAction: { label: string; onPress: () => void };
  status?: ApprovalStatus;
  timestamp: string;
  contentId?: string;
  reviewId?: string;
  draftResponse?: string;
}

export default function ApprovalCard({
  title,
  description,
  preview,
  primaryAction,
  secondaryAction,
  status: initialStatus = 'pending',
  timestamp,
  contentId,
  reviewId,
  draftResponse,
}: ApprovalCardProps) {
  const [status, setStatus] = useState<ApprovalStatus>(initialStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleApprove = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      if (contentId) {
        await publishContent(contentId);
      } else if (reviewId && draftResponse) {
        await respondToReview(reviewId, draftResponse);
      }

      setStatus('approved');
      primaryAction.onPress();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage('Something went wrong. Tap to try again.');
        setStatus('error');
      } else {
        // Offline — optimistically approve, queue for later
        setStatus('approved');
        primaryAction.onPress();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setStatus('dismissed');
  };

  const handleRetry = () => {
    setStatus('pending');
    setErrorMessage('');
  };

  // Dismissed — remove from view
  if (status === 'dismissed') {
    return (
      <div className="card opacity-40 py-3 px-card-padding animate-in">
        <p className="text-caption text-slate line-through">{title}</p>
        <button
          onClick={() => setStatus('pending')}
          className="text-caption text-terracotta mt-1"
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <article
      className="card animate-in flex flex-col gap-card-gap"
      aria-label={`Action requiring your approval: ${title}`}
    >
      <h3 className="text-h2 text-charcoal">{title}</h3>
      <p className="text-body text-charcoal">{description}</p>

      {preview && (
        <div className="rounded-sm overflow-hidden">{preview}</div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <button
          onClick={handleRetry}
          className="px-4 py-3 bg-error-light text-error-dark text-body rounded-sm text-left"
        >
          {errorMessage} ↻
        </button>
      )}

      {/* Action buttons */}
      {(status === 'pending' || status === 'error') && (
        <div className="flex gap-3">
          <div className="flex-[3]">
            <Button
              variant="primary"
              label={primaryAction.label}
              onClick={handleApprove}
              loading={isLoading}
              fullWidth
            />
          </div>
          <div className="flex-[2]">
            <Button
              variant="secondary"
              label={secondaryAction.label}
              onClick={secondaryAction.onPress}
              fullWidth
            />
          </div>
        </div>
      )}

      {/* Success state */}
      {(status === 'approved' || status === 'published' || status === 'scheduled') && (
        <div
          className="flex items-center gap-2 py-2 text-body font-semibold text-sage transition-all duration-normal"
          aria-live="polite"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-sage"
            style={{ animation: 'checkmark 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {status === 'approved' && 'Approved'}
          {status === 'published' && 'Posted'}
          {status === 'scheduled' && 'Scheduled'}
        </div>
      )}

      <span className="text-caption text-slate">{timestamp}</span>
    </article>
  );
}
