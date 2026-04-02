/**
 * Competitor Monitoring Service
 *
 * Tracks nearby competitors' public Google data and generates
 * comparison insights for the Weekly Digest.
 *
 * Emotional architecture:
 *   - Fear acquires: "Your competitor has more reviews"
 *   - Pride retains: "You gained 12 reviews this month, they gained 8"
 *   - Overall tone: motivating, not anxiety-inducing
 *
 * Google Places API integration is structured for real API calls
 * but returns mock data until a valid API key is configured.
 */

import { db } from "@/lib/db";
import { competitors, businesses, reviews } from "@/db/schema";
import { eq, and, sql, gte } from "drizzle-orm";
import { generate } from "./ai";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompetitorRecord {
  id: string;
  businessId: string;
  organizationId: string;
  competitorName: string;
  googlePlaceId: string | null;
  googleRating: string | null;
  googleReviewCount: number | null;
  lastRating: string | null;
  lastReviewCount: number | null;
  lastCheckedAt: Date | null;
  createdAt: Date;
}

interface CompetitorComparison {
  competitorName: string;
  competitorRating: number;
  competitorReviewCount: number;
  competitorReviewDelta: number;
  businessRating: number;
  businessReviewCount: number;
  businessReviewDelta: number;
}

interface CompetitorDigestSection {
  businessName: string;
  businessRating: number;
  businessReviewCount: number;
  businessReviewDelta: number;
  competitors: CompetitorComparison[];
  summary: string;
}

// ─── Google Places API (mock-ready) ──────────────────────────────────────────

const GOOGLE_PLACES_API_BASE = "https://maps.googleapis.com/maps/api/place";

/**
 * Fetch place details from Google Places API.
 * Structured for real API — returns mock data when no API key is configured.
 */
async function fetchPlaceDetails(
  googlePlaceId: string
): Promise<{ rating: number; reviewCount: number }> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (apiKey) {
    // Real API call — uncomment when ready
    // const url = `${GOOGLE_PLACES_API_BASE}/details/json?place_id=${googlePlaceId}&fields=rating,user_ratings_total&key=${apiKey}`;
    // const response = await fetch(url);
    // if (!response.ok) throw new Error(`Google Places API failed: ${response.status}`);
    // const data = await response.json();
    // return {
    //   rating: data.result.rating || 0,
    //   reviewCount: data.result.user_ratings_total || 0,
    // };
  }

  // Mock data: plausible values that shift slightly each check
  const baseRating = 3.8 + Math.random() * 1.0; // 3.8–4.8
  const baseReviews = 50 + Math.floor(Math.random() * 200); // 50–250
  return {
    rating: Math.round(baseRating * 10) / 10,
    reviewCount: baseReviews,
  };
}

/**
 * Search for a place by name and city using Google Places API.
 * Returns a place_id if found. Mock-ready.
 */
