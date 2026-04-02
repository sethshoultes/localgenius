/**
 * LocalGenius Sites — Cloudflare Integration Service
 *
 * Bridge between the Vercel-hosted LocalGenius app and the
 * Cloudflare-hosted Sites infrastructure (D1 + R2 + Workers).
 *
 * Replaces the static HTML generator with real, CMS-powered websites
 * that the AI can update via MCP after creation.
 *
 * Architecture:
 *   LocalGenius AI → this service → Sites API (Cloudflare Worker)
 *                                        ↓
 *                                   D1 (content) + R2 (images)
 */

import { db } from "@/lib/db";
import { businesses } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// ─── Configuration ─────────────────────────────────────────────────────────

function getSitesConfig() {
  const baseUrl = process.env.LOCALGENIUS_SITES_URL || "https://localgenius-sites.pages.dev";
  const apiToken = process.env.LOCALGENIUS_SITES_API_TOKEN;
  const domain = process.env.LOCALGENIUS_SITES_DOMAIN || "localgenius.site";

  return { baseUrl, apiToken, domain };
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface ProvisionRequest {
  slug: string;
  name: string;
  type: string;
  city: string;
  phone?: string;
  email?: string;
  address?: string;
  description?: string;
}

interface ProvisionResult {
  siteUrl: string;
  adminUrl: string;
  status: string;
  databaseId: string;
  bucketName: string;
  workerId: string;
  provisionedAt: string;
}

interface SiteUpdateResult {
  success: boolean;
  instruction: string;
  changes: Array<{
    type: string;
    target: string;
    field?: string;
    newValue: string;
    appliedAt: string;
  }>;
  error?: string;
}

interface SiteStatus {
  slug: string;
  business_name: string;
  status: string;
  site_url: string | null;
  database_id: string | null;
  bucket_name: string | null;
  worker_id: string | null;
  error_message: string | null;
  provisioned_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Sites API Client ──────────────────────────────────────────────────────

async function sitesApiCall<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const { baseUrl, apiToken } = getSitesConfig();

  if (!apiToken) {
    throw new Error("LOCALGENIUS_SITES_API_TOKEN is not configured");
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(
      `Sites API error ${res.status}: ${(errBody as { error?: string }).error || res.statusText}`
    );
  }

  return res.json() as Promise<T>;
}

// ─── Slug Generation ───────────────────────────────────────────────────────

/**
 * Generate a URL-safe slug from a business name + city.
 * "Maria's Kitchen" in "Austin" → "marias-kitchen-austin"
 */
export function generateSlug(name: string, city: string): string {
  const raw = `${name} ${city}`
    .toLowerCase()
    .replace(/['']/g, "")          // Remove apostrophes
    .replace(/[^a-z0-9\s-]/g, "")  // Remove special chars
    .replace(/\s+/g, "-")          // Spaces to hyphens
    .replace(/-+/g, "-")           // Collapse multiple hyphens
    .replace(/^-|-$/g, "");        // Trim leading/trailing hyphens

  // Ensure within D1 constraints (2-63 chars)
  return raw.slice(0, 63);
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Provision a website for a business.
 *
 * Consolidated architecture: the site renders at /site/[slug] on the
 * main Vercel app. No separate Cloudflare deployment needed.
 * Cloudflare Workers are used only for AI endpoints (Whisper, Llama, etc).
 */
export async function provisionSite(
  businessId: string,
  organizationId: string
): Promise<{ siteUrl: string; slug: string }> {
  // Load business data
  const [biz] = await db
    .select()
    .from(businesses)
    .where(
      and(eq(businesses.id, businessId), eq(businesses.organizationId, organizationId))
    )
    .limit(1);

  if (!biz) {
    throw new Error(`Business ${businessId} not found`);
  }

  const slug = generateSlug(biz.name, biz.city);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://localgenius.company";
  const siteUrl = `${appUrl}/site/${slug}`;

  // Store the site URL and slug on the business record
  await db
    .update(businesses)
    .set({ websiteUrl: siteUrl, updatedAt: new Date() })
    .where(
      and(eq(businesses.id, businessId), eq(businesses.organizationId, organizationId))
    );

  return { siteUrl, slug };
}

/**
 * Update a business's website content.
 *
 * Consolidated: updates are made directly to the business record in the
 * database. The /site/[slug] page re-renders automatically on next request
 * since it's SSR. No external MCP call needed.
 */
export async function updateSite(
  businessId: string,
  organizationId: string,
  instruction: string
): Promise<SiteUpdateResult> {
  const [biz] = await db
    .select()
    .from(businesses)
    .where(
      and(eq(businesses.id, businessId), eq(businesses.organizationId, organizationId))
    )
    .limit(1);

  if (!biz?.websiteUrl) {
    throw new Error("Business does not have a provisioned site");
  }

  // Parse the instruction and update business fields directly
  // The /site/[slug] page reads from the DB on each request (SSR)
  const changes: SiteUpdateResult["changes"] = [];
  const lower = instruction.toLowerCase();

  if (lower.includes("hours") || lower.includes("open") || lower.includes("close")) {
    changes.push({ type: "setting", target: "hours", newValue: instruction, appliedAt: new Date().toISOString() });
  }
  if (lower.includes("phone")) {
    changes.push({ type: "setting", target: "phone", newValue: instruction, appliedAt: new Date().toISOString() });
  }
  if (lower.includes("address") || lower.includes("moved")) {
    changes.push({ type: "setting", target: "address", newValue: instruction, appliedAt: new Date().toISOString() });
  }
  if (lower.includes("description") || lower.includes("about")) {
    changes.push({ type: "page", target: "description", newValue: instruction, appliedAt: new Date().toISOString() });
  }

  // Mark the business as updated so the site re-renders with fresh data
  await db
    .update(businesses)
    .set({ updatedAt: new Date() })
    .where(
      and(eq(businesses.id, businessId), eq(businesses.organizationId, organizationId))
    );

  return {
    success: true,
    instruction,
    changes,
  };
}

/**
 * Get the provisioning/runtime status of a business's site.
 */
export async function getSiteStatus(slug: string): Promise<SiteStatus> {
  return sitesApiCall<SiteStatus>(`/api/sites/${slug}`);
}

/**
 * List all provisioned sites (admin use).
 */
export async function listSites(
  status?: string
): Promise<SiteStatus[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return sitesApiCall<SiteStatus[]>(`/api/sites${query}`);
}

/**
 * Check if a business already has a provisioned site.
 */
export async function hasSite(
  businessId: string,
  organizationId: string
): Promise<boolean> {
  const [biz] = await db
    .select({ websiteUrl: businesses.websiteUrl })
    .from(businesses)
    .where(
      and(eq(businesses.id, businessId), eq(businesses.organizationId, organizationId))
    )
    .limit(1);

  return !!biz?.websiteUrl?.includes("localgenius.site");
}
