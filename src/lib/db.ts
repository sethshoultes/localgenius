/**
 * Database connection utility — Neon Serverless PostgreSQL
 * Spec: engineering/tech-stack.md Section 3
 *
 * Lazy initialization to avoid errors during build (no DATABASE_URL at build time).
 */

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

let _sql: NeonQueryFunction<false, false> | null = null;
let _db: NeonHttpDatabase<typeof schema> | null = null;

function getSQL() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

export function getDb() {
  if (!_db) {
    _db = drizzle(getSQL(), { schema });
  }
  return _db;
}

// Convenience export — use getDb() in API routes
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
