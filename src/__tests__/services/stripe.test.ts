/**
 * Tests for src/services/stripe.ts
 * Checkout session creation, webhook event processing, customer management.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

// ─── Module mocks ────────────────────────────────────────────────────────────

// Mock Stripe SDK
const mockCustomersCreate = vi.fn();
const mockCheckoutSessionsCreate = vi.fn();
const mockBillingPortalSessionsCreate = vi.fn();
const mockSubscriptionsRetrieve = vi.fn();
const mockWebhooksConstructEvent = vi.fn();

vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      customers: { create: mockCustomersCreate },
      checkout: { sessions: { create: mockCheckoutSessionsCreate } },
      billingPortal: { sessions: { create: mockBillingPortalSessionsCreate } },
      subscriptions: { retrieve: mockSubscriptionsRetrieve },
      webhooks: { constructEvent: mockWebhooksConstructEvent },
    })),
  };
});

// Mock DB
const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

const mockSelectLimit = vi.fn().mockResolvedValue([]);
const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
  getDb: vi.fn(),
}));

// Mock schema
vi.mock("@/db/schema", () => ({
  organizations: {
    id: "organizations.id",
    stripeCustomerId: "organizations.stripeCustomerId",
    stripeSubscriptionId: "organizations.stripeSubscriptionId",
    plan: "organizations.plan",
  },
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ op: "eq", args })),
}));

// ─── Tests: createCustomer ───────────────────────────────────────────────────

describe("createCustomer", () => {
  let createCustomer: typeof import("@/services/stripe").createCustomer;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_123";

    mockCustomersCreate.mockResolvedValue({ id: "cus_test_001" });

    const mod = await import("@/services/stripe");
    createCustomer = mod.createCustomer;
  });

  it("creates a Stripe customer and stores the ID on the org", async () => {
    const customerId = await createCustomer("org-uuid-001", "owner@test.com", "Test Biz");

    expect(customerId).toBe("cus_test_001");
    expect(mockCustomersCreate).toHaveBeenCalledWith({
      email: "owner@test.com",
      name: "Test Biz",
      metadata: { organizationId: "org-uuid-001", source: "localgenius" },
    });
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ stripeCustomerId: "cus_test_001" })
    );
  });

  it("propagates Stripe API errors", async () => {
    mockCustomersCreate.mockRejectedValueOnce(new Error("Stripe API error"));

    await expect(createCustomer("org-uuid-001", "bad@test.com", "Bad Biz")).rejects.toThrow(
      "Stripe API error"
    );
  });
});

// ─── Tests: getOrCreateCustomer ──────────────────────────────────────────────

describe("getOrCreateCustomer", () => {
  let getOrCreateCustomer: typeof import("@/services/stripe").getOrCreateCustomer;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_123";

    mockCustomersCreate.mockResolvedValue({ id: "cus_new_001" });

    const mod = await import("@/services/stripe");
    getOrCreateCustomer = mod.getOrCreateCustomer;
  });

  it("returns existing customer ID if org already has one", async () => {
    mockSelectLimit.mockResolvedValueOnce([
      { id: "org-uuid-001", stripeCustomerId: "cus_existing_001", plan: "base" },
    ]);

    const customerId = await getOrCreateCustomer("org-uuid-001", "owner@test.com", "Test Biz");

    expect(customerId).toBe("cus_existing_001");
    expect(mockCustomersCreate).not.toHaveBeenCalled();
  });

  it("creates a new customer if org has no stripeCustomerId", async () => {
    mockSelectLimit.mockResolvedValueOnce([
      { id: "org-uuid-001", stripeCustomerId: null, plan: "base" },
    ]);

    const customerId = await getOrCreateCustomer("org-uuid-001", "owner@test.com", "Test Biz");

    expect(customerId).toBe("cus_new_001");
    expect(mockCustomersCreate).toHaveBeenCalled();
  });
});

// ─── Tests: createCheckoutSession ────────────────────────────────────────────

describe("createCheckoutSession", () => {
  let createCheckoutSession: typeof import("@/services/stripe").createCheckoutSession;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_123";

    mockCheckoutSessionsCreate.mockResolvedValue({
      id: "cs_test_001",
      url: "https://checkout.stripe.com/pay/cs_test_001",
    });

    const mod = await import("@/services/stripe");
    createCheckoutSession = mod.createCheckoutSession;
  });

  it("creates a checkout session for base plan", async () => {
    const result = await createCheckoutSession(
      "org-uuid-001",
      "cus_test_001",
      "base",
      "https://app.localgenius.io/success",
      "https://app.localgenius.io/cancel"
    );

    expect(result.sessionId).toBe("cs_test_001");
    expect(result.url).toBe("https://checkout.stripe.com/pay/cs_test_001");
    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_test_001",
        mode: "subscription",
        metadata: expect.objectContaining({ organizationId: "org-uuid-001", plan: "base" }),
      })
    );
  });

  it("creates a checkout session for pro plan", async () => {
    await createCheckoutSession(
      "org-uuid-001",
      "cus_test_001",
      "pro",
      "https://app.localgenius.io/success",
      "https://app.localgenius.io/cancel"
    );

    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ plan: "pro" }),
      })
    );
  });

  it("returns empty string for url when Stripe returns null", async () => {
    mockCheckoutSessionsCreate.mockResolvedValueOnce({
      id: "cs_test_002",
      url: null,
    });

    const result = await createCheckoutSession(
      "org-uuid-001",
      "cus_test_001",
      "base",
      "https://app.localgenius.io/success",
      "https://app.localgenius.io/cancel"
    );

    expect(result.url).toBe("");
  });
});

// ─── Tests: createPortalSession ──────────────────────────────────────────────

describe("createPortalSession", () => {
  let createPortalSession: typeof import("@/services/stripe").createPortalSession;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_123";

    mockBillingPortalSessionsCreate.mockResolvedValue({
      url: "https://billing.stripe.com/session/test",
    });

    const mod = await import("@/services/stripe");
    createPortalSession = mod.createPortalSession;
  });

  it("creates a billing portal session and returns the URL", async () => {
    const url = await createPortalSession("cus_test_001", "https://app.localgenius.io/settings");

    expect(url).toBe("https://billing.stripe.com/session/test");
    expect(mockBillingPortalSessionsCreate).toHaveBeenCalledWith({
      customer: "cus_test_001",
      return_url: "https://app.localgenius.io/settings",
    });
  });
});

// ─── Tests: constructWebhookEvent ────────────────────────────────────────────

describe("constructWebhookEvent", () => {
  let constructWebhookEvent: typeof import("@/services/stripe").constructWebhookEvent;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_123";

    const mod = await import("@/services/stripe");
    constructWebhookEvent = mod.constructWebhookEvent;
  });

  it("verifies and constructs webhook event", () => {
    const fakeEvent = { id: "evt_001", type: "checkout.session.completed" };
    mockWebhooksConstructEvent.mockReturnValue(fakeEvent);

    const result = constructWebhookEvent("payload-body", "sig_header");

    expect(result).toEqual(fakeEvent);
    expect(mockWebhooksConstructEvent).toHaveBeenCalledWith(
      "payload-body",
      "sig_header",
      "whsec_test_123"
    );
  });

  it("throws when STRIPE_WEBHOOK_SECRET is not set", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    // Need to re-import to pick up the env change — but since getStripe is cached,
    // the function itself checks the env var at call time
    expect(() => constructWebhookEvent("payload", "sig")).toThrow(
      "STRIPE_WEBHOOK_SECRET not set"
    );
  });
});

// ─── Tests: handleWebhookEvent ───────────────────────────────────────────────

describe("handleWebhookEvent", () => {
  let handleWebhookEvent: typeof import("@/services/stripe").handleWebhookEvent;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_123";

    const mod = await import("@/services/stripe");
    handleWebhookEvent = mod.handleWebhookEvent;
  });

  it("handles checkout.session.completed — activates plan", async () => {
    const event = {
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { organizationId: "org-uuid-001", plan: "pro" },
          subscription: "sub_test_001",
        },
      },
    } as unknown as Stripe.Event;

    const result = await handleWebhookEvent(event);

    expect(result.handled).toBe(true);
    expect(result.action).toBe("activated_pro");
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "pro",
        stripeSubscriptionId: "sub_test_001",
      })
    );
  });

  it("handles checkout.session.completed — returns unhandled when metadata missing", async () => {
    const event = {
      type: "checkout.session.completed",
      data: { object: { metadata: {} } },
    } as unknown as Stripe.Event;

    const result = await handleWebhookEvent(event);

    expect(result.handled).toBe(false);
    expect(result.action).toBe("missing_metadata");
  });

  it("handles invoice.payment_succeeded", async () => {
    mockSelectLimit.mockResolvedValueOnce([
      { id: "org-uuid-001", stripeSubscriptionId: "sub_test_001" },
    ]);

    const event = {
      type: "invoice.payment_succeeded",
      data: { object: { subscription: "sub_test_001" } },
    } as unknown as Stripe.Event;

    const result = await handleWebhookEvent(event);

    expect(result.handled).toBe(true);
    expect(result.action).toBe("payment_confirmed");
  });

  it("handles invoice.payment_failed — logs warning", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const event = {
      type: "invoice.payment_failed",
      data: { object: { subscription: "sub_test_001" } },
    } as unknown as Stripe.Event;

    const result = await handleWebhookEvent(event);

    expect(result.handled).toBe(true);
    expect(result.action).toBe("payment_failed");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Payment failed for subscription sub_test_001")
    );

    warnSpy.mockRestore();
  });

  it("handles customer.subscription.updated — updates plan", async () => {
    const event = {
      type: "customer.subscription.updated",
      data: {
        object: {
          metadata: { organizationId: "org-uuid-001" },
          items: { data: [{ price: { id: "price_pro_79" } }] },
        },
      },
    } as unknown as Stripe.Event;

    const result = await handleWebhookEvent(event);

    expect(result.handled).toBe(true);
    expect(result.action).toBe("plan_changed_to_pro");
  });

  it("handles customer.subscription.deleted — downgrades to base", async () => {
    const event = {
      type: "customer.subscription.deleted",
      data: {
        object: {
          metadata: { organizationId: "org-uuid-001" },
        },
      },
    } as unknown as Stripe.Event;

    const result = await handleWebhookEvent(event);

    expect(result.handled).toBe(true);
    expect(result.action).toBe("subscription_cancelled");
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "base",
        stripeSubscriptionId: null,
      })
    );
  });

  it("returns unhandled for unknown event types", async () => {
    const event = {
      type: "some.unknown.event",
      data: { object: {} },
    } as unknown as Stripe.Event;

    const result = await handleWebhookEvent(event);

    expect(result.handled).toBe(false);
    expect(result.action).toBe("unhandled_event_some.unknown.event");
  });
});

// ─── Tests: getSubscriptionStatus ────────────────────────────────────────────

describe("getSubscriptionStatus", () => {
  let getSubscriptionStatus: typeof import("@/services/stripe").getSubscriptionStatus;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_123";

    const mod = await import("@/services/stripe");
    getSubscriptionStatus = mod.getSubscriptionStatus;
  });

  it("returns no_subscription when org has no stripeSubscriptionId", async () => {
    mockSelectLimit.mockResolvedValueOnce([
      { id: "org-uuid-001", plan: "base", stripeSubscriptionId: null },
    ]);

    const result = await getSubscriptionStatus("org-uuid-001");

    expect(result).toEqual({
      plan: "base",
      status: "no_subscription",
      currentPeriodEnd: null,
    });
  });

  it("returns subscription status from Stripe", async () => {
    mockSelectLimit.mockResolvedValueOnce([
      { id: "org-uuid-001", plan: "pro", stripeSubscriptionId: "sub_test_001" },
    ]);
    mockSubscriptionsRetrieve.mockResolvedValueOnce({
      status: "active",
      current_period_end: 1735689600, // 2025-01-01 00:00:00 UTC
    });

    const result = await getSubscriptionStatus("org-uuid-001");

    expect(result!.plan).toBe("pro");
    expect(result!.status).toBe("active");
    expect(result!.currentPeriodEnd).toBeInstanceOf(Date);
  });

  it("returns error status when Stripe API fails", async () => {
    mockSelectLimit.mockResolvedValueOnce([
      { id: "org-uuid-001", plan: "pro", stripeSubscriptionId: "sub_test_001" },
    ]);
    mockSubscriptionsRetrieve.mockRejectedValueOnce(new Error("Stripe unavailable"));

    const result = await getSubscriptionStatus("org-uuid-001");

    expect(result!.plan).toBe("pro");
    expect(result!.status).toBe("error");
    expect(result!.currentPeriodEnd).toBeNull();
  });
});
