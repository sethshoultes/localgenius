'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Global Header — appears on every page except /app, /digest, and /site/*.
 *
 * Logo left, nav links right, mobile hamburger.
 * Consistent across landing, about, pricing, sites, auth, onboarding.
 */

const NAV_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/sites', label: 'Sites' },
];

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Hide on app pages (AppShell has its own header) and site pages (own nav)
  if (pathname.startsWith('/app') || pathname.startsWith('/digest') || pathname.startsWith('/site/')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 bg-warm-white/95 backdrop-blur-sm border-b" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="max-w-[1120px] mx-auto px-screen-margin flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 no-underline">
          <div className="w-8 h-8 bg-terracotta rounded-md flex items-center justify-center">
            <span className="text-white font-semibold text-body">L</span>
          </div>
          <span className="text-h2 text-charcoal font-semibold">LocalGenius</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-5">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-body transition-colors no-underline ${
                pathname === link.href ? 'text-charcoal font-semibold' : 'text-slate hover:text-charcoal'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="text-body text-slate hover:text-charcoal transition-colors no-underline"
          >
            Sign in
          </Link>
          <Link
            href="/welcome"
            className="inline-flex items-center justify-center min-h-tap-min px-5 bg-terracotta text-white font-semibold rounded-sm hover:bg-terracotta-hover transition-colors no-underline text-caption"
          >
            Get started
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="sm:hidden flex flex-col gap-1.5 w-[44px] h-[44px] items-center justify-center"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <span className={`block w-5 h-0.5 bg-charcoal transition-transform ${menuOpen ? 'rotate-45 translate-y-1' : ''}`} />
          <span className={`block w-5 h-0.5 bg-charcoal transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-charcoal transition-transform ${menuOpen ? '-rotate-45 -translate-y-1' : ''}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden border-t px-screen-margin py-4 bg-warm-white" style={{ borderColor: 'var(--border-subtle)' }}>
          <nav className="flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`text-body no-underline py-2 ${
                  pathname === link.href ? 'text-charcoal font-semibold' : 'text-slate'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="text-body text-slate no-underline py-2"
            >
              Sign in
            </Link>
            <Link
              href="/welcome"
              onClick={() => setMenuOpen(false)}
              className="inline-flex items-center justify-center min-h-tap-min px-5 bg-terracotta text-white font-semibold rounded-sm hover:bg-terracotta-hover transition-colors no-underline text-body mt-2"
            >
              Get started
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
