'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Global Footer — appears on every page except /app, /digest, and /site/*.
 *
 * Logo, nav links, copyright. Consistent everywhere.
 */

export default function GlobalFooter() {
  const pathname = usePathname();

  // Hide on app pages (AppShell has its own chrome) and site pages (own footer)
  if (pathname.startsWith('/app') || pathname.startsWith('/digest') || pathname.startsWith('/site/')) {
    return null;
  }

  return (
    <footer className="border-t mt-auto" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="max-w-[1120px] mx-auto px-screen-margin py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Logo + tagline */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-terracotta rounded-sm flex items-center justify-center">
              <span className="text-white font-semibold text-small">L</span>
            </div>
            <span className="text-body text-charcoal font-semibold">LocalGenius</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4 text-caption text-slate">
            <Link href="/about" className="hover:text-charcoal transition-colors no-underline text-caption text-slate">
              About
            </Link>
            <span>·</span>
            <Link href="/pricing" className="hover:text-charcoal transition-colors no-underline text-caption text-slate">
              Pricing
            </Link>
            <span>·</span>
            <Link href="/sites" className="hover:text-charcoal transition-colors no-underline text-caption text-slate">
              Sites
            </Link>
            <span>·</span>
            <span>Austin, TX</span>
          </div>

          {/* Tagline */}
          <p className="text-small text-slate-light">
            Your business, handled.
          </p>
        </div>
      </div>
    </footer>
  );
}
