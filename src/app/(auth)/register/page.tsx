'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/shared/Button';
import { register, ApiError } from '@/lib/api';

/**
 * Register page — email, password, business name on one screen.
 * Submit → creates account → redirects to onboarding.
 * Simple. Warm. Not institutional.
 */
export default function RegisterPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!businessName.trim()) { setError('What\'s your business called?'); return; }
    if (!email.trim()) { setError('We\'ll need your email.'); return; }
    if (password.length < 8) { setError('Password needs at least 8 characters.'); return; }

    setIsLoading(true);
    try {
      await register({
        email,
        password,
        businessName,
        businessType: '',
        city: '',
      });
      router.push('/welcome');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('That email is already in use. Want to sign in instead?');
      } else {
        setError('Something went wrong. Give it another try.');
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
            Let&apos;s get you set up.
          </h1>
          <p className="text-body text-slate mt-2">
            Three things, then we build your business something beautiful.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="businessName" className="text-caption text-slate font-semibold">
                Business name
              </label>
              <input
                id="businessName"
                type="text"
                value={businessName}
                onChange={(e) => { setBusinessName(e.target.value); setError(''); }}
                placeholder="Maria's Kitchen"
                autoFocus
                className="w-full min-h-tap-min px-4 py-3 text-body text-charcoal placeholder:text-slate-light bg-cream rounded-md border border-transparent focus:border-terracotta outline-none transition-colors duration-fast"
              />
            </div>

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
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className="w-full min-h-tap-min px-4 py-3 text-body text-charcoal placeholder:text-slate-light bg-cream rounded-md border border-transparent focus:border-terracotta outline-none transition-colors duration-fast"
              />
            </div>

            {error && (
              <p className="text-body text-error" role="alert">{error}</p>
            )}

            <Button
              variant="primary"
              label="Create account"
              type="submit"
              fullWidth
              loading={isLoading}
            />

            <p className="text-caption text-slate text-center">
              No credit card required. No contracts.
            </p>
          </form>

          <div className="mt-8 text-center">
            <p className="text-body text-slate">
              Already have an account?
            </p>
            <Link
              href="/login"
              className="text-body text-terracotta-text font-semibold no-underline hover:underline mt-1 inline-block"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
