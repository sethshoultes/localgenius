/**
 * Tests for POST /api/billing/subscribe
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { TEST_USER } from "../mocks/db";

// ─── Module mocks ────────────────────────────────────────────────────────────

const AUTH_CONTEXT = {
  userId: "user-uuid-001",
  organizationId: "org-uuid-001",
  businessId: "biz-uuid-001",
  plan: "base" as const,
};

const mockVerifyAuth = vi.fn().mockResolvedValue(AUTH_CONTEXT);

vi.mock("@/api/middleware/auth", () => ({
  verifyAuth: (...args: unknown[]) => mockVerifyAuth(...args),
}));

// Mock DB for user lookup
const mockSelectLimit = vi.fn().mockResolvedValue([TEST_USER]);
const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
  getDb: vi.fn(),
}));

// Mock schema
vi.mock("@/db/schema", () => ({
  users: { id: "users.id" },
}));

// Mock Stripe service
const mockGetOrCreateCustomer = vi.fn().mockResolvedValue("cus_test_123");
const mockCreateCheckoutSession = vi.fn().mockResolvedValue({
  url: "https://checkout.stripe.com/session_abc",
  sessionId: "cs_test_abc",
});

vi.mock("@/services/stripe", () => ({
  getOrCreateCustomer: (...args: unknown[]) => mockGetOrCreateCustomer(...args),
  createCheckoutSession: (...args: unknown[]) => mockCreateCheckoutSession(...args),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/billing/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── Tests: POST /api/billing/subscribe ─────────────────────────────────────

describe("POST /api/billing/subscribe", () => {
  let postHandler: typeof import("@/app/api/billing/subscribe/route").POST;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockVerifyAuth.mockResolvedValue(AUTH_CONTEXT);
    mockSelectLimit.mockResolvedValue([TEST_USER]);
    mockGetOrCreateCustomer.mockResolvedValue("cus_test_123");
    mockCreateCheckoutSession.mockResolvedValue({
      url: "https://checkout.stripe.com/session_abc",
      sessionId: "cs_test_abc",
    });

    const mod = await import("@/app/api/billing/subscribe/route");
    postHandler = mod.POST;
  });

  it("creates checkout session for base plan and returns URL", async () => {
    const request = makePostRequest({ plan: "base" });
    const response = await postHandler(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.checkoutUrl).toBe("https://checkout.stripe.com/session_abc");
    expect(body.data.sessionId).toBe("cs_test_abc");
    expect(body.meta.timestamp).toBeDefined();

    expect(mockGetOrCreateCustomer).toHaveBeenCalledWith(
      AUTH_CONTEXT.organizationId,
      TEST_USER.email,
      TEST_USER.name
    );
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      AUTH_CONTEXT.organizationId,
      "cus_test_123",
      "base",
      expect.stringContaining("billing=success"),
      expect.stringContaining("billing=cancelled")
    );
  });

  it("creates checkout session for pro plan", async () => {
    const request = makePostRequest({ plan: "pro" });
    const response = await postHandler(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.checkoutUrl).toBeDefined();

    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      AUTH_CONTEXT.organizationId,
      "cus_test_123",
      "pro",
      expect.any(String),
      expect.any(String)
    );
  });

  it("returns 400 for missing plan (Zod validation)", async () => {
    const request = makePostRequest({});
    const response = await postHandler(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toBeDefined();
  });

  it("returns 400 for invalid plan value", async () => {
    const request = makePostRequest({ plan: "enterprise" });
    const response = await postHandler(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when user not found", async () => {
    mockSelectLimit.mockResolvedValueOnce([]);

    const request = makePostRequest({ plan: "base" });
    const response = await postHandler(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("User not found");
  });

  it("returns 401 for unauthenticated request", async () => {
    mockVerifyAuth.mockResolvedValueOnce(
      NextResponse.json(
        { error: { code: "AUTH_REQUIRED", message: "Authentication required" } },
        { status: 401 }
      )
    );

    const request = makePostRequest({ plan: "base" });
    const response = await postHandler(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_REQUIRED");
  });

  it("returns 500 when Stripe service fails", async () => {
    mockCreateCheckoutSession.mockRejectedValueOnce(new Error("Stripe API unavailable"));

    const request = makePostRequest({ plan: "base" });
    const response = await postHandler(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("BILLING_ERROR");
    expect(body.error.message).toBe("Stripe API unavailable");
  });
});
