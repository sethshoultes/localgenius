# Stripe Billing Setup

This guide covers setting up Stripe payment processing for LocalGenius billing.

## Overview

LocalGenius uses Stripe for subscription management with two locked pricing tiers:
- **Base Plan**: $29/month
- **Pro Plan**: $79/month

Stripe handles checkout sessions, subscription lifecycle management, and webhook notifications for payment events.

## Step 1: Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and create an account
2. Verify your email and set up your business information
3. Complete identity verification (required to accept real payments)
4. Once verified, you have access to both test and live modes

## Step 2: Get API Keys

1. Go to **Dashboard → Developers → API keys**
2. Copy your keys from both Test and Live modes:
   - **Secret Key** (starts with `sk_test_` or `sk_live_`)
   - **Publishable Key** (starts with `pk_test_` or `pk_live_`)

For development, use test mode keys. For production, use live mode keys.

## Step 3: Create Products and Prices

Products and prices must be created in the Stripe Dashboard. The application references them by Price ID.

### Create Base Plan ($29/month)

1. Go to **Billing → Products** in Stripe Dashboard
2. Click **Create product**
3. Set up:
   - **Name**: LocalGenius Base
   - **Description**: Base tier with core features
   - **Type**: Service
4. Under **Pricing**, click **Add pricing**
   - **Price type**: Recurring
   - **Billing period**: Monthly
   - **Amount**: $29.00
5. Click **Create product**
6. Copy the **Price ID** (starts with `price_`)

### Create Pro Plan ($79/month)

Repeat the above, but:
- **Name**: LocalGenius Pro
- **Amount**: $79.00

## Step 4: Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# Stripe API
STRIPE_SECRET_KEY=sk_test_xxxxx          # Secret key from API keys page
STRIPE_WEBHOOK_SECRET=whsec_xxxxx        # Generated after setting up webhook endpoint
STRIPE_PRICE_BASE=price_xxxxx            # Price ID from Base plan
STRIPE_PRICE_PRO=price_xxxxx             # Price ID from Pro plan
```

### Where to find each value:

| Variable | Location | Notes |
|----------|----------|-------|
| `STRIPE_SECRET_KEY` | Developers → API keys → Secret key | Use test key for dev, live key for prod |
| `STRIPE_PRICE_BASE` | Billing → Products → Base product → Price ID | Copy the full price ID |
| `STRIPE_PRICE_PRO` | Billing → Products → Pro product → Price ID | Copy the full price ID |
| `STRIPE_WEBHOOK_SECRET` | Developers → Webhooks (after Step 5) | Generated after webhook setup |

## Step 5: Configure Webhook Endpoint

Stripe sends payment events (checkout completion, subscription updates, payment failures) via webhooks.

1. Go to **Developers → Webhooks** in Stripe Dashboard
2. Click **Create endpoint** or **Add endpoint**
3. Set endpoint URL:
   ```
   https://localgenius.company/api/webhooks/stripe
   ```
   For local development:
   ```
   https://your-ngrok-url/api/webhooks/stripe
   ```
   (Use [ngrok](https://ngrok.com) to expose local server to Stripe)

4. Under **Events to send**, select these events:
   - `checkout.session.completed` — Subscription activated
   - `customer.subscription.updated` — Plan changed or renewed
   - `customer.subscription.deleted` — Subscription cancelled
   - `invoice.payment_succeeded` — Payment confirmed
   - `invoice.payment_failed` — Payment failed

5. Click **Create endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add to `.env.local`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

## Step 6: Test Webhook Delivery

### Using Stripe CLI

1. Install [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Authenticate:
   ```bash
   stripe login
   ```
3. Forward webhooks to local development server:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
4. This generates a `STRIPE_WEBHOOK_SECRET` for testing — add to `.env.local`

### Simulate Payment Events

While `stripe listen` is running, trigger test events:

```bash
# Simulate checkout completion
stripe trigger checkout.session.completed

# Simulate successful payment
stripe trigger invoice.payment_succeeded

# Simulate plan change
stripe trigger customer.subscription.updated

# Simulate cancellation
stripe trigger customer.subscription.deleted
```

## Step 7: Test Checkout Flow

### In Test Mode

1. Start the app:
   ```bash
   npm run dev
   ```
2. Navigate to the billing page
3. Click **Subscribe to Pro**
4. Use Stripe's test card numbers:
   - **Success**: `4242 4242 4242 4242`
   - **Decline**: `4000 0000 0000 0002`
   - **Expiry**: Any future date (e.g., 12/25)
   - **CVC**: Any 3 digits (e.g., 123)

5. Verify:
   - Checkout session created
   - Webhook received in dashboard or CLI
   - Organization plan updated in database
   - User redirected to success page

### In Production (Live Mode)

Switch to live mode keys ONLY after thorough testing:

1. Replace test mode keys with live mode keys in `.env.local`
2. Redeploy the application
3. Verify webhook endpoint is configured with live mode keys
4. Test with small real transactions first
5. Monitor webhook delivery in Stripe Dashboard

## Step 8: Monitor Payments

### Stripe Dashboard

- **Billing → Invoices** — View payment history
- **Billing → Subscriptions** — View active subscriptions
- **Developers → Webhooks → Events** — View webhook delivery logs
- **Payments** — View all transactions

### Application Database

Payments are tracked in:
- `organizations` table: `plan`, `stripeCustomerId`, `stripeSubscriptionId`
- Payment events logged to `analyticsEvents` table via webhook handler

## Environment Variables Reference

All Stripe environment variables are **optional** — the app functions without them, but billing is disabled.

```bash
# Required for billing to work
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_BASE=price_xxxxx
STRIPE_PRICE_PRO=price_xxxxx
```

## Webhook Events Handled

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Activate subscription, set plan in organization |
| `invoice.payment_succeeded` | Update `updatedAt` timestamp for revenue tracking |
| `invoice.payment_failed` | Log payment failure (alerts sent to owner via conversation) |
| `customer.subscription.updated` | Detect plan changes and update organization |
| `customer.subscription.deleted` | Downgrade organization to free tier, clear subscription ID |

## Troubleshooting

### "STRIPE_SECRET_KEY not set"

Add `STRIPE_SECRET_KEY` to `.env.local` and restart the dev server.

### Webhook signature verification failed

1. Verify `STRIPE_WEBHOOK_SECRET` matches the value in Stripe Dashboard
2. If using `stripe listen`, get the new secret from the CLI output
3. Restart the dev server after updating `.env.local`

### Checkout session fails to create

1. Verify `STRIPE_PRICE_BASE` and `STRIPE_PRICE_PRO` are valid Price IDs
2. Check that products exist in Stripe Dashboard
3. Verify user is authenticated before attempting checkout

### Test card declined

Stripe test mode has special behaviors:
- `4000 0000 0000 0002` always declines
- Use `4242 4242 4242 4242` for successful transactions
- See [Stripe test card list](https://stripe.com/docs/testing) for more

## Related Files

- `src/services/stripe.ts` — Billing service (customer creation, checkout, webhooks)
- `src/app/api/billing/subscribe/route.ts` — Checkout session endpoint
- `src/app/api/webhooks/stripe/route.ts` — Webhook receiver and processor
- `src/lib/env.ts` — Environment variable validation

## Next Steps

1. Create Stripe account and verify identity
2. Create products and prices in Stripe Dashboard
3. Add API keys and Price IDs to `.env.local`
4. Set up webhook endpoint
5. Test with Stripe CLI
6. Deploy to staging and test with real test cards
7. Switch to live mode keys for production
