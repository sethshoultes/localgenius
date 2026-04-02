import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, businesses, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/password";
import { issueAccessToken, issueRefreshToken } from "@/api/middleware/auth";

const loginSchema = z.object({ email: z.string().email(), password: z.string() });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = loginSchema.parse(body);

    const [user] = await db.select().from(users).where(eq(users.email, validated.email)).limit(1);
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: { code: "AUTH_FAILED", message: "Invalid credentials" } }, { status: 401 });
    }

    const valid = await verifyPassword(validated.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: { code: "AUTH_FAILED", message: "Invalid credentials" } }, { status: 401 });
    }

    const [biz] = await db.select().from(businesses).where(eq(businesses.id, user.businessId)).limit(1);
    const [org] = await db.select().from(organizations).where(eq(organizations.id, user.organizationId)).limit(1);
    await db.update(users).set({ lastActiveAt: new Date() }).where(eq(users.id, user.id));

    const authContext = {
      userId: user.id,
      organizationId: user.organizationId,
      businessId: user.businessId,
      plan: (org?.plan || "base") as "base" | "pro" | "franchise",
    };

    const [accessToken, refreshToken] = await Promise.all([
      issueAccessToken(authContext),
      issueRefreshToken(user.id),
    ]);

    return NextResponse.json({
      data: {
        user: { id: user.id, email: user.email, name: user.name },
        business: biz ? { id: biz.id, name: biz.name } : null,
        accessToken, refreshToken,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid login data", details: error.errors } }, { status: 400 });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Login failed" } }, { status: 500 });
  }
}
