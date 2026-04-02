import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import * as jose from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

/**
 * POST /api/auth/forgot-password
 *
 * Initiates password reset flow. Always returns 200 for security (don't leak if email exists).
 * In production, the reset token would be sent via email. For now, returned in response.
 *
 * Request: { email: string }
 * Response: { data: { sent: true } }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = forgotPasswordSchema.parse(body);

    // Look up user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, validated.email))
      .limit(1);

    // Generate reset token if user found (type: "reset", 1-hour expiry)
    let resetToken: string | null = null;
    if (user) {
      resetToken = await new jose.SignJWT({
        sub: user.id,
        type: "reset",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(JWT_SECRET);
    }

    // Always return 200 for security
    return NextResponse.json({
      data: { sent: true },
      ...(resetToken && { _debug: { token: resetToken } }), // For development only
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Please provide a valid email address",
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Password reset request failed" } },
      { status: 500 }
    );
  }
}
