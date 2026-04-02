/**
 * Tests for src/lib/env.ts — Environment variable validation with Zod
 *
 * Verifies:
 * 1. getEnv() validates and caches environment variables
 * 2. Missing required vars throw clear error messages
 * 3. getServiceStatus() reports configured/not_configured for each service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('env', () => {
  beforeEach(() => {
    // Clear the module cache before each test to reset _env
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getEnv()', () => {
    it('returns validated env when all required vars are set', async () => {
      // Set up minimal required environment
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');
      vi.stubEnv('JWT_SECRET', 'a'.repeat(32));
      vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test-key');
      vi.stubEnv('NODE_ENV', 'test');

      const { getEnv } = await import('@/lib/env');
      const env = getEnv();

      expect(env.DATABASE_URL).toBe('postgresql://localhost/test');
      expect(env.JWT_SECRET).toBe('a'.repeat(32));
      expect(env.ANTHROPIC_API_KEY).toBe('sk-ant-test-key');
      expect(env.NODE_ENV).toBe('test');
    });

    it('caches the result on subsequent calls', async () => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');
      vi.stubEnv('JWT_SECRET', 'a'.repeat(32));
      vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test-key');

      const { getEnv } = await import('@/lib/env');
      const env1 = getEnv();
      const env2 = getEnv();

      // Should return the exact same object (cached)
      expect(env1).toBe(env2);
    });

    it('throws when DATABASE_URL is missing', async () => {
      vi.stubEnv('JWT_SECRET', 'a'.repeat(32));
      vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test-key');
      // DATABASE_URL intentionally not set

      const { getEnv } = await import('@/lib/env');
      expect(() => getEnv()).toThrow(/DATABASE_URL/);
      expect(() => getEnv()).toThrow(/database-setup/);
    });

    it('throws when DATABASE_URL is empty', async () => {
      vi.stubEnv('DATABASE_URL', '');
      vi.stubEnv('JWT_SECRET', 'a'.repeat(32));
      vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test-key');

      const { getEnv } = await import('@/lib/env');
      expect(() => getEnv()).toThrow(/DATABASE_URL/);
      expect(() => getEnv()).toThrow(/empty/);
    });

    it('throws when JWT_SECRET is missing', async () => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');
      vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test-key');
      // JWT_SECRET intentionally not set

      const { getEnv } = await import('@/lib/env');
      expect(() => getEnv()).toThrow(/JWT_SECRET/);
      expect(() => getEnv()).toThrow(/openssl rand/);
    });

    it('throws when JWT_SECRET is too short', async () => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');
      vi.stubEnv('JWT_SECRET', 'short');
      vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test-key');

      const { getEnv } = await import('@/lib/env');
      expect(() => getEnv()).toThrow(/JWT_SECRET/);
      expect(() => getEnv()).toThrow(/32 characters/);
    });

    it('throws when ANTHROPIC_API_KEY is missing', async () => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');
      vi.stubEnv('JWT_SECRET', 'a'.repeat(32));
      // ANTHROPIC_API_KEY intentionally not set

      const { getEnv } = await import('@/lib/env');
      expect(() => getEnv()).toThrow(/ANTHROPIC_API_KEY/);
      expect(() => getEnv()).toThrow(/console.anthropic.com/);
    });

    it('throws error with all missing vars listed', async () => {
      // Set no required vars
      const { getEnv } = await import('@/lib/env');

      // Just verify that it throws — the error will contain multiple issues
      expect(() => getEnv()).toThrow();
    });

    it('allows NODE_ENV to be set to test', async () => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');
      vi.stubEnv('JWT_SECRET', 'a'.repeat(32));
      vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test-key');
      vi.stubEnv('NODE_ENV', 'test');

      const { getEnv } = await import('@/lib/env');
      const env = getEnv();

      expect(env.NODE_ENV).toBe('test');
    });

    it('includes default values for NEXT_PUBLIC_APP_URL if not set', async () => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');
      vi.stubEnv('JWT_SECRET', 'a'.repeat(32));
      vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test-key');
      // Don't set NEXT_PUBLIC_APP_URL, should default

      const { getEnv } = await import('@/lib/env');
      const env = getEnv();

      expect(env.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000');
    });

    it('allows optional vars to be undefined', async () => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');
      vi.stubEnv('JWT_SECRET', 'a'.repeat(32));
      vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test-key');
      // Don't set optional vars like STRIPE_SECRET_KEY

      const { getEnv } = await import('@/lib/env');
      const env = getEnv();

      expect(env.STRIPE_SECRET_KEY).toBeUndefined();
      expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
      expect(env.RESEND_API_KEY).toBeUndefined();
    });
  });

  describe('getServiceStatus()', () => {
    it('returns configured for each service when env vars are set', async () => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');
      vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test-key');
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_xyz');
      vi.stubEnv('GOOGLE_CLIENT_ID', 'google-id');
      vi.stubEnv('META_APP_ID', 'meta-id');
      vi.stubEnv('YELP_API_KEY', 'yelp-key');
      vi.stubEnv('RESEND_API_KEY', 'resend-key');
      vi.stubEnv('TWILIO_ACCOUNT_SID', 'twilio-sid');
      vi.stubEnv('SENTRY_DSN', 'sentry-dsn');

      const { getServiceStatus } = await import('@/lib/env');
      const status = getServiceStatus();

      expect(status.database).toBe('configured');
      expect(status.ai).toBe('configured');
      expect(status.stripe).toBe('configured');
      expect(status.google).toBe('configured');
      expect(status.meta).toBe('configured');
      expect(status.yelp).toBe('configured');
      expect(status.email).toBe('configured');
      expect(status.sms).toBe('configured');
      expect(status.monitoring).toBe('configured');
    });

    it('returns not_configured when service vars are missing', async () => {
      // Set nothing
      const { getServiceStatus } = await import('@/lib/env');
      const status = getServiceStatus();

      expect(status.database).toBe('not_configured');
      expect(status.ai).toBe('not_configured');
      expect(status.stripe).toBe('not_configured');
      expect(status.google).toBe('not_configured');
      expect(status.meta).toBe('not_configured');
      expect(status.yelp).toBe('not_configured');
      expect(status.email).toBe('not_configured');
      expect(status.sms).toBe('not_configured');
      expect(status.monitoring).toBe('not_configured');
    });

    it('returns mixed status for partially configured services', async () => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');
      vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test-key');
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_xyz');
      // Don't set other optional services

      const { getServiceStatus } = await import('@/lib/env');
      const status = getServiceStatus();

      expect(status.database).toBe('configured');
      expect(status.ai).toBe('configured');
      expect(status.stripe).toBe('configured');
      expect(status.google).toBe('not_configured');
      expect(status.meta).toBe('not_configured');
      expect(status.yelp).toBe('not_configured');
      expect(status.email).toBe('not_configured');
      expect(status.sms).toBe('not_configured');
      expect(status.monitoring).toBe('not_configured');
    });

    it('can be called multiple times without side effects', async () => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_xyz');

      const { getServiceStatus } = await import('@/lib/env');
      const status1 = getServiceStatus();
      const status2 = getServiceStatus();

      expect(status1.database).toBe(status2.database);
      expect(status1.stripe).toBe(status2.stripe);
    });
  });
});
