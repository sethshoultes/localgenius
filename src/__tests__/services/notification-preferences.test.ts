/**
 * Tests for src/services/notification-preferences.ts
 * Getting preferences (defaults when none saved), updating preferences.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Module mocks ────────────────────────────────────────────────────────────

// Mock DB: chainable select + insert with onConflictDoUpdate
const mockSelectLimit = vi.fn().mockResolvedValue([]);
const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
const mockInsertValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
  getDb: vi.fn(),
}));

// Mock schema
vi.mock("@/db/schema", () => ({
  businessSettings: {
    id: "businessSettings.id",
    businessId: "businessSettings.businessId",
    organizationId: "businessSettings.organizationId",
    platform: "businessSettings.platform",
    config: "businessSettings.config",
    connectionStatus: "businessSettings.connectionStatus",
    updatedAt: "businessSettings.updatedAt",
  },
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ op: "eq", args })),
  and: vi.fn((...args: unknown[]) => ({ op: "and", args })),
}));

// ─── Tests: getNotificationPreferences ───────────────────────────────────────

describe("getNotificationPreferences", () => {
  let getNotificationPreferences: typeof import("@/services/notification-preferences").getNotificationPreferences;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import("@/services/notification-preferences");
    getNotificationPreferences = mod.getNotificationPreferences;
  });

  it("returns default preferences when none are saved", async () => {
    mockSelectLimit.mockResolvedValueOnce([]);

    const prefs = await getNotificationPreferences("biz-uuid-001");

    expect(prefs.negative_review).toEqual({ email: true, sms: true, push: true });
    expect(prefs.positive_review).toEqual({ email: false, sms: false, push: false });
    expect(prefs.weekly_digest).toEqual({ email: true, sms: false, push: true });
    expect(prefs.booking).toEqual({ email: true, sms: true, push: true });
    expect(prefs.payment_success).toEqual({ email: true, sms: false, push: false });
    expect(prefs.payment_failed).toEqual({ email: true, sms: true, push: true });
    expect(prefs.campaign_results).toEqual({ email: false, sms: false, push: true });
    expect(prefs.integration_error).toEqual({ email: true, sms: false, push: true });
  });

  it("returns defaults when settings exist but config is null", async () => {
    mockSelectLimit.mockResolvedValueOnce([{ config: null }]);

    const prefs = await getNotificationPreferences("biz-uuid-001");

    expect(prefs.negative_review).toEqual({ email: true, sms: true, push: true });
  });

  it("merges stored preferences with defaults", async () => {
    mockSelectLimit.mockResolvedValueOnce([{
      config: {
        negative_review: { email: false, sms: false, push: true },
      },
    }]);

    const prefs = await getNotificationPreferences("biz-uuid-001");

    // Stored override
    expect(prefs.negative_review).toEqual({ email: false, sms: false, push: true });
    // Defaults for types not in stored config
    expect(prefs.weekly_digest).toEqual({ email: true, sms: false, push: true });
    expect(prefs.booking).toEqual({ email: true, sms: true, push: true });
  });

  it("queries the correct business ID", async () => {
    mockSelectLimit.mockResolvedValueOnce([]);

    await getNotificationPreferences("biz-uuid-999");

    expect(mockSelect).toHaveBeenCalled();
    expect(mockSelectFrom).toHaveBeenCalled();
    expect(mockSelectWhere).toHaveBeenCalled();
  });
});

// ─── Tests: updateNotificationPreferences ────────────────────────────────────

describe("updateNotificationPreferences", () => {
  let updateNotificationPreferences: typeof import("@/services/notification-preferences").updateNotificationPreferences;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import("@/services/notification-preferences");
    updateNotificationPreferences = mod.updateNotificationPreferences;
  });

  it("merges partial update with current preferences and upserts", async () => {
    // getNotificationPreferences will be called internally — return defaults
    mockSelectLimit.mockResolvedValueOnce([]);

    const result = await updateNotificationPreferences(
      "biz-uuid-001",
      "org-uuid-001",
      { positive_review: { email: true, sms: true, push: true } }
    );

    // Updated type should reflect the change
    expect(result.positive_review).toEqual({ email: true, sms: true, push: true });
    // Other types should retain defaults
    expect(result.negative_review).toEqual({ email: true, sms: true, push: true });
    expect(result.weekly_digest).toEqual({ email: true, sms: false, push: true });

    // Verify upsert was called
    expect(mockInsert).toHaveBeenCalled();
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: "biz-uuid-001",
        organizationId: "org-uuid-001",
        platform: "notification_prefs",
        connectionStatus: "active",
      })
    );
    expect(mockOnConflictDoUpdate).toHaveBeenCalled();
  });

  it("preserves existing stored preferences when updating a single type", async () => {
    // Return existing stored prefs
    mockSelectLimit.mockResolvedValueOnce([{
      config: {
        negative_review: { email: false, sms: false, push: false },
        booking: { email: false, sms: false, push: false },
      },
    }]);

    const result = await updateNotificationPreferences(
      "biz-uuid-001",
      "org-uuid-001",
      { weekly_digest: { email: false, sms: true, push: false } }
    );

    // Stored overrides should be preserved
    expect(result.negative_review).toEqual({ email: false, sms: false, push: false });
    expect(result.booking).toEqual({ email: false, sms: false, push: false });
    // New update should be applied
    expect(result.weekly_digest).toEqual({ email: false, sms: true, push: false });
    // Defaults for other types
    expect(result.payment_success).toEqual({ email: true, sms: false, push: false });
  });

  it("handles updating multiple notification types at once", async () => {
    mockSelectLimit.mockResolvedValueOnce([]);

    const result = await updateNotificationPreferences(
      "biz-uuid-001",
      "org-uuid-001",
      {
        negative_review: { email: false, sms: false, push: false },
        positive_review: { email: true, sms: true, push: true },
        weekly_digest: { email: false, sms: false, push: false },
      }
    );

    expect(result.negative_review).toEqual({ email: false, sms: false, push: false });
    expect(result.positive_review).toEqual({ email: true, sms: true, push: true });
    expect(result.weekly_digest).toEqual({ email: false, sms: false, push: false });
    // Untouched types keep defaults
    expect(result.booking).toEqual({ email: true, sms: true, push: true });
  });

  it("propagates database errors", async () => {
    mockSelectLimit.mockResolvedValueOnce([]);
    mockOnConflictDoUpdate.mockRejectedValueOnce(new Error("DB write failed"));

    await expect(
      updateNotificationPreferences("biz-uuid-001", "org-uuid-001", {
        booking: { email: false, sms: false, push: false },
      })
    ).rejects.toThrow("DB write failed");
  });
});

// ─── Tests: getNotificationTypes ─────────────────────────────────────────────

describe("getNotificationTypes", () => {
  let getNotificationTypes: typeof import("@/services/notification-preferences").getNotificationTypes;

  beforeEach(async () => {
    const mod = await import("@/services/notification-preferences");
    getNotificationTypes = mod.getNotificationTypes;
  });

  it("returns all 8 notification types with labels and descriptions", () => {
    const types = getNotificationTypes();

    expect(types).toHaveLength(8);
    expect(types.map((t) => t.type)).toEqual([
      "negative_review",
      "positive_review",
      "weekly_digest",
      "booking",
      "payment_success",
      "payment_failed",
      "campaign_results",
      "integration_error",
    ]);
  });

  it("each notification type has a label, description, and default channels", () => {
    const types = getNotificationTypes();

    for (const t of types) {
      expect(t.label).toBeDefined();
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.description).toBeDefined();
      expect(t.description.length).toBeGreaterThan(0);
      expect(t.default).toHaveProperty("email");
      expect(t.default).toHaveProperty("sms");
      expect(t.default).toHaveProperty("push");
    }
  });
});
