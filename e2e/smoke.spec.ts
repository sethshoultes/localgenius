import { test, expect } from '@playwright/test';

/**
 * Smoke test — verifies the critical register → onboarding → login flow.
 * Uses a unique email per run to avoid 409 conflicts.
 */
const TEST_EMAIL = `smoke-${Date.now()}@test.localgenius.dev`;
const TEST_PASSWORD = 'TestPass123!';
const TEST_BUSINESS = 'Smoke Test Bakery';

test.describe('Auth Smoke Test', () => {
  test.describe('Registration', () => {
    test('renders the register page with all form fields', async ({ page }) => {
      await page.goto('/register');

      await expect(
        page.getByText("Let's get you set up."),
      ).toBeVisible();

      await expect(page.getByLabel(/business name/i)).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(
        page.getByRole('button', { name: /create account/i }),
      ).toBeVisible();
    });

    test('shows validation error when business name is empty', async ({
      page,
    }) => {
      await page.goto('/register');

      await page.getByRole('button', { name: /create account/i }).click();

      await expect(
        page.getByText(/what's your business called/i),
      ).toBeVisible();
    });

    test('shows validation error when email is empty', async ({ page }) => {
      await page.goto('/register');

      await page.getByLabel(/business name/i).fill(TEST_BUSINESS);
      await page.getByRole('button', { name: /create account/i }).click();

      await expect(
        page.getByText(/we'll need your email/i),
      ).toBeVisible();
    });

    test('shows validation error when password is too short', async ({
      page,
    }) => {
      await page.goto('/register');

      await page.getByLabel(/business name/i).fill(TEST_BUSINESS);
      await page.getByLabel(/email/i).fill(TEST_EMAIL);
      await page.getByLabel(/password/i).fill('short');
      await page.getByRole('button', { name: /create account/i }).click();

      await expect(
        page.getByText(/at least 8 characters/i),
      ).toBeVisible();
    });

    test('fills form and submits registration', async ({ page }) => {
      await page.goto('/register');

      await page.getByLabel(/business name/i).fill(TEST_BUSINESS);
      await page.getByLabel(/email/i).fill(TEST_EMAIL);
      await page.getByLabel(/password/i).fill(TEST_PASSWORD);
      await page.getByRole('button', { name: /create account/i }).click();

      // Successful registration redirects to onboarding (/welcome)
      await expect(page).toHaveURL(/\/welcome/, { timeout: 10_000 });
    });

    test('has a link to the login page', async ({ page }) => {
      await page.goto('/register');

      const signInLink = page.getByRole('link', { name: /sign in/i });
      await expect(signInLink).toBeVisible();
      await expect(signInLink).toHaveAttribute('href', '/login');
    });
  });

  test.describe('Login', () => {
    test('renders the login page with all form fields', async ({ page }) => {
      await page.goto('/login');

      await expect(page.getByText('Welcome back.')).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(
        page.getByRole('button', { name: /sign in/i }),
      ).toBeVisible();
    });

    test('shows validation error when email is empty', async ({ page }) => {
      await page.goto('/login');

      await page.getByRole('button', { name: /sign in/i }).click();

      await expect(
        page.getByText(/what's your email/i),
      ).toBeVisible();
    });

    test('shows validation error when password is empty', async ({ page }) => {
      await page.goto('/login');

      await page.getByLabel(/email/i).fill('someone@example.com');
      await page.getByRole('button', { name: /sign in/i }).click();

      await expect(
        page.getByText(/you'll need your password/i),
      ).toBeVisible();
    });

    test('fills form and submits login', async ({ page }) => {
      await page.goto('/login');

      await page.getByLabel(/email/i).fill(TEST_EMAIL);
      await page.getByLabel(/password/i).fill(TEST_PASSWORD);
      await page.getByRole('button', { name: /sign in/i }).click();

      // Successful login redirects to the app dashboard
      await expect(page).toHaveURL(/\/app/, { timeout: 10_000 });
    });

    test('has a link to get started (register)', async ({ page }) => {
      await page.goto('/login');

      const getStartedLink = page.getByRole('link', {
        name: /get started/i,
      });
      await expect(getStartedLink).toBeVisible();
      await expect(getStartedLink).toHaveAttribute('href', '/welcome');
    });
  });
});
