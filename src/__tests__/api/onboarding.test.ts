/**
 * Tests for GET /api/onboarding and POST /api/onboarding
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  TEST_BUSINESS,
  TEST_CONVERSATION,
} from "../mocks/db";

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

// Mock onboarding pipeline
const mockRunOnboardingPipeline = vi.fn().mockResolvedValue({
  websiteGenerated: true,
  welcomeMessageSent: true,
  postsGenerated: 3,
  reviewsSynced: 5,
  digestScheduled: true,
  seoScore: 72,
  totalSteps: 7,
  completedSteps: 7,
  errors: [],
});

vi.mock("@/services/onboarding-pipeline", () => ({
  runOnboardingPipeline: (...args: unknown[]) => mockRunOnboardingPipeline(...args),
}));

// Mock DB
let selectCallCount = 0;
const mockSelectLimit = vi.fn().mockImplementation(() => {
  selectCallCount++;
  switch (selectCallCount) {
    case 1: return Promise.resolve([TEST_BUSINESS]);
    case 2: return Promise.resolve([TEST_CONVERSATION]);
    default: return Promise.resolve([]);
  }
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

// Mock schema imports (needed for eq/and comparisons)
vi.mock("@/db/schema", () => ({
  businesses: { id: "businesses.id", organizationId: "businesses.organizationId" },
  conversations: { businessId: "conversations.businessId" },
  businessSettings: { businessId: "businessSettings.businessId", platform: "businessSettings.platform", connectionStatus: "businessSettings.connectionStatus" },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeGetRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/onboarding", {
    method: "GET",
  });
}

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── Tests: GET /api/onboarding ─────────────────────────────────────────────

describe("GET /api/onboarding", () => {
  let getHandler: typeof import("@/app/api/onboarding/route").GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    selectCallCount = 0;

    // Default: business found, conversation found
    mockSelectLimit.mockImplementation(() => {
      selectCallCount++;
      switch (selectCallCount) {
        case 1: return Promise.resolve([TEST_BUSINESS]);
        case 2: return Promise.resolve([TEST_CONVERSATION]);
        default: return Promise.resolve([]);
      }
    });

    mockVerifyAuth.mockResolvedValue(AUTH_CONTEXT);

    const mod = await import("@/app/api/onboarding/route");
    getHandler = mod.GET;
  });

  it("returns business data and conversationId for authenticated user", async () => {
    const request = makeGetRequest();
    const response = await getHandler(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.business).toBeDefined();
    expect(body.data.business.id).toBe(TEST_BUSINESS.id);
    expect(body.data.business.name).toBe(TEST_BUSINESS.name);
    expect(body.data.business.vertical).toBe(TEST_BUSINESS.vertical);
    expect(body.data.business.city).toBe(TEST_BUSINESS.city);
    expect(body.data.business.onboardingCompleted).toBe(false);
    expect(body.data.conversationId).toBe(TEST_CONVERSATION.id);
    expect(body.meta.timestamp).toBeDefined();
  });

  it("returns null business when none found", async () => {
    selectCallCount = 0;
    mockSelectLimit.mockImplementation(() => {
      selectCallCount++;
      return Promise.resolve([]);
    });

    const request = makeGetRequest();
    const response = await getHandler(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.business).toBeNull();
    expect(body.data.conversationId).toBeNull();
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
});

// ─── Tests: POST /api/onboarding ────────────────────────────────────────────

describe("POST /api/onboarding", () => {
  let postHandler: typeof import("@/app/api/onboarding/route").POST;

  beforeEach(async () => {
    vi.clearAllMocks();
    selectCallCount = 0;

    mockVerifyAuth.mockResolvedValue(AUTH_CONTEXT);

    const mod = await import("@/app/api/onboarding/route");
    postHandler = mod.POST;
  });

  it("updates address/phone on confirm step", async () => {
    const request = makePostRequest({
      step: "confirm",
      data: { address: "456 Oak Ave", phone: "512-555-0200" },
    });
    const response = await postHandler(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.step).toBe("confirm");
    expect(body.data.status).toBe("completed");
    expect(body.meta.timestamp).toBeDefined();

    // Verify db.update was called
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        address: "456 Oak Ave",
        phone: "512-555-0200",
      })
    );
  });

  it("updates priority focus on priority step", async () => {
    const request = makePostRequest({
      step: "priority",
      data: { focus: "reviews" },
    });
    const response = await postHandler(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.step).toBe("priority");
    expect(body.data.status).toBe("completed");

    // Verify db.update was called with priorityFocus
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        priorityFocus: "reviews",
      })
    );
  });

  it("runs onboarding pipeline on complete step", async () => {
    // For the complete step, we need:
    // 1. db.update for onboardingCompletedAt
    // 2. db.select for business lookup
    // 3. db.select for Google connection check
    selectCallCount = 0;
    mockSelectLimit.mockImplementation(() => {
      selectCallCount++;
      switch (selectCallCount) {
        case 1: return Promise.resolve([TEST_BUSINESS]);
        case 2: return Promise.resolve([]); // no Google connection
        default: return Promise.resolve([]);
      }
    });

    const request = makePostRequest({ step: "complete" });
    const response = await postHandler(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.step).toBe("complete");
    expect(body.data.status).toBe("completed");
    expect(body.data.pipeline).toBeDefined();
    expect(body.data.pipeline.websiteGenerated).toBe(true);
    expect(body.data.pipeline.welcomeMessageSent).toBe(true);
    expect(body.data.pipeline.postsGenerated).toBe(3);
    expect(body.data.pipeline.reviewsSynced).toBe(5);
    expect(body.data.pipeline.digestScheduled).toBe(true);
    expect(body.data.pipeline.seoScore).toBe(72);
    expect(body.data.pipeline.completedSteps).toBe(7);
    expect(body.data.pipeline.totalSteps).toBe(7);

    // Verify pipeline was called
    expect(mockRunOnboardingPipeline).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: AUTH_CONTEXT.businessId,
        organizationId: AUTH_CONTEXT.organizationId,
        userId: AUTH_CONTEXT.userId,
      })
    );
  });

  it("returns 401 for unauthenticated request", async () => {
    mockVerifyAuth.mockResolvedValueOnce(
      NextResponse.json(
        { error: { code: "AUTH_REQUIRED", message: "Authentication required" } },
        { status: 401 }
      )
    );

    const request = makePostRequest({ step: "confirm" });
    const response = await postHandler(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_REQUIRED");
  });

  it("returns 400 for invalid step value", async () => {
    const request = makePostRequest({ step: "invalid_step" });
    const response = await postHandler(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for missing step field", async () => {
    const request = makePostRequest({});
    const response = await postHandler(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
