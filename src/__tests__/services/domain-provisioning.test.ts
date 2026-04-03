/**
 * Tests for src/services/domain-provisioning.ts
 *
 * Tests subdomain and email domain provisioning via Vercel DNS and Resend APIs.
 * All external calls (fetch, DB) and environment variables are mocked.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock DB ────────────────────────────────────────────────────────────────

const TEST_BUSINESS = {
  id: "biz-uuid-001",
  organizationId: "org-uuid-001",
  name: "Maria's Kitchen",
  city: "Austin",
  address: "123 South Lamar",
  email: "maria@example.com",
  phone: "512-555-0100",
  state: "TX",
  vertical: "restaurant",
  description: "Authentic Tex-Mex",
  websiteUrl: null,
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
  businesses: {
    id: "businesses.id",
    organizationId: "businesses.organizationId",
    websiteUrl: "businesses.websiteUrl",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ op: "eq", args })),
  and: vi.fn((...args: unknown[]) => ({ op: "and", args })),
}));

// ─── Mock fetch ─────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ─── Mock logInference (inference-log service) ─────────────────────────────

vi.mock("@/lib/inference-log", () => ({
  logInference: vi.fn().mockResolvedValue(undefined),
}));

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  mockSelectLimit.mockResolvedValue([TEST_BUSINESS]);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("provisionDomain", () => {
  describe("success path", () => {
    it("provisions both DNS and email domain successfully", async () => {
      vi.stubEnv("VERCEL_TOKEN", "test-vercel-token");
      vi.stubEnv("VERCEL_TEAM_ID", "test-team-id");
      vi.stubEnv("VERCEL_PROJECT_ID", "test-project-id");
      vi.stubEnv("RESEND_API_KEY", "test-resend-key");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            uid: "dns-record-123",
            name: "marias-kitchen-austin",
            type: "CNAME",
            value: "cname.vercel-dns.com",
          }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "domain-123",
            name: "marias-kitchen-austin.localgenius.company",
            status: "pending",
          }),
      });

      const { provisionDomain } = await import("@/services/domain-provisioning");
      const result = await provisionDomain("biz-uuid-001", "org-uuid-001");

      expect(result.dnsProvisioned).toBe(true);
      expect(result.emailDomainProvisioned).toBe(true);
      expect(result.subdomain).toBe("marias-kitchen-austin");
      expect(result.siteUrl).toBe("https://marias-kitchen-austin.localgenius.company");
      expect(result.errors).toEqual([]);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe("DNS fails, email succeeds", () => {
    it("returns partial success with DNS error in errors array", async () => {
      vi.stubEnv("VERCEL_TOKEN", "test-vercel-token");
      vi.stubEnv("VERCEL_TEAM_ID", "test-team-id");
      vi.stubEnv("VERCEL_PROJECT_ID", "test-project-id");
      vi.stubEnv("RESEND_API_KEY", "test-resend-key");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: { message: "Invalid CNAME record" } }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "domain-123",
            name: "marias-kitchen-austin.localgenius.company",
            status: "pending",
          }),
      });

      const { provisionDomain } = await import("@/services/domain-provisioning");
      const result = await provisionDomain("biz-uuid-001", "org-uuid-001");

      expect(result.dnsProvisioned).toBe(false);
      expect(result.emailDomainProvisioned).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("DNS:");
      expect(result.errors[0]).toContain("Invalid CNAME record");
    });
  });

  describe("both DNS and email fail", () => {
    it("returns errors array with both failures", async () => {
      vi.stubEnv("VERCEL_TOKEN", "test-vercel-token");
      vi.stubEnv("VERCEL_TEAM_ID", "test-team-id");
      vi.stubEnv("VERCEL_PROJECT_ID", "test-project-id");
      vi.stubEnv("RESEND_API_KEY", "test-resend-key");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: "Internal Server Error" } }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: "Unauthorized" }),
      });

      const { provisionDomain } = await import("@/services/domain-provisioning");
      const result = await provisionDomain("biz-uuid-001", "org-uuid-001");

      expect(result.dnsProvisioned).toBe(false);
      expect(result.emailDomainProvisioned).toBe(false);
      expect(result.errors.length).toBe(2);
      expect(result.errors[0]).toContain("DNS:");
      expect(result.errors[1]).toContain("Email:");
    });
  });

  describe("VERCEL_TOKEN not set", () => {
    it("skips DNS provisioning gracefully", async () => {
      vi.stubEnv("VERCEL_TOKEN", undefined);
      vi.stubEnv("RESEND_API_KEY", "test-resend-key");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "domain-123",
            name: "marias-kitchen-austin.localgenius.company",
            status: "pending",
          }),
      });

      const { provisionDomain } = await import("@/services/domain-provisioning");
      const result = await provisionDomain("biz-uuid-001", "org-uuid-001");

      expect(result.dnsProvisioned).toBe(false);
      expect(result.emailDomainProvisioned).toBe(true);
      expect(result.errors).toContain(
        "DNS: VERCEL_TOKEN not configured — skipped"
      );
      // Should call Resend for email but NOT Vercel DNS
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("https://api.resend.com/domains"),
        expect.anything()
      );
    });
  });

  describe("RESEND_API_KEY not set", () => {
    it("skips email domain provisioning gracefully", async () => {
      vi.stubEnv("VERCEL_TOKEN", "test-vercel-token");
      vi.stubEnv("VERCEL_TEAM_ID", "test-team-id");
      vi.stubEnv("VERCEL_PROJECT_ID", "test-project-id");
      vi.stubEnv("RESEND_API_KEY", undefined);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            uid: "dns-record-123",
            name: "marias-kitchen-austin",
            type: "CNAME",
            value: "cname.vercel-dns.com",
          }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const { provisionDomain } = await import("@/services/domain-provisioning");
      const result = await provisionDomain("biz-uuid-001", "org-uuid-001");

      expect(result.dnsProvisioned).toBe(true);
      expect(result.emailDomainProvisioned).toBe(false);
      expect(result.errors).toContain(
        "Email: RESEND_API_KEY not configured — skipped"
      );
      // Verify we called Vercel but NOT Resend
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("https://api.vercel.com"),
        expect.anything()
      );
      const resendCalls = mockFetch.mock.calls.filter((call) =>
        call[0].includes("https://api.resend.com")
      );
      expect(resendCalls).toHaveLength(0);
    });
  });

  describe("business not found", () => {
    it("throws error when business does not exist", async () => {
      mockSelectLimit.mockResolvedValueOnce([]);

      const { provisionDomain } = await import("@/services/domain-provisioning");
      await expect(provisionDomain("missing-biz", "org-uuid-001")).rejects.toThrow(
        "Business missing-biz not found"
      );
    });
  });

  describe("database update", () => {
    it("updates business websiteUrl when DNS succeeds", async () => {
      vi.stubEnv("VERCEL_TOKEN", "test-vercel-token");
      vi.stubEnv("VERCEL_TEAM_ID", "test-team-id");
      vi.stubEnv("VERCEL_PROJECT_ID", "test-project-id");
      vi.stubEnv("RESEND_API_KEY", "");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            uid: "dns-record-123",
            name: "marias-kitchen-austin",
            type: "CNAME",
            value: "cname.vercel-dns.com",
          }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const { provisionDomain } = await import("@/services/domain-provisioning");
      await provisionDomain("biz-uuid-001", "org-uuid-001");

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockUpdateSet).toHaveBeenCalledWith(
        expect.objectContaining({
          websiteUrl: "https://marias-kitchen-austin.localgenius.company",
        })
      );
    });

    it("does NOT update database when DNS fails", async () => {
      vi.stubEnv("VERCEL_TOKEN", "test-vercel-token");
      vi.stubEnv("VERCEL_TEAM_ID", "test-team-id");
      vi.stubEnv("VERCEL_PROJECT_ID", "test-project-id");
      vi.stubEnv("RESEND_API_KEY", "");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: { message: "Bad request" } }),
      });

      const { provisionDomain } = await import("@/services/domain-provisioning");
      await provisionDomain("biz-uuid-001", "org-uuid-001");

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});

describe("isSubdomainAvailable", () => {
  describe("returns true when slug not in records", () => {
    it("returns true when subdomain is available", async () => {
      vi.stubEnv("VERCEL_TOKEN", "test-vercel-token");
      vi.stubEnv("VERCEL_TEAM_ID", "test-team-id");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            records: [
              {
                uid: "record-1",
                name: "existing-subdomain-1",
                type: "CNAME",
                value: "cname.vercel-dns.com",
              },
              {
                uid: "record-2",
                name: "existing-subdomain-2",
                type: "CNAME",
                value: "cname.vercel-dns.com",
              },
            ],
          }),
      });

      const { isSubdomainAvailable } = await import(
        "@/services/domain-provisioning"
      );
      const result = await isSubdomainAvailable("new-available-slug");

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "https://api.vercel.com/v4/domains/localgenius.company/records"
        ),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-vercel-token",
          }),
        })
      );
    });
  });

  describe("returns false when slug already exists", () => {
    it("returns false when subdomain is already taken", async () => {
      vi.stubEnv("VERCEL_TOKEN", "test-vercel-token");
      vi.stubEnv("VERCEL_TEAM_ID", "test-team-id");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            records: [
              {
                uid: "record-1",
                name: "marias-kitchen-austin",
                type: "CNAME",
                value: "cname.vercel-dns.com",
              },
              {
                uid: "record-2",
                name: "another-slug",
                type: "CNAME",
                value: "cname.vercel-dns.com",
              },
            ],
          }),
      });

      const { isSubdomainAvailable } = await import(
        "@/services/domain-provisioning"
      );
      const result = await isSubdomainAvailable("marias-kitchen-austin");

      expect(result).toBe(false);
    });
  });

  describe("VERCEL_TOKEN not set", () => {
    it("returns true when VERCEL_TOKEN is not configured", async () => {
      vi.stubEnv("VERCEL_TOKEN", undefined);

      const { isSubdomainAvailable } = await import(
        "@/services/domain-provisioning"
      );
      const result = await isSubdomainAvailable("any-slug");

      expect(result).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("API failure", () => {
    it("returns true when API call fails", async () => {
      vi.stubEnv("VERCEL_TOKEN", "test-vercel-token");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { isSubdomainAvailable } = await import(
        "@/services/domain-provisioning"
      );
      const result = await isSubdomainAvailable("some-slug");

      expect(result).toBe(true);
    });

    it("returns true when fetch throws an error", async () => {
      vi.stubEnv("VERCEL_TOKEN", "test-vercel-token");

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { isSubdomainAvailable } = await import(
        "@/services/domain-provisioning"
      );
      const result = await isSubdomainAvailable("some-slug");

      expect(result).toBe(true);
    });
  });

  describe("team ID handling", () => {
    it("includes teamId query parameter when VERCEL_TEAM_ID is set", async () => {
      vi.stubEnv("VERCEL_TOKEN", "test-vercel-token");
      vi.stubEnv("VERCEL_TEAM_ID", "custom-team-id");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ records: [] }),
      });

      const { isSubdomainAvailable } = await import(
        "@/services/domain-provisioning"
      );
      await isSubdomainAvailable("test-slug");

      const calls = mockFetch.mock.calls;
      expect(calls[0][0]).toContain("?teamId=custom-team-id");
    });

    it("omits teamId when VERCEL_TEAM_ID is not set", async () => {
      vi.stubEnv("VERCEL_TOKEN", "test-vercel-token");
      vi.stubEnv("VERCEL_TEAM_ID", undefined);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ records: [] }),
      });

      const { isSubdomainAvailable } = await import(
        "@/services/domain-provisioning"
      );
      await isSubdomainAvailable("test-slug");

      const calls = mockFetch.mock.calls;
      expect(calls[0][0]).not.toContain("?teamId");
    });
  });
});
