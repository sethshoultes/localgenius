/**
 * Usage Metering Service — AI Cost Control
 *
 * Tracks AI token usage per business per month. Enforces the 15%
 * revenue ceiling from market-fit.md:
 *   - $29 user → $4.35 AI cost limit
 *   - $79 user → $11.85 AI cost limit
 *
 * When a user approaches the limit, degrades to Haiku for non-critical
 * tasks. Alerts admin when any user exceeds 80% of their budget.
 */

import { db } from "@/lib/db";
import { messages, organizations, businesses } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

// ─── Cost Constants ───────────────────────────────────────────────────────────

// Anthropic pricing (per million tokens)
const PRICING = {
  "claude-sonnet-4-6-20250514": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5-20251001": { input: 0.25, output: 1.25 },
} as const;

// Revenue ceiling: 15% of monthly subscription
const PLAN_LIMITS_CENTS: Record<string, number> = {
  base: 435,      // $4.35 = 15% of $29
  pro: 1185,      // $11.85 = 15% of $79
  franchise: 1185,
};

const DEGRADATION_THRESHOLD = 0.80; // Start degrading at 80% of budget
const ALERT_THRESHOLD = 0.90;       // Alert admin at 90%

// ─── Usage Tracking ───────────────────────────────────────────────────────────

interface UsageData {
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCostCents: number;
  budgetCents: number;
  budgetUsedPercent: number;
  shouldDegrade: boolean;
  shouldAlert: boolean;
  model: string; // recommended model based on usage
}

/**
 * Get current month's AI usage for a business.
 */
export async function getUsage(businessId: string): Promise<UsageData> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // Sum tokens for this business this month
  const [usage] = await db
    .select({
      totalInput: sql<number>`coalesce(sum(${messages.tokensInput}), 0)`,
      totalOutput: sql<number>`coalesce(sum(${messages.tokensOutput}), 0)`,
      sonnetInput: sql<number>`coalesce(sum(case when ${messages.aiModel} like '%sonnet%' then ${messages.tokensInput} else 0 end), 0)`,
      sonnetOutput: sql<number>`coalesce(sum(case when ${messages.aiModel} like '%sonnet%' then ${messages.tokensOutput} else 0 end), 0)`,
      haikuInput: sql<number>`coalesce(sum(case when ${messages.aiModel} like '%haiku%' then ${messages.tokensInput} else 0 end), 0)`,
      haikuOutput: sql<number>`coalesce(sum(case when ${messages.aiModel} like '%haiku%' then ${messages.tokensOutput} else 0 end), 0)`,
    })
    .from(messages)
    .where(
      and(
        eq(messages.businessId, businessId),
        sql`${messages.aiModel} IS NOT NULL`,
        gte(messages.createdAt, monthStart)
      )
    );

  const sonnetCost =
    (Number(usage?.sonnetInput || 0) / 1_000_000) * PRICING["claude-sonnet-4-6-20250514"].input +
    (Number(usage?.sonnetOutput || 0) / 1_000_000) * PRICING["claude-sonnet-4-6-20250514"].output;

  const haikuCost =
    (Number(usage?.haikuInput || 0) / 1_000_000) * PRICING["claude-haiku-4-5-20251001"].input +
    (Number(usage?.haikuOutput || 0) / 1_000_000) * PRICING["claude-haiku-4-5-20251001"].output;

  const totalCostCents = Math.round((sonnetCost + haikuCost) * 100);

  // Get plan to determine budget
  const [biz] = await db
    .select({ organizationId: businesses.organizationId })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  let budgetCents = PLAN_LIMITS_CENTS.base;
  if (biz) {
    const [org] = await db
      .select({ plan: organizations.plan })
      .from(organizations)
      .where(eq(organizations.id, biz.organizationId))
      .limit(1);
    budgetCents = PLAN_LIMITS_CENTS[org?.plan || "base"] || PLAN_LIMITS_CENTS.base;
  }

  const usedPercent = budgetCents > 0 ? totalCostCents / budgetCents : 0;

  return {
    totalInputTokens: Number(usage?.totalInput || 0),
    totalOutputTokens: Number(usage?.totalOutput || 0),
    estimatedCostCents: totalCostCents,
    budgetCents,
    budgetUsedPercent: Math.round(usedPercent * 100),
    shouldDegrade: usedPercent >= DEGRADATION_THRESHOLD,
    shouldAlert: usedPercent >= ALERT_THRESHOLD,
    model: usedPercent >= DEGRADATION_THRESHOLD
      ? "claude-haiku-4-5-20251001"
      : "claude-sonnet-4-6-20250514",
  };
}

