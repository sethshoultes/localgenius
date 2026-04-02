import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent, handleWebhookEvent } from "@/services/stripe";

/**
 * POST /api/billing/webhook
 * Handles Stripe webhook events. Verifies signature, processes event.
 *
 * Webhook events handled:
 *   - checkout.session.completed → activate subscription
 *   - invoice.payment_succeeded → confirm payment
 *   - invoice.payment_failed → log failure, notify owner
 *   - customer.subscription.updated → plan change
 *   - customer.subscription.deleted → downgrade to base
 *
 * Configure in Stripe dashboard:
 *   Endpoint URL: https://api.localgenius.com/api/billing/webhook
 *   Events: checkout.session.completed, invoice.*, customer.subscription.*
 */
export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: { code: "MISSING_SIGNATURE", message: "No stripe-signature header" } },
        { status: 400 }
      );
    }

    // Verify webhook signature and parse event
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

    // Process the event
    const result = await handleWebhookEvent(event);

    return NextResponse.json({
      data: {
        received: true,
        eventType: event.type,
        ...result,
      },
    });
  } catch (error) {
    // Log but return 200 to prevent Stripe retries on our errors
    console.error("Stripe webhook error:", error);
    return NextResponse.json({
      data: {
        received: true,
        error: error instanceof Error ? error.message : "Processing error",
      },
    });
  }
}
