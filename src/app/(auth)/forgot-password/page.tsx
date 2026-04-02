'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/shared/Button';

/**
 * Forgot Password — Maria locked herself out at 10pm.
 * This page should feel like a warm hand on the shoulder,
 * not a bureaucratic process. Quick, simple, reassuring.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError("What's your email?");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Request failed');
      }

      setSent(true);
    } catch {
      setError('Something went wrong. Give it another try.');
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-warm-white flex flex-col">
        {/* Header */}
        <div className="px-screen-margin py-6">
          <Link href="/" className="flex items-center gap-2 no-underline w-fit">
            <div className="w-8 h-8 bg-terracotta rounded-md flex items-center justify-center">
              <span className="text-white font-semibold text-body">L</span>
            </div>
            <span className="text-h2 text-charcoal">LocalGenius</span>
          </Link>
        </div>

        {/* Success */}
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
              Check your email.
            </h1>
            <p className="text-body text-slate mt-3 leading-relaxed">
              If there&apos;s an account with that email, I sent a link to reset
              your password. It&apos;ll expire in an hour.
            </p>
            <p className="text-body text-slate mt-4 leading-relaxed">
              Don&apos;t see it? Check your spam folder. Sometimes I end up
              there.
            </p>

            <div className="mt-8">
              <Link
                href="/login"
                className="text-body text-terracotta-text font-semibold no-underline hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-white flex flex-col">
      {/* Header */}
      <div className="px-screen-margin py-6">
        <Link href="/" className="flex items-center gap-2 no-underline w-fit">
          <div className="w-8 h-8 bg-terracotta rounded-md flex items-center justify-center">
            <span className="text-white font-semibold text-body">L</span>
          </div>
          <span className="text-h2 text-charcoal">LocalGenius</span>
        </Link>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-start justify-center pt-12 px-screen-margin">
        <div className="w-full max-w-[400px]">
          <h1 className="text-[1.75rem] font-semibold text-charcoal leading-tight">
            Forgot your password?
          </h1>
          <p className="text-body text-slate mt-2">
            No worries. Enter your email and I&apos;ll send you a reset link.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-caption text-slate font-semibold">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="maria@mariaskitchen.com"
                autoComplete="email"
                autoFocus
                className="w-full min-h-tap-min px-4 py-3 text-body text-charcoal placeholder:text-slate-light bg-cream rounded-md border border-transparent focus:border-terracotta outline-none transition-colors duration-fast"
              />
            </div>

            {error && (
              <p className="text-body text-error" role="alert">{error}</p>
            )}

            <Button
              variant="primary"
              label="Send reset link"
              type="submit"
              fullWidth
              loading={isLoading}
            />
          </form>

          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="text-body text-terracotta-text font-semibold no-underline hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
