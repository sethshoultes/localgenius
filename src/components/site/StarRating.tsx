export interface StarRatingProps {
  rating: number;
  count?: number;
}

/**
 * StarRating — Pure CSS star display component
 *
 * Features:
 * - Displays 1-5 stars with gold color (#D4A853)
 * - Supports half-star ratings
 * - Optional review count display
 * - CSS clip-path stars (no icon library)
 * - Accessible with ARIA labels
 *
 * Server component (no 'use client' directive)
 */
export default function StarRating({ rating, count }: StarRatingProps) {
  // Clamp rating between 0 and 5
  const clampedRating = Math.max(0, Math.min(5, rating));
  const fullStars = Math.floor(clampedRating);
  const hasHalf = clampedRating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  const ariaLabel = `${clampedRating} out of 5 stars${
    count !== undefined ? `, ${count} reviews` : ''
  }`;

  return (
    <span
      className="inline-flex items-center gap-1.5"
      aria-label={ariaLabel}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
      }}
    >
      {/* Stars container */}
      <span
        className="inline-flex gap-0.5"
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          gap: '2px',
        }}
      >
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <StarIcon key={`full-${i}`} type="full" />
        ))}

        {/* Half star */}
        {hasHalf && <StarIcon type="half" />}

        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <StarIcon key={`empty-${i}`} type="empty" />
        ))}
      </span>

      {/* Review count */}
      {count !== undefined && (
        <span
          style={{
            fontSize: '0.875em',
            color: 'var(--text-secondary)',
            fontWeight: 400,
          }}
        >
          ({count})
        </span>
      )}
    </span>
  );
}

interface StarIconProps {
  type: 'full' | 'half' | 'empty';
}

function StarIcon({ type }: StarIconProps) {
  // Star dimensions
  const size = '1.125em';

  // Get background color based on star type
  const getGradient = () => {
    switch (type) {
      case 'full':
        return 'var(--color-gold)';
      case 'half':
        return 'linear-gradient(to right, var(--color-gold) 50%, #d6d3d1 50%)';
      case 'empty':
      default:
        return '#d6d3d1';
    }
  };

  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        position: 'relative',
        background: 'transparent',
      }}
    >
      {/* Star shape via CSS clip-path */}
      <span
        style={{
          content: '""',
          position: 'absolute',
          inset: 0,
          backgroundColor:
            type === 'half'
              ? 'transparent'
              : type === 'full'
                ? 'var(--color-gold)'
                : '#d6d3d1',
          backgroundImage:
            type === 'half'
              ? 'linear-gradient(to right, var(--color-gold) 50%, #d6d3d1 50%)'
              : 'none',
          clipPath: `polygon(
            50% 0%,
            61% 35%,
            98% 35%,
            68% 57%,
            79% 91%,
            50% 70%,
            21% 91%,
            32% 57%,
            2% 35%,
            39% 35%
          )`,
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
    </span>
  );
}
