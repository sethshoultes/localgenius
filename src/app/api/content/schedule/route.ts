import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/api/middleware/auth";
import { schedule, getUpcoming, cancel } from "@/services/content-scheduler";

const scheduleSchema = z.object({
  platform: z.enum(["instagram", "facebook"]),
  topic: z.string().min(1),
  scheduledFor: z.string().datetime(),
  content: z.string().optional(),
  mediaUrls: z.array(z.string().url()).optional(),
});

const cancelSchema = z.object({
  postId: z.string().uuid(),
});

/**
 * POST /api/content/schedule — schedule a social post for future publication
 * GET /api/content/schedule — list upcoming scheduled posts
 * DELETE /api/content/schedule — cancel a scheduled post
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const validated = scheduleSchema.parse(body);

    const scheduledDate = new Date(validated.scheduledFor);
    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: { code: "INVALID_SCHEDULE", message: "Scheduled time must be in the future" } },
        { status: 400 }
      );
    }

    const result = await schedule({
      businessId: auth.businessId,
      organizationId: auth.organizationId,
      platform: validated.platform,
      topic: validated.topic,
      scheduledFor: scheduledDate,
      content: validated.content,
      mediaUrls: validated.mediaUrls,
    });

    return NextResponse.json(
      { data: { scheduledPost: result }, meta: { timestamp: new Date().toISOString() } },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid schedule request", details: error.errors } },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Scheduling failed";
    return NextResponse.json(
      { error: { code: "SCHEDULE_ERROR", message } },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  const upcoming = await getUpcoming(auth.businessId, auth.organizationId);

  return NextResponse.json({
    data: { scheduledPosts: upcoming, count: upcoming.length },
    meta: { timestamp: new Date().toISOString() },
  });
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const validated = cancelSchema.parse(body);

    const cancelled = await cancel(validated.postId, auth.businessId);

    if (!cancelled) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Scheduled post not found or already published" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: { cancelled: true, postId: validated.postId },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid request", details: error.errors } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Cancellation failed" } },
      { status: 500 }
    );
  }
}
