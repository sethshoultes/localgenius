'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to Sentry in production
    console.error('Application error:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAF8F5',
        fontFamily: "'Source Sans 3', system-ui, sans-serif",
        padding: '24px',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '420px' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#F5E6E0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '28px',
          }}
        >
          !
        </div>
        <h1
          style={{
            color: '#2C2C2C',
            fontSize: '24px',
            fontWeight: 600,
            margin: '0 0 12px',
          }}
        >
          Something went wrong.
        </h1>
        <p
          style={{
            color: '#6B7280',
            fontSize: '16px',
            lineHeight: '24px',
            margin: '0 0 32px',
          }}
        >
          {"Don't worry — your data is safe. This is a temporary hiccup, not a permanent problem. Let's try that again."}
        </p>
        <button
          onClick={reset}
          style={{
            backgroundColor: '#C4704B',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            padding: '14px 28px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'Source Sans 3', system-ui, sans-serif",
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
