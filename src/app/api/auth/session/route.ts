import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";
import { db } from "@/lib/db";
import { users, businesses } from "@/db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);

const COOKIE_NAME = "lg_session";

/**
 * GET /api/auth/session
 * Returns the current session user + business from the auth cookie.
 * Used by useAuth() hook on page load.
 */
export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(COOKIE_NAME);

  if (!cookie?.value) {
    return NextResponse.json(
      { data: null },
      { status: 200 } // 200 not 401 — useAuth() checks data === null
    );
  }

  try {
    const { payload } = await jose.jwtVerify(cookie.value, JWT_SECRET);

    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, payload.sub as string))
      .limit(1);

    const [biz] = await db
      .select({ id: businesses.id, name: businesses.name, vertical: businesses.vertical })
      .from(businesses)
      .where(eq(businesses.id, payload.biz as string))
      .limit(1);

    if (!user) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({
      data: {
        user: { id: user.id, email: user.email, name: user.name },
        business: biz ? { id: biz.id, name: biz.name, vertical: biz.vertical } : null,
        plan: (payload.plan as string) || 'base',
      },
    });
  } catch {
    return NextResponse.json({ data: null });
  }
}
