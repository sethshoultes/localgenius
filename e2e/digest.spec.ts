import { test, expect } from '@playwright/test';

test.describe('Daily Digest', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/digest');
  });

  test('renders the morning greeting', async ({ page }) => {
    await expect(page.getByText(/good morning/i)).toBeVisible();
  });

  test('shows the three digest sections', async ({ page }) => {
    await expect(page.getByText("Here's what happened")).toBeVisible();
    await expect(page.getByText("Here's what I did")).toBeVisible();
    await expect(page.getByText("Here's what I recommend")).toBeVisible();
  });

  test('displays metrics (website visits, reviews, bookings)', async ({
    page,
  }) => {
    await expect(page.getByText(/website visits/i)).toBeVisible();
    await expect(page.getByText(/reviews/i)).toBeVisible();
    await expect(page.getByText(/bookings/i)).toBeVisible();
  });

  test('recommendation has action buttons', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /send it/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /skip/i }),
    ).toBeVisible();
  });
});
