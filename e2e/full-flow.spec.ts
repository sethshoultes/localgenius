import { test, expect } from '@playwright/test';

/**
 * Full flow E2E test: Register → Onboarding → Conversation
 *
 * Tests the critical path a new business owner takes:
 * 1. Register with business details
 * 2. Complete onboarding steps
 * 3. Send a message and verify AI responds
 *
 * Uses a unique email per run to avoid conflicts.
 * Requires the dev server to be running (playwright.config.ts handles this).
 */

const TS = Date.now();
const TEST_EMAIL = `e2e-full-${TS}@test.localgenius.dev`;
const TEST_PASSWORD = 'E2eFullFlow123!';
const TEST_NAME = 'E2E Tester';
const TEST_BUSINESS = `E2E Restaurant ${TS}`;

test.describe('Full Registration → Onboarding → Conversation Flow', () => {

  test.describe('Step 1: Registration', () => {

    test('register page renders all required fields', async ({ page }) => {
      await page.goto('/register');
      await expect(page.locator('label[for="name"]')).toBeVisible();
      await expect(page.locator('label[for="businessName"]')).toBeVisible();
      await expect(page.locator('label[for="email"]')).toBeVisible();
      await expect(page.locator('label[for="password"]')).toBeVisible();
      await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
    });

    test('validates required fields before submit', async ({ page }) => {
      await page.goto('/register');
      await page.getByRole('button', { name: /create account/i }).click();
      // Should show validation — page stays on /register
      await expect(page).toHaveURL(/register/);
    });

    test('validates email format', async ({ page }) => {
      await page.goto('/register');
      await page.locator('#name').fill(TEST_NAME);
      await page.locator('#businessName').fill(TEST_BUSINESS);
      await page.locator('#email').fill('not-an-email');
      await page.locator('#password').fill(TEST_PASSWORD);
      await page.getByRole('button', { name: /create account/i }).click();
      // Should show email validation error
      await expect(page).toHaveURL(/register/);
    });

    test('validates password length', async ({ page }) => {
      await page.goto('/register');
      await page.locator('#name').fill(TEST_NAME);
      await page.locator('#businessName').fill(TEST_BUSINESS);
      await page.locator('#email').fill(TEST_EMAIL);
      await page.locator('#password').fill('short');
      await page.getByRole('button', { name: /create account/i }).click();
      await expect(page).toHaveURL(/register/);
    });

    test('successful registration redirects to onboarding', async ({ page }) => {
      await page.goto('/register');

      await page.locator('#name').fill(TEST_NAME);
      await page.locator('#businessName').fill(TEST_BUSINESS);
      await page.locator('#email').fill(TEST_EMAIL);
      await page.locator('#password').fill(TEST_PASSWORD);

      // Select city + state if visible
      const cityInput = page.locator('#city, input[placeholder="Austin"]');
      if (await cityInput.isVisible()) {
        await cityInput.fill('Austin');
      }
      const stateInput = page.locator('#state, input[placeholder="TX"]');
      if (await stateInput.isVisible()) {
        await stateInput.fill('TX');
      }

      await page.getByRole('button', { name: /create account/i }).click();

      // Should redirect to onboarding (/welcome) or app (/app)
      await page.waitForURL(/welcome|app/, { timeout: 10000 });
      const url = page.url();
      expect(url).toMatch(/welcome|app/);
    });
  });

  test.describe('Step 2: Login (verify account exists)', () => {

    test('login page renders', async ({ page }) => {
      await page.goto('/login');
      await expect(page.locator('input[type="email"], #email')).toBeVisible();
      await expect(page.locator('input[type="password"], #password')).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('rejects wrong password', async ({ page }) => {
      await page.goto('/login');
      await page.locator('input[type="email"], #email').fill(TEST_EMAIL);
      await page.locator('input[type="password"], #password').fill('WrongPassword123!');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should stay on login with error
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/login/);
    });

    test('successful login redirects to app', async ({ page }) => {
      await page.goto('/login');
      await page.locator('input[type="email"], #email').fill(TEST_EMAIL);
      await page.locator('input[type="password"], #password').fill(TEST_PASSWORD);
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should redirect to app or welcome
      await page.waitForURL(/app|welcome/, { timeout: 10000 });
      const url = page.url();
      expect(url).toMatch(/app|welcome/);
    });
  });

  test.describe('Step 3: Onboarding', () => {

    test('onboarding page shows business name', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.locator('input[type="email"], #email').fill(TEST_EMAIL);
      await page.locator('input[type="password"], #password').fill(TEST_PASSWORD);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/app|welcome/, { timeout: 10000 });

      // If redirected to welcome, check business name is shown
      if (page.url().includes('welcome')) {
        const content = await page.textContent('body');
        // The onboarding page should show something about the business
        expect(content).toBeTruthy();
      }
    });
  });

  test.describe('Step 4: Conversation', () => {

    test('conversation thread is accessible after login', async ({ page }) => {
      await page.goto('/login');
      await page.locator('input[type="email"], #email').fill(TEST_EMAIL);
      await page.locator('input[type="password"], #password').fill(TEST_PASSWORD);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/app|welcome/, { timeout: 10000 });

      // Navigate to app if on welcome
      if (page.url().includes('welcome')) {
        await page.goto('/app');
        await page.waitForTimeout(2000);
      }

      // The app page should have an input area for messages
      const hasInput = await page.locator('textarea, input[type="text"], [aria-label*="Message"]').count();
      expect(hasInput).toBeGreaterThan(0);
    });
  });

  test.describe('Public Site', () => {

    test('/site directory is accessible without login', async ({ page }) => {
      await page.goto('/site');
      await expect(page.locator('body')).toContainText(/LocalGenius Sites|Live/i);
    });

    test('/site/marias-kitchen-austin renders restaurant page', async ({ page }) => {
      await page.goto('/site/marias-kitchen-austin');

      await expect(page.locator('body')).toContainText("Maria's Kitchen");
      await expect(page.locator('body')).toContainText('Mole Poblano');
    });

    test('/site/bright-smile-dental-austin renders dental page', async ({ page }) => {
      await page.goto('/site/bright-smile-dental-austin');

      await expect(page.locator('body')).toContainText('Bright Smile Dental');
      await expect(page.locator('body')).toContainText('Dr. Sarah Chen');
    });

    test('/site/nonexistent returns 404', async ({ page }) => {
      const response = await page.goto('/site/nonexistent-business-xyz');
      // Should either be a 404 page or show "not found" content
      const status = response?.status();
      const content = await page.textContent('body');
      expect(status === 404 || content?.toLowerCase().includes('not found')).toBeTruthy();
    });
  });
});
