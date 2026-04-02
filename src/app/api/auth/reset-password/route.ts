import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/password";
import * as jose from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * POST /api/auth/reset-password
 *
 * Validates reset token and updates user password.
 *
 * Request: { token: string, password: string }
 * Response: { data: { reset: true } }
 * Error (401): Invalid or expired token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = resetPasswordSchema.parse(body);

    // Verify reset token (must have type: "reset", not expired)
    let payload: jose.JWTPayload;
    try {
      const result = await jose.jwtVerify(validated.token, JWT_SECRET);
      payload = result.payload;
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_TOKEN", message: "Password reset link expired or invalid" } },
        { status: 401 }
      );
    }

    // Validate token structure
    if (payload.type !== "reset" || !payload.sub) {
      return NextResponse.json(
        { error: { code: "INVALID_TOKEN", message: "Password reset link expired or invalid" } },
        { status: 401 }
      );
    }

    const userId = payload.sub as string;

    // Hash new password
    const passwordHash = await hashPassword(validated.password);

    // Update user password
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return NextResponse.json({
      data: { reset: true },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Password must be at least 8 characters",
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Password reset failed" } },
      { status: 500 }
    );
  }
}
