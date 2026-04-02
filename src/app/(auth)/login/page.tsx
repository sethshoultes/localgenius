'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/shared/Button';
import { login, ApiError } from '@/lib/api';

/**
 * Login page — the second thing Maria sees after the landing page.
 * Welcoming, not institutional. Email + password. That's it.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) { setError('What\'s your email?'); return; }
    if (!password) { setError('You\'ll need your password.'); return; }

    setIsLoading(true);
    try {
      await login(email, password);
      router.push('/app');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('That email and password don\'t match. Want to try again?');
      } else {
        setError('Something went wrong on our end. Give it another try.');
      }
    } finally {
      setIsLoading(false);
    }
  };

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
            Welcome back.
          </h1>
          <p className="text-body text-slate mt-2">
            Your business missed you.
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

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-caption text-slate font-semibold">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Your password"
                autoComplete="current-password"
                className="w-full min-h-tap-min px-4 py-3 text-body text-charcoal placeholder:text-slate-light bg-cream rounded-md border border-transparent focus:border-terracotta outline-none transition-colors duration-fast"
              />
            </div>

            {error && (
              <p className="text-body text-error" role="alert">{error}</p>
            )}

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-caption text-slate hover:text-terracotta-text no-underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              variant="primary"
              label="Sign in"
              type="submit"
              fullWidth
              loading={isLoading}
            />
          </form>

          <div className="mt-8 text-center">
            <p className="text-body text-slate">
              Don&apos;t have an account?
            </p>
            <Link
              href="/welcome"
              className="text-body text-terracotta-text font-semibold no-underline hover:underline mt-1 inline-block"
            >
              Get started in 5 minutes
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
