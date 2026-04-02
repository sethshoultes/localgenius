import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { conversations, messages, businesses } from "@/db/schema";
import { eq, and, desc, lt } from "drizzle-orm";
import { verifyAuth } from "@/api/middleware/auth";
import { generate, stream } from "@/services/ai";

const sendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
  stream: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (auth instanceof NextResponse) return auth;
    const { id: conversationId } = await params;
    const body = await request.json();
    const validated = sendMessageSchema.parse(body);

    // Verify conversation ownership
    const [convo] = await db.select().from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.organizationId, auth.organizationId)))
      .limit(1);
    if (!convo) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Conversation not found" } }, { status: 404 });
    }

    // Load business context for AI
    const [biz] = await db.select().from(businesses).where(eq(businesses.id, auth.businessId)).limit(1);

    // Store owner message
    const [ownerMsg] = await db.insert(messages).values({
      conversationId,
      businessId: auth.businessId,
      organizationId: auth.organizationId,
      role: "owner",
      contentType: "text",
      content: { text: validated.content },
    }).returning();

    // Load recent history for context
    const history = await db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(10);

    const historyText = history.reverse()
      .map((m) => `${m.role}: ${(m.content as { text?: string })?.text || ""}`)
      .join("\n");

    const prompt = `Previous conversation:\n${historyText}\n\nOwner's latest message: "${validated.content}"\n\nRespond helpfully as LocalGenius, their AI marketing assistant.`;
    const businessContext = biz ? { name: biz.name, vertical: biz.vertical, city: biz.city, state: biz.state } : undefined;

    // SSE streaming mode — delivers typewriter effect to frontend
    if (validated.stream || request.headers.get("accept") === "text/event-stream") {
      const encoder = new TextEncoder();
      let fullContent = "";

      const readable = new ReadableStream({
        async start(controller) {
          try {
            const chunks = stream({ prompt, businessContext });

            for await (const chunk of chunks) {
              fullContent += chunk;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`)
              );
            }

            // Store the complete assistant message
            const [assistantMsg] = await db.insert(messages).values({
              conversationId,
              businessId: auth.businessId,
              organizationId: auth.organizationId,
              role: "assistant",
              contentType: "text",
              content: { text: fullContent },
              aiModel: "claude-sonnet-4-20250514",
            }).returning();

            // Send the complete message object
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                message: {
                  id: assistantMsg.id,
                  conversationId,
                  role: "assistant",
                  content: fullContent,
                  type: "text",
                  createdAt: assistantMsg.createdAt?.toISOString(),
                },
              })}\n\n`)
            );
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                error: error instanceof Error ? error.message : "Stream failed",
              })}\n\n`)
            );
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming fallback
    const aiResponse = await generate({
      prompt,
      businessContext,
    });

    const [assistantMsg] = await db.insert(messages).values({
      conversationId,
      businessId: auth.businessId,
      organizationId: auth.organizationId,
      role: "assistant",
      contentType: "text",
      content: { text: aiResponse },
      aiModel: "claude-sonnet-4-20250514",
    }).returning();

    return NextResponse.json({ data: { ownerMessage: ownerMsg, assistantMessage: assistantMsg }, meta: { timestamp: new Date().toISOString() } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid message", details: error.errors } }, { status: 400 });
    }
    console.error("[messages] Error:", error);
    const cause = (error as { cause?: Error })?.cause;
    if (cause) console.error("[messages] Cause:", cause.message);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to send message" } }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id: conversationId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const before = searchParams.get("before");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

  const conditions = [
    eq(messages.conversationId, conversationId),
    eq(messages.organizationId, auth.organizationId),
  ];
  if (before) conditions.push(lt(messages.createdAt, new Date(before)));

  const results = await db.select().from(messages)
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(limit + 1);

  const hasMore = results.length > limit;
  const pageMessages = hasMore ? results.slice(0, limit) : results;

  return NextResponse.json({
    data: { messages: pageMessages.reverse(), pagination: { hasMore, nextCursor: hasMore ? pageMessages[0]?.createdAt?.toISOString() : null } },
    meta: { timestamp: new Date().toISOString() },
  });
}
