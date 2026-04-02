'use client';

/**
 * TypingIndicator — Three pulsing dots when LocalGenius is thinking.
 *
 * Terracotta dots, staggered pulse animation.
 * Appears as a system-aligned bubble in the thread.
 * Disappears when the real response arrives.
 */

export default function TypingIndicator() {
  return (
    <div className="flex justify-start" aria-label="LocalGenius is thinking" role="status">
      <div className="bg-cream rounded-md rounded-bl-sm px-5 py-4 flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-terracotta"
            style={{
              animation: 'typingPulse 1.2s ease-in-out infinite',
              animationDelay: `${i * 200}ms`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes typingPulse {
          0%, 60%, 100% {
            opacity: 0.25;
            transform: scale(0.85);
          }
          30% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
