import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyAuth } from "@/api/middleware/auth";
import { createPortalSession } from "@/services/stripe";

/**
 * POST /api/billing/portal
 * Creates a Stripe Billing Portal session.
 * Owner can manage subscription, update payment method, cancel.
 *
 * Per product-design.md: no billing settings page.
 * This is triggered from the conversation thread:
 * "I'd like to change my plan" → LocalGenius provides portal link.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth instanceof NextResponse) return auth;

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, auth.organizationId))
      .limit(1);

    if (!org?.stripeCustomerId) {
      return NextResponse.json(
        { error: { code: "NO_SUBSCRIPTION", message: "No billing account found. Start a subscription first." } },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const portalUrl = await createPortalSession(
      org.stripeCustomerId,
      `${appUrl}/`
    );

    return NextResponse.json({
      data: { portalUrl },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Portal creation failed";
    return NextResponse.json(
      { error: { code: "BILLING_ERROR", message } },
      { status: 500 }
    );
  }
}
