/**
 * Tests for GET /api/health
 */

import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns structured health check with version and timestamp", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    // Status is one of: healthy, degraded, unconfigured, unhealthy
    expect(["healthy", "degraded", "unconfigured", "unhealthy"]).toContain(body.data.status);
    expect(body.data.version).toBe("0.1.0");
    expect(body.data.timestamp).toBeDefined();
    expect(new Date(body.data.timestamp).toISOString()).toBe(body.data.timestamp);
    // Deep health check fields present
    expect(body.data.database).toBeDefined();
    expect(body.data.ai).toBeDefined();
    expect(body.data.integrations).toBeDefined();
  });
});
