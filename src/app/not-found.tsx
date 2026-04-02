import Link from 'next/link';

export default function NotFound() {
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
            color: '#D4A853',
            fontSize: '72px',
            fontWeight: 700,
            lineHeight: 1,
            margin: '0 0 16px',
          }}
        >
          404
        </div>
        <h1
          style={{
            color: '#2C2C2C',
            fontSize: '24px',
            fontWeight: 600,
            margin: '0 0 12px',
          }}
        >
          This page wandered off.
        </h1>
        <p
          style={{
            color: '#6B7280',
            fontSize: '16px',
            lineHeight: '24px',
            margin: '0 0 32px',
          }}
        >
          {"It happens to the best of us. Let's get you back to somewhere useful."}
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            backgroundColor: '#C4704B',
            color: '#FFFFFF',
            borderRadius: '8px',
            padding: '14px 28px',
            fontSize: '16px',
            fontWeight: 600,
            textDecoration: 'none',
            fontFamily: "'Source Sans 3', system-ui, sans-serif",
          }}
        >
          Take me home
        </Link>
      </div>
    </div>
  );
}
