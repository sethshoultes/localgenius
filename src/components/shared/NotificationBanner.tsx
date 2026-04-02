'use client';

import { useEffect, useRef, useCallback } from 'react';
import { toastEnterStyle, toastKeyframes } from '@/lib/animations';

export type NotificationVariant = 'review' | 'published' | 'digest' | 'milestone' | 'error';

export interface NotificationAction {
  label: string;
  onPress: () => void;
}

export interface NotificationBannerProps {
  message: string;
  variant: NotificationVariant;
  action?: NotificationAction;
  duration?: number;
  onDismiss: () => void;
  visible: boolean;
}

const variantConfig: Record<
  NotificationVariant,
  { color: string; icon: React.ReactNode }
> = {
  review: {
    color: 'var(--color-gold)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  published: {
    color: 'var(--color-sage)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  digest: {
    color: 'var(--color-terracotta)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
  },
  milestone: {
    color: 'var(--color-gold)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    ),
  },
  error: {
    color: 'var(--color-error)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
};

export default function NotificationBanner({
  message,
  variant,
  action,
  duration = 5000,
  onDismiss,
  visible,
}: NotificationBannerProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const isExiting = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Auto-dismiss timer
  useEffect(() => {
    clearTimer();
    if (visible && duration > 0) {
      timerRef.current = setTimeout(() => {
        onDismiss();
      }, duration);
    }
    return clearTimer;
  }, [visible, duration, onDismiss, clearTimer]);

  // Focus action button when banner appears
  useEffect(() => {
    if (visible && actionRef.current) {
      actionRef.current.focus();
    }
  }, [visible]);

  // Escape key dismisses
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, onDismiss]);

  // Touch handlers for swipe-up dismiss
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartY.current === null) return;
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;
      touchStartY.current = null;
      // Swipe up threshold: -30px
      if (deltaY < -30) {
        onDismiss();
      }
    },
    [onDismiss],
  );

  if (!visible) return null;

  const config = variantConfig[variant];
  const isAssertive = variant === 'error' || variant === 'review';
  const role = variant === 'error' ? 'alert' : 'status';

  return (
    <>
      {/* Inject toast keyframes */}
      <style dangerouslySetInnerHTML={{ __html: toastKeyframes }} />

      <div
        ref={bannerRef}
        role={role}
        aria-live={isAssertive ? 'assertive' : 'polite'}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'fixed',
          top: 'env(safe-area-inset-top, 12px)',
          left: 'var(--space-screen-margin)',
          right: 'var(--space-screen-margin)',
          maxWidth: '640px',
          marginLeft: 'auto',
          marginRight: 'auto',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: 'var(--space-3) var(--space-4)',
          background: '#FFFFFF',
          boxShadow: 'var(--shadow-lg)',
          borderRadius: 'var(--radius-md)',
          ...toastEnterStyle(),
        }}
      >
        {/* Left accent bar */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            top: 'var(--space-2)',
            bottom: 'var(--space-2)',
            width: '3px',
            borderRadius: '2px',
            backgroundColor: config.color,
          }}
        />

        {/* Icon */}
        <span
          aria-hidden="true"
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: config.color,
          }}
        >
          {config.icon}
        </span>

        {/* Message */}
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 'var(--font-size-body)',
            lineHeight: 'var(--line-height-body)',
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {message}
        </span>

        {/* Action button */}
        {action && (
          <button
            ref={actionRef}
            onClick={action.onPress}
            style={{
              flexShrink: 0,
              padding: '4px 8px',
              fontSize: 'var(--font-size-body)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--action-primary)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm)',
              minHeight: 'var(--tap-target-min)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {action.label}
          </button>
        )}
      </div>
    </>
  );
}
