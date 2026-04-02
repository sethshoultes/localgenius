/**
 * Multi-Tenant Context Middleware
 *
 * Spec: engineering/data-model.md (RLS section)
 * Locked Decision #4: Multi-tenant from day one
 *
 * Extracts organization_id from the JWT auth context and sets it
 * as the PostgreSQL session variable `app.current_org_id`.
 * This activates Row-Level Security policies on all tenant-scoped tables.
 *
 * No application code touches tenant scoping — the database enforces it.
 */

import { type AuthContext } from "./auth";

/**
 * Set the tenant context on a database connection.
 * Must be called before any query in an authenticated request.
 *
 * This sets the PostgreSQL session variable that RLS policies reference:
 *   CREATE POLICY tenant_isolation ON businesses
 *     USING (organization_id = current_setting('app.current_org_id')::UUID);
 *
 * @param db - The database connection/client (Drizzle or raw SQL)
 * @param auth - The authenticated user's context from JWT
 */
export async function setTenantContext(
  db: { execute: (query: { sql: string; params: string[] }) => Promise<unknown> },
  auth: AuthContext
): Promise<void> {
  // TODO: Replace with actual Drizzle sql`` tagged template when db client is initialized
  // This raw SQL sets the session variable that RLS policies reference.
  // It must run at the start of every authenticated request, before any queries.
  await db.execute({
    sql: "SELECT set_config('app.current_org_id', $1, true)",
    params: [auth.organizationId],
  });
}

/**
 * Helper to get the size bucket for a business (used in benchmark queries).
 * Maps employee count to anonymized size bucket per data-model.md anonymization rules.
 */
export function getSizeBucket(employeeCount: number | null): string {
  if (!employeeCount || employeeCount <= 5) return "1-5";
  if (employeeCount <= 15) return "6-15";
  return "16-50";
}
