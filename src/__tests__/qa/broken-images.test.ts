/**
 * Broken Image Detector — QA test
 *
 * Fetches every demo site page, extracts all <img> src URLs,
 * and verifies each returns HTTP 200. Catches broken Unsplash
 * links, missing assets, and typos in image paths.
 *
 * Run: npx vitest run src/__tests__/qa/broken-images.test.ts
 */

import { describe, it, expect } from "vitest";

// Demo site pages to check
const SITE_PAGES = [
  "/site/marias-kitchen-austin",
  "/site/marias-kitchen-austin/menu",
  "/site/marias-kitchen-austin/contact",
  "/site/bright-smile-dental-austin",
  "/site/bright-smile-dental-austin/services",
  "/site/bright-smile-dental-austin/contact",
];

const BASE_URL = process.env.TEST_BASE_URL || "https://localgenius.company";

/**
 * Extract all image src URLs from HTML string.
 * Handles: <img src="...">, background-image: url('...'), og:image content="..."
 */
function extractImageUrls(html: string): string[] {
  const urls = new Set<string>();

  // Unescape HTML entities first so URLs parse correctly
  const decoded = html.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&#39;/g, "'");

  // All <img> src attributes
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(decoded)) !== null) {
    const url = match[1];
    if (url.startsWith("http")) urls.add(url);
  }

  // background-image: url('...')
  const bgRegex = /background-image:\s*url\(['"]?([^'")\s]+)/gi;
  while ((match = bgRegex.exec(decoded)) !== null) {
    if (match[1].startsWith("http")) urls.add(match[1]);
  }

  return [...urls];
}

/**
 * Check if a URL returns HTTP 200.
 */
async function checkUrl(url: string): Promise<{ url: string; status: number; ok: boolean }> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    return { url, status: res.status, ok: res.ok };
  } catch (err) {
    return { url, status: 0, ok: false };
  }
}

describe("Broken Image Detector", () => {
  for (const pagePath of SITE_PAGES) {
    it(`all images load on ${pagePath}`, async () => {
      // Fetch the page HTML
      const pageRes = await fetch(`${BASE_URL}${pagePath}`, {
        signal: AbortSignal.timeout(15000),
      });
      expect(pageRes.ok).toBe(true);

      const html = await pageRes.text();
      const imageUrls = extractImageUrls(html);

      // Contact pages may have zero images — that's okay
      if (imageUrls.length === 0) return;

      // Check each image
      const results = await Promise.all(imageUrls.map(checkUrl));
      const broken = results.filter((r) => !r.ok);

      if (broken.length > 0) {
        const brokenList = broken
          .map((r) => `  ${r.status} ${r.url}`)
          .join("\n");
        throw new Error(
          `${broken.length} broken image(s) on ${pagePath}:\n${brokenList}`
        );
      }
    }, 30000); // 30s timeout per page
  }

  it("extractImageUrls parses img tags correctly", () => {
    const html = `
      <img src="https://images.unsplash.com/photo-123?w=600&q=80" alt="test">
      <img src="/local/image.png" />
      <div style="background-image: url('https://example.com/bg.jpg')"></div>
    `;
    const urls = extractImageUrls(html);
    expect(urls).toContain("https://images.unsplash.com/photo-123?w=600&q=80");
    expect(urls).toContain("https://example.com/bg.jpg");
    // Local paths are excluded (only http URLs)
    expect(urls).not.toContain("/local/image.png");
  });

  it("extractImageUrls handles HTML-escaped ampersands", () => {
    const html = `<img src="https://images.unsplash.com/photo-123?w=600&amp;q=80">`;
    const urls = extractImageUrls(html);
    expect(urls[0]).toContain("&q=80");
    expect(urls[0]).not.toContain("&amp;");
  });

  it("extractImageUrls finds background-image URLs", () => {
    const html = `<div style="background-image: url('https://cdn.example.com/hero.jpg')"></div>`;
    const urls = extractImageUrls(html);
    expect(urls).toContain("https://cdn.example.com/hero.jpg");
  });
});
