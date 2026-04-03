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
  vertical: 'restaurant' | 'dental' | 'salon' | 'services' | 'other';
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
      return getDemoSite(slug);
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
      vertical: (biz.vertical === 'restaurant' ? 'restaurant' : biz.vertical === 'dental' ? 'dental' : biz.vertical === 'salon' ? 'salon' : 'services') as SiteData['vertical'],
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

    const dbSlugs = allBusinesses.map((b) => generateSlug(b.name, b.city));
    // Add directory demos only if no DB match for that business
    const dbNames = new Set(allBusinesses.map((b) => b.name.toLowerCase()));
    const demoSlugs = DIRECTORY_SLUGS.filter((s) => {
      const demo = getDemoSite(s);
      return demo && !dbNames.has(demo.name.toLowerCase()) && !dbSlugs.includes(s);
    });
    // Deduplicate
    return [...new Set([...dbSlugs, ...demoSlugs])];
  } catch (error) {
    console.error("Error fetching all site slugs:", error);
    return DIRECTORY_SLUGS;
  }
}

// ─── Demo Sites ─────────────────────────────────────────────────────────────

// Slugs shown in the /site directory page (no short aliases)
const DIRECTORY_SLUGS = ["marias-kitchen-austin", "bright-smile-dental-austin"];
// All slugs that resolve to demo data (includes aliases)
const DEMO_SLUGS = ["marias-kitchen-austin", "bright-smile-dental-austin", "bright-smile"];

function getDemoSite(slug: string): SiteData | null {
  // Allow short aliases
  const resolved = slug === "bright-smile" ? "bright-smile-dental-austin" : slug;

  const demos: Record<string, SiteData> = {
    "marias-kitchen-austin": {
      name: "Maria's Kitchen",
      vertical: "restaurant",
      tagline: "Real Tex-Mex. Real people. Since 2019.",
      phone: "(512) 555-0142",
      email: "hello@mariaskitchen.com",
      address: { street: "1401 S Lamar Blvd", city: "Austin", state: "TX", zip: "78704" },
      hero: {
        headline: "Where the tortillas are pressed before the sun comes up",
        subheadline: "Family recipes from Oaxaca, made fresh daily on South Lamar. Walk-ins welcome.",
        backgroundImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80",
      },
      about: {
        heading: "Three generations of the same red sauce",
        body: "When my grandmother came to Austin in 2005, she carried two things: her cast-iron comal and a notebook of recipes written in pencil. Maria's Kitchen started as weekend tamales sold at the SFC Farmers' Market. Fourteen years later, we opened on South Lamar.\n\nWe make everything by hand — the tortillas, the mole, the carnitas that take fourteen hours. Nothing comes from a can, nothing from a freezer.",
        highlight: "Every dish made from scratch, every day, no exceptions.",
      },
      menuHighlights: [
        { name: "Mole Poblano", description: "Slow-simmered with 22 ingredients, served over chicken", price: "$19", image: "https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=600&q=80" },
        { name: "Carnitas Plate", description: "Fourteen-hour braised pork, crispy edges, cilantro rice", price: "$17", image: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600&q=80" },
        { name: "Tamales (3)", description: "Corn masa in banana leaf — chicken tinga, rajas, or black bean", price: "$14", image: "https://images.unsplash.com/photo-1604467707321-70d009801bf9?w=600&q=80" },
        { name: "Churros con Cajeta", description: "Crisp cinnamon dough with warm goat-milk caramel", price: "$9", image: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&q=80" },
      ],
      hours: { Monday: "Closed", Tuesday: "11am–9pm", Wednesday: "11am–9pm", Thursday: "11am–9pm", Friday: "11am–10pm", Saturday: "10am–10pm", Sunday: "10am–8pm", notes: "Kitchen closes 30 min before close" },
      reviews: [
        { quote: "The mole here is unlike anything else in the city.", author: "Rosa M.", rating: 5, source: "google" },
        { quote: "My family has been coming every Sunday for three years.", author: "Carlos D.", rating: 5, source: "google" },
        { quote: "Unpretentious, honest, and absolutely delicious.", author: "James T.", rating: 5, source: "yelp" },
      ],
      aggregateRating: { score: 4.8, count: 247, source: "Google" },
      meta: { title: "Maria's Kitchen — Tex-Mex Restaurant in Austin", description: "Authentic Tex-Mex on South Lamar. Mole, carnitas, tamales made from scratch daily." },
    },
    "bright-smile-dental-austin": {
      name: "Bright Smile Dental",
      vertical: "dental",
      tagline: "Your neighborhood dentist since 2012.",
      phone: "(512) 555-0388",
      email: "hello@brightsmiledental.com",
      address: { street: "4521 Guadalupe St", city: "Austin", state: "TX", zip: "78751" },
      hero: {
        headline: "Dentistry that feels like visiting a friend",
        subheadline: "Comprehensive family dental care in North Austin. Accepting new patients.",
        backgroundImage: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1600&q=80",
      },
      about: {
        heading: "Dr. Sarah Chen and the Bright Smile team",
        body: "Dr. Chen opened Bright Smile in 2012 with a simple idea: dental care should not feel clinical. Our office has warm lighting, comfortable chairs, and a team that remembers your name.\n\nWe offer preventive, restorative, and cosmetic dentistry for the whole family.",
        highlight: "Gentle care. Real results. No judgment.",
      },
      menuHighlights: [
        { name: "Teeth Cleaning", description: "Thorough cleaning and polish with fluoride treatment", price: "$99", image: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=600&q=80" },
        { name: "Whitening", description: "Professional in-office whitening — up to 8 shades brighter", price: "$299", image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600&q=80" },
        { name: "Invisalign Consultation", description: "Free consultation for clear aligners", price: "Free", image: "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=600&q=80" },
        { name: "Emergency Visit", description: "Same-day emergency appointments available", price: "Varies", image: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=600&q=80" },
      ],
      hours: { Monday: "8am–5pm", Tuesday: "8am–5pm", Wednesday: "8am–5pm", Thursday: "8am–6pm", Friday: "9am–3pm", Saturday: "Closed", Sunday: "Closed", notes: "Emergency line available 24/7" },
      reviews: [
        { quote: "Dr. Chen is the first dentist my daughter has actually looked forward to visiting.", author: "Michelle R.", rating: 5, source: "google" },
        { quote: "Switched from a big corporate chain. Night and day difference.", author: "Kevin P.", rating: 5, source: "google" },
        { quote: "Got an emergency appointment the same morning I called.", author: "David L.", rating: 5, source: "yelp" },
      ],
      aggregateRating: { score: 4.9, count: 183, source: "Google" },
      meta: { title: "Bright Smile Dental — Family Dentist in Austin", description: "Gentle family dental care in North Austin. Dr. Sarah Chen. Accepting new patients." },
    },
  };

  return demos[resolved] || null;
}

export { getDemoSite, DEMO_SLUGS };
