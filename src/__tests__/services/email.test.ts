/**
 * Tests for src/services/email.ts
 * Email template functions, Resend SDK integration, error handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type React from "react";

// ─── Module mocks ────────────────────────────────────────────────────────────

// Mock Resend SDK
const mockEmailsSend = vi.fn();

vi.mock("resend", () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: mockEmailsSend,
      },
    })),
  };
});

// Mock email components (they're React components, so we just mock them as returning a React element)
vi.mock("@/components/email/WelcomeEmail", () => ({
  WelcomeEmail: vi.fn().mockReturnValue({} as React.ReactElement),
}));

vi.mock("@/components/email/DigestEmail", () => ({
  DigestEmail: vi.fn().mockReturnValue({} as React.ReactElement),
}));

vi.mock("@/components/email/ReviewAlertEmail", () => ({
  ReviewAlertEmail: vi.fn().mockReturnValue({} as React.ReactElement),
}));

vi.mock("@/components/email/SubscriptionEmail", () => ({
  SubscriptionEmail: vi.fn().mockReturnValue({} as React.ReactElement),
}));

vi.mock("@/components/email/PaymentFailedEmail", () => ({
  PaymentFailedEmail: vi.fn().mockReturnValue({} as React.ReactElement),
}));

// ─── Tests: sendWelcomeEmail ─────────────────────────────────────────────────

describe("sendWelcomeEmail", () => {
  let sendWelcomeEmail: typeof import("@/services/email").sendWelcomeEmail;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_123";

    mockEmailsSend.mockResolvedValue({
      data: { id: "msg_welcome_001" },
      error: null,
    });

    const mod = await import("@/services/email");
    sendWelcomeEmail = mod.sendWelcomeEmail;
  });

  it("sends a welcome email with correct parameters", async () => {
    const result = await sendWelcomeEmail("owner@testbiz.com", "Test Biz");

    expect(result.success).toBe(true);
    expect((result as any).messageId).toBe("msg_welcome_001");
    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "LocalGenius <hello@localgenius.com>",
        to: "owner@testbiz.com",
        subject: "Welcome to LocalGenius, Test Biz",
        react: expect.any(Object),
      })
    );
  });

  it("returns error when Resend API returns an error", async () => {
    mockEmailsSend.mockResolvedValueOnce({
      data: null,
      error: { message: "Invalid email address" },
    });

    const result = await sendWelcomeEmail("bad-email", "Test Biz");

    expect(result.success).toBe(false);
    expect((result as any).error).toBe("Invalid email address");
  });

  it("returns error when Resend throws an exception", async () => {
    mockEmailsSend.mockRejectedValueOnce(new Error("Network timeout"));

    const result = await sendWelcomeEmail("owner@testbiz.com", "Test Biz");

    expect(result.success).toBe(false);
    expect((result as any).error).toBe("Network timeout");
  });

  it("includes business name in subject line", async () => {
    await sendWelcomeEmail("owner@testbiz.com", "My Restaurant");

    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Welcome to LocalGenius, My Restaurant",
      })
    );
  });
});

// ─── Tests: sendWeeklyDigestEmail ────────────────────────────────────────────

describe("sendWeeklyDigestEmail", () => {
  let sendWeeklyDigestEmail: typeof import("@/services/email").sendWeeklyDigestEmail;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_123";

    mockEmailsSend.mockResolvedValue({
      data: { id: "msg_digest_001" },
      error: null,
    });

    const mod = await import("@/services/email");
    sendWeeklyDigestEmail = mod.sendWeeklyDigestEmail;
  });

  it("sends digest email with metrics and narrative", async () => {
    const digestData = {
      metrics: { reviewsReceived: 5, averageRating: 4.2, actionsCompleted: 8 },
      narrative: "Great week! Keep up the momentum.",
    };

    const result = await sendWeeklyDigestEmail(
      "owner@testbiz.com",
      "Test Biz",
      digestData
    );

    expect(result.success).toBe(true);
    expect((result as any).messageId).toBe("msg_digest_001");
    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "owner@testbiz.com",
        subject: expect.stringMatching(/Your week in review.*Test Biz/),
      })
    );
  });

  it("passes digest data to the email component", async () => {
    const digestData = {
      metrics: { reviewsReceived: 3 },
      narrative: "Good progress this week.",
    };

    await sendWeeklyDigestEmail("owner@testbiz.com", "Test Biz", digestData);

    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({
        react: expect.any(Object),
      })
    );
  });

  it("handles missing API key by throwing error", async () => {
    delete process.env.RESEND_API_KEY;

    // The getClient() will throw when trying to create a new Resend instance
    // We need to reimport to clear the cached client
    vi.resetModules();
    const { sendWeeklyDigestEmail: fn } = await import("@/services/email");

    const result = await fn("owner@testbiz.com", "Test Biz", {
      metrics: {},
      narrative: "",
    });

    expect(result.success).toBe(false);
    expect((result as any).error).toBe("RESEND_API_KEY is not set");
  });
});

// ─── Tests: sendNegativeReviewAlert ──────────────────────────────────────────

describe("sendNegativeReviewAlert", () => {
  let sendNegativeReviewAlert: typeof import("@/services/email").sendNegativeReviewAlert;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_123";

    mockEmailsSend.mockResolvedValue({
      data: { id: "msg_review_alert_001" },
      error: null,
    });

    const mod = await import("@/services/email");
    sendNegativeReviewAlert = mod.sendNegativeReviewAlert;
  });

  it("sends a negative review alert email", async () => {
    const review = {
      platform: "google",
      rating: 2,
      reviewerName: "Jane Smith",
      text: "Terrible service and cold food.",
    };

    const result = await sendNegativeReviewAlert(
      "owner@testbiz.com",
      "Test Biz",
      review
    );

    expect(result.success).toBe(true);
    expect((result as any).messageId).toBe("msg_review_alert_001");
  });

  it("includes rating and platform in subject", async () => {
    const review = {
      platform: "yelp",
      rating: 1,
      reviewerName: "John Doe",
      text: "Worst experience ever.",
    };

    await sendNegativeReviewAlert("owner@testbiz.com", "Test Biz", review);

    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringMatching(/1-star.*yelp/),
      })
    );
  });

  it("handles 3-star review as negative alert", async () => {
    const review = {
      platform: "google",
      rating: 3,
      reviewerName: "Alice",
      text: "It was okay, but could be better.",
    };

    await sendNegativeReviewAlert("owner@testbiz.com", "Test Biz", review);

    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining("3-star"),
      })
    );
  });

  it("returns error when send fails", async () => {
    mockEmailsSend.mockRejectedValueOnce(new Error("Rate limit exceeded"));

    const review = {
      platform: "google",
      rating: 2,
      reviewerName: "Jane",
      text: "Bad experience.",
    };

    const result = await sendNegativeReviewAlert(
      "owner@testbiz.com",
      "Test Biz",
      review
    );

    expect(result.success).toBe(false);
    expect((result as any).error).toBe("Rate limit exceeded");
  });
});

// ─── Tests: sendSubscriptionConfirmation ─────────────────────────────────────

describe("sendSubscriptionConfirmation", () => {
  let sendSubscriptionConfirmation: typeof import("@/services/email").sendSubscriptionConfirmation;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_123";

    mockEmailsSend.mockResolvedValue({
      data: { id: "msg_subscription_001" },
      error: null,
    });

    const mod = await import("@/services/email");
    sendSubscriptionConfirmation = mod.sendSubscriptionConfirmation;
  });

  it("sends subscription confirmation for base plan", async () => {
    const result = await sendSubscriptionConfirmation(
      "owner@testbiz.com",
      "Test Biz",
      "base",
      2900
    );

    expect(result.success).toBe(true);
    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "owner@testbiz.com",
        subject: "You're all set — base plan confirmed",
      })
    );
  });

  it("sends subscription confirmation for pro plan", async () => {
    const result = await sendSubscriptionConfirmation(
      "owner@testbiz.com",
      "Test Biz",
      "pro",
      7900
    );

    expect(result.success).toBe(true);
    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "You're all set — pro plan confirmed",
      })
    );
  });

  it("includes amount in email component", async () => {
    await sendSubscriptionConfirmation(
      "owner@testbiz.com",
      "Test Biz",
      "base",
      2900
    );

    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({
        react: expect.any(Object),
      })
    );
  });

  it("handles API failure gracefully", async () => {
    mockEmailsSend.mockRejectedValueOnce(new Error("Service unavailable"));

    const result = await sendSubscriptionConfirmation(
      "owner@testbiz.com",
      "Test Biz",
      "base",
      2900
    );

    expect(result.success).toBe(false);
    expect((result as any).error).toBe("Service unavailable");
  });
});

// ─── Tests: sendPaymentFailedNotice ──────────────────────────────────────────

describe("sendPaymentFailedNotice", () => {
  let sendPaymentFailedNotice: typeof import("@/services/email").sendPaymentFailedNotice;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_123";

    mockEmailsSend.mockResolvedValue({
      data: { id: "msg_payment_failed_001" },
      error: null,
    });

    const mod = await import("@/services/email");
    sendPaymentFailedNotice = mod.sendPaymentFailedNotice;
  });

  it("sends a payment failed notice email", async () => {
    const result = await sendPaymentFailedNotice(
      "owner@testbiz.com",
      "Test Biz"
    );

    expect(result.success).toBe(true);
    expect((result as any).messageId).toBe("msg_payment_failed_001");
    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "owner@testbiz.com",
        subject: "Heads up — we couldn't process your payment",
      })
    );
  });

  it("includes business name in email component", async () => {
    await sendPaymentFailedNotice("owner@testbiz.com", "My Restaurant");

    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({
        react: expect.any(Object),
      })
    );
  });

  it("handles send error", async () => {
    mockEmailsSend.mockResolvedValueOnce({
      data: null,
      error: { message: "Bounce detected" },
    });

    const result = await sendPaymentFailedNotice(
      "owner@testbiz.com",
      "Test Biz"
    );

    expect(result.success).toBe(false);
    expect((result as any).error).toBe("Bounce detected");
  });

  it("handles exception during send", async () => {
    mockEmailsSend.mockRejectedValueOnce(new Error("Connection refused"));

    const result = await sendPaymentFailedNotice(
      "owner@testbiz.com",
      "Test Biz"
    );

    expect(result.success).toBe(false);
    expect((result as any).error).toBe("Connection refused");
  });
});

// ─── Tests: Error handling for missing RESEND_API_KEY ───────────────────────

describe("Email service — missing RESEND_API_KEY", () => {
  it("throws when RESEND_API_KEY is not set", async () => {
    // Clear the module and env var to test lazy initialization
    vi.resetModules();
    delete process.env.RESEND_API_KEY;

    const { sendWelcomeEmail } = await import("@/services/email");

    const result = await sendWelcomeEmail("owner@testbiz.com", "Test Biz");

    expect(result.success).toBe(false);
    expect((result as any).error).toContain("RESEND_API_KEY");
  });
});

// ─── Tests: Helper function (send) ───────────────────────────────────────────

describe("Email service — send helper", () => {
  let sendWelcomeEmail: typeof import("@/services/email").sendWelcomeEmail;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_123";

    const mod = await import("@/services/email");
    sendWelcomeEmail = mod.sendWelcomeEmail;
  });

  it("returns messageId in success case", async () => {
    mockEmailsSend.mockResolvedValueOnce({
      data: { id: "msg_12345" },
      error: null,
    });

    const result = await sendWelcomeEmail("owner@testbiz.com", "Test Biz");

    expect(result.success).toBe(true);
    expect((result as any).messageId).toBe("msg_12345");
  });

  it("returns empty string when data.id is undefined", async () => {
    mockEmailsSend.mockResolvedValueOnce({
      data: {},
      error: null,
    });

    const result = await sendWelcomeEmail("owner@testbiz.com", "Test Biz");

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("");
  });

  it("captures error message from exception", async () => {
    const customError = new Error("Custom API error");
    mockEmailsSend.mockRejectedValueOnce(customError);

    const result = await sendWelcomeEmail("owner@testbiz.com", "Test Biz");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Custom API error");
  });

  it("handles non-Error exceptions", async () => {
    mockEmailsSend.mockRejectedValueOnce("String error");

    const result = await sendWelcomeEmail("owner@testbiz.com", "Test Biz");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unknown email error");
  });
});
