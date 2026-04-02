/**
 * Site data fetching — from LocalGenius database
 *
 * This module queries the database for business information and generates
 * site data that matches the SiteData interface expected by the page component.
 *
 * In the future, this could be cached or invalidated on business updates.
 */

import { db } from "@/lib/db";
import { businesses } from "@/db/schema";
import { isNull } from "drizzle-orm";

export interface SiteData {
  name: string;
  tagline: string;
  phone: string;
  email: string;
  address: { street: string; city: string; state: string; zip: string };
  hero: {
    headline: string;
    subheadline: string;
    backgroundImage: string;
  };
  about: {
    heading: string;
    body: string;
    highlight: string;
  };
  menuHighlights: {
    name: string;
    description: string;
    price: string;
    image: string;
  }[];
  hours: Record<string, string> & { notes?: string };
  reviews: {
    quote: string;
    author: string;
    rating: number;
    source: "google" | "yelp";
  }[];
  aggregateRating: { score: number; count: number; source: string };
  meta: { title: string; description: string };
}

/**
 * Generate slug from business name + city.
 * Example: "Maria's Kitchen" + "Austin" → "marias-kitchen-austin"
 */
function generateSlug(name: string, city: string): string {
  const nameSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const citySlug = city
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${nameSlug}-${citySlug}`;
}

/**
 * Find a business by slug and convert to SiteData format.
 *
 * TODO: In production, this should be cached with ISR or similar.
 */
export async function getSiteData(slug: string): Promise<SiteData | null> {
  try {
    // Query all non-deleted businesses
    const allBusinesses = await db
      .select()
      .from(businesses)
      .where(isNull(businesses.deletedAt));

    // Find matching business by slug
    const biz = allBusinesses.find(
      (b) => generateSlug(b.name, b.city) === slug
    );

    if (!biz) {
      return null;
    }

    // Parse address (assume it's in "street, city, state zip" format)
    const addressParts = (biz.address || "").split(",").map((p) => p.trim());
    const street = addressParts[0] || "";
    const cityState = addressParts[1] || "";
    const [city, stateZip] = cityState.split(/\s+(?=[A-Z]{2})/);
    const [state, zip] = (stateZip || "").split(/\s+/);

    // Default tagline if not provided
    const tagline =
      biz.description ||
      `${biz.vertical} in ${biz.city}, ${biz.state}`;

    // Parse hours from JSONB
    const hours: Record<string, string> = (biz.hours as Record<string, string>) || {
      "Monday-Friday": "9am - 5pm",
      Saturday: "10am - 4pm",
      Sunday: "Closed",
    };

    return {
      name: biz.name,
      tagline,
      phone: biz.phone || "(555) 000-0000",
      email: biz.email || "",
      address: {
        street,
        city: biz.city,
        state: biz.state,
        zip: zip || "00000",
      },
      hero: {
        headline: biz.name,
        subheadline: tagline,
        backgroundImage:
          (biz.photos as string[])?.[0] ||
          "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80",
      },
      about: {
        heading: `Welcome to ${biz.name}`,
        body: biz.description || `A ${biz.vertical} in ${biz.city}, ${biz.state}.`,
        highlight: `${biz.vertical} in ${biz.city}`,
      },
      menuHighlights: [],
      hours,
      reviews: [],
      aggregateRating: { score: 4.5, count: 0, source: "LocalGenius" },
      meta: {
        title: `${biz.name} — ${biz.vertical} in ${biz.city}, ${biz.state}`,
        description: `${biz.name} — ${tagline}`,
      },
    };
  } catch (error) {
    console.error("Error fetching site data:", error);
    return null;
  }
}

/**
 * Get all available site slugs for static generation.
 *
 * In production with many businesses, this should be paginated
 * or use incremental static regeneration (ISR).
 */
export async function getAllSiteSlugs(): Promise<string[]> {
  try {
    const allBusinesses = await db
      .select()
      .from(businesses)
      .where(isNull(businesses.deletedAt));

    return allBusinesses.map((b) => generateSlug(b.name, b.city));
  } catch (error) {
    console.error("Error fetching all site slugs:", error);
    return [];
  }
}
