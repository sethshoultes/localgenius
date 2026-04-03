import { test, expect } from '@playwright/test';

/**
 * Broken Image Detector — Playwright E2E
 *
 * Navigates to each demo site page in a real browser and checks
 * that every <img> element loaded successfully (naturalWidth > 0).
 * This catches issues that fetch-based tests miss: lazy loading,
 * CORS errors, CSP blocks, and client-side image rendering.
 */

const SITE_PAGES = [
  '/site/marias-kitchen-austin',
  '/site/marias-kitchen-austin/menu',
  '/site/bright-smile-dental-austin',
  '/site/bright-smile-dental-austin/services',
];

test.describe('Broken Image Detector (Browser)', () => {
  for (const pagePath of SITE_PAGES) {
    test(`no broken images on ${pagePath}`, async ({ page }) => {
      await page.goto(pagePath, { waitUntil: 'networkidle' });

      // Wait for lazy images to load
      await page.waitForTimeout(2000);

      // Check every <img> element
      const brokenImages = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images
          .filter((img) => {
            // Skip tiny tracking pixels and SVG data URIs
            if (img.src.startsWith('data:')) return false;
            if (img.width < 2 && img.height < 2) return false;
            // naturalWidth === 0 means the image failed to load
            return img.naturalWidth === 0;
          })
          .map((img) => ({
            src: img.src,
            alt: img.alt,
          }));
      });

      if (brokenImages.length > 0) {
        const list = brokenImages
          .map((img) => `  ${img.src} (alt: "${img.alt}")`)
          .join('\n');
        throw new Error(
          `${brokenImages.length} broken image(s) on ${pagePath}:\n${list}`
        );
      }
    });
  }
});
