import { NextResponse } from "next/server";

/**
 * POST /api/billing/webhook
 *
 * DEPRECATED: This endpoint has been replaced by /api/webhooks/stripe,
 * which adds thread notifications on top of the original billing logic.
 * Update your Stripe dashboard to point to /api/webhooks/stripe.
 */
export async function POST() {
  console.warn("Deprecated /api/billing/webhook endpoint called — update Stripe dashboard to use /api/webhooks/stripe");
  return NextResponse.json(
    {
      error: {
        code: "DEPRECATED",
        message: "Use /api/webhooks/stripe instead",
      },
    },
    { status: 410 }
  );
}
