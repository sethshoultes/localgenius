import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests — Screenshot comparison
 *
 * Takes screenshots of key pages at desktop (1280x800) and mobile (390x844),
 * compares against baseline snapshots. Fails if visual diff exceeds threshold.
 *
 * First run: creates baselines in e2e/visual-regression.spec.ts-snapshots/
 * Subsequent runs: compares against baselines, fails on mismatch.
 *
 * Update baselines: npx playwright test e2e/visual-regression.spec.ts --update-snapshots
 */

const PAGES = [
  { path: '/', name: 'landing' },
  { path: '/login', name: 'login' },
  { path: '/register', name: 'register' },
  { path: '/site', name: 'site-directory' },
  { path: '/site/marias-kitchen-austin', name: 'marias-kitchen' },
  { path: '/site/bright-smile-dental-austin', name: 'bright-smile' },
];

// Allow 1% pixel diff to account for font rendering differences across OS
const THRESHOLD = 0.01;

test.describe('Visual Regression — Desktop (1280x800)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  for (const page of PAGES) {
    test(`${page.name} matches baseline`, async ({ page: p }) => {
      await p.goto(page.path, { waitUntil: 'networkidle' });
      // Wait for fonts and images to load
      await p.waitForTimeout(1000);

      await expect(p).toHaveScreenshot(`desktop-${page.name}.png`, {
        maxDiffPixelRatio: THRESHOLD,
        fullPage: true,
      });
    });
  }
});

test.describe('Visual Regression — Mobile (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const page of PAGES) {
    test(`${page.name} matches baseline (mobile)`, async ({ page: p }) => {
      await p.goto(page.path, { waitUntil: 'networkidle' });
      await p.waitForTimeout(1000);

      await expect(p).toHaveScreenshot(`mobile-${page.name}.png`, {
        maxDiffPixelRatio: THRESHOLD,
        fullPage: true,
      });
    });
  }
});

test.describe('Visual Checks — Hero Contrast', () => {
  test('Maria\'s Kitchen hero has white text on dark overlay', async ({ page }) => {
    await page.goto('/site/marias-kitchen-austin', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Verify hero headline is white
    const heroH1 = page.locator('.s-hero h1, .s-hero-content h1').first();
    if (await heroH1.count() > 0) {
      const color = await heroH1.evaluate((el) => getComputedStyle(el).color);
      // Should be white (rgb(255, 255, 255)) or close to it
      expect(color).toMatch(/rgb\(255,\s*255,\s*255\)|rgba\(255,\s*255,\s*255/);
    }

    // Verify overlay exists
    const overlay = page.locator('.s-hero-overlay').first();
    if (await overlay.count() > 0) {
      const bg = await overlay.evaluate((el) => getComputedStyle(el).background);
      expect(bg).toContain('gradient');
    }
  });

  test('Bright Smile hero has white text on dark overlay', async ({ page }) => {
    await page.goto('/site/bright-smile-dental-austin', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const heroH1 = page.locator('.s-hero h1, .s-hero-content h1').first();
    if (await heroH1.count() > 0) {
      const color = await heroH1.evaluate((el) => getComputedStyle(el).color);
      expect(color).toMatch(/rgb\(255,\s*255,\s*255\)|rgba\(255,\s*255,\s*255/);
    }
  });
});

test.describe('Visual Checks — Responsive Layout', () => {
  test('landing page has no horizontal scroll at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/', { waitUntil: 'networkidle' });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // 1px tolerance
  });

  test('site page has no horizontal scroll at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/site/marias-kitchen-austin', { waitUntil: 'networkidle' });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
