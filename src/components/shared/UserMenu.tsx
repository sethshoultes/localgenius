'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth-client';

/**
 * UserMenu — Business name + avatar initial in the app header.
 * Tap to show dropdown: business info, notification prefs, log out.
 * No settings page — this is the lightest touch of account management.
 */
export default function UserMenu() {
  const { user, business, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const initial = (business?.name || user?.name || 'M')[0].toUpperCase();

  return (
    <div ref={menuRef} className="relative">
      {/* Avatar button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-full bg-terracotta-light text-terracotta font-semibold text-body flex items-center justify-center hover:bg-terracotta hover:text-white transition-colors duration-fast"
        aria-label="Account menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {initial}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-12 w-[260px] bg-white rounded-md shadow-lg border overflow-hidden z-50 animate-in"
          style={{ borderColor: 'var(--border-default)' }}
          role="menu"
          aria-label="Account options"
        >
          {/* Business info */}
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <p className="text-body text-charcoal font-semibold">
              {business?.name || 'Your Business'}
            </p>
            <p className="text-caption text-slate">
              {user?.email || ''}
            </p>
            <span className="inline-block mt-1.5 px-2 py-0.5 bg-terracotta-light text-terracotta-text text-small font-semibold rounded-sm">
              Pro Plan
            </span>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                // TODO: navigate to notification preferences conversation
              }}
              className="w-full px-4 py-3 text-left text-body text-charcoal hover:bg-cream transition-colors flex items-center gap-3 min-h-tap-min"
              role="menuitem"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              Notification Preferences
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full px-4 py-3 text-left text-body text-error hover:bg-error-light transition-colors flex items-center gap-3 min-h-tap-min"
              role="menuitem"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-error">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
