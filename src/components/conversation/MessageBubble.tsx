'use client';

type MessageVariant = 'user' | 'system';

interface MessageBubbleProps {
  variant: MessageVariant;
  content: string;
  timestamp: string;
  showTimestamp?: boolean;
  status?: 'sending' | 'sent' | 'failed';
}

export default function MessageBubble({
  variant,
  content,
  timestamp,
  showTimestamp = false,
  status = 'sent',
}: MessageBubbleProps) {
  const isUser = variant === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[${isUser ? '80' : '85'}%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Bubble */}
        <div
          className={[
            'px-4 py-3 text-body text-charcoal',
            'transition-opacity duration-fast',
            isUser
              ? 'bg-terracotta-light rounded-md rounded-br-sm'
              : 'bg-cream rounded-md rounded-bl-sm',
            status === 'sending' ? 'opacity-70' : 'opacity-100',
          ].join(' ')}
        >
          {content}
          {status === 'failed' && (
            <button
              className="ml-2 text-terracotta text-caption inline-flex items-center gap-1"
              aria-label="Message failed. Tap to retry."
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
              Retry
            </button>
          )}
        </div>

        {/* Timestamp */}
        {showTimestamp && (
          <span className="text-caption text-slate mt-1 px-1">
            {timestamp}
          </span>
        )}
      </div>
    </div>
  );
}
