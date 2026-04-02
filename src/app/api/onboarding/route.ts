import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { businesses, conversations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyAuth } from "@/api/middleware/auth";

const updateSchema = z.object({
  step: z.enum(["confirm", "photos", "priority", "complete"]),
  data: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const validated = updateSchema.parse(body);

    const where = and(eq(businesses.id, auth.businessId), eq(businesses.organizationId, auth.organizationId));

    switch (validated.step) {
      case "confirm": {
        const updates = validated.data as Record<string, string> | undefined;
        if (updates) await db.update(businesses).set({ address: updates.address, phone: updates.phone, updatedAt: new Date() }).where(where);
        break;
      }
      case "priority": {
        const focus = (validated.data as { focus?: string })?.focus;
        if (focus) await db.update(businesses).set({ priorityFocus: focus as "found_online" | "reviews" | "social", updatedAt: new Date() }).where(where);
        break;
      }
      case "complete": {
        await db.update(businesses).set({ onboardingCompletedAt: new Date(), updatedAt: new Date() }).where(where);
        break;
      }
    }

    return NextResponse.json({ data: { step: validated.step, status: "completed" }, meta: { timestamp: new Date().toISOString() } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid data", details: error.errors } }, { status: 400 });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Onboarding step failed" } }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  const [biz] = await db.select().from(businesses).where(and(eq(businesses.id, auth.businessId), eq(businesses.organizationId, auth.organizationId))).limit(1);
  const [convo] = await db.select().from(conversations).where(eq(conversations.businessId, auth.businessId)).limit(1);

  return NextResponse.json({
    data: {
      business: biz ? { id: biz.id, name: biz.name, vertical: biz.vertical, city: biz.city, onboardingCompleted: !!biz.onboardingCompletedAt, priorityFocus: biz.priorityFocus } : null,
      conversationId: convo?.id || null,
    },
    meta: { timestamp: new Date().toISOString() },
  });
}
