import Link from 'next/link';

/**
 * Marketing layout — shared nav for landing, pricing, about.
 * Clean, minimal. Logo left, links right, CTA button.
 * No auth required. Public pages.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-warm-white">
      {/* Nav */}
      <nav className="px-screen-margin py-4 flex items-center justify-between max-w-[1120px] mx-auto">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <div className="w-8 h-8 bg-terracotta rounded-md flex items-center justify-center">
            <span className="text-white font-semibold text-body">L</span>
          </div>
          <span className="text-h2 text-charcoal">LocalGenius</span>
        </Link>

        <div className="flex items-center gap-5">
          <Link
            href="/about"
            className="text-body text-slate hover:text-charcoal transition-colors no-underline hidden sm:inline"
          >
            About
          </Link>
          <Link
            href="/pricing"
            className="text-body text-slate hover:text-charcoal transition-colors no-underline hidden sm:inline"
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="text-body text-slate hover:text-charcoal transition-colors no-underline hidden sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/welcome"
            className="inline-flex items-center justify-center min-h-tap-min px-5 bg-terracotta text-white font-semibold rounded-sm hover:bg-terracotta-hover transition-colors no-underline text-caption"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Page content */}
      {children}

      {/* Footer */}
      <footer className="px-screen-margin py-8 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-[1120px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-terracotta rounded-sm flex items-center justify-center">
              <span className="text-white font-semibold text-small">L</span>
            </div>
            <span className="text-body text-charcoal font-semibold">LocalGenius</span>
          </div>
          <div className="flex items-center gap-4 text-caption text-slate">
            <Link href="/about" className="hover:text-charcoal transition-colors no-underline text-caption text-slate">About</Link>
            <span>·</span>
            <Link href="/pricing" className="hover:text-charcoal transition-colors no-underline text-caption text-slate">Pricing</Link>
            <span>·</span>
            <span>Austin, TX</span>
          </div>
          <p className="text-small text-slate-light">
            Your business, handled.
          </p>
        </div>
      </footer>
    </div>
  );
}
