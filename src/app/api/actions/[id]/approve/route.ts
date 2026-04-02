import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { actions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyAuth } from "@/api/middleware/auth";
import { publishPost } from "@/services/social";

/**
 * POST /api/actions/:id/approve
 * Approve a proposed action. Triggers execution (e.g., publish social post).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id: actionId } = await params;

    const [action] = await db
      .select()
      .from(actions)
      .where(
        and(
          eq(actions.id, actionId),
          eq(actions.organizationId, auth.organizationId),
          eq(actions.status, "proposed")
        )
      )
      .limit(1);

    if (!action) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Action not found or already processed" } },
        { status: 404 }
      );
    }

    // Approve the action
    await db
      .update(actions)
      .set({
        status: "approved",
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(actions.id, actionId));

    // Execute based on action type
    let executionResult: Record<string, unknown> = {};

    if (action.actionType === "social_post") {
      const content = action.content as { text?: string; platform?: string };
      const platform = (content.platform || "instagram") as "instagram" | "facebook";

      const result = await publishPost(auth.businessId, platform, {
        text: content.text || "",
      });

      executionResult = {
        published: result.success,
        postUrl: result.postUrl,
        live: result.live,
      };

      await db
        .update(actions)
        .set({
          status: result.success ? "completed" : "failed",
          executedAt: new Date(),
          externalId: result.id,
          externalPlatform: platform,
          errorDetails: result.error ? { error: result.error } : undefined,
          updatedAt: new Date(),
        })
        .where(eq(actions.id, actionId));
    } else {
      // For non-social actions (review responses, etc.), mark as completed
      await db
        .update(actions)
        .set({
          status: "completed",
          executedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(actions.id, actionId));

      executionResult = { executed: true };
    }

    return NextResponse.json({
      data: {
        actionId,
        status: "completed",
        ...executionResult,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Approval failed";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
