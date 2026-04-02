/**
 * Tests for GET /api/health
 */

import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns status ok with version and timestamp", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe("ok");
    expect(body.data.version).toBe("0.1.0");
    expect(body.data.timestamp).toBeDefined();
    // Timestamp should be a valid ISO string
    expect(new Date(body.data.timestamp).toISOString()).toBe(body.data.timestamp);
  });
});
