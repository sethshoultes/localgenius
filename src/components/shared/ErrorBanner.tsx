'use client';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export default function ErrorBanner({
  message,
  onRetry,
  onDismiss,
}: ErrorBannerProps) {
  return (
    <div
      className="mx-screen-margin mt-2 px-4 py-3 bg-error-light rounded-md flex items-center gap-3 animate-in"
      role="alert"
    >
      {/* Error icon */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-error flex-shrink-0"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" x2="12" y1="8" y2="12" />
        <line x1="12" x2="12.01" y1="16" y2="16" />
      </svg>

      <p className="text-body text-error-dark flex-1">{message}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="text-body font-semibold text-error-dark flex-shrink-0 min-h-tap-min flex items-center"
          aria-label="Retry"
        >
          Retry
        </button>
      )}

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-error-dark flex-shrink-0 min-h-tap-min min-w-tap-min flex items-center justify-center"
          aria-label="Dismiss error"
        >
          ×
        </button>
      )}
    </div>
  );
}
