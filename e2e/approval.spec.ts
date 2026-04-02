import { test, expect } from '@playwright/test';

test.describe('Approval Card Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('approval card has Approve and Edit buttons', async ({ page }) => {
    const approveButton = page.getByRole('button', { name: /approve/i }).first();
    const editButton = page.getByRole('button', { name: /edit/i }).first();

    await expect(approveButton).toBeVisible();
    await expect(editButton).toBeVisible();
  });

  test('clicking Approve shows success state', async ({ page }) => {
    const approveButton = page.getByRole('button', { name: /approve/i }).first();
    await approveButton.click();

    // Card should transition to a success state
    const successIndicator = page
      .locator('[data-testid="approval-card"]')
      .first()
      .getByText(/approved|✓/i);
    await expect(successIndicator).toBeVisible();
  });
});
