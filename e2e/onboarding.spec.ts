import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/welcome');
  });

  test.describe('Step 1 — Business Info', () => {
    test('renders the setup heading', async ({ page }) => {
      await expect(
        page.getByText("Let's get your business set up"),
      ).toBeVisible();
    });

    test('requires a business name before continuing', async ({ page }) => {
      // Try to continue without filling in a name
      await page.getByRole('button', { name: /continue|next/i }).click();
      // Validation message should appear
      await expect(page.getByText(/required|enter.*name/i)).toBeVisible();
    });

    test('fills business name, selects category, and city auto-fills', async ({
      page,
    }) => {
      await page.getByPlaceholder(/business name/i).fill("Maria's Kitchen");
      // Select the Restaurant category tile
      await page.getByRole('button', { name: /restaurant/i }).click();
      // City field should auto-fill (not be empty)
      const cityInput = page.getByPlaceholder(/city/i);
      await expect(cityInput).not.toHaveValue('');
    });
  });

  test.describe('Step 2 — Discovery', () => {
    test('progress bar advances and discovery card appears', async ({
      page,
    }) => {
      // Complete step 1
      await page.getByPlaceholder(/business name/i).fill("Maria's Kitchen");
      await page.getByRole('button', { name: /restaurant/i }).click();
      await page.getByRole('button', { name: /continue|next/i }).click();

      // Progress bar should reflect step 2
      const progressBar = page.getByRole('progressbar');
      await expect(progressBar).toBeVisible();

      // Discovery card shows business info
      await expect(page.getByText("Maria's Kitchen")).toBeVisible();
    });
  });

  test.describe('Step 3 — Photo Upload', () => {
    test('renders photo upload step with minimum hint', async ({ page }) => {
      // Navigate through steps 1-2
      await page.getByPlaceholder(/business name/i).fill("Maria's Kitchen");
      await page.getByRole('button', { name: /restaurant/i }).click();
      await page.getByRole('button', { name: /continue|next/i }).click();
      await page.getByRole('button', { name: /continue|next/i }).click();

      // Photo upload UI
      await expect(page.getByText(/minimum 3 photos/i)).toBeVisible();
    });
  });

  test.describe('Step 4 — Priority Selection', () => {
    test('shows 3 priority options', async ({ page }) => {
      // Navigate through steps 1-3
      await page.getByPlaceholder(/business name/i).fill("Maria's Kitchen");
      await page.getByRole('button', { name: /restaurant/i }).click();
      await page.getByRole('button', { name: /continue|next/i }).click();
      await page.getByRole('button', { name: /continue|next/i }).click();
      await page.getByRole('button', { name: /continue|next/i }).click();

      await expect(page.getByText(/get found online/i)).toBeVisible();
      await expect(page.getByText(/manage my reviews/i)).toBeVisible();
      await expect(page.getByText(/stay active on social/i)).toBeVisible();
    });
  });

  test.describe('Step 5 — The Reveal', () => {
    test('shows generated deliverables and publish button', async ({
      page,
    }) => {
      // Navigate through steps 1-4
      await page.getByPlaceholder(/business name/i).fill("Maria's Kitchen");
      await page.getByRole('button', { name: /restaurant/i }).click();
      await page.getByRole('button', { name: /continue|next/i }).click();
      await page.getByRole('button', { name: /continue|next/i }).click();
      await page.getByRole('button', { name: /continue|next/i }).click();
      await page.getByRole('button', { name: /continue|next/i }).click();

      // The Reveal heading
      await expect(
        page.getByText("Here's what I built for you"),
      ).toBeVisible();

      // Four deliverable cards
      await expect(page.getByText(/website/i)).toBeVisible();
      await expect(page.getByText(/first post/i)).toBeVisible();
      await expect(page.getByText(/google listing/i)).toBeVisible();
      await expect(page.getByText(/campaign/i)).toBeVisible();

      // Publish button
      await expect(
        page.getByRole('button', {
          name: /looks good.*publish everything/i,
        }),
      ).toBeVisible();
    });
  });
});
