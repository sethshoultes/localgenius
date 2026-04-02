'use client';

interface SkeletonProps {
  variant?: 'text' | 'circle' | 'card' | 'image';
  width?: string;
  height?: string;
  lines?: number;
  className?: string;
}

function SkeletonLine({ width = '100%' }: { width?: string }) {
  return (
    <div
      className="h-4 bg-cream rounded-sm loading-glow"
      style={{ width }}
    />
  );
}

export default function Skeleton({
  variant = 'text',
  width,
  height,
  lines = 1,
  className = '',
}: SkeletonProps) {
  if (variant === 'circle') {
    return (
      <div
        className={`rounded-full bg-cream loading-glow ${className}`}
        style={{ width: width || '48px', height: height || '48px' }}
      />
    );
  }

  if (variant === 'image') {
    return (
      <div
        className={`rounded-sm bg-cream loading-glow ${className}`}
        style={{ width: width || '100%', height: height || '200px' }}
      />
    );
  }

  if (variant === 'card') {
    return (
      <div className={`card-subtle flex flex-col gap-card-gap ${className}`}>
        <SkeletonLine width="40%" />
        <SkeletonLine width="100%" />
        <SkeletonLine width="75%" />
      </div>
    );
  }

  // Text variant
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine
          key={i}
          width={i === lines - 1 && lines > 1 ? '60%' : width || '100%'}
        />
      ))}
    </div>
  );
}

// Pre-composed skeletons for common patterns

export function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-content-gap px-screen-margin py-6">
      {/* System message skeleton */}
      <div className="flex justify-start">
        <div className="max-w-[85%] bg-cream rounded-md rounded-bl-sm px-4 py-3">
          <Skeleton variant="text" lines={3} />
        </div>
      </div>
      {/* Approval card skeleton */}
      <Skeleton variant="card" />
      {/* Another system message */}
      <div className="flex justify-start">
        <div className="max-w-[85%] bg-cream rounded-md rounded-bl-sm px-4 py-3">
          <Skeleton variant="text" lines={2} />
        </div>
      </div>
    </div>
  );
}

export function DigestSkeleton() {
  return (
    <div className="digest-container px-screen-margin py-6 flex flex-col gap-section-gap">
      {/* Greeting */}
      <div className="flex flex-col gap-2">
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="text" width="30%" />
      </div>
      {/* Three act sections */}
      <Skeleton variant="card" />
      <Skeleton variant="image" height="120px" />
      <Skeleton variant="card" />
      <Skeleton variant="card" />
    </div>
  );
}

export function OnboardingDiscoverySkeleton() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6">
      <div className="loading-glow w-16 h-16 rounded-full" />
      <Skeleton variant="text" width="200px" />
      <div className="w-full max-w-sm flex flex-col gap-3 mt-4">
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="90%" />
        <Skeleton variant="text" width="70%" />
      </div>
    </div>
  );
}
