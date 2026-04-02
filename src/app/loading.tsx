/**
 * Global loading state — appears during page transitions.
 * Simple, warm, confident. Just the wordmark with a pulse.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-warm-white flex items-center justify-center">
      <div className="flex items-center gap-3" style={{ animation: 'pulseGlow 1.5s ease-in-out infinite' }}>
        <div className="w-10 h-10 bg-terracotta rounded-md flex items-center justify-center">
          <span className="text-white font-semibold text-h2">L</span>
        </div>
        <span className="text-h1 text-charcoal">LocalGenius</span>
      </div>
    </div>
  );
}