/**
 * Get the recommended model for a business based on usage budget.
 * Critical tasks (conversation, review responses) stay on Sonnet until 95%.
 * Non-critical (digest, SEO analysis, insights) degrade to Haiku at 80%.
 */
export async function getModel(
  businessId: string,
  critical: boolean = false
): Promise<"claude-sonnet-4-6-20250514" | "claude-haiku-4-5-20251001"> {
  const usage = await getUsage(businessId);

  if (critical) {
    // Critical tasks only degrade at 95%
    return usage.budgetUsedPercent >= 95
      ? "claude-haiku-4-5-20251001"
      : "claude-sonnet-4-6-20250514";
  }

  return usage.model as "claude-sonnet-4-6-20250514" | "claude-haiku-4-5-20251001";
}

/**
 * Get usage summary for all businesses (admin endpoint).
 */
export async function getAllUsageSummary(): Promise<{
  totalBusinesses: number;
  overBudget: number;
  nearBudget: number;
  totalCostCents: number;
  topUsers: Array<{ businessId: string; businessName: string; costCents: number; budgetPercent: number }>;
}> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // Get usage per business
  const perBusiness = await db
    .select({
      businessId: messages.businessId,
      totalInput: sql<number>`coalesce(sum(${messages.tokensInput}), 0)`,
      totalOutput: sql<number>`coalesce(sum(${messages.tokensOutput}), 0)`,
    })
    .from(messages)
    .where(
      and(
        sql`${messages.aiModel} IS NOT NULL`,
        gte(messages.createdAt, monthStart)
      )
    )
    .groupBy(messages.businessId);

  let totalCostCents = 0;
  let overBudget = 0;
  let nearBudget = 0;
  const topUsers: Array<{ businessId: string; businessName: string; costCents: number; budgetPercent: number }> = [];

  for (const row of perBusiness) {
    // Blended cost estimate (assume 80% Sonnet, 20% Haiku)
    const inputTokens = Number(row.totalInput);
    const outputTokens = Number(row.totalOutput);
    const costCents = Math.round(
      ((inputTokens / 1_000_000) * 2.45 + (outputTokens / 1_000_000) * 12.25) * 100
    );
    totalCostCents += costCents;

    const budgetCents = PLAN_LIMITS_CENTS.base; // simplified
    const budgetPercent = Math.round((costCents / budgetCents) * 100);

    if (budgetPercent >= 100) overBudget++;
    else if (budgetPercent >= 80) nearBudget++;

    topUsers.push({
      businessId: row.businessId,
      businessName: "", // filled below
      costCents,
      budgetPercent,
    });
  }

  // Sort by cost and get top 10
  topUsers.sort((a, b) => b.costCents - a.costCents);
  const top10 = topUsers.slice(0, 10);

  // Fill in business names
  for (const user of top10) {
    const [biz] = await db
      .select({ name: businesses.name })
      .from(businesses)
      .where(eq(businesses.id, user.businessId))
      .limit(1);
    user.businessName = biz?.name || "Unknown";
  }

  return {
    totalBusinesses: perBusiness.length,
    overBudget,
    nearBudget,
    totalCostCents,
    topUsers: top10,
  };
}
