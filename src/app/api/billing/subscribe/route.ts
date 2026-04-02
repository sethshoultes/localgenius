import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyAuth } from "@/api/middleware/auth";
import { getOrCreateCustomer, createCheckoutSession } from "@/services/stripe";

const subscribeSchema = z.object({
  plan: z.enum(["base", "pro"]),
});

/**
 * POST /api/billing/subscribe
 * Creates a Stripe Checkout session for the selected plan.
 * Returns the checkout URL — client redirects the owner there.
 *
 * Locked pricing: $29/month base, $79/month pro.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const validated = subscribeSchema.parse(body);

    // Get user email for Stripe customer
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateCustomer(
      auth.organizationId,
      user.email,
      user.name
    );

    // Create checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const { url, sessionId } = await createCheckoutSession(
      auth.organizationId,
      customerId,
      validated.plan,
      `${appUrl}/?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      `${appUrl}/?billing=cancelled`
    );

    return NextResponse.json({
      data: { checkoutUrl: url, sessionId },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid plan", details: error.errors } },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Subscription failed";
    return NextResponse.json(
      { error: { code: "BILLING_ERROR", message } },
      { status: 500 }
    );
  }
}
