import { test, expect } from '@playwright/test';

test.describe('Conversation Thread', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders the welcome message from LocalGenius', async ({ page }) => {
    // The AI assistant should display an initial welcome message
    const welcomeMessage = page.locator('[data-testid="assistant-message"]').first();
    await expect(welcomeMessage).toBeVisible();
  });

  test('input bar is visible with correct placeholder', async ({ page }) => {
    const input = page.getByPlaceholder('Talk to LocalGenius...');
    await expect(input).toBeVisible();
  });

  test('sends a message and displays it as a user bubble', async ({ page }) => {
    const input = page.getByPlaceholder('Talk to LocalGenius...');
    await input.fill('Post something about our lunch special');
    await page.getByRole('button', { name: /send/i }).click();

    // User message bubble should appear right-aligned
    const userBubble = page.locator('[data-testid="user-message"]').filter({
      hasText: 'Post something about our lunch special',
    });
    await expect(userBubble).toBeVisible();
  });

  test('bottom navigation has exactly 2 tabs: Thread and Digest', async ({
    page,
  }) => {
    const nav = page.getByRole('navigation');
    const threadTab = nav.getByText(/thread/i);
    const digestTab = nav.getByText(/digest/i);

    await expect(threadTab).toBeVisible();
    await expect(digestTab).toBeVisible();

    // Exactly 2 tabs
    const tabs = nav.getByRole('link');
    await expect(tabs).toHaveCount(2);
  });
});
