'use client';

/**
 * Client-Side Auth Utility
 *
 * JWT stored in httpOnly cookie (not localStorage — XSS-safe).
 * Auto-refreshes token before expiry. Redirects to /login on session expire.
 * Provides useAuth() hook for React components.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
}

interface Business {
  id: string;
  name: string;
  vertical?: string;
  onboardingCompleted?: boolean;
}

interface AuthState {
  user: User | null;
  business: Business | null;
  plan: 'base' | 'pro' | 'franchise' | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Login — sends credentials, sets httpOnly cookie via Set-Cookie header.
 */
export async function login(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include', // ensures cookies are sent/received
    });

    if (!res.ok) {
      const body = await res.json();
      return { success: false, error: body.error?.message || 'Login failed' };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Network error' };
  }
}

/**
 * Register — creates account, sets httpOnly cookie.
 */
export async function register(data: {
  email: string;
  password: string;
  name: string;
  businessName: string;
  businessType?: string;
  city: string;
  state: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!res.ok) {
      const body = await res.json();
      return { success: false, error: body.error?.message || 'Registration failed' };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Network error' };
  }
}

/**
 * Refresh session — extends the JWT before it expires.
 */
async function refreshSession(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Logout — clears auth cookie server-side.
 */
async function logoutRequest(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // Best effort — cookie will expire naturally
  }
}

/**
 * Fetch current session from server.
 */
async function fetchSession(): Promise<{ user: User; business: Business; plan: string } | null> {
  try {
    const res = await fetch('/api/auth/session', {
      credentials: 'include',
    });

    if (!res.ok) return null;

    const body = await res.json();
    return body.data || null;
  } catch {
    return null;
  }
}

// ─── React Hook ───────────────────────────────────────────────────────────────

/**
 * useAuth() — provides auth state + logout for React components.
 *
 * Usage:
 *   const { user, business, isLoading, isAuthenticated, logout } = useAuth();
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    business: null,
    plan: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load session on mount
  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const session = await fetchSession();

      if (!mounted) return;

      if (session) {
        setState({
          user: session.user,
          business: session.business,
          plan: (session.plan as 'base' | 'pro' | 'franchise') || 'base',
          isLoading: false,
          isAuthenticated: true,
        });

        // Schedule auto-refresh (12 minutes — token expires at 15)
        scheduleRefresh();
      } else {
        setState({
          user: null,
          business: null,
          plan: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    }

    loadSession();

    return () => {
      mounted = false;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, []);

  function scheduleRefresh() {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);

    // Refresh 3 minutes before expiry (token lives 15 min)
    refreshTimer.current = setTimeout(async () => {
      const success = await refreshSession();
      if (success) {
        scheduleRefresh(); // re-schedule after successful refresh
      } else {
        // Session expired — redirect to login
        setState({
          user: null,
          business: null,
          plan: null,
          isLoading: false,
          isAuthenticated: false,
        });
        window.location.href = '/login';
      }
    }, 12 * 60 * 1000); // 12 minutes
  }

  const logout = useCallback(async () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    await logoutRequest();
    setState({
      user: null,
      business: null,
      plan: null,
      isLoading: false,
      isAuthenticated: false,
    });
    window.location.href = '/login';
  }, []);

  return {
    user: state.user,
    business: state.business,
    plan: state.plan,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    logout,
  };
}
