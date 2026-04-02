'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/shared/Button';

/**
 * Reset Password — Maria clicked the link in her email.
 * She's tired, it's late. Make this fast.
 * One field. One button. Done.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen bg-warm-white flex flex-col">
        <div className="px-screen-margin py-6">
          <Link href="/" className="flex items-center gap-2 no-underline w-fit">
            <div className="w-8 h-8 bg-terracotta rounded-md flex items-center justify-center">
              <span className="text-white font-semibold text-body">L</span>
            </div>
            <span className="text-h2 text-charcoal">LocalGenius</span>
          </Link>
        </div>
        <div className="flex-1 flex items-start justify-center pt-12 px-screen-margin">
          <div className="w-full max-w-[400px]">
            <h1 className="text-[1.75rem] font-semibold text-charcoal leading-tight">
              This link doesn&apos;t look right.
            </h1>
            <p className="text-body text-slate mt-3">
              The reset link may have expired or been used already.
              Want to try again?
            </p>
            <div className="mt-6">
              <Link href="/forgot-password">
                <Button variant="primary" label="Request a new link" fullWidth />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) { setError('Pick a new password.'); return; }
    if (password.length < 8) { setError('Make it at least 8 characters.'); return; }
    if (password !== confirm) { setError("Those passwords don't match."); return; }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body.error?.message || 'Something went wrong.';
        if (res.status === 401) {
          setError('This link has expired. Request a new one.');
        } else {
          setError(msg);
        }
        return;
      }

      setDone(true);
    } catch {
      setError('Something went wrong. Give it another try.');
    } finally {
      setIsLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-warm-white flex flex-col">
        <div className="px-screen-margin py-6">
          <Link href="/" className="flex items-center gap-2 no-underline w-fit">
            <div className="w-8 h-8 bg-terracotta rounded-md flex items-center justify-center">
              <span className="text-white font-semibold text-body">L</span>
            </div>
            <span className="text-h2 text-charcoal">LocalGenius</span>
          </Link>
        </div>
        <div className="flex-1 flex items-start justify-center pt-12 px-screen-margin">
          <div className="w-full max-w-[400px]">
            <div
              className="w-16 h-16 rounded-full bg-sage-light flex items-center justify-center mb-6"
              style={{ animation: 'fadeUp 400ms cubic-bezier(0, 0, 0.2, 1) both' }}
            >
              <svg
                width="32" height="32" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className="text-sage"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className="text-[1.75rem] font-semibold text-charcoal leading-tight">
              Password updated.
            </h1>
            <p className="text-body text-slate mt-3">
              You&apos;re all set. Sign in with your new password.
            </p>
            <div className="mt-6">
              <Button
                variant="primary"
                label="Sign in"
                fullWidth
                onClick={() => router.push('/login')}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-white flex flex-col">
      <div className="px-screen-margin py-6">
        <Link href="/" className="flex items-center gap-2 no-underline w-fit">
          <div className="w-8 h-8 bg-terracotta rounded-md flex items-center justify-center">
            <span className="text-white font-semibold text-body">L</span>
          </div>
          <span className="text-h2 text-charcoal">LocalGenius</span>
        </Link>
      </div>

      <div className="flex-1 flex items-start justify-center pt-12 px-screen-margin">
        <div className="w-full max-w-[400px]">
          <h1 className="text-[1.75rem] font-semibold text-charcoal leading-tight">
            Pick a new password.
          </h1>
          <p className="text-body text-slate mt-2">
            Make it something you&apos;ll remember.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-caption text-slate font-semibold">
                New password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                autoFocus
                className="w-full min-h-tap-min px-4 py-3 text-body text-charcoal placeholder:text-slate-light bg-cream rounded-md border border-transparent focus:border-terracotta outline-none transition-colors duration-fast"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm" className="text-caption text-slate font-semibold">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                placeholder="Type it again"
                autoComplete="new-password"
                className="w-full min-h-tap-min px-4 py-3 text-body text-charcoal placeholder:text-slate-light bg-cream rounded-md border border-transparent focus:border-terracotta outline-none transition-colors duration-fast"
              />
            </div>

            {error && (
              <p className="text-body text-error" role="alert">{error}</p>
            )}

            <Button
              variant="primary"
              label="Reset password"
              type="submit"
              fullWidth
              loading={isLoading}
            />
          </form>
        </div>
      </div>
    </div>
  );
}
