'use client';

/**
 * Global Error Boundary — root-level fallback
 *
 * Catches errors that escape the nested error.tsx boundary.
 * This includes errors in the root layout itself.
 * Must include its own <html> and <body> tags since it replaces
 * the entire page when triggered.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FAF8F5',
          fontFamily: "system-ui, -apple-system, sans-serif",
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
              color: '#C4704B',
              fontWeight: 700,
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
            Something unexpected happened.
          </h1>
          <p
            style={{
              color: '#6B7280',
              fontSize: '16px',
              lineHeight: '24px',
              margin: '0 0 32px',
            }}
          >
            We hit a snag we didn&apos;t expect. Your data is safe. Try refreshing, or come back in a moment.
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
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