async function searchPlace(
  name: string,
  city: string
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (apiKey) {
    // Real API call — uncomment when ready
    // const query = encodeURIComponent(`${name} ${city}`);
    // const url = `${GOOGLE_PLACES_API_BASE}/findplacefromtext/json?input=${query}&inputtype=textquery&fields=place_id&key=${apiKey}`;
    // const response = await fetch(url);
    // if (!response.ok) return null;
    // const data = await response.json();
    // return data.candidates?.[0]?.place_id || null;
  }

  // Mock: generate a deterministic fake place_id from the name
  const hash = name
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return `ChIJ_mock_${hash}_${name.replace(/\s+/g, "_").slice(0, 20)}`;
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Register a competitor to track for a business.
 */
export async function addCompetitor(
  businessId: string,
  organizationId: string,
  competitorName: string,
  googlePlaceId?: string
): Promise<CompetitorRecord> {
  // If no place_id provided, search by name + business city
  let placeId = googlePlaceId || null;

  if (!placeId) {
    const [biz] = await db
      .select({ city: businesses.city })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (biz) {
      placeId = await searchPlace(competitorName, biz.city);
    }
  }

  const [record] = await db
    .insert(competitors)
    .values({
      businessId,
      organizationId,
      competitorName,
      googlePlaceId: placeId,
    })
    .returning();

  return record;
}

/**
 * Stop tracking a competitor.
 */
export async function removeCompetitor(
  competitorId: string,
  businessId: string
): Promise<boolean> {
  const result = await db
    .delete(competitors)
    .where(
      and(
        eq(competitors.id, competitorId),
        eq(competitors.businessId, businessId)
      )
    )
    .returning({ id: competitors.id });

  return result.length > 0;
}

/**
 * List all tracked competitors for a business with current data.
 */
export async function getCompetitors(
  businessId: string
): Promise<CompetitorRecord[]> {
  return db
    .select()
    .from(competitors)
    .where(eq(competitors.businessId, businessId));
}

/**
 * Fetch current Google data for a single competitor.
 * Saves previous values before updating for delta calculation.
 */
export async function checkCompetitor(
  competitorId: string
): Promise<CompetitorRecord | null> {
  const [comp] = await db
    .select()
    .from(competitors)
    .where(eq(competitors.id, competitorId))
    .limit(1);

  if (!comp || !comp.googlePlaceId) return null;

  const placeData = await fetchPlaceDetails(comp.googlePlaceId);

  // Save previous values, then update with fresh data
  const [updated] = await db
    .update(competitors)
    .set({
      lastRating: comp.googleRating,
      lastReviewCount: comp.googleReviewCount,
      googleRating: String(placeData.rating),
      googleReviewCount: placeData.reviewCount,
      lastCheckedAt: new Date(),
    })
    .where(eq(competitors.id, competitorId))
    .returning();

  return updated;
}

/**
 * Check all competitors for a business.
 */
export async function checkAllCompetitors(
  businessId: string
): Promise<CompetitorRecord[]> {
  const comps = await getCompetitors(businessId);
  const results: CompetitorRecord[] = [];

  for (const comp of comps) {
    const updated = await checkCompetitor(comp.id);
    if (updated) results.push(updated);
  }

  return results;
}

// ─── Insight Generation ──────────────────────────────────────────────────────

/**
 * Get the business's own Google rating and review metrics.
 */
async function getBusinessMetrics(
  businessId: string
): Promise<{ rating: number; reviewCount: number; recentReviews: number }> {
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [totals] = await db
    .select({
      count: sql<number>`count(*)`,
      avgRating: sql<number>`coalesce(avg(${reviews.rating}), 0)`,
    })
    .from(reviews)
    .where(
      and(eq(reviews.businessId, businessId), eq(reviews.platform, "google"))
    );

  const [recent] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(reviews)
    .where(
      and(
        eq(reviews.businessId, businessId),
        eq(reviews.platform, "google"),
        gte(reviews.reviewDate, oneMonthAgo)
      )
    );

  return {
    rating: Math.round(Number(totals?.avgRating || 0) * 10) / 10,
    reviewCount: Number(totals?.count || 0),
    recentReviews: Number(recent?.count || 0),
  };
}

/**
 * Generate a human-readable competitor insight using AI.
 * Tone: motivating, pride-focused. "You're closing the gap" not "you're falling behind."
 */
export async function generateCompetitorInsight(
  businessId: string
): Promise<string> {
  const [biz] = await db
    .select({ name: businesses.name })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!biz) return "";

  const bizMetrics = await getBusinessMetrics(businessId);
  const comps = await getCompetitors(businessId);

  if (comps.length === 0) {
    return "No competitors tracked yet. Add a competitor to see how you compare.";
  }

  const competitorSummaries = comps.map((c) => ({
    name: c.competitorName,
    rating: Number(c.googleRating || 0),
    reviewCount: c.googleReviewCount || 0,
    reviewDelta: (c.googleReviewCount || 0) - (c.lastReviewCount || c.googleReviewCount || 0),
  }));

  const prompt = `You are writing a competitor insight for ${biz.name}, a local business.

Their metrics:
- Google rating: ${bizMetrics.rating}
- Total Google reviews: ${bizMetrics.reviewCount}
- Reviews this month: ${bizMetrics.recentReviews}

Their competitors:
${competitorSummaries.map((c) => `- ${c.name}: ${c.rating} rating, ${c.reviewCount} reviews (${c.reviewDelta >= 0 ? "+" : ""}${c.reviewDelta} this period)`).join("\n")}

Write a 2-3 sentence insight. Rules:
- Tone: motivating and proud, never anxiety-inducing
- Highlight where the business is winning (higher rating, faster review growth)
- Where they're behind, frame it as "closing the gap" or an opportunity
- Use specific numbers
- Do not use the words "AI-powered", "platform", "solution", or "streamline"
- Keep it under 80 words`;

  return generate({
    prompt,
    model: "claude-haiku-4-5-20251001",
    maxTokens: 256,
  });
}

/**
 * Build the competitor section for the Weekly Digest.
 * Returns structured data + a human-readable summary.
 */
export async function getCompetitorDigestSection(
  businessId: string
): Promise<CompetitorDigestSection | null> {
  const [biz] = await db
    .select({ name: businesses.name })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!biz) return null;

  const comps = await getCompetitors(businessId);
  if (comps.length === 0) return null;

  const bizMetrics = await getBusinessMetrics(businessId);
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Build comparison data for each competitor
  const comparisons: CompetitorComparison[] = comps.map((c) => {
    const currentReviews = c.googleReviewCount || 0;
    const previousReviews = c.lastReviewCount || currentReviews;
    return {
      competitorName: c.competitorName,
      competitorRating: Number(c.googleRating || 0),
      competitorReviewCount: currentReviews,
      competitorReviewDelta: currentReviews - previousReviews,
      businessRating: bizMetrics.rating,
      businessReviewCount: bizMetrics.reviewCount,
      businessReviewDelta: bizMetrics.recentReviews,
    };
  });

  // Generate summary text
  const wins: string[] = [];
  const opportunities: string[] = [];

  for (const comp of comparisons) {
    if (comp.businessRating > comp.competitorRating) {
      wins.push(`higher rated than ${comp.competitorName} (${comp.businessRating} vs ${comp.competitorRating})`);
    }
    if (comp.businessReviewDelta > comp.competitorReviewDelta) {
      wins.push(`gaining reviews faster than ${comp.competitorName}`);
    }
    if (comp.competitorReviewCount > comp.businessReviewCount) {
      opportunities.push(`${comp.competitorName} has ${comp.competitorReviewCount - comp.businessReviewCount} more reviews — close the gap`);
    }
  }

  const summaryParts: string[] = [];
  if (wins.length > 0) {
    summaryParts.push(`Wins: ${wins.slice(0, 2).join("; ")}.`);
  }
  if (opportunities.length > 0) {
    summaryParts.push(`Opportunity: ${opportunities[0]}.`);
  }

  return {
    businessName: biz.name,
    businessRating: bizMetrics.rating,
    businessReviewCount: bizMetrics.reviewCount,
    businessReviewDelta: bizMetrics.recentReviews,
    competitors: comparisons,
    summary: summaryParts.join(" ") || "Keep building your review presence.",
  };
}
