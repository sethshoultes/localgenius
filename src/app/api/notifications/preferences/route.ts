import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/api/middleware/auth";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  getNotificationTypes,
} from "@/services/notification-preferences";

const channelSchema = z.object({
  email: z.boolean(),
  sms: z.boolean(),
  push: z.boolean(),
});

const updateSchema = z.record(channelSchema);

/**
 * GET /api/notifications/preferences
 * Returns current notification preferences + available types.
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  const preferences = await getNotificationPreferences(auth.businessId);
  const types = getNotificationTypes();

  return NextResponse.json({
    data: { preferences, availableTypes: types },
    meta: { timestamp: new Date().toISOString() },
  });
}

/**
 * PUT /api/notifications/preferences
 * Update notification preferences. Partial — only updates included types.
 *
 * Body: { "negative_review": { "email": true, "sms": true, "push": false }, ... }
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const validated = updateSchema.parse(body) as Record<string, { email: boolean; sms: boolean; push: boolean }>;

    const updated = await updateNotificationPreferences(
      auth.businessId,
      auth.organizationId,
      validated
    );

    return NextResponse.json({
      data: { preferences: updated },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid preferences", details: error.errors } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Update failed" } },
      { status: 500 }
    );
  }
}
