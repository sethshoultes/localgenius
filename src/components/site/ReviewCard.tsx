import StarRating from './StarRating';

export type Platform = 'google' | 'yelp';

export interface ReviewCardProps {
  reviewer: string;
  rating: number;
  text: string;
  date: string;
  platform: Platform;
}

/**
 * ReviewCard — Single review card with star rating and platform badge
 *
 * Features:
 * - Star rating display via StarRating component
 * - Platform badge (Google/Yelp with brand colors)
 * - Reviewer name and date
 * - Text truncation to 280 characters
 * - Hover shadow effect
 * - Responsive layout
 *
 * Server component (no 'use client' directive)
 */
export default function ReviewCard({
  reviewer,
  rating,
  text,
  date,
  platform,
}: ReviewCardProps) {
  // Truncate long reviews to 280 characters
  const maxLength = 280;
  const isLong = text.length > maxLength;
  const displayText = isLong ? text.slice(0, maxLength).trimEnd() + '...' : text;

  // Format date for display
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Platform badge styling
  const getPlatformStyles = (platform: Platform) => {
    switch (platform) {
      case 'google':
        return {
          backgroundColor: '#e8f0fe',
          color: '#1a73e8',
        };
      case 'yelp':
        return {
          backgroundColor: '#fce4e4',
          color: '#d32323',
        };
      default:
        return {
          backgroundColor: 'var(--surface-card)',
          color: 'var(--text-secondary)',
        };
    }
  };

  const platformLabel =
    platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();
  const platformStyles = getPlatformStyles(platform);

  return (
    <article
      className="transition-shadow duration-200 hover:shadow-lg"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-card-padding)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.875rem',
        transition: 'box-shadow 200ms ease',
        boxShadow: 'var(--shadow-sm)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow =
          '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      {/* Header: Stars + Platform Badge */}
      <div
        className="flex items-center justify-between gap-3 flex-wrap"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <StarRating rating={rating} />

        <span
          className="inline-block rounded-full text-xs font-semibold"
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            padding: '0.2rem 0.625rem',
            borderRadius: '9999px',
            lineHeight: 1.4,
            ...platformStyles,
          }}
        >
          {platformLabel}
        </span>
      </div>

      {/* Review text */}
      <p
        style={{
          fontSize: '0.9375rem',
          lineHeight: 1.6,
          color: 'var(--text-primary)',
          marginBottom: 0,
        }}
      >
        {displayText}
      </p>

      {/* Footer: Author + Date */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          paddingTop: '0.5rem',
          borderTop: '1px solid var(--border-default)',
        }}
      >
        <span
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {reviewer}
        </span>

        <span
          style={{
            fontSize: '0.8125rem',
            color: 'var(--color-slate-light)',
          }}
        >
          {formattedDate}
        </span>
      </div>
    </article>
  );
}
