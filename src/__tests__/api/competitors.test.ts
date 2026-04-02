/**
 * Tests for GET/POST/DELETE /api/competitors
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

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

// Mock competitor-monitor service
const TEST_COMPETITOR = {
  id: "comp-uuid-001",
  businessId: "biz-uuid-001",
  competitorName: "Rival Bistro",
  googlePlaceId: "ChIJ_test123",
  googleRating: "4.5",
  googleReviewCount: 120,
  lastRating: "4.3",
  lastReviewCount: 110,
  lastCheckedAt: new Date("2025-06-01"),
  createdAt: new Date("2025-01-15"),
};

const mockGetCompetitors = vi.fn().mockResolvedValue([TEST_COMPETITOR]);
const mockAddCompetitor = vi.fn().mockResolvedValue(TEST_COMPETITOR);
const mockRemoveCompetitor = vi.fn().mockResolvedValue(true);

vi.mock("@/services/competitor-monitor", () => ({
  getCompetitors: (...args: unknown[]) => mockGetCompetitors(...args),
  addCompetitor: (...args: unknown[]) => mockAddCompetitor(...args),
  removeCompetitor: (...args: unknown[]) => mockRemoveCompetitor(...args),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeGetRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/competitors", {
    method: "GET",
  });
}

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/competitors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(id?: string): NextRequest {
  const url = id
    ? `http://localhost:3000/api/competitors?id=${id}`
    : "http://localhost:3000/api/competitors";
  return new NextRequest(url, { method: "DELETE" });
}

// ─── Tests: GET /api/competitors ────────────────────────────────────────────

describe("GET /api/competitors", () => {
  let getHandler: typeof import("@/app/api/competitors/route").GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockVerifyAuth.mockResolvedValue(AUTH_CONTEXT);
    mockGetCompetitors.mockResolvedValue([TEST_COMPETITOR]);

    const mod = await import("@/app/api/competitors/route");
    getHandler = mod.GET;
  });

  it("returns competitors list for authenticated user", async () => {
    const request = makeGetRequest();
    const response = await getHandler(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.competitors).toHaveLength(1);
    expect(body.data.competitors[0].id).toBe("comp-uuid-001");
    expect(body.data.competitors[0].competitorName).toBe("Rival Bistro");
    expect(body.data.competitors[0].googleRating).toBe(4.5);
    expect(body.data.competitors[0].googleReviewCount).toBe(120);
    expect(body.data.competitors[0].ratingDelta).toBeCloseTo(0.2);
    expect(body.data.competitors[0].reviewCountDelta).toBe(10);
    expect(body.meta.timestamp).toBeDefined();

    expect(mockGetCompetitors).toHaveBeenCalledWith(AUTH_CONTEXT.businessId);
  });

  it("returns empty array when no competitors tracked", async () => {
    mockGetCompetitors.mockResolvedValueOnce([]);

    const request = makeGetRequest();
    const response = await getHandler(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.competitors).toHaveLength(0);
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

// ─── Tests: POST /api/competitors ───────────────────────────────────────────

describe("POST /api/competitors", () => {
  let postHandler: typeof import("@/app/api/competitors/route").POST;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockVerifyAuth.mockResolvedValue(AUTH_CONTEXT);
    mockAddCompetitor.mockResolvedValue(TEST_COMPETITOR);

    const mod = await import("@/app/api/competitors/route");
    postHandler = mod.POST;
  });

  it("creates a competitor and returns 201", async () => {
    const request = makePostRequest({ name: "Rival Bistro", googlePlaceId: "ChIJ_test123" });
    const response = await postHandler(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.competitor).toBeDefined();
    expect(body.data.competitor.id).toBe("comp-uuid-001");
    expect(body.meta.timestamp).toBeDefined();

    expect(mockAddCompetitor).toHaveBeenCalledWith(
      AUTH_CONTEXT.businessId,
      AUTH_CONTEXT.organizationId,
      "Rival Bistro",
      "ChIJ_test123"
    );
  });

  it("creates a competitor without googlePlaceId", async () => {
    const request = makePostRequest({ name: "Some Place" });
    const response = await postHandler(request);

    expect(response.status).toBe(201);
    expect(mockAddCompetitor).toHaveBeenCalledWith(
      AUTH_CONTEXT.businessId,
      AUTH_CONTEXT.organizationId,
      "Some Place",
      undefined
    );
  });

  it("returns 400 for missing name (Zod validation)", async () => {
    const request = makePostRequest({});
    const response = await postHandler(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toBeDefined();
  });

  it("returns 400 for empty name string", async () => {
    const request = makePostRequest({ name: "" });
    const response = await postHandler(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 409 for duplicate competitor", async () => {
    mockAddCompetitor.mockRejectedValueOnce(new Error("unique constraint violated"));

    const request = makePostRequest({ name: "Rival Bistro" });
    const response = await postHandler(request);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("DUPLICATE");
  });

  it("returns 500 when service throws unexpected error", async () => {
    mockAddCompetitor.mockRejectedValueOnce(new Error("DB connection lost"));

    const request = makePostRequest({ name: "Rival Bistro" });
    const response = await postHandler(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("DB connection lost");
  });

  it("returns 401 for unauthenticated request", async () => {
    mockVerifyAuth.mockResolvedValueOnce(
      NextResponse.json(
        { error: { code: "AUTH_REQUIRED", message: "Authentication required" } },
        { status: 401 }
      )
    );

    const request = makePostRequest({ name: "Rival Bistro" });
    const response = await postHandler(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_REQUIRED");
  });
});

// ─── Tests: DELETE /api/competitors ─────────────────────────────────────────

describe("DELETE /api/competitors", () => {
  let deleteHandler: typeof import("@/app/api/competitors/route").DELETE;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockVerifyAuth.mockResolvedValue(AUTH_CONTEXT);
    mockRemoveCompetitor.mockResolvedValue(true);

    const mod = await import("@/app/api/competitors/route");
    deleteHandler = mod.DELETE;
  });

  it("deletes a competitor and returns success", async () => {
    const request = makeDeleteRequest("comp-uuid-001");
    const response = await deleteHandler(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.deleted).toBe(true);
    expect(body.meta.timestamp).toBeDefined();

    expect(mockRemoveCompetitor).toHaveBeenCalledWith("comp-uuid-001", AUTH_CONTEXT.businessId);
  });

  it("returns 400 when id query param is missing", async () => {
    const request = makeDeleteRequest();
    const response = await deleteHandler(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toContain("id");
  });

  it("returns 404 when competitor not found or not owned", async () => {
    mockRemoveCompetitor.mockResolvedValueOnce(false);

    const request = makeDeleteRequest("comp-uuid-999");
    const response = await deleteHandler(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 500 when service throws", async () => {
    mockRemoveCompetitor.mockRejectedValueOnce(new Error("DB error"));

    const request = makeDeleteRequest("comp-uuid-001");
    const response = await deleteHandler(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("DB error");
  });

  it("returns 401 for unauthenticated request", async () => {
    mockVerifyAuth.mockResolvedValueOnce(
      NextResponse.json(
        { error: { code: "AUTH_REQUIRED", message: "Authentication required" } },
        { status: 401 }
      )
    );

    const request = makeDeleteRequest("comp-uuid-001");
    const response = await deleteHandler(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_REQUIRED");
  });
});
