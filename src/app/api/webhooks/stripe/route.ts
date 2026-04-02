import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizations, businesses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { constructWebhookEvent, handleWebhookEvent } from "@/services/stripe";
import { dispatch } from "@/services/webhook-dispatcher";

/**
 * POST /api/webhooks/stripe
 * Receives Stripe webhook events, verifies signature, processes payment
 * lifecycle events, and dispatches thread messages to the owner.
 *
 * This is the preferred Stripe webhook endpoint (replaces /api/billing/webhook).
 * It adds conversation thread notifications on top of the billing logic.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: { code: "MISSING_SIGNATURE", message: "No stripe-signature header" } },
        { status: 400 }
      );
    }

    // Verify signature and parse event
    let event;
    try {
      event = constructWebhookEvent(body, signature);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Signature verification failed";
      return NextResponse.json(
        { error: { code: "INVALID_SIGNATURE", message } },
        { status: 400 }
      );
    }

    // Process billing logic (plan updates, subscription status)
    const billingResult = await handleWebhookEvent(event);

    // Dispatch thread messages based on event type
    const eventData = event.data.object as unknown as Record<string, unknown>;
    const orgId = (eventData.metadata as Record<string, string>)?.organizationId;

    if (orgId) {
      // Find the business for this org
      const [biz] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.organizationId, orgId))
        .limit(1);

      if (biz) {
        const dispatchMap: Record<string, { type: string; data: Record<string, unknown> }> = {
          "checkout.session.completed": {
            type: "subscription.activated",
            data: { plan: (eventData.metadata as Record<string, string>)?.plan || "base" },
          },
          "invoice.payment_succeeded": {
            type: "payment.succeeded",
            data: {
              amount: eventData.amount_paid
                ? `$${(Number(eventData.amount_paid) / 100).toFixed(2)}`
                : undefined,
            },
          },
          "invoice.payment_failed": {
            type: "payment.failed",
            data: {},
          },
          "customer.subscription.updated": {
            type: "subscription.changed",
            data: {
              oldPlan: "base",
              newPlan: (eventData.metadata as Record<string, string>)?.plan || "pro",
            },
          },
          "customer.subscription.deleted": {
            type: "subscription.cancelled",
            data: {},
          },
        };

        const mapping = dispatchMap[event.type];
        if (mapping) {
          await dispatch({
            type: mapping.type as Parameters<typeof dispatch>[0]["type"],
            businessId: biz.id,
            organizationId: orgId,
            data: mapping.data,
          });
        }
      }
    }

    return NextResponse.json({
      data: {
        received: true,
        eventType: event.type,
        billing: billingResult,
        threadNotified: !!orgId,
      },
    });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json({
      data: { received: true, error: error instanceof Error ? error.message : "Processing error" },
    });
  }
}
