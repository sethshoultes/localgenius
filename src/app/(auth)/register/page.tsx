'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/shared/Button';
import { register, ApiError } from '@/lib/api';

const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'salon', label: 'Salon' },
  { value: 'dental', label: 'Dental' },
  { value: 'medical', label: 'Medical' },
  { value: 'home_services', label: 'Home Services' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'retail', label: 'Retail' },
  { value: 'other', label: 'Other' },
] as const;

type BusinessType = typeof BUSINESS_TYPES[number]['value'];

/**
 * Register page — collects all fields the API requires.
 * name, email, password, businessName, businessType, city, state.
 * Simple. Warm. Not institutional.
 */
export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('restaurant');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('What\'s your name?'); return; }
    if (!businessName.trim()) { setError('What\'s your business called?'); return; }
    if (!city.trim()) { setError('What city are you in?'); return; }
    if (!state.trim() || state.trim().length !== 2) { setError('Enter your 2-letter state (e.g. CA).'); return; }
    if (!email.trim()) { setError('We\'ll need your email.'); return; }
    if (password.length < 8) { setError('Password needs at least 8 characters.'); return; }

    setIsLoading(true);
    try {
      await register({
        name: name.trim(),
        email,
        password,
        businessName: businessName.trim(),
        businessType,
        city: city.trim(),
        state: state.trim().toUpperCase(),
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

  const inputClass = "w-full min-h-tap-min px-4 py-3 text-body text-charcoal placeholder:text-slate-light bg-cream rounded-md border border-transparent focus:border-terracotta outline-none transition-colors duration-fast";

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
      <div className="flex-1 flex items-start justify-center pt-12 px-screen-margin pb-12">
        <div className="w-full max-w-[400px]">
          <h1 className="text-[1.75rem] font-semibold text-charcoal leading-tight">
            Let&apos;s get you set up.
          </h1>
          <p className="text-body text-slate mt-2">
            Tell us a bit about you and your business.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">

            {/* Your name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-caption text-slate font-semibold">
                Your name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                placeholder="Maria"
                autoFocus
                autoComplete="given-name"
                className={inputClass}
              />
            </div>

            {/* Business name */}
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
                autoComplete="organization"
                className={inputClass}
              />
            </div>

            {/* Business type */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="businessType" className="text-caption text-slate font-semibold">
                Type of business
              </label>
              <select
                id="businessType"
                value={businessType}
                onChange={(e) => { setBusinessType(e.target.value as BusinessType); setError(''); }}
                className={inputClass}
              >
                {BUSINESS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* City + State on one row */}
            <div className="flex gap-3">
              <div className="flex flex-col gap-1.5 flex-1">
                <label htmlFor="city" className="text-caption text-slate font-semibold">
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => { setCity(e.target.value); setError(''); }}
                  placeholder="Austin"
                  autoComplete="address-level2"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5 w-20">
                <label htmlFor="state" className="text-caption text-slate font-semibold">
                  State
                </label>
                <input
                  id="state"
                  type="text"
                  value={state}
                  onChange={(e) => { setState(e.target.value.toUpperCase().slice(0, 2)); setError(''); }}
                  placeholder="TX"
                  autoComplete="address-level1"
                  maxLength={2}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Email */}
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
                className={inputClass}
              />
            </div>

            {/* Password */}
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
                className={inputClass}
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
