import { test, expect } from '@playwright/test';

/**
 * Live Flow Smoke Test — verifies the full user journey on the LIVE site.
 * This test runs against https://localgenius.company and verifies critical pages load.
 * It does NOT create accounts or make state changes — purely read-only smoke tests.
 */

test.describe('Live Site - Full User Journey', () => {
  // Override baseURL for live site tests
  test.use({ baseURL: 'https://localgenius.company' });

  test('landing page renders with main heading', async ({ page }) => {
    await page.goto('/');

    // Verify the main heading is visible (split across elements: "Your business," + "handled.")
    await expect(
      page.getByRole('heading', { level: 1 }).first(),
    ).toContainText('Your business');
  });

  test('get started button redirects to welcome (onboarding)', async ({
    page,
  }) => {
    await page.goto('/');

    // Click the "Get started in 5 minutes" link/button
    const getStartedButton = page.getByRole('link', {
      name: /get started in 5 minutes/i,
    });
    await expect(getStartedButton).toBeVisible();
    await getStartedButton.click();

    // Verify redirect to /welcome
    await expect(page).toHaveURL(/\/welcome/, { timeout: 10_000 });
  });

  test('login page renders with email and password fields', async ({
    page,
  }) => {
    await page.goto('/login');

    // Verify page heading
    await expect(page.getByText('Welcome back.')).toBeVisible();

    // Verify form fields
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Verify sign in button
    await expect(
      page.getByRole('button', { name: /sign in/i }),
    ).toBeVisible();
  });

  test('register page renders with form fields', async ({ page }) => {
    await page.goto('/register');

    // Verify page heading
    await expect(
      page.getByText("Let's get you set up."),
    ).toBeVisible();

    // Verify form fields
    await expect(page.getByLabel(/business name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Verify create account button
    await expect(
      page.getByRole('button', { name: /create account/i }),
    ).toBeVisible();
  });

  test('health check endpoint returns healthy status', async ({ page }) => {
    const response = await page.request.get('/api/health');

    // Verify response is successful
    expect(response.status()).toBe(200);

    // Verify response contains "healthy" in data.status
    const json = await response.json();
    expect(json).toHaveProperty('data');
    expect(json.data).toHaveProperty('status');
    expect(json.data.status).toContain('healthy');
  });
});
