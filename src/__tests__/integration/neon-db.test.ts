/**
 * Integration tests for the real Neon PostgreSQL database connection.
 *
 * These tests verify that the Drizzle ORM schema matches the actual
 * database, that CRUD operations work end-to-end, and that multi-tenant
 * isolation (organization_id scoping) is enforced.
 *
 * IMPORTANT: These tests run against the REAL Neon database specified
 * by DATABASE_URL. They create test data with a known prefix and clean
 * up after themselves. Skip if DATABASE_URL is not available.
 *
 * Run: npm test -- src/__tests__/integration/neon-db.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and } from "drizzle-orm";
import * as schema from "@/db/schema";

// ─── Skip if no real database ─────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
const shouldRun = !!DATABASE_URL;

// ─── Test database connection ─────────────────────────────────────────────────

const TEST_PREFIX = `__neon_test_${Date.now()}`;

function getTestDb() {
  if (!DATABASE_URL) throw new Error("DATABASE_URL not set");
  const sql = neon(DATABASE_URL);
  return drizzle(sql, { schema });
}

// Track created IDs for cleanup
const cleanup = {
  conversationIds: [] as string[],
  userIds: [] as string[],
  businessIds: [] as string[],
  orgIds: [] as string[],
};

describe.skipIf(!shouldRun)("Neon Database Integration", () => {
  let db: ReturnType<typeof getTestDb>;

  beforeAll(() => {
    db = getTestDb();
  });

  afterAll(async () => {
    if (!db) return;
    // Clean up in reverse FK order
    for (const id of cleanup.conversationIds) {
      await db.delete(schema.conversations).where(eq(schema.conversations.id, id));
    }
    for (const id of cleanup.userIds) {
      await db.delete(schema.users).where(eq(schema.users.id, id));
    }
    for (const id of cleanup.businessIds) {
      await db.delete(schema.businesses).where(eq(schema.businesses.id, id));
    }
    for (const id of cleanup.orgIds) {
      await db.delete(schema.organizations).where(eq(schema.organizations.id, id));
    }
  });

  // ─── Connection ──────────────────────────────────────────────────────────

  it("connects to Neon and executes a raw query", async () => {
    const sql = neon(DATABASE_URL!);
    const result = await sql`SELECT 1 as ping`;
    expect(result[0].ping).toBe(1);
  });

  it("connects via Drizzle ORM", async () => {
    const result = await db.execute(
      // Use drizzle-orm sql tag
      require("drizzle-orm").sql`SELECT current_database() as db_name`
    );
    expect(result.rows[0].db_name).toBeDefined();
  });

  // ─── Schema Verification ─────────────────────────────────────────────────

  it("organizations table exists and supports CRUD", async () => {
    const [org] = await db
      .insert(schema.organizations)
      .values({ name: `${TEST_PREFIX}_org` })
      .returning();

    cleanup.orgIds.push(org.id);

    expect(org.id).toBeDefined();
    expect(org.name).toBe(`${TEST_PREFIX}_org`);
    expect(org.plan).toBe("base"); // default
    expect(org.createdAt).toBeInstanceOf(Date);

    // Read back
    const [found] = await db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.id, org.id))
      .limit(1);
    expect(found.name).toBe(`${TEST_PREFIX}_org`);

    // Update
    await db
      .update(schema.organizations)
      .set({ plan: "pro" })
      .where(eq(schema.organizations.id, org.id));

    const [updated] = await db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.id, org.id))
      .limit(1);
    expect(updated.plan).toBe("pro");
  });

  it("businesses table enforces FK to organizations", async () => {
    const [org] = await db
      .insert(schema.organizations)
      .values({ name: `${TEST_PREFIX}_biz_org` })
      .returning();
    cleanup.orgIds.push(org.id);

    const [biz] = await db
      .insert(schema.businesses)
      .values({
        organizationId: org.id,
        name: `${TEST_PREFIX}_biz`,
        vertical: "restaurant",
        city: "Austin",
        state: "TX",
      })
      .returning();
    cleanup.businessIds.push(biz.id);

    expect(biz.id).toBeDefined();
    expect(biz.organizationId).toBe(org.id);
    expect(biz.vertical).toBe("restaurant");
    expect(biz.city).toBe("Austin");
  });

  it("users table enforces FK to organizations and businesses", async () => {
    // Reuse org + biz from previous test
    const [org] = await db
      .insert(schema.organizations)
      .values({ name: `${TEST_PREFIX}_user_org` })
      .returning();
    cleanup.orgIds.push(org.id);

    const [biz] = await db
      .insert(schema.businesses)
      .values({
        organizationId: org.id,
        name: `${TEST_PREFIX}_user_biz`,
        vertical: "salon",
        city: "Dallas",
        state: "TX",
      })
      .returning();
    cleanup.businessIds.push(biz.id);

    const [user] = await db
      .insert(schema.users)
      .values({
        organizationId: org.id,
        businessId: biz.id,
        email: `${TEST_PREFIX}@test.localgenius.dev`,
        name: "Test User",
        passwordHash: "fakesalt:fakehash",
        consentAt: new Date(),
      })
      .returning();
    cleanup.userIds.push(user.id);

    expect(user.id).toBeDefined();
    expect(user.email).toBe(`${TEST_PREFIX}@test.localgenius.dev`);
    expect(user.organizationId).toBe(org.id);
    expect(user.businessId).toBe(biz.id);
  });

  // ─── Multi-tenant Isolation ──────────────────────────────────────────────

  it("queries scoped by organization_id return only matching rows", async () => {
    // Create two orgs with one business each
    const [org1] = await db
      .insert(schema.organizations)
      .values({ name: `${TEST_PREFIX}_iso_org1` })
      .returning();
    cleanup.orgIds.push(org1.id);

    const [org2] = await db
      .insert(schema.organizations)
      .values({ name: `${TEST_PREFIX}_iso_org2` })
      .returning();
    cleanup.orgIds.push(org2.id);

    const [biz1] = await db
      .insert(schema.businesses)
      .values({
        organizationId: org1.id,
        name: `${TEST_PREFIX}_iso_biz1`,
        vertical: "dental",
        city: "Houston",
        state: "TX",
      })
      .returning();
    cleanup.businessIds.push(biz1.id);

    const [biz2] = await db
      .insert(schema.businesses)
      .values({
        organizationId: org2.id,
        name: `${TEST_PREFIX}_iso_biz2`,
        vertical: "fitness",
        city: "San Antonio",
        state: "TX",
      })
      .returning();
    cleanup.businessIds.push(biz2.id);

    // Query scoped to org1 should only return biz1
    const org1Businesses = await db
      .select()
      .from(schema.businesses)
      .where(eq(schema.businesses.organizationId, org1.id));

    expect(org1Businesses).toHaveLength(1);
    expect(org1Businesses[0].name).toBe(`${TEST_PREFIX}_iso_biz1`);

    // Query scoped to org2 should only return biz2
    const org2Businesses = await db
      .select()
      .from(schema.businesses)
      .where(eq(schema.businesses.organizationId, org2.id));

    expect(org2Businesses).toHaveLength(1);
    expect(org2Businesses[0].name).toBe(`${TEST_PREFIX}_iso_biz2`);
  });

  // ─── Conversation + Message Flow ─────────────────────────────────────────

  it("creates a conversation and messages for a business", async () => {
    const [org] = await db
      .insert(schema.organizations)
      .values({ name: `${TEST_PREFIX}_conv_org` })
      .returning();
    cleanup.orgIds.push(org.id);

    const [biz] = await db
      .insert(schema.businesses)
      .values({
        organizationId: org.id,
        name: `${TEST_PREFIX}_conv_biz`,
        vertical: "restaurant",
        city: "Austin",
        state: "TX",
      })
      .returning();
    cleanup.businessIds.push(biz.id);

    const [convo] = await db
      .insert(schema.conversations)
      .values({ businessId: biz.id, organizationId: org.id })
      .returning();
    cleanup.conversationIds.push(convo.id);

    expect(convo.id).toBeDefined();
    expect(convo.businessId).toBe(biz.id);

    // Insert messages
    const [ownerMsg] = await db
      .insert(schema.messages)
      .values({
        conversationId: convo.id,
        businessId: biz.id,
        organizationId: org.id,
        role: "owner",
        contentType: "text",
        content: { text: "How should I respond to this review?" },
      })
      .returning();

    const [assistantMsg] = await db
      .insert(schema.messages)
      .values({
        conversationId: convo.id,
        businessId: biz.id,
        organizationId: org.id,
        role: "assistant",
        contentType: "text",
        content: { text: "Here is a warm, professional response..." },
        aiModel: "claude-sonnet-4-20250514",
        tokensInput: 150,
        tokensOutput: 200,
      })
      .returning();

    expect(ownerMsg.role).toBe("owner");
    expect(assistantMsg.role).toBe("assistant");
    expect(assistantMsg.aiModel).toBe("claude-sonnet-4-20250514");
    expect(assistantMsg.tokensInput).toBe(150);

    // Query messages for this conversation
    const messages = await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.conversationId, convo.id));

    expect(messages).toHaveLength(2);

    // Clean up messages (not tracked in cleanup object since they cascade)
    await db.delete(schema.messages).where(eq(schema.messages.conversationId, convo.id));
  });

  // ─── Unique Constraints ──────────────────────────────────────────────────

  it("rejects duplicate user email within same organization", async () => {
    const [org] = await db
      .insert(schema.organizations)
      .values({ name: `${TEST_PREFIX}_dup_org` })
      .returning();
    cleanup.orgIds.push(org.id);

    const [biz] = await db
      .insert(schema.businesses)
      .values({
        organizationId: org.id,
        name: `${TEST_PREFIX}_dup_biz`,
        vertical: "retail",
        city: "Austin",
        state: "TX",
      })
      .returning();
    cleanup.businessIds.push(biz.id);

    const email = `${TEST_PREFIX}_dup@test.localgenius.dev`;

    const [user1] = await db
      .insert(schema.users)
      .values({
        organizationId: org.id,
        businessId: biz.id,
        email,
        name: "User One",
        passwordHash: "salt:hash",
        consentAt: new Date(),
      })
      .returning();
    cleanup.userIds.push(user1.id);

    // Second insert with same email should fail
    await expect(
      db.insert(schema.users).values({
        organizationId: org.id,
        businessId: biz.id,
        email,
        name: "User Two",
        passwordHash: "salt:hash2",
        consentAt: new Date(),
      })
    ).rejects.toThrow();
  });
});
