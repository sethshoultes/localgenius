/**
 * Domain Provisioning Service
 *
 * Automatically provisions subdomains and email sending domains
 * when a new business completes onboarding.
 *
 * Flow:
 *   1. User onboards → business slug generated
 *   2. Vercel DNS API adds CNAME: {slug}.localgenius.company → cname.vercel-dns.com
 *   3. Resend API adds sending domain for transactional email
 *   4. /site/[slug] route serves the business site
 *
 * Non-blocking: provisioning failures don't break onboarding.
 * DNS propagation is async — subdomain works within seconds on Vercel.
 */

import { db } from "@/lib/db";
import { businesses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateSlug } from "./sites";
import { logInference } from "@/lib/inference-log";

// ─── Configuration ─────────────────────────────────────────────────────────

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const BASE_DOMAIN = "localgenius.company";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ProvisionResult {
  subdomain: string;
  siteUrl: string;
  dnsProvisioned: boolean;
  emailDomainProvisioned: boolean;
  errors: string[];
}

interface VercelDnsRecord {
  uid: string;
  name: string;
  type: string;
  value: string;
}

interface ResendDomain {
  id: string;
  name: string;
  status: string;
}

// ─── Vercel DNS API ────────────────────────────────────────────────────────

/**
 * Add a CNAME record to Vercel DNS for the business subdomain.
 * {slug}.localgenius.company → cname.vercel-dns.com
 */
async function addVercelDnsRecord(slug: string): Promise<VercelDnsRecord> {
  if (!VERCEL_TOKEN) {
    throw new Error("VERCEL_TOKEN not configured — cannot provision DNS");
  }

  const teamQuery = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";

  const res = await fetch(
    `https://api.vercel.com/v4/domains/${BASE_DOMAIN}/records${teamQuery}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: slug,
        type: "CNAME",
        value: "cname.vercel-dns.com",
        ttl: 60,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(
      `Vercel DNS error ${res.status}: ${(err as { error?: { message?: string } }).error?.message || res.statusText}`
    );
  }

  return res.json() as Promise<VercelDnsRecord>;
}

/**
 * Add the subdomain to the Vercel project so it serves the app.
 */
async function addVercelProjectDomain(subdomain: string): Promise<void> {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    throw new Error("VERCEL_TOKEN + VERCEL_PROJECT_ID required for domain provisioning");
  }

  const teamQuery = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";

  const res = await fetch(
    `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains${teamQuery}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `${subdomain}.${BASE_DOMAIN}`,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    // 409 = domain already exists — not an error
    if (res.status !== 409) {
      throw new Error(
        `Vercel domain error ${res.status}: ${(err as { error?: { message?: string } }).error?.message || res.statusText}`
      );
    }
  }
}

// ─── Resend Email Domain API ───────────────────────────────────────────────

/**
 * Register a sending domain with Resend for transactional email.
 * This allows sending from noreply@{slug}.localgenius.company.
 */
async function addResendDomain(subdomain: string): Promise<ResendDomain> {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY not configured — cannot provision email domain");
  }

  const res = await fetch("https://api.resend.com/domains", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `${subdomain}.${BASE_DOMAIN}`,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(
      `Resend domain error ${res.status}: ${(err as { message?: string }).message || res.statusText}`
    );
  }

  return res.json() as Promise<ResendDomain>;
}

// ─── Main Provisioning Function ────────────────────────────────────────────

/**
 * Provision a subdomain and email domain for a business.
 * Called after onboarding completion.
 *
 * Non-blocking: each step is independent. DNS failure doesn't
 * prevent email domain setup, and vice versa. The /site/[slug]
 * route works regardless of DNS status (accessible via main domain).
 */
export async function provisionDomain(
  businessId: string,
  organizationId: string
): Promise<ProvisionResult> {
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
  const subdomain = slug;
  const siteUrl = `https://${subdomain}.${BASE_DOMAIN}`;
  const errors: string[] = [];
  let dnsProvisioned = false;
  let emailDomainProvisioned = false;

  // Step 1: Add DNS CNAME record
  if (VERCEL_TOKEN) {
    try {
      await addVercelDnsRecord(slug);
      await addVercelProjectDomain(slug);
      dnsProvisioned = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "DNS provisioning failed";
      errors.push(`DNS: ${msg}`);
    }
  } else {
    errors.push("DNS: VERCEL_TOKEN not configured — skipped");
  }

  // Step 2: Add email sending domain
  if (RESEND_API_KEY) {
    try {
      await addResendDomain(slug);
      emailDomainProvisioned = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Email domain provisioning failed";
      errors.push(`Email: ${msg}`);
    }
  } else {
    errors.push("Email: RESEND_API_KEY not configured — skipped");
  }

  // Step 3: Update business record with subdomain URL
  if (dnsProvisioned) {
    await db
      .update(businesses)
      .set({ websiteUrl: siteUrl, updatedAt: new Date() })
      .where(
        and(eq(businesses.id, businessId), eq(businesses.organizationId, organizationId))
      );
  }

  return {
    subdomain,
    siteUrl,
    dnsProvisioned,
    emailDomainProvisioned,
    errors,
  };
}

/**
 * Check if a subdomain is available (not already provisioned).
 */
export async function isSubdomainAvailable(slug: string): Promise<boolean> {
  if (!VERCEL_TOKEN) return true; // Can't check without API access

  const teamQuery = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";

  try {
    const res = await fetch(
      `https://api.vercel.com/v4/domains/${BASE_DOMAIN}/records${teamQuery}`,
      {
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      }
    );

    if (!res.ok) return true; // Assume available if API fails

    const data = (await res.json()) as { records: VercelDnsRecord[] };
    return !data.records.some((r) => r.name === slug);
  } catch {
    return true;
  }
}
