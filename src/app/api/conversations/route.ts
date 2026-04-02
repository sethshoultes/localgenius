import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { conversations, messages } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { verifyAuth } from "@/api/middleware/auth";

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  const [convo] = await db.select().from(conversations)
    .where(and(eq(conversations.businessId, auth.businessId), eq(conversations.organizationId, auth.organizationId)))
    .limit(1);

  if (!convo) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "No conversation found" } }, { status: 404 });
  }

  const recentMessages = await db.select().from(messages)
    .where(and(eq(messages.conversationId, convo.id), eq(messages.organizationId, auth.organizationId)))
    .orderBy(desc(messages.createdAt))
    .limit(50);

  return NextResponse.json({
    data: {
      conversation: { id: convo.id, businessId: convo.businessId, createdAt: convo.createdAt },
      messages: recentMessages.reverse(),
    },
    meta: { timestamp: new Date().toISOString() },
  });
}
