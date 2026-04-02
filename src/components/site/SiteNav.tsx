import Link from 'next/link';
import { useState } from 'react';

export interface NavLink {
  label: string;
  href: string;
}

export interface SiteNavProps {
  businessName: string;
  businessSlug: string;
  links?: NavLink[];
}

const defaultLinks: NavLink[] = [
  { label: 'Menu', href: '#menu' },
  { label: 'Contact', href: '#contact' },
];

/**
 * SiteNav — Sticky navigation bar for public business sites
 *
 * Features:
 * - Sticky positioning with subtle shadow
 * - Business name in Lora (serif display font)
 * - Responsive hamburger menu (CSS-only on mobile)
 * - Brand color hover states
 * - Default links: Menu, Contact (relative to /site/{businessSlug}/)
 */
export default function SiteNav({
  businessName,
  businessSlug,
  links = defaultLinks,
}: SiteNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = () => setIsOpen(false);

  return (
    <nav
      className="sticky top-0 z-100 bg-white"
      style={{
        boxShadow: 'var(--shadow-sm)',
      }}
      aria-label="Main navigation"
    >
      <div
        className="flex items-center justify-between px-5 md:px-10 h-16 gap-6"
        style={{
          maxWidth: '100%',
          margin: '0 auto',
        }}
      >
        {/* Brand */}
        <Link
          href={`/site/${businessSlug}/`}
          className="no-underline whitespace-nowrap"
          style={{
            fontFamily: "'Lora', 'Georgia', serif",
            fontSize: '1.375rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            lineHeight: 1,
            transition: 'color var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--action-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
        >
          {businessName}
        </Link>

        {/* CSS-only Hamburger Toggle (hidden via sr-only on desktop) */}
        <input
          type="checkbox"
          id="nav-toggle"
          className="sr-only"
          aria-label="Toggle navigation menu"
          checked={isOpen}
          onChange={(e) => setIsOpen(e.target.checked)}
        />

        {/* Hamburger Button */}
        <label
          htmlFor="nav-toggle"
          className="hidden md:hidden flex-col justify-center gap-1.5 w-8 h-8 cursor-pointer"
          aria-hidden="true"
        >
          <span
            className="block w-full h-0.5 bg-current rounded-sm transition-transform"
            style={{
              transform: isOpen ? 'translateY(7px) rotate(45deg)' : 'none',
              transition: 'transform 250ms ease',
            }}
          />
          <span
            className="block w-full h-0.5 bg-current rounded-sm transition-opacity"
            style={{
              opacity: isOpen ? 0 : 1,
              transition: 'opacity 250ms ease',
            }}
          />
          <span
            className="block w-full h-0.5 bg-current rounded-sm transition-transform"
            style={{
              transform: isOpen ? 'translateY(-7px) rotate(-45deg)' : 'none',
              transition: 'transform 250ms ease',
            }}
          />
        </label>

        {/* Navigation Links */}
        <ul
          className="hidden md:flex items-center gap-8 list-none m-0 p-0"
          role="list"
          style={{
            maxHeight: isOpen ? '20rem' : 0,
            overflow: 'hidden',
            transition: 'max-height var(--transition-normal)',
          }}
        >
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={`/site/${businessSlug}/${link.href.replace(/^#/, '')}`}
                className="no-underline"
                style={{
                  fontFamily: 'var(--font-family-sans)',
                  fontSize: '0.9375rem',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.02em',
                  position: 'relative',
                  paddingBottom: '0.25rem',
                  transition: 'color var(--transition-fast)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  const after = e.currentTarget.querySelector('::after');
                  if (after) {
                    (after as HTMLElement).style.width = '100%';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  const after = e.currentTarget.querySelector('::after');
                  if (after) {
                    (after as HTMLElement).style.width = '0';
                  }
                }}
              >
                {link.label}
                <span
                  className="absolute bottom-[-2px] left-0 h-0.5 bg-current"
                  style={{
                    width: 0,
                    backgroundColor: 'var(--action-primary)',
                    transition: 'width 200ms ease',
                  }}
                />
              </Link>
            </li>
          ))}
        </ul>

        {/* Mobile Menu */}
        {isOpen && (
          <ul
            className="absolute top-16 left-0 right-0 flex flex-col gap-0 list-none m-0 p-0 md:hidden"
            role="list"
            style={{
              backgroundColor: 'white',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {links.map((link) => (
              <li key={link.href} className="w-full border-b border-gray-200">
                <Link
                  href={`/site/${businessSlug}/${link.href.replace(/^#/, '')}`}
                  className="block no-underline px-6 py-3.5 text-base"
                  style={{
                    fontFamily: 'var(--font-family-sans)',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    borderBottom: '1px solid var(--border-default)',
                    transition: 'color var(--transition-fast)',
                  }}
                  onClick={handleClose}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </nav>
  );
}
