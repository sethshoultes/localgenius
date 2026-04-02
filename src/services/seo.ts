/**
 * Local SEO Agent
 * Spec: PRD Core Feature — "Local SEO agent: continuously optimizes Google
 * Business Profile, citations, and local keywords."
 *
 * Analyzes a business's digital presence and provides actionable SEO
 * recommendations. Tracks local search ranking signals.
 */

import { db } from "@/lib/db";
import {
  businesses,
  reviews,
  actions,
  analyticsEvents,
  contentItems,
  businessSettings,
} from "@/db/schema";
import { eq, and, gte, sql, desc } from "drizzle-orm";
import { generate } from "./ai";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SEOScore {
  overall: number; // 0-100
  categories: {
    name: string;
    score: number;
    maxScore: number;
    findings: SEOFinding[];
  }[];
}

interface SEOFinding {
  status: "pass" | "warn" | "fail";
  label: string;
  detail: string;
  recommendation?: string;
}

interface SEORecommendation {
  priority: "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  estimatedImpact: string;
  actionable: boolean;
}

// ─── SEO Audit ────────────────────────────────────────────────────────────────

/**
 * Run a comprehensive local SEO audit for a business.
 * Returns a score (0-100) with categorized findings and recommendations.
 */
export async function runAudit(
  businessId: string,
  organizationId: string
): Promise<{
  score: SEOScore;
  recommendations: SEORecommendation[];
  aiInsights: string;
}> {
  const [biz] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!biz) throw new Error("Business not found");

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Gather data for audit
  const [reviewData] = await db
    .select({
      total: sql<number>`count(*)`,
      avgRating: sql<number>`avg(${reviews.rating})`,
      recent: sql<number>`count(*) filter (where ${reviews.reviewDate} >= ${thirtyDaysAgo})`,
      responded: sql<number>`count(*) filter (where ${reviews.id} in (select review_id from review_responses))`,
    })
    .from(reviews)
    .where(eq(reviews.businessId, businessId));

  const [contentData] = await db
    .select({
      totalPosts: sql<number>`count(*)`,
      recentPosts: sql<number>`count(*) filter (where ${contentItems.createdAt} >= ${thirtyDaysAgo})`,
    })
    .from(contentItems)
    .where(
      and(
        eq(contentItems.businessId, businessId),
        eq(contentItems.contentType, "social_post")
      )
    );

  const [trafficData] = await db
    .select({
      pageViews: sql<number>`count(*) filter (where ${analyticsEvents.eventType} = 'page_view')`,
      searchImpressions: sql<number>`count(*) filter (where ${analyticsEvents.eventType} = 'search_impression')`,
      directionRequests: sql<number>`count(*) filter (where ${analyticsEvents.eventType} = 'direction_request')`,
      phoneCalls: sql<number>`count(*) filter (where ${analyticsEvents.eventType} = 'phone_call')`,
    })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.businessId, businessId),
        gte(analyticsEvents.occurredAt, thirtyDaysAgo)
      )
    );

  // Check Google connection
  const [googleConn] = await db
    .select()
    .from(businessSettings)
    .where(
      and(
        eq(businessSettings.businessId, businessId),
        eq(businessSettings.platform, "google_business")
      )
    )
    .limit(1);

  // ─── Score Calculation ────────────────────────────────────────────────────

  const categories: SEOScore["categories"] = [];
  const recommendations: SEORecommendation[] = [];

  // 1. Profile Completeness (25 points)
  const profileFindings: SEOFinding[] = [];
  let profileScore = 0;

  if (biz.name) { profileScore += 5; profileFindings.push({ status: "pass", label: "Business name", detail: biz.name }); }
  else { profileFindings.push({ status: "fail", label: "Business name", detail: "Missing", recommendation: "Add your business name" }); }

  if (biz.address) { profileScore += 5; profileFindings.push({ status: "pass", label: "Address", detail: biz.address }); }
  else {
    profileFindings.push({ status: "fail", label: "Address", detail: "Missing — critical for local search", recommendation: "Add your business address" });
    recommendations.push({ priority: "high", category: "Profile", title: "Add business address", description: "Google uses your address to show your business in local search results and Google Maps.", estimatedImpact: "High — required for local pack results", actionable: true });
  }

  if (biz.phone) { profileScore += 5; profileFindings.push({ status: "pass", label: "Phone number", detail: biz.phone }); }
  else {
    profileFindings.push({ status: "fail", label: "Phone number", detail: "Missing", recommendation: "Add your phone number" });
    recommendations.push({ priority: "high", category: "Profile", title: "Add phone number", description: "Phone number enables click-to-call from Google search results.", estimatedImpact: "High — direct lead generation", actionable: true });
  }

  if (googleConn?.connectionStatus === "active") { profileScore += 5; profileFindings.push({ status: "pass", label: "Google Business Profile", detail: "Connected and active" }); }
  else {
    profileFindings.push({ status: "fail", label: "Google Business Profile", detail: "Not connected", recommendation: "Connect your Google Business Profile to manage your listing" });
    recommendations.push({ priority: "high", category: "Profile", title: "Connect Google Business Profile", description: "Connecting GBP allows LocalGenius to optimize your listing, respond to reviews, and track search performance.", estimatedImpact: "Critical — foundational for local SEO", actionable: true });
  }

  if (biz.vertical) { profileScore += 5; profileFindings.push({ status: "pass", label: "Business category", detail: biz.vertical }); }

  categories.push({ name: "Profile Completeness", score: profileScore, maxScore: 25, findings: profileFindings });

  // 2. Reviews & Reputation (25 points)
  const reviewFindings: SEOFinding[] = [];
  let reviewScore = 0;
  const totalReviews = Number(reviewData?.total || 0);
  const avgRating = Number(reviewData?.avgRating || 0);
  const recentReviews = Number(reviewData?.recent || 0);
  const respondedCount = Number(reviewData?.responded || 0);
  const responseRate = totalReviews > 0 ? respondedCount / totalReviews : 0;

  if (totalReviews >= 50) { reviewScore += 7; reviewFindings.push({ status: "pass", label: "Review count", detail: `${totalReviews} total reviews` }); }
  else if (totalReviews >= 20) { reviewScore += 4; reviewFindings.push({ status: "warn", label: "Review count", detail: `${totalReviews} reviews — aim for 50+`, recommendation: "Ask satisfied customers for reviews" }); }
  else {
    reviewScore += 1;
    reviewFindings.push({ status: "fail", label: "Review count", detail: `${totalReviews} reviews — below local average`, recommendation: "Actively request reviews from happy customers" });
    recommendations.push({ priority: "high", category: "Reviews", title: "Increase review volume", description: `You have ${totalReviews} reviews. Businesses with 50+ reviews rank significantly higher in local search.`, estimatedImpact: "High — top 3 ranking factor", actionable: true });
  }

  if (avgRating >= 4.5) { reviewScore += 7; reviewFindings.push({ status: "pass", label: "Average rating", detail: `${avgRating.toFixed(1)} stars` }); }
  else if (avgRating >= 4.0) { reviewScore += 4; reviewFindings.push({ status: "warn", label: "Average rating", detail: `${avgRating.toFixed(1)} stars — good, aim for 4.5+` }); }
  else { reviewScore += 1; reviewFindings.push({ status: "fail", label: "Average rating", detail: `${avgRating.toFixed(1)} stars — needs improvement` }); }

  if (recentReviews >= 4) { reviewScore += 5; reviewFindings.push({ status: "pass", label: "Review velocity", detail: `${recentReviews} reviews in last 30 days` }); }
  else if (recentReviews >= 1) { reviewScore += 2; reviewFindings.push({ status: "warn", label: "Review velocity", detail: `${recentReviews} reviews in last 30 days — aim for 4+` }); }
  else {
    reviewFindings.push({ status: "fail", label: "Review velocity", detail: "No new reviews in 30 days" });
    recommendations.push({ priority: "medium", category: "Reviews", title: "Boost review velocity", description: "Google values fresh reviews. Aim for at least 4 new reviews per month.", estimatedImpact: "Medium — freshness signal", actionable: true });
  }

  if (responseRate >= 0.8) { reviewScore += 6; reviewFindings.push({ status: "pass", label: "Response rate", detail: `${(responseRate * 100).toFixed(0)}% of reviews responded` }); }
  else if (responseRate >= 0.5) { reviewScore += 3; reviewFindings.push({ status: "warn", label: "Response rate", detail: `${(responseRate * 100).toFixed(0)}% responded — aim for 80%+` }); }
  else {
    reviewScore += 1;
    reviewFindings.push({ status: "fail", label: "Response rate", detail: `${(responseRate * 100).toFixed(0)}% — respond to all reviews` });
    recommendations.push({ priority: "medium", category: "Reviews", title: "Respond to all reviews", description: "Google considers review responses a ranking signal. Aim for 80%+ response rate.", estimatedImpact: "Medium — engagement signal", actionable: true });
  }

  categories.push({ name: "Reviews & Reputation", score: reviewScore, maxScore: 25, findings: reviewFindings });

  // 3. Content & Social Signals (25 points)
  const contentFindings: SEOFinding[] = [];
  let contentScore = 0;
  const recentPosts = Number(contentData?.recentPosts || 0);

  if (recentPosts >= 12) { contentScore += 15; contentFindings.push({ status: "pass", label: "Social posting frequency", detail: `${recentPosts} posts in 30 days` }); }
  else if (recentPosts >= 4) { contentScore += 8; contentFindings.push({ status: "warn", label: "Social posting frequency", detail: `${recentPosts} posts — aim for 12+/month` }); }
  else {
    contentScore += 2;
    contentFindings.push({ status: "fail", label: "Social posting frequency", detail: `${recentPosts} posts in 30 days` });
    recommendations.push({ priority: "medium", category: "Content", title: "Post more frequently", description: "Consistent social posting improves local search visibility. Aim for 3 posts per week.", estimatedImpact: "Medium — social signals + brand awareness", actionable: true });
  }

  const hasWebsite = true; // LocalGenius generates one
  if (hasWebsite) { contentScore += 10; contentFindings.push({ status: "pass", label: "Website", detail: "Generated by LocalGenius — mobile-optimized" }); }

  categories.push({ name: "Content & Social Signals", score: contentScore, maxScore: 25, findings: contentFindings });

  // 4. Search Performance (25 points)
  const searchFindings: SEOFinding[] = [];
  let searchScore = 0;
  const pageViews = Number(trafficData?.pageViews || 0);
  const searchImpressions = Number(trafficData?.searchImpressions || 0);
  const phoneCalls = Number(trafficData?.phoneCalls || 0);

  if (pageViews >= 200) { searchScore += 8; searchFindings.push({ status: "pass", label: "Website visits", detail: `${pageViews} in 30 days` }); }
  else if (pageViews >= 50) { searchScore += 4; searchFindings.push({ status: "warn", label: "Website visits", detail: `${pageViews} — growing` }); }
  else { searchScore += 1; searchFindings.push({ status: "fail", label: "Website visits", detail: `${pageViews} in 30 days — needs improvement` }); }

  if (searchImpressions >= 500) { searchScore += 8; searchFindings.push({ status: "pass", label: "Search impressions", detail: `${searchImpressions} in 30 days` }); }
  else if (searchImpressions >= 100) { searchScore += 4; searchFindings.push({ status: "warn", label: "Search impressions", detail: `${searchImpressions} — building visibility` }); }
  else { searchScore += 1; searchFindings.push({ status: "fail", label: "Search impressions", detail: `${searchImpressions} — limited visibility` }); }

  if (phoneCalls >= 20) { searchScore += 9; searchFindings.push({ status: "pass", label: "Phone calls from search", detail: `${phoneCalls} in 30 days` }); }
  else if (phoneCalls >= 5) { searchScore += 5; searchFindings.push({ status: "warn", label: "Phone calls from search", detail: `${phoneCalls} — aim for 20+/month` }); }
  else { searchScore += 1; searchFindings.push({ status: "fail", label: "Phone calls from search", detail: `${phoneCalls} in 30 days` }); }

  categories.push({ name: "Search Performance", score: searchScore, maxScore: 25, findings: searchFindings });

  // ─── Overall Score ──────────────────────────────────────────────────────

  const overall = categories.reduce((sum, c) => sum + c.score, 0);

  // ─── AI Insights ──────────────────────────────────────────────────────────

  const aiInsights = await generate({
    prompt: `You are a local SEO expert analyzing ${biz.name} (${biz.vertical} in ${biz.city}, ${biz.state}). Their SEO score is ${overall}/100.

Key data: ${totalReviews} reviews (${avgRating.toFixed(1)} avg), ${recentPosts} social posts in 30 days, ${pageViews} website visits, ${phoneCalls} calls from search, ${(responseRate * 100).toFixed(0)}% review response rate.

Top recommendations: ${recommendations.slice(0, 3).map((r) => r.title).join(", ") || "None — they're doing well!"}

Write 2-3 sentences of specific, actionable SEO advice for this business. Mention their city and business type. Be warm and encouraging, not technical. No jargon.`,
    maxTokens: 200,
    model: "claude-haiku-4-5-20251001",
  });

  return {
    score: { overall, categories },
    recommendations: recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }),
    aiInsights,
  };
}
