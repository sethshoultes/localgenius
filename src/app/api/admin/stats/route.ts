import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  organizations,
  businesses,
  users,
  conversations,
  contentItems,
  reviews,
  reviewResponses,
  messages,
  actions,
} from "@/db/schema";
import { sql, eq } from "drizzle-orm";
import { verifyAuth } from "@/api/middleware/auth";

/**
 * GET /api/admin/stats
 * System health dashboard — total users, businesses, conversations,
 * content generated, reviews responded, AI token usage, MRR estimate.
 *
 * Protected: requires admin role (checked against users.role).
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  // Admin role check
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, auth.userId))
    .limit(1);

  if (!user || user.role !== "admin") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Admin access required" } },
      { status: 403 }
    );
  }

  // Run all aggregate queries in parallel
  const [
    [userCount],
    [bizCount],
    [convoCount],
    [contentCount],
    [responseCount],
    [actionCount],
    [tokenUsage],
    planBreakdown,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(users),
    db.select({ count: sql<number>`count(*)` }).from(businesses),
    db.select({ count: sql<number>`count(*)` }).from(conversations),
    db.select({ count: sql<number>`count(*)` }).from(contentItems),
    db.select({ count: sql<number>`count(*)` }).from(reviewResponses),
    db
      .select({
        total: sql<number>`count(*)`,
        completed: sql<number>`count(*) filter (where ${actions.status} = 'completed')`,
        proposed: sql<number>`count(*) filter (where ${actions.status} = 'proposed')`,
        failed: sql<number>`count(*) filter (where ${actions.status} = 'failed')`,
      })
      .from(actions),
    db
      .select({
        totalInput: sql<number>`coalesce(sum(${messages.tokensInput}), 0)`,
        totalOutput: sql<number>`coalesce(sum(${messages.tokensOutput}), 0)`,
        aiMessages: sql<number>`count(*) filter (where ${messages.aiModel} is not null)`,
      })
      .from(messages),
    db
      .select({
        plan: organizations.plan,
        count: sql<number>`count(*)`,
      })
      .from(organizations)
      .groupBy(organizations.plan),
  ]);

  // Estimate MRR from plan breakdown
  const priceMap: Record<string, number> = { base: 29, pro: 79, franchise: 79 };
  const mrr = planBreakdown.reduce((sum, row) => {
    return sum + (priceMap[row.plan] || 0) * Number(row.count);
  }, 0);

  // Estimate AI costs from token usage
  // Sonnet 4.6: $3/M input, $15/M output. Haiku 4.5: $0.25/M input, $1.25/M output
  // Blended estimate (80% Sonnet, 20% Haiku)
  const inputTokens = Number(tokenUsage?.totalInput || 0);
  const outputTokens = Number(tokenUsage?.totalOutput || 0);
  const estimatedAiCostCents = Math.round(
    (inputTokens / 1_000_000) * 2.45 * 100 + // blended input: $3*0.8 + $0.25*0.2
    (outputTokens / 1_000_000) * 12.25 * 100   // blended output: $15*0.8 + $1.25*0.2
  );

  return NextResponse.json({
    data: {
      users: {
        total: Number(userCount?.count || 0),
      },
      businesses: {
        total: Number(bizCount?.count || 0),
      },
      conversations: {
        total: Number(convoCount?.count || 0),
      },
      content: {
        totalGenerated: Number(contentCount?.count || 0),
        reviewsResponded: Number(responseCount?.count || 0),
      },
      actions: {
        total: Number(actionCount?.total || 0),
        completed: Number(actionCount?.completed || 0),
        proposed: Number(actionCount?.proposed || 0),
        failed: Number(actionCount?.failed || 0),
      },
      ai: {
        totalMessages: Number(tokenUsage?.aiMessages || 0),
        tokensInput: inputTokens,
        tokensOutput: outputTokens,
        estimatedCostCents: estimatedAiCostCents,
        estimatedCostFormatted: `$${(estimatedAiCostCents / 100).toFixed(2)}`,
      },
      revenue: {
        mrrCents: mrr * 100,
        mrrFormatted: `$${mrr.toLocaleString()}`,
        planBreakdown: planBreakdown.map((row) => ({
          plan: row.plan,
          count: Number(row.count),
          mrrContribution: (priceMap[row.plan] || 0) * Number(row.count),
        })),
        aiCostPercentOfRevenue:
          mrr > 0
            ? `${((estimatedAiCostCents / 100 / mrr) * 100).toFixed(1)}%`
            : "N/A",
      },
      timestamp: new Date().toISOString(),
    },
  });
}
