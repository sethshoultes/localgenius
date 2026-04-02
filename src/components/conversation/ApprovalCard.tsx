'use client';

import { useState } from 'react';
import Button from '../shared/Button';
import PublishedCard from './PublishedCard';
import { approveAction, publishContent, respondToReview, ApiError } from '@/lib/api';

type ApprovalStatus = 'pending' | 'publishing' | 'approved' | 'published' | 'dismissed' | 'scheduled' | 'error';

interface ApprovalCardProps {
  title: string;
  description: string;
  preview?: React.ReactNode;
  primaryAction: { label: string; onPress: () => void };
  secondaryAction: { label: string; onPress: () => void };
  status?: ApprovalStatus;
  timestamp: string;
  actionId?: string;
  contentId?: string;
  reviewId?: string;
  draftResponse?: string;
  platform?: 'instagram' | 'facebook' | 'google';
}

export default function ApprovalCard({
  title,
  description,
  preview,
  primaryAction,
  secondaryAction,
  status: initialStatus = 'pending',
  timestamp,
  actionId,
  contentId,
  reviewId,
  draftResponse,
  platform,
}: ApprovalCardProps) {
  const [status, setStatus] = useState<ApprovalStatus>(initialStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [postUrl, setPostUrl] = useState<string | undefined>();

  const handleApprove = async () => {
    setIsLoading(true);
    setStatus('publishing');
    setErrorMessage('');

    try {
      // Use the real action approval endpoint if actionId is available
      if (actionId) {
        const result = await approveAction(actionId);
        if (result.postUrl) setPostUrl(result.postUrl);
        setStatus('published');
      } else if (contentId) {
        await publishContent(contentId);
        setStatus('published');
      } else if (reviewId && draftResponse) {
        await respondToReview(reviewId, draftResponse);
        setStatus('approved');
      } else {
        // Generic approval — call the parent handler
        setStatus('approved');
      }

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

  const handleRetry = () => {
    setStatus('pending');
    setErrorMessage('');
  };

  // Published — transition to PublishedCard
  if (status === 'published' && platform) {
    return (
      <PublishedCard
        platform={platform}
        title={title}
        preview={description}
        postUrl={postUrl}
        timestamp={timestamp}
      />
    );
  }

  // Dismissed — collapsed with undo
  if (status === 'dismissed') {
    return (
      <div className="card opacity-40 py-3 px-card-padding animate-in">
        <p className="text-caption text-slate line-through">{title}</p>
        <button
          onClick={() => setStatus('pending')}
          className="text-caption text-terracotta mt-1 min-h-tap-min flex items-center"
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
          className="px-4 py-3 bg-error-light text-error-dark text-body rounded-sm text-left min-h-tap-min"
        >
          {errorMessage} ↻
        </button>
      )}

      {/* Action buttons — pending or error */}
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

      {/* Publishing state — spinner with text */}
      {status === 'publishing' && (
        <div className="flex items-center gap-3 py-3" aria-live="polite">
          <span className="loading-glow w-5 h-5 rounded-full flex-shrink-0" />
          <span className="text-body text-slate">Publishing...</span>
        </div>
      )}

      {/* Approved/published success (without platform — no PublishedCard transition) */}
      {(status === 'approved' || (status === 'published' && !platform) || status === 'scheduled') && (
        <div
          className="flex items-center gap-2 py-2 text-body font-semibold text-sage-text transition-all duration-normal"
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
