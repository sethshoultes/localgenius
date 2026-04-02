/**
 * Tests for src/services/sms.ts — Twilio SMS Notifications
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock Twilio ────────────────────────────────────────────────────────────

const mockCreate = vi.fn();

vi.mock("twilio", () => {
  return {
    default: vi.fn(() => ({
      messages: { create: mockCreate },
    })),
  };
});

// ─── Mock DB ────────────────────────────────────────────────────────────────

let selectCallCount = 0;
const selectResults: unknown[][] = [];

function makeThenable(result: unknown[]) {
  const obj: Record<string, unknown> = {};
  obj.limit = vi.fn().mockImplementation(() => makeThenable(result));
  obj.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
    Promise.resolve(result).then(res, rej);
  return obj;
}

const mockSelectWhere = vi.fn().mockImplementation(() => {
  const result = selectResults[selectCallCount] || [];
  selectCallCount++;
  return makeThenable(result);
});
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

vi.mock("@/lib/db", () => ({
  db: { select: (...args: unknown[]) => mockSelect(...args) },
}));

vi.mock("@/db/schema", () => ({
  businesses: { id: "businesses.id", name: "businesses.name" },
  users: { businessId: "users.businessId", phone: "users.phone" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ op: "eq", args })),
}));

// ─── Mock notification preferences ─────────────────────────────────────────

const mockGetPrefs = vi.fn();
vi.mock("@/services/notification-preferences", () => ({
  getNotificationPreferences: (...args: unknown[]) => mockGetPrefs(...args),
}));

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  selectCallCount = 0;
  selectResults.length = 0;
  vi.stubEnv("TWILIO_ACCOUNT_SID", "AC_test_sid");
  vi.stubEnv("TWILIO_AUTH_TOKEN", "test_token");
  vi.stubEnv("TWILIO_PHONE_NUMBER", "+15125550000");

  // Default: SMS enabled with phone number
  mockGetPrefs.mockResolvedValue({
    negative_review: { email: true, sms: true, push: true },
    weekly_digest: { email: true, sms: true, push: false },
    booking: { email: true, sms: true, push: true },
  });

  mockCreate.mockResolvedValue({ sid: "SM_test_message_id" });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("sendNegativeReviewSMS", () => {
  it("sends SMS for negative review when preferences allow", async () => {
    // shouldSendSMS: user with phone
    selectResults.push([{ phone: "+15125551234" }]);
    // sendNegativeReviewSMS: business lookup
    selectResults.push([{ name: "Maria's Kitchen" }]);

    const { sendNegativeReviewSMS } = await import("@/services/sms");
    const result = await sendNegativeReviewSMS("biz-1", {
      platform: "Google",
      rating: 2,
      reviewerName: "Lisa W.",
    });

    expect(result.success).toBe(true);
    expect(result.messageSid).toBe("SM_test_message_id");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "+15125551234",
        body: expect.stringContaining("2-star review"),
      })
    );
  });

  it("skips when SMS preference is disabled", async () => {
    mockGetPrefs.mockResolvedValue({
      negative_review: { email: true, sms: false, push: true },
    });

    const { sendNegativeReviewSMS } = await import("@/services/sms");
    const result = await sendNegativeReviewSMS("biz-1", {
      platform: "Google",
      rating: 1,
      reviewerName: "Angry Customer",
    });

    expect(result.success).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("skips when user has no phone number", async () => {
    selectResults.push([{ phone: null }]);

    const { sendNegativeReviewSMS } = await import("@/services/sms");
    const result = await sendNegativeReviewSMS("biz-1", {
      platform: "Yelp",
      rating: 2,
      reviewerName: "Test",
    });

    expect(result.success).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("sendDigestSummarySMS", () => {
  it("sends digest summary with metrics", async () => {
    selectResults.push([{ phone: "+15125551234" }]);

    const { sendDigestSummarySMS } = await import("@/services/sms");
    const result = await sendDigestSummarySMS("biz-1", {
      reviewCount: 8,
      avgRating: 4.6,
      websiteVisits: 340,
      bookings: 23,
    });

    expect(result.success).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("8 new reviews"),
      })
    );
  });

  it("includes digest URL when provided", async () => {
    selectResults.push([{ phone: "+15125551234" }]);

    const { sendDigestSummarySMS } = await import("@/services/sms");
    await sendDigestSummarySMS(
      "biz-1",
      { reviewCount: 5, avgRating: 4.2, websiteVisits: 100, bookings: 10 },
      "https://localgenius.company/digest/123"
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("localgenius.company/digest/123"),
      })
    );
  });
});

describe("sendBookingConfirmationSMS", () => {
  it("sends booking confirmation with party size", async () => {
    selectResults.push([{ phone: "+15125551234" }]);
    selectResults.push([{ name: "Maria's Kitchen" }]);

    const { sendBookingConfirmationSMS } = await import("@/services/sms");
    const result = await sendBookingConfirmationSMS("biz-1", {
      customerName: "John D.",
      date: "Friday",
      time: "7pm",
      partySize: 4,
    });

    expect(result.success).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("party of 4"),
      })
    );
  });

  it("sends without party size", async () => {
    selectResults.push([{ phone: "+15125551234" }]);
    selectResults.push([{ name: "Test Biz" }]);

    const { sendBookingConfirmationSMS } = await import("@/services/sms");
    const result = await sendBookingConfirmationSMS("biz-1", {
      customerName: "Jane",
      date: "Saturday",
      time: "12pm",
    });

    expect(result.success).toBe(true);
    const callBody = mockCreate.mock.calls[0][0].body;
    expect(callBody).not.toContain("party of");
  });
});
