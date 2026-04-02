'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * AppShell — Header + content + bottom nav.
 * Two tabs only. Per product-design.md: "If we ever feel
 * the need for a third icon, we've failed."
 */
export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="h-screen flex flex-col bg-warm-white">
      <header
        className="safe-area-top flex items-center justify-between px-screen-margin py-3 bg-white border-b flex-shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div>
          <h1 className="text-h2 text-charcoal">Maria&apos;s Kitchen</h1>
          <p className="text-caption text-sage">Everything&apos;s handled</p>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col min-h-0">
        {children}
      </main>

      <nav
        className="safe-area-bottom flex items-center justify-around bg-white border-t flex-shrink-0"
        style={{
          borderColor: 'var(--border-subtle)',
          height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        role="tablist"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          className={[
            'flex flex-col items-center justify-center gap-1',
            'w-12 h-12 transition-colors duration-100 no-underline',
            pathname === '/' ? 'text-terracotta' : 'text-slate hover:text-charcoal',
          ].join(' ')}
          role="tab"
          aria-selected={pathname === '/'}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill={pathname === '/' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-small">Thread</span>
        </Link>

        <Link
          href="/digest"
          className={[
            'flex flex-col items-center justify-center gap-1',
            'w-12 h-12 transition-colors duration-100 no-underline',
            pathname === '/digest' ? 'text-terracotta' : 'text-slate hover:text-charcoal',
          ].join(' ')}
          role="tab"
          aria-selected={pathname === '/digest'}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
          <span className="text-small">Digest</span>
        </Link>
      </nav>
    </div>
  );
}
