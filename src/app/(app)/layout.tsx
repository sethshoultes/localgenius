'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Two tabs only. Per product-design.md: "If we ever feel the need for a
  // third icon, we've failed at the core design."
  const tabs = [
    {
      id: 'thread',
      label: 'Thread',
      href: '/',
      isActive: pathname === '/',
      icon: (active: boolean) => (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      id: 'digest',
      label: 'Digest',
      href: '/digest',
      isActive: pathname === '/digest',
      icon: (active: boolean) => (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      ),
    },
  ];

  return (
    <div className="h-screen flex flex-col bg-warm-white">
      {/* Header */}
      <header
        className="safe-area-top flex items-center justify-between px-screen-margin py-3 bg-white border-b flex-shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div>
          <h1 className="text-h2 text-charcoal">Maria&apos;s Kitchen</h1>
          <p className="text-caption text-sage">Everything&apos;s handled</p>
        </div>
      </header>

      {/* Content — takes all remaining space above bottom nav */}
      <main className="flex-1 overflow-hidden flex flex-col min-h-0">
        {children}
      </main>

      {/* Bottom navigation — fixed, two items only */}
      <nav
        className="safe-area-bottom flex items-center justify-around bg-white border-t flex-shrink-0"
        style={{
          borderColor: 'var(--border-subtle)',
          height: `calc(60px + env(safe-area-inset-bottom, 0px))`,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        role="tablist"
        aria-label="Main navigation"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={[
              'flex flex-col items-center justify-center gap-1',
              'w-[var(--tap-target-nav)] h-[var(--tap-target-nav)]',
              'transition-colors duration-instant',
              'no-underline',
              tab.isActive ? 'text-terracotta' : 'text-slate hover:text-charcoal',
            ].join(' ')}
            role="tab"
            aria-selected={tab.isActive}
            aria-label={tab.label}
          >
            {tab.icon(tab.isActive)}
            <span className="text-small">{tab.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
