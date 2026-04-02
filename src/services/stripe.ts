/**
 * Stripe Billing Service
 * Spec: engineering/integration-plan.md Section 4
 *
 * Locked pricing: $29/month base, $79/month pro.
 * Creates Stripe customer on registration, manages subscriptions,
 * handles webhook events for payment lifecycle.
 */

import Stripe from "stripe";
import { db } from "@/lib/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

// ─── Client ───────────────────────────────────────────────────────────────────

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

// ─── Price IDs ────────────────────────────────────────────────────────────────
// These are set in Stripe dashboard and stored as env vars.
// Fallbacks are for development with Stripe test mode.

function getPriceId(plan: "base" | "pro"): string {
  if (plan === "base") {
    return process.env.STRIPE_PRICE_BASE || "price_base_29";
  }
  return process.env.STRIPE_PRICE_PRO || "price_pro_79";
}

// ─── Customer Management ──────────────────────────────────────────────────────

/**
 * Create a Stripe customer for a new organization.
 * Called during registration (auth/register).
 */
export async function createCustomer(
  organizationId: string,
  email: string,
  name: string
): Promise<string> {
  const stripe = getStripe();

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      organizationId,
      source: "localgenius",
    },
  });

  // Store customer ID on org
  await db
    .update(organizations)
    .set({
      stripeCustomerId: customer.id,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId));

  return customer.id;
}

/**
 * Get or create a Stripe customer for an organization.
 */
export async function getOrCreateCustomer(
  organizationId: string,
  email: string,
  name: string
): Promise<string> {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (org?.stripeCustomerId) {
    return org.stripeCustomerId;
  }

  return createCustomer(organizationId, email, name);
}

// ─── Checkout Sessions ────────────────────────────────────────────────────────

/**
 * Create a Stripe Checkout Session for subscribing to a plan.
 * Returns the checkout URL — redirect the owner here.
 */
export async function createCheckoutSession(
  organizationId: string,
  customerId: string,
  plan: "base" | "pro",
  successUrl: string,
  cancelUrl: string
): Promise<{ url: string; sessionId: string }> {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: getPriceId(plan),
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      organizationId,
      plan,
    },
    subscription_data: {
      metadata: {
        organizationId,
        plan,
      },
    },
  });

  return {
    url: session.url || "",
    sessionId: session.id,
  };
}

// ─── Billing Portal ───────────────────────────────────────────────────────────

/**
 * Create a Stripe Billing Portal session.
 * Allows the owner to manage their subscription, update payment, cancel.
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

// ─── Webhook Processing ──────────────────────────────────────────────────────

/**
 * Verify Stripe webhook signature and parse the event.
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET not set");
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Handle a verified Stripe webhook event.
 * Updates organization plan and subscription status in the database.
 */
export async function handleWebhookEvent(
  event: Stripe.Event
): Promise<{ handled: boolean; action: string }> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.organizationId;
      const plan = session.metadata?.plan as "base" | "pro" | undefined;

      if (orgId && plan) {
        await db
          .update(organizations)
          .set({
            plan,
            stripeSubscriptionId:
              typeof session.subscription === "string"
                ? session.subscription
                : session.subscription?.id || null,
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, orgId));

        return { handled: true, action: `activated_${plan}` };
      }
      return { handled: false, action: "missing_metadata" };
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = (invoice as unknown as Record<string, unknown>).subscription as string | null;

      if (subId) {
        const [org] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.stripeSubscriptionId, subId))
          .limit(1);

        if (org) {
          await db
            .update(organizations)
            .set({ updatedAt: new Date() })
            .where(eq(organizations.id, org.id));
        }
      }
      return { handled: true, action: "payment_confirmed" };
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = (invoice as unknown as Record<string, unknown>).subscription as string | null;

      if (subId) {
        // Payment failed — log for follow-up
        // In production: send notification to owner via conversation thread
        console.warn(`Payment failed for subscription ${subId}`);
      }
      return { handled: true, action: "payment_failed" };
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const orgId = subscription.metadata?.organizationId;

      if (orgId) {
        // Detect plan change from line items
        const priceId = subscription.items.data[0]?.price?.id;
        const basePriceId = process.env.STRIPE_PRICE_BASE || "price_base_29";
        const newPlan = priceId === basePriceId ? "base" : "pro";

        await db
          .update(organizations)
          .set({
            plan: newPlan as "base" | "pro",
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, orgId));

        return { handled: true, action: `plan_changed_to_${newPlan}` };
      }
      return { handled: false, action: "missing_org_id" };
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const orgId = subscription.metadata?.organizationId;

      if (orgId) {
        // Subscription cancelled — downgrade to base (or disable)
        await db
          .update(organizations)
          .set({
            plan: "base",
            stripeSubscriptionId: null,
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, orgId));

        return { handled: true, action: "subscription_cancelled" };
      }
      return { handled: false, action: "missing_org_id" };
    }

    default:
      return { handled: false, action: `unhandled_event_${event.type}` };
  }
}

// ─── Subscription Queries ─────────────────────────────────────────────────────

/**
 * Get the current subscription status for an organization.
 */
export async function getSubscriptionStatus(
  organizationId: string
): Promise<{
  plan: string;
  status: string;
  currentPeriodEnd: Date | null;
} | null> {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org || !org.stripeSubscriptionId) {
    return { plan: org?.plan || "base", status: "no_subscription", currentPeriodEnd: null };
  }

  try {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(org.stripeSubscriptionId) as unknown as {
      status: string;
      current_period_end: number;
    };

    return {
      plan: org.plan,
      status: sub.status,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
    };
  } catch {
    return { plan: org.plan, status: "error", currentPeriodEnd: null };
  }
}
