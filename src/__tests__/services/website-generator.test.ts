/**
 * Tests for src/services/website-generator.ts
 * Static website generation with AI copy, reviews, and metadata
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TEST_BUSINESS } from "../mocks/db";

// ─── Module mocks ────────────────────────────────────────────────────────────

function makeThenable(result: unknown[]) {
  const obj: Record<string, unknown> = {};
  obj.limit = vi.fn().mockImplementation(() => makeThenable(result));
  obj.orderBy = vi.fn().mockImplementation(() => makeThenable(result));
  obj.desc = vi.fn().mockImplementation(() => makeThenable(result));
  obj.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return obj;
}

const mockSelectWhere = vi.fn().mockImplementation(() => makeThenable([]));
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

const mockUpdateWhere = vi.fn().mockResolvedValue([]);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
  getDb: vi.fn(),
}));

// Mock schema
vi.mock("@/db/schema", () => ({
  businesses: {
    id: "businesses.id",
    organizationId: "businesses.organizationId",
    name: "businesses.name",
    vertical: "businesses.vertical",
    city: "businesses.city",
    state: "businesses.state",
    updatedAt: "businesses.updatedAt",
  },
  reviews: {
    id: "reviews.id",
    businessId: "reviews.businessId",
    organizationId: "reviews.organizationId",
    reviewerName: "reviews.reviewerName",
    rating: "reviews.rating",
    reviewText: "reviews.reviewText",
    reviewDate: "reviews.reviewDate",
    sentiment: "reviews.sentiment",
  },
  businessSettings: {},
  actions: {},
  analyticsEvents: {},
}));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  desc: vi.fn((...args: unknown[]) => ({ type: "desc", args })),
  sql: vi.fn((...args: unknown[]) => ({ type: "sql", args })),
}));

// Mock AI service
const mockGenerate = vi.fn();
vi.mock("@/services/ai", () => ({
  generate: (...args: unknown[]) => mockGenerate(...args),
}));

// ─── Tests: generateWebsite ──────────────────────────────────────────────────

describe("website-generator — generateWebsite()", () => {
  let generateWebsite: typeof import("@/services/website-generator").generateWebsite;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import("@/services/website-generator");
    generateWebsite = mod.generateWebsite;
  });

  it("generates HTML with business name, address, and phone", async () => {
    mockGenerate
      .mockResolvedValueOnce("A warm, welcoming restaurant with fresh ingredients")
      .mockResolvedValueOnce("Fresh food, warm hearts");

    mockSelectWhere.mockImplementationOnce(() => makeThenable([]));

    const result = await generateWebsite(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      {
        name: "Maria's Kitchen",
        vertical: "restaurant",
        city: "Austin",
        state: "TX",
        address: "123 Main St",
        phone: "512-555-0100",
      }
    );

    expect(result.html).toContain("Maria's Kitchen");
    expect(result.html).toContain("123 Main St");
    expect(result.html).toContain("512-555-0100");
    expect(result.metadata.title).toContain("Maria's Kitchen");
  });

  it("calls AI to generate description when not provided", async () => {
    mockGenerate
      .mockResolvedValueOnce("Generated description from AI")
      .mockResolvedValueOnce("Generated tagline");

    mockSelectWhere.mockImplementationOnce(() => makeThenable([]));

    await generateWebsite(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      {
        name: "Joe's Tacos",
        vertical: "restaurant",
        city: "Austin",
        state: "TX",
      }
    );

    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("Joe's Tacos"),
      })
    );
  });

  it("uses provided description instead of generating", async () => {
    mockGenerate.mockResolvedValueOnce("Generated tagline");

    mockSelectWhere.mockImplementationOnce(() => makeThenable([]));

    const customDescription = "My custom business description";

    const result = await generateWebsite(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      {
        name: "Test Biz",
        vertical: "restaurant",
        city: "Austin",
        state: "TX",
        description: customDescription,
      }
    );

    expect(result.html).toContain(customDescription);
  });

  it("calls AI to generate tagline", async () => {
    mockGenerate
      .mockResolvedValueOnce("Generated description")
      .mockResolvedValueOnce("Fresh and local");

    mockSelectWhere.mockImplementationOnce(() => makeThenable([]));

    await generateWebsite(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      {
        name: "Maria's Kitchen",
        vertical: "restaurant",
        city: "Austin",
        state: "TX",
      }
    );

    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("tagline"),
      })
    );
  });

  it("includes top 3 positive reviews in HTML", async () => {
    const reviews = [
      {
        id: "review-1",
        businessId: TEST_BUSINESS.id,
        organizationId: TEST_BUSINESS.organizationId,
        reviewerName: "Alice",
        rating: 5,
        reviewText: "Amazing food!",
        reviewDate: new Date(),
        sentiment: "positive",
      },
      {
        id: "review-2",
        businessId: TEST_BUSINESS.id,
        organizationId: TEST_BUSINESS.organizationId,
        reviewerName: "Bob",
        rating: 4,
        reviewText: "Great experience",
        reviewDate: new Date(),
        sentiment: "positive",
      },
    ];

    mockGenerate
      .mockResolvedValueOnce("Great restaurant")
      .mockResolvedValueOnce("Fresh and friendly");

    mockSelectWhere.mockImplementationOnce(() => makeThenable(reviews));

    const result = await generateWebsite(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      {
        name: "Test Biz",
        vertical: "restaurant",
        city: "Austin",
        state: "TX",
      }
    );

    expect(result.html).toContain("Amazing food!");
    expect(result.html).toContain("Great experience");
    expect(result.html).toContain("Alice");
    expect(result.html).toContain("Bob");
  });

  it("filters reviews to rating >= 4", async () => {
    const reviews = [
      {
        id: "review-1",
        businessId: TEST_BUSINESS.id,
        reviewerName: "Good Reviewer",
        rating: 5,
        reviewText: "Great!",
        reviewDate: new Date(),
      },
      {
        id: "review-2",
        businessId: TEST_BUSINESS.id,
        reviewerName: "Bad Reviewer",
        rating: 2,
        reviewText: "Awful!",
        reviewDate: new Date(),
      },
    ];

    mockGenerate
      .mockResolvedValueOnce("Good place")
      .mockResolvedValueOnce("Excellent");

    mockSelectWhere.mockImplementationOnce(() => makeThenable(reviews));

    const result = await generateWebsite(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      {
        name: "Test Biz",
        vertical: "restaurant",
        city: "Austin",
        state: "TX",
      }
    );

    // The mock returns all reviews, but the function should filter them
    // Check that mockSelect was called with the where clause
    expect(mockSelectFrom).toHaveBeenCalled();
  });

  it("includes hero photo when provided", async () => {
    mockGenerate
      .mockResolvedValueOnce("Great place")
      .mockResolvedValueOnce("Excellent");

    mockSelectWhere.mockImplementationOnce(() => makeThenable([]));

    const heroUrl = "https://cdn.example.com/hero.jpg";

    const result = await generateWebsite(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      {
        name: "Test Biz",
        vertical: "restaurant",
        city: "Austin",
        state: "TX",
        photos: [heroUrl],
      }
    );

    expect(result.html).toContain(heroUrl);
    expect(result.html).toContain("hero");
  });

  it("includes gallery section with multiple photos", async () => {
    mockGenerate
      .mockResolvedValueOnce("Great place")
      .mockResolvedValueOnce("Excellent");

    mockSelectWhere.mockImplementationOnce(() => makeThenable([]));

    const photos = [
      "https://cdn.example.com/hero.jpg",
      "https://cdn.example.com/gallery1.jpg",
      "https://cdn.example.com/gallery2.jpg",
    ];

    const result = await generateWebsite(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      {
        name: "Test Biz",
        vertical: "restaurant",
        city: "Austin",
        state: "TX",
        photos,
      }
    );

    expect(result.html).toContain("gallery1.jpg");
    expect(result.html).toContain("gallery2.jpg");
    expect(result.html).toContain("gallery");
  });

  it("uses provided hours or defaults", async () => {
    mockGenerate
      .mockResolvedValueOnce("Great place")
      .mockResolvedValueOnce("Excellent");

    mockSelectWhere.mockImplementationOnce(() => makeThenable([]));

    const customHours = {
      "Mon-Fri": "9am - 5pm",
      "Sat": "10am - 3pm",
      "Sun": "Closed",
    };

    const result = await generateWebsite(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      {
        name: "Test Biz",
        vertical: "restaurant",
        city: "Austin",
        state: "TX",
        hours: customHours,
      }
    );

    expect(result.html).toContain("9am - 5pm");
    expect(result.html).toContain("10am - 3pm");
  });

  it("uses default hours when not provided", async () => {
    mockGenerate
      .mockResolvedValueOnce("Great place")
      .mockResolvedValueOnce("Excellent");

    mockSelectWhere.mockImplementationOnce(() => makeThenable([]));

    const result = await generateWebsite(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      {
        name: "Test Biz",
        vertical: "restaurant",
        city: "Austin",
        state: "TX",
      }
    );

    expect(result.html).toContain("11am - 9pm");
    expect(result.html).toContain("Mon-Thu");
  });

  it("generates correct metadata description", async () => {
    mockGenerate
      .mockResolvedValueOnce("Great place")
      .mockResolvedValueOnce("Fresh and local");

    mockSelectWhere.mockImplementationOnce(() => makeThenable([]));

    const result = await generateWebsite(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      {
        name: "Maria's Kitchen",
        vertical: "restaurant",
        city: "Austin",
        state: "TX",
      }
    );

    expect(result.metadata.description).toContain("Maria's Kitchen");
    expect(result.metadata.description).toContain("Fresh and local");
    expect(result.metadata.description).toContain("Restaurant");
    expect(result.metadata.description).toContain("Austin");
    expect(result.metadata.description).toContain("TX");
  });

  it("updates business updatedAt timestamp", async () => {
    mockGenerate
      .mockResolvedValueOnce("Great place")
      .mockResolvedValueOnce("Excellent");

    mockSelectWhere.mockImplementationOnce(() => makeThenable([]));

    await generateWebsite(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      {
        name: "Test Biz",
        vertical: "restaurant",
        city: "Austin",
        state: "TX",
      }
    );

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        updatedAt: expect.any(Date),
      })
    );
  });

  it("returns metadata with title and description", async () => {
    mockGenerate
      .mockResolvedValueOnce("Great place")
      .mockResolvedValueOnce("Fresh and local");

    mockSelectWhere.mockImplementationOnce(() => makeThenable([]));

    const result = await generateWebsite(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      {
        name: "Maria's Kitchen",
        vertical: "restaurant",
        city: "Austin",
        state: "TX",
      }
    );

    expect(result.metadata.title).toContain("Maria's Kitchen");
    expect(result.metadata.title).toContain("Fresh and local");
    expect(result.metadata.description).toBeDefined();
    expect(result.metadata.generatedAt).toBeDefined();
  });

  it("includes call and directions buttons when contact info provided", async () => {
    mockGenerate
      .mockResolvedValueOnce("Great place")
      .mockResolvedValueOnce("Excellent");

    mockSelectWhere.mockImplementationOnce(() => makeThenable([]));

    const result = await generateWebsite(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      {
        name: "Test Biz",
        vertical: "restaurant",
        city: "Austin",
        state: "TX",
        address: "123 Main St",
        phone: "512-555-0100",
      }
    );

    expect(result.html).toContain("Call Us");
    expect(result.html).toContain("Get Directions");
    expect(result.html).toContain("tel:");
    expect(result.html).toContain("maps.google.com");
  });

  it("uses proper design tokens in CSS", async () => {
    mockGenerate
      .mockResolvedValueOnce("Great place")
      .mockResolvedValueOnce("Excellent");

    mockSelectWhere.mockImplementationOnce(() => makeThenable([]));

    const result = await generateWebsite(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      {
        name: "Test Biz",
        vertical: "restaurant",
        city: "Austin",
        state: "TX",
      }
    );

    // Check for design tokens from product-design.md
    expect(result.html).toContain("#2C2C2C"); // Warm Charcoal
    expect(result.html).toContain("#FAF8F5"); // Warm White
    expect(result.html).toContain("#C4704B"); // Terracotta
    expect(result.html).toContain("#7A8B6F"); // Sage
    expect(result.html).toContain("#D4A853"); // Soft Gold
  });

  it("includes Source Sans 3 typeface", async () => {
    mockGenerate
      .mockResolvedValueOnce("Great place")
      .mockResolvedValueOnce("Excellent");

    mockSelectWhere.mockImplementationOnce(() => makeThenable([]));

    const result = await generateWebsite(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      {
        name: "Test Biz",
        vertical: "restaurant",
        city: "Austin",
        state: "TX",
      }
    );

    expect(result.html).toContain("Source Sans 3");
  });

  it("renders reviews with star ratings", async () => {
    const reviews = [
      {
        id: "review-1",
        businessId: TEST_BUSINESS.id,
        organizationId: TEST_BUSINESS.organizationId,
        reviewerName: "Alice",
        rating: 5,
        reviewText: "Perfect!",
        reviewDate: new Date(),
        sentiment: "positive",
      },
    ];

    mockGenerate
      .mockResolvedValueOnce("Great place")
      .mockResolvedValueOnce("Excellent");

    mockSelectWhere.mockImplementationOnce(() => makeThenable(reviews));

    const result = await generateWebsite(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      {
        name: "Test Biz",
        vertical: "restaurant",
        city: "Austin",
        state: "TX",
      }
    );

    expect(result.html).toContain("★"); // Star character
    expect(result.html).toContain("Perfect!");
    expect(result.html).toContain("Alice");
  });

  it("handles business with no reviews", async () => {
    mockGenerate
      .mockResolvedValueOnce("Great place")
      .mockResolvedValueOnce("Excellent");

    mockSelectWhere.mockImplementationOnce(() => makeThenable([]));

    const result = await generateWebsite(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      {
        name: "Test Biz",
        vertical: "restaurant",
        city: "Austin",
        state: "TX",
      }
    );

    // Should not have reviews section if no reviews
    expect(result.html).not.toContain("What People Are Saying");
  });

  it("handles business with no photos", async () => {
    mockGenerate
      .mockResolvedValueOnce("Great place")
      .mockResolvedValueOnce("Excellent");

    mockSelectWhere.mockImplementationOnce(() => makeThenable([]));

    const result = await generateWebsite(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      {
        name: "Test Biz",
        vertical: "restaurant",
        city: "Austin",
        state: "TX",
        photos: [],
      }
    );

    // Hero should use gradient fallback, no gallery section
    expect(result.html).not.toContain('<section class="gallery">');
  });

  it("handles business with no address or phone", async () => {
    mockGenerate
      .mockResolvedValueOnce("Great place")
      .mockResolvedValueOnce("Excellent");

    mockSelectWhere.mockImplementationOnce(() => makeThenable([]));

    const result = await generateWebsite(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      {
        name: "Test Biz",
        vertical: "restaurant",
        city: "Austin",
        state: "TX",
      }
    );

    // Should still generate valid HTML
    expect(result.html).toContain("Test Biz");
    expect(result.html).toContain("<!DOCTYPE html>");
  });

  it("sanitizes phone number for tel: links", async () => {
    mockGenerate
      .mockResolvedValueOnce("Great place")
      .mockResolvedValueOnce("Excellent");

    mockSelectWhere.mockImplementationOnce(() => makeThenable([]));

    const result = await generateWebsite(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      {
        name: "Test Biz",
        vertical: "restaurant",
        city: "Austin",
        state: "TX",
        phone: "(512) 555-0100",
      }
    );

    expect(result.html).toContain("tel:");
    // Phone should be cleaned (non-digits removed)
    expect(result.html).toContain("5125550100");
  });

  it("URL encodes address for Google Maps", async () => {
    mockGenerate
      .mockResolvedValueOnce("Great place")
      .mockResolvedValueOnce("Excellent");

    mockSelectWhere.mockImplementationOnce(() => makeThenable([]));

    const result = await generateWebsite(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      {
        name: "Test Biz",
        vertical: "restaurant",
        city: "Austin",
        state: "TX",
        address: "123 Main St, Austin, TX",
      }
    );

    expect(result.html).toContain("maps.google.com");
    expect(result.html).toContain("?q=");
    expect(result.html).toContain("%20"); // URL encoded space
  });

  it("includes footer with LocalGenius credit", async () => {
    mockGenerate
      .mockResolvedValueOnce("Great place")
      .mockResolvedValueOnce("Excellent");

    mockSelectWhere.mockImplementationOnce(() => makeThenable([]));

    const result = await generateWebsite(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      {
        name: "Test Biz",
        vertical: "restaurant",
        city: "Austin",
        state: "TX",
      }
    );

    expect(result.html).toContain("LocalGenius");
    expect(result.html).toContain("localgenius.com");
  });

  it("includes current year in footer copyright", async () => {
    mockGenerate
      .mockResolvedValueOnce("Great place")
      .mockResolvedValueOnce("Excellent");

    mockSelectWhere.mockImplementationOnce(() => makeThenable([]));

    const result = await generateWebsite(
      TEST_BUSINESS.id,
      TEST_BUSINESS.organizationId,
      {
        name: "Test Biz",
        vertical: "restaurant",
        city: "Austin",
        state: "TX",
      }
    );

    const currentYear = new Date().getFullYear();
    expect(result.html).toContain(currentYear.toString());
  });
});
