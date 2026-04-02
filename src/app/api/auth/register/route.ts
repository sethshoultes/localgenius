import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { organizations, businesses, users, conversations } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { issueAccessToken, issueRefreshToken } from "@/api/middleware/auth";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  businessName: z.string().min(1),
  businessType: z
    .enum(["restaurant", "salon", "dental", "medical", "home_services", "fitness", "retail", "other"])
    .default("restaurant"),
  city: z.string().min(1),
  state: z.string().min(2).max(2),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = registerSchema.parse(body);
    const passwordHash = await hashPassword(validated.password);

    const [org] = await db.insert(organizations).values({ name: validated.businessName }).returning();

    const [biz] = await db.insert(businesses).values({
      organizationId: org.id,
      name: validated.businessName,
      vertical: validated.businessType,
      city: validated.city,
      state: validated.state,
    }).returning();

    const [user] = await db.insert(users).values({
      organizationId: org.id,
      businessId: biz.id,
      email: validated.email,
      name: validated.name,
      passwordHash,
      consentAt: new Date(),
    }).returning();

    await db.insert(conversations).values({ businessId: biz.id, organizationId: org.id });

    const authContext = {
      userId: user.id,
      organizationId: org.id,
      businessId: biz.id,
      plan: org.plan as "base" | "pro" | "franchise",
    };

    const [accessToken, refreshToken] = await Promise.all([
      issueAccessToken(authContext),
      issueRefreshToken(user.id),
    ]);

    return NextResponse.json({
      data: {
        user: { id: user.id, email: user.email, name: user.name },
        business: { id: biz.id, name: biz.name, vertical: biz.vertical },
        organization: { id: org.id, plan: org.plan },
        accessToken,
        refreshToken,
      },
      meta: { timestamp: new Date().toISOString() },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid registration data", details: error.errors } }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message } }, { status: 500 });
  }
}
