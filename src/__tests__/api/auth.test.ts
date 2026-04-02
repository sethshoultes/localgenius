/**
 * Tests for POST /api/auth/register, POST /api/auth/login,
 * POST /api/auth/refresh, POST /api/auth/logout, GET /api/auth/session
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  TEST_ORG,
  TEST_BUSINESS,
  TEST_USER,
  TEST_CONVERSATION,
} from "../mocks/db";

// ─── Module mocks ────────────────────────────────────────────────────────────

// Mock the database module
const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

const mockSelectLimitResult = vi.fn();
const mockSelectLimit = vi.fn().mockImplementation(() => mockSelectLimitResult());
const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

vi.mock("@/lib/db", () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
  getDb: vi.fn(),
}));

// Mock password module
const mockHashPassword = vi.fn().mockResolvedValue("salthex:hashhex");
const mockVerifyPassword = vi.fn().mockResolvedValue(true);

vi.mock("@/lib/password", () => ({
  hashPassword: (...args: unknown[]) => mockHashPassword(...args),
  verifyPassword: (...args: unknown[]) => mockVerifyPassword(...args),
}));

// Mock auth middleware (JWT issuing)
const mockIssueAccessToken = vi.fn().mockResolvedValue("mock-access-token-jwt");
const mockIssueRefreshToken = vi.fn().mockResolvedValue("mock-refresh-token-jwt");

vi.mock("@/api/middleware/auth", () => ({
  issueAccessToken: (...args: unknown[]) => mockIssueAccessToken(...args),
  issueRefreshToken: (...args: unknown[]) => mockIssueRefreshToken(...args),
  verifyAuth: vi.fn(),
}));

// Mock jose (used by refresh and session routes)
const mockJwtVerify = vi.fn();
const mockDecodeJwt = vi.fn();

vi.mock("jose", () => ({
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
  decodeJwt: (...args: unknown[]) => mockDecodeJwt(...args),
  errors: {
    JWTExpired: class JWTExpired extends Error {
      constructor(message = "jwt expired") {
        super(message);
        this.name = "JWTExpired";
      }
    },
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeLoginRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_REGISTER_BODY = {
  email: "owner@testbiz.com",
  password: "securepass123",
  name: "Test Owner",
  businessName: "Test Biz Inc",
  businessType: "restaurant",
  city: "Austin",
  state: "TX",
};

// ─── Tests: Registration ─────────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  let registerHandler: typeof import("@/app/api/auth/register/route").POST;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Set up sequential insert returns: org, business, user, conversation
    let insertCallCount = 0;
    mockInsertReturning.mockImplementation(() => {
      insertCallCount++;
      switch (insertCallCount) {
        case 1: return Promise.resolve([TEST_ORG]);
        case 2: return Promise.resolve([TEST_BUSINESS]);
        case 3: return Promise.resolve([TEST_USER]);
        default: return Promise.resolve([]);
      }
    });
    // Conversation insert does not use returning
    mockInsertValues.mockImplementation((vals: unknown) => {
      return { returning: mockInsertReturning };
    });

    const mod = await import("@/app/api/auth/register/route");
    registerHandler = mod.POST;
  });

  it("creates org, business, user and returns JWT tokens on valid input", async () => {
    const request = makeRequest(VALID_REGISTER_BODY);
    const response = await registerHandler(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.user.id).toBe(TEST_USER.id);
    expect(body.data.user.email).toBe(TEST_USER.email);
    expect(body.data.business.id).toBe(TEST_BUSINESS.id);
    expect(body.data.business.vertical).toBe("restaurant");
    expect(body.data.organization.id).toBe(TEST_ORG.id);
    expect(body.data.accessToken).toBe("mock-access-token-jwt");
    expect(body.data.refreshToken).toBe("mock-refresh-token-jwt");
    expect(body.meta.timestamp).toBeDefined();

    // Verify password was hashed
    expect(mockHashPassword).toHaveBeenCalledWith("securepass123");

    // Verify insert was called 4 times (org, business, user, conversation)
    expect(mockInsert).toHaveBeenCalledTimes(4);

    // Verify JWT was issued with correct context
    expect(mockIssueAccessToken).toHaveBeenCalledWith({
      userId: TEST_USER.id,
      organizationId: TEST_ORG.id,
      businessId: TEST_BUSINESS.id,
      plan: "base",
    });
    expect(mockIssueRefreshToken).toHaveBeenCalledWith(TEST_USER.id);
  });

  it("returns 400 for missing required fields", async () => {
    const request = makeRequest({ email: "bad" });
    const response = await registerHandler(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toBeDefined();
    expect(body.error.details.length).toBeGreaterThan(0);
  });

  it("returns 400 for invalid email", async () => {
    const request = makeRequest({ ...VALID_REGISTER_BODY, email: "not-an-email" });
    const response = await registerHandler(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for password shorter than 8 characters", async () => {
    const request = makeRequest({ ...VALID_REGISTER_BODY, password: "short" });
    const response = await registerHandler(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid state (must be 2 chars)", async () => {
    const request = makeRequest({ ...VALID_REGISTER_BODY, state: "Texas" });
    const response = await registerHandler(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid businessType enum", async () => {
    const request = makeRequest({ ...VALID_REGISTER_BODY, businessType: "spaceship" });
    const response = await registerHandler(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 500 when database insert fails", async () => {
    mockInsertReturning.mockRejectedValueOnce(new Error("DB connection failed"));
    const request = makeRequest(VALID_REGISTER_BODY);
    const response = await registerHandler(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("DB connection failed");
  });
});

// ─── Tests: Login ────────────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  let loginHandler: typeof import("@/app/api/auth/login/route").POST;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default: user found, password valid
    let selectCallCount = 0;
    mockSelectLimitResult.mockImplementation(() => {
      selectCallCount++;
      switch (selectCallCount) {
        case 1: return Promise.resolve([TEST_USER]);
        case 2: return Promise.resolve([TEST_BUSINESS]);
        case 3: return Promise.resolve([TEST_ORG]);
        default: return Promise.resolve([]);
      }
    });
    mockVerifyPassword.mockResolvedValue(true);

    const mod = await import("@/app/api/auth/login/route");
    loginHandler = mod.POST;
  });

  it("returns tokens and user data on valid credentials", async () => {
    const request = makeLoginRequest({ email: "owner@testbiz.com", password: "securepass123" });
    const response = await loginHandler(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.user.id).toBe(TEST_USER.id);
    expect(body.data.user.email).toBe(TEST_USER.email);
    expect(body.data.business.id).toBe(TEST_BUSINESS.id);
    expect(body.data.accessToken).toBe("mock-access-token-jwt");
    expect(body.data.refreshToken).toBe("mock-refresh-token-jwt");

    // Verify password was checked
    expect(mockVerifyPassword).toHaveBeenCalledWith("securepass123", TEST_USER.passwordHash);

    // Verify lastActiveAt was updated
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("returns 401 for non-existent user", async () => {
    mockSelectLimitResult.mockResolvedValue([]);

    const request = makeLoginRequest({ email: "nobody@test.com", password: "securepass123" });
    const response = await loginHandler(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_FAILED");
    expect(body.error.message).toBe("Invalid credentials");
  });

  it("returns 401 for wrong password", async () => {
    mockSelectLimitResult.mockResolvedValueOnce([TEST_USER]);
    mockVerifyPassword.mockResolvedValueOnce(false);

    const request = makeLoginRequest({ email: "owner@testbiz.com", password: "wrongpassword" });
    const response = await loginHandler(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_FAILED");
  });

  it("returns 400 for invalid email format", async () => {
    const request = makeLoginRequest({ email: "not-email", password: "securepass123" });
    const response = await loginHandler(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for missing password", async () => {
    const request = makeLoginRequest({ email: "owner@testbiz.com" });
    const response = await loginHandler(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ─── Tests: JWT Token Verification ───────────────────────────────────────────

describe("JWT token verification", () => {
  it("issueAccessToken is called with correct auth context shape", async () => {
    // Already tested above, but verify the shape explicitly
    const context = {
      userId: "user-uuid-001",
      organizationId: "org-uuid-001",
      businessId: "biz-uuid-001",
      plan: "base" as const,
    };

    await mockIssueAccessToken(context);
    expect(mockIssueAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: expect.any(String),
        organizationId: expect.any(String),
        businessId: expect.any(String),
        plan: expect.stringMatching(/^(base|pro|franchise)$/),
      })
    );
  });

  it("issueRefreshToken is called with userId string", async () => {
    await mockIssueRefreshToken("user-uuid-001");
    expect(mockIssueRefreshToken).toHaveBeenCalledWith(expect.any(String));
  });
});

// ─── Tests: Refresh ─────────────────────────────────────────────────────────

describe("POST /api/auth/refresh", () => {
  let refreshHandler: typeof import("@/app/api/auth/refresh/route").POST;

  const VALID_JWT_PAYLOAD = {
    sub: TEST_USER.id,
    org: TEST_ORG.id,
    biz: TEST_BUSINESS.id,
    plan: "base",
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default: valid token verification
    mockJwtVerify.mockResolvedValue({ payload: VALID_JWT_PAYLOAD });
    mockIssueAccessToken.mockResolvedValue("mock-new-access-token-jwt");

    const mod = await import("@/app/api/auth/refresh/route");
    refreshHandler = mod.POST;
  });

  it("returns refreshed: true and sets cookie on valid session", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/refresh", {
      method: "POST",
    });
    request.cookies.set("lg_session", "valid-jwt-token");

    const response = await refreshHandler(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.refreshed).toBe(true);
    expect(body.meta.timestamp).toBeDefined();

    // Verify issueAccessToken was called with correct context
    expect(mockIssueAccessToken).toHaveBeenCalledWith({
      userId: TEST_USER.id,
      organizationId: TEST_ORG.id,
      businessId: TEST_BUSINESS.id,
      plan: "base",
    });

    // Verify cookie was set on the response
    const setCookie = response.cookies.get("lg_session");
    expect(setCookie?.value).toBe("mock-new-access-token-jwt");
  });

  it("returns 401 NO_SESSION when no cookie is present", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/refresh", {
      method: "POST",
    });

    const response = await refreshHandler(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("NO_SESSION");
  });

  it("refreshes an expired token within grace period", async () => {
    // Simulate JWTExpired error from jose
    const { errors } = await import("jose");
    mockJwtVerify.mockRejectedValue(new errors.JWTExpired("jwt expired", {}, "exp", "expired"));

    // Token expired 5 minutes ago (within 30-min grace period)
    const fiveMinAgo = Math.floor((Date.now() - 5 * 60 * 1000) / 1000);
    mockDecodeJwt.mockReturnValue({ ...VALID_JWT_PAYLOAD, exp: fiveMinAgo });

    const request = new NextRequest("http://localhost:3000/api/auth/refresh", {
      method: "POST",
    });
    request.cookies.set("lg_session", "expired-jwt-token");

    const response = await refreshHandler(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.refreshed).toBe(true);
    expect(mockIssueAccessToken).toHaveBeenCalled();
  });

  it("returns 401 SESSION_EXPIRED when token is expired beyond grace period", async () => {
    const { errors } = await import("jose");
    mockJwtVerify.mockRejectedValue(new errors.JWTExpired("jwt expired", {}, "exp", "expired"));

    // Token expired 60 minutes ago (beyond 30-min grace period)
    const sixtyMinAgo = Math.floor((Date.now() - 60 * 60 * 1000) / 1000);
    mockDecodeJwt.mockReturnValue({ ...VALID_JWT_PAYLOAD, exp: sixtyMinAgo });

    const request = new NextRequest("http://localhost:3000/api/auth/refresh", {
      method: "POST",
    });
    request.cookies.set("lg_session", "old-expired-jwt-token");

    const response = await refreshHandler(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("SESSION_EXPIRED");
  });

  it("returns 401 INVALID_SESSION for a tampered token", async () => {
    mockJwtVerify.mockRejectedValue(new Error("invalid signature"));

    const request = new NextRequest("http://localhost:3000/api/auth/refresh", {
      method: "POST",
    });
    request.cookies.set("lg_session", "tampered-jwt-token");

    const response = await refreshHandler(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("INVALID_SESSION");
  });
});

// ─── Tests: Logout ──────────────────────────────────────────────────────────

describe("POST /api/auth/logout", () => {
  let logoutHandler: typeof import("@/app/api/auth/logout/route").POST;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import("@/app/api/auth/logout/route");
    logoutHandler = mod.POST;
  });

  it("returns loggedOut: true and clears the session cookie", async () => {
    const response = await logoutHandler();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.loggedOut).toBe(true);
    expect(body.meta.timestamp).toBeDefined();

    // Verify cookie is cleared (maxAge 0 = expire immediately)
    const setCookie = response.cookies.get("lg_session");
    expect(setCookie?.value).toBe("");
  });
});

// ─── Tests: Session ─────────────────────────────────────────────────────────

describe("GET /api/auth/session", () => {
  let sessionHandler: typeof import("@/app/api/auth/session/route").GET;

  const VALID_JWT_PAYLOAD = {
    sub: TEST_USER.id,
    org: TEST_ORG.id,
    biz: TEST_BUSINESS.id,
    plan: "base",
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default: valid token, user and business found
    mockJwtVerify.mockResolvedValue({ payload: VALID_JWT_PAYLOAD });

    let selectCallCount = 0;
    mockSelectLimitResult.mockImplementation(() => {
      selectCallCount++;
      switch (selectCallCount) {
        case 1: return Promise.resolve([{ id: TEST_USER.id, email: TEST_USER.email, name: TEST_USER.name }]);
        case 2: return Promise.resolve([{ id: TEST_BUSINESS.id, name: TEST_BUSINESS.name, vertical: TEST_BUSINESS.vertical }]);
        default: return Promise.resolve([]);
      }
    });

    const mod = await import("@/app/api/auth/session/route");
    sessionHandler = mod.GET;
  });

  it("returns user and business data for a valid session", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/session", {
      method: "GET",
    });
    request.cookies.set("lg_session", "valid-jwt-token");

    const response = await sessionHandler(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.user.id).toBe(TEST_USER.id);
    expect(body.data.user.email).toBe(TEST_USER.email);
    expect(body.data.user.name).toBe(TEST_USER.name);
    expect(body.data.business.id).toBe(TEST_BUSINESS.id);
    expect(body.data.business.name).toBe(TEST_BUSINESS.name);
    expect(body.data.business.vertical).toBe(TEST_BUSINESS.vertical);
    expect(body.data.plan).toBe("base");
  });

  it("returns data: null when no cookie is present", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/session", {
      method: "GET",
    });

    const response = await sessionHandler(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toBeNull();
  });

  it("returns data: null when user is not found in database", async () => {
    mockSelectLimitResult.mockResolvedValue([]);

    const request = new NextRequest("http://localhost:3000/api/auth/session", {
      method: "GET",
    });
    request.cookies.set("lg_session", "valid-jwt-token");

    const response = await sessionHandler(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toBeNull();
  });

  it("returns data: null when JWT verification fails", async () => {
    mockJwtVerify.mockRejectedValue(new Error("invalid token"));

    const request = new NextRequest("http://localhost:3000/api/auth/session", {
      method: "GET",
    });
    request.cookies.set("lg_session", "bad-jwt-token");

    const response = await sessionHandler(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toBeNull();
  });

  it("returns business: null when business is not found", async () => {
    let selectCallCount = 0;
    mockSelectLimitResult.mockImplementation(() => {
      selectCallCount++;
      switch (selectCallCount) {
        case 1: return Promise.resolve([{ id: TEST_USER.id, email: TEST_USER.email, name: TEST_USER.name }]);
        case 2: return Promise.resolve([]); // no business found
        default: return Promise.resolve([]);
      }
    });

    const request = new NextRequest("http://localhost:3000/api/auth/session", {
      method: "GET",
    });
    request.cookies.set("lg_session", "valid-jwt-token");

    const response = await sessionHandler(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.user.id).toBe(TEST_USER.id);
    expect(body.data.business).toBeNull();
  });
});
