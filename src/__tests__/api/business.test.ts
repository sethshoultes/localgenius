/**
 * Tests for GET/PUT /api/business
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { TEST_BUSINESS } from "../mocks/db";

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

// Mock DB — inline chain mocks following the onboarding test pattern
let selectCallCount = 0;
const mockSelectLimit = vi.fn().mockImplementation(() => {
  selectCallCount++;
  return Promise.resolve([TEST_BUSINESS]);
});
const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
  getDb: vi.fn(),
}));

// Mock schema imports
vi.mock("@/db/schema", () => ({
  businesses: {
    id: "businesses.id",
    organizationId: "businesses.organizationId",
  },
  users: {
    id: "users.id",
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeGetRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/business", {
    method: "GET",
  });
}

function makePutRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/business", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── Tests: GET /api/business ───────────────────────────────────────────────

describe("GET /api/business", () => {
  let getHandler: typeof import("@/app/api/business/route").GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    selectCallCount = 0;
    mockVerifyAuth.mockResolvedValue(AUTH_CONTEXT);
    mockSelectLimit.mockImplementation(() => {
      selectCallCount++;
      return Promise.resolve([TEST_BUSINESS]);
    });

    const mod = await import("@/app/api/business/route");
    getHandler = mod.GET;
  });

  it("returns business data for authenticated user", async () => {
    const request = makeGetRequest();
    const response = await getHandler(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.business).toBeDefined();
    expect(body.data.business.id).toBe(TEST_BUSINESS.id);
    expect(body.data.business.name).toBe(TEST_BUSINESS.name);
    expect(body.data.business.vertical).toBe("restaurant");
    expect(body.data.business.city).toBe("Austin");
    expect(body.data.business.state).toBe("TX");
    expect(body.data.business.onboardingCompleted).toBe(false);
    expect(body.meta.timestamp).toBeDefined();
  });

  it("returns 404 when business not found", async () => {
    mockSelectLimit.mockResolvedValueOnce([]);

    const request = makeGetRequest();
    const response = await getHandler(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("Business not found");
  });

  it("returns 401 for unauthenticated request", async () => {
    mockVerifyAuth.mockResolvedValueOnce(
      NextResponse.json(
        { error: { code: "AUTH_REQUIRED", message: "Authentication required" } },
        { status: 401 }
      )
    );

    const request = makeGetRequest();
    const response = await getHandler(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_REQUIRED");
  });

  it("returns 500 when database fails", async () => {
    mockSelectLimit.mockRejectedValueOnce(new Error("DB timeout"));

    const request = makeGetRequest();
    const response = await getHandler(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("DB timeout");
  });
});

// ─── Tests: PUT /api/business ───────────────────────────────────────────────

describe("PUT /api/business", () => {
  let putHandler: typeof import("@/app/api/business/route").PUT;

  const UPDATED_BUSINESS = {
    ...TEST_BUSINESS,
    name: "Updated Biz",
    phone: "512-555-9999",
    description: "A fine dining restaurant",
    email: "new@testbiz.com",
    address: "789 Oak Ave",
    hours: { monday: "9-5" },
    websiteUrl: "https://testbiz.com",
    socialLinks: { instagram: "@testbiz" },
    photos: null,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    selectCallCount = 0;
    mockVerifyAuth.mockResolvedValue(AUTH_CONTEXT);

    // After the update, the select fetches the updated record
    mockSelectLimit.mockImplementation(() => {
      selectCallCount++;
      return Promise.resolve([UPDATED_BUSINESS]);
    });

    const mod = await import("@/app/api/business/route");
    putHandler = mod.PUT;
  });

  it("updates business fields and returns updated data", async () => {
    const request = makePutRequest({ name: "Updated Biz", phone: "512-555-9999" });
    const response = await putHandler(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.updated).toBe(true);
    expect(body.data.business.name).toBe("Updated Biz");
    expect(body.data.business.phone).toBe("512-555-9999");
    expect(body.data.fieldsUpdated).toContain("name");
    expect(body.data.fieldsUpdated).toContain("phone");
    expect(body.meta.timestamp).toBeDefined();

    // Verify db.update was called
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Updated Biz",
        phone: "512-555-9999",
        updatedAt: expect.any(Date),
      })
    );
  });

  it("returns 400 for invalid email format", async () => {
    const request = makePutRequest({ email: "not-an-email" });
    const response = await putHandler(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toBeDefined();
  });

  it("returns 400 for invalid websiteUrl", async () => {
    const request = makePutRequest({ websiteUrl: "not-a-url" });
    const response = await putHandler(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 401 for unauthenticated request", async () => {
    mockVerifyAuth.mockResolvedValueOnce(
      NextResponse.json(
        { error: { code: "AUTH_REQUIRED", message: "Authentication required" } },
        { status: 401 }
      )
    );

    const request = makePutRequest({ name: "Hacked Biz" });
    const response = await putHandler(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_REQUIRED");
  });

  it("returns 500 when update fails", async () => {
    mockUpdateWhere.mockRejectedValueOnce(new Error("Write conflict"));

    const request = makePutRequest({ name: "Updated Biz" });
    const response = await putHandler(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("Write conflict");
  });
});
