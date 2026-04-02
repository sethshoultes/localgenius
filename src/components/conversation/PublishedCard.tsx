'use client';

/**
 * PublishedCard — Confirmation after content is published.
 *
 * Appears in the thread after an ApprovalCard action succeeds.
 * Shows: platform, post preview, link to view live post.
 * The moment Maria sees her content is actually live.
 */

interface PublishedCardProps {
  platform: 'instagram' | 'facebook' | 'google';
  title: string;
  preview?: string;
  postUrl?: string;
  timestamp: string;
}

const PLATFORM_CONFIG = {
  instagram: { label: 'Instagram', icon: '📸', color: 'text-terracotta' },
  facebook: { label: 'Facebook', icon: '📘', color: 'text-terracotta' },
  google: { label: 'Google', icon: '🔍', color: 'text-terracotta' },
};

export default function PublishedCard({
  platform,
  title,
  preview,
  postUrl,
  timestamp,
}: PublishedCardProps) {
  const config = PLATFORM_CONFIG[platform];

  return (
    <article
      className="card-subtle animate-in flex flex-col gap-card-gap"
      aria-label={`Published to ${config.label}: ${title}`}
    >
      {/* Header with platform + checkmark */}
      <div className="flex items-center gap-2">
        <span className="text-body">{config.icon}</span>
        <span className="text-h2 text-charcoal">Posted to {config.label}</span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-sage ml-auto"
          style={{
            animation: 'checkmark 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
          }}
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      {/* Post preview */}
      {preview && (
        <p className="text-body text-charcoal">{preview}</p>
      )}

      {/* View live link */}
      {postUrl && (
        <a
          href={postUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-body text-terracotta-text font-semibold no-underline hover:underline inline-flex items-center gap-1"
        >
          View live post
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" x2="21" y1="14" y2="3" />
          </svg>
        </a>
      )}

      <span className="text-caption text-slate">{timestamp}</span>
    </article>
  );
}
