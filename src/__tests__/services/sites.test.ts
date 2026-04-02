/**
 * Tests for src/services/sites.ts — Cloudflare Sites Integration
 *
 * Tests the bridge between LocalGenius (Vercel) and Sites (Cloudflare).
 * All external calls (fetch, DB) are mocked.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock DB ────────────────────────────────────────────────────────────────

const TEST_BUSINESS = {
  id: "biz-uuid-001",
  organizationId: "org-uuid-001",
  name: "Maria's Kitchen",
  vertical: "restaurant",
  city: "Austin",
  state: "TX",
  phone: "512-555-0100",
  email: "maria@example.com",
  address: "123 South Lamar",
  description: "Authentic Tex-Mex",
  websiteUrl: "https://marias-kitchen-austin.localgenius.site",
};

const mockSelectLimit = vi.fn();
const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

vi.mock("@/db/schema", () => ({
  businesses: { id: "businesses.id", organizationId: "businesses.organizationId", websiteUrl: "businesses.websiteUrl" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ op: "eq", args })),
  and: vi.fn((...args: unknown[]) => ({ op: "and", args })),
}));

// ─── Mock fetch ─────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("LOCALGENIUS_SITES_API_TOKEN", "test-token-123");
  vi.stubEnv("LOCALGENIUS_SITES_URL", "https://sites-api.test");
  vi.stubEnv("LOCALGENIUS_SITES_DOMAIN", "localgenius.site");
  mockSelectLimit.mockResolvedValue([TEST_BUSINESS]);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("generateSlug", () => {
  it("generates a URL-safe slug from business name + city", async () => {
    const { generateSlug } = await import("@/services/sites");
    expect(generateSlug("Maria's Kitchen", "Austin")).toBe("marias-kitchen-austin");
  });

  it("handles special characters", async () => {
    const { generateSlug } = await import("@/services/sites");
    expect(generateSlug("Joe's Bar & Grill", "San Antonio")).toBe("joes-bar-grill-san-antonio");
  });

  it("lowercases everything", async () => {
    const { generateSlug } = await import("@/services/sites");
    expect(generateSlug("THE BEST PIZZA", "NYC")).toBe("the-best-pizza-nyc");
  });

  it("truncates to 63 characters", async () => {
    const { generateSlug } = await import("@/services/sites");
    const long = "A".repeat(100);
    expect(generateSlug(long, "City").length).toBeLessThanOrEqual(63);
  });
});

describe("provisionSite", () => {
  it("generates slug and stores site URL on business", async () => {
    const { provisionSite } = await import("@/services/sites");
    const result = await provisionSite("biz-uuid-001", "org-uuid-001");

    expect(result.slug).toBe("marias-kitchen-austin");
    expect(result.siteUrl).toContain("/site/marias-kitchen-austin");

    // Verify DB was updated with the site URL
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        websiteUrl: expect.stringContaining("/site/marias-kitchen-austin"),
      })
    );
  });

  it("throws when business not found", async () => {
    mockSelectLimit.mockResolvedValueOnce([]);

    const { provisionSite } = await import("@/services/sites");
    await expect(provisionSite("missing", "org")).rejects.toThrow("not found");
  });
});

describe("updateSite", () => {
  beforeEach(() => {
    mockSelectLimit.mockResolvedValue([TEST_BUSINESS]);
  });

  it("updates business and returns changes", async () => {
    const { updateSite } = await import("@/services/sites");
    const result = await updateSite("biz-uuid-001", "org-uuid-001", "Update hours to 9-5 weekdays");

    expect(result.success).toBe(true);
    expect(result.changes.length).toBeGreaterThan(0);
    expect(result.changes[0].target).toBe("hours");
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("throws when business has no website", async () => {
    mockSelectLimit.mockResolvedValueOnce([{ ...TEST_BUSINESS, websiteUrl: null }]);

    const { updateSite } = await import("@/services/sites");
    await expect(
      updateSite("biz-uuid-001", "org-uuid-001", "Update hours")
    ).rejects.toThrow("does not have a provisioned site");
  });
});

describe("hasSite", () => {
  it("returns true when business has a localgenius.site URL", async () => {
    const { hasSite } = await import("@/services/sites");
    const result = await hasSite("biz-uuid-001", "org-uuid-001");
    expect(result).toBe(true);
  });

  it("returns false when business has no website", async () => {
    mockSelectLimit.mockResolvedValueOnce([{ websiteUrl: null }]);

    const { hasSite } = await import("@/services/sites");
    const result = await hasSite("biz-uuid-001", "org-uuid-001");
    expect(result).toBe(false);
  });

  it("returns false when website is not a localgenius.site domain", async () => {
    mockSelectLimit.mockResolvedValueOnce([{ websiteUrl: "https://example.com" }]);

    const { hasSite } = await import("@/services/sites");
    const result = await hasSite("biz-uuid-001", "org-uuid-001");
    expect(result).toBe(false);
  });
});

describe("getSiteStatus", () => {
  it("fetches site status from Sites API", async () => {
    const statusResponse = {
      slug: "marias-kitchen-austin",
      business_name: "Maria's Kitchen",
      status: "ready",
      site_url: "https://marias-kitchen-austin.localgenius.site",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(statusResponse),
    });

    const { getSiteStatus } = await import("@/services/sites");
    const result = await getSiteStatus("marias-kitchen-austin");

    expect(result.status).toBe("ready");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://sites-api.test/api/sites/marias-kitchen-austin",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token-123",
        }),
      })
    );
  });
});

describe("listSites", () => {
  it("lists all sites", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ slug: "site-1" }, { slug: "site-2" }]),
    });

    const { listSites } = await import("@/services/sites");
    const result = await listSites();

    expect(result).toHaveLength(2);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://sites-api.test/api/sites",
      expect.anything()
    );
  });

  it("filters by status", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ slug: "site-1", status: "ready" }]),
    });

    const { listSites } = await import("@/services/sites");
    await listSites("ready");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://sites-api.test/api/sites?status=ready",
      expect.anything()
    );
  });
});
