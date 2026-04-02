import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { businesses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyAuth } from "@/api/middleware/auth";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().max(1000).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  hours: z.record(z.string()).optional(),
  websiteUrl: z.string().url().optional().nullable(),
  socialLinks: z.object({
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    yelp: z.string().optional(),
    google: z.string().optional(),
  }).optional(),
  timezone: z.string().optional(),
  employeeCount: z.number().int().positive().optional(),
}).partial();

/**
 * GET /api/business
 * Returns the full business profile for the authenticated user.
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  const [biz] = await db
    .select()
    .from(businesses)
    .where(
      and(
        eq(businesses.id, auth.businessId),
        eq(businesses.organizationId, auth.organizationId)
      )
    )
    .limit(1);

  if (!biz) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Business not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    data: {
      business: {
        id: biz.id,
        name: biz.name,
        vertical: biz.vertical,
        description: biz.description,
        phone: biz.phone,
        email: biz.email,
        address: biz.address,
        city: biz.city,
        state: biz.state,
        hours: biz.hours,
        websiteUrl: biz.websiteUrl,
        socialLinks: biz.socialLinks,
        photos: biz.photos,
        employeeCount: biz.employeeCount,
        timezone: biz.timezone,
        priorityFocus: biz.priorityFocus,
        autonomyLevel: biz.autonomyLevel,
        onboardingCompleted: !!biz.onboardingCompletedAt,
        createdAt: biz.createdAt,
      },
    },
    meta: { timestamp: new Date().toISOString() },
  });
}

/**
 * PUT /api/business
 * Updates business profile fields. Partial — only updates included fields.
 * Used by: the AI when Maria says "update my hours", and the settings UI.
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const validated = updateSchema.parse(body);

    // Build update object — only include non-undefined fields
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (validated.name !== undefined) updates.name = validated.name;
    if (validated.description !== undefined) updates.description = validated.description;
    if (validated.phone !== undefined) updates.phone = validated.phone;
    if (validated.email !== undefined) updates.email = validated.email;
    if (validated.address !== undefined) updates.address = validated.address;
    if (validated.hours !== undefined) updates.hours = validated.hours;
    if (validated.websiteUrl !== undefined) updates.websiteUrl = validated.websiteUrl;
    if (validated.socialLinks !== undefined) updates.socialLinks = validated.socialLinks;
    if (validated.timezone !== undefined) updates.timezone = validated.timezone;
    if (validated.employeeCount !== undefined) updates.employeeCount = validated.employeeCount;

    await db
      .update(businesses)
      .set(updates)
      .where(
        and(
          eq(businesses.id, auth.businessId),
          eq(businesses.organizationId, auth.organizationId)
        )
      );

    // Fetch updated record
    const [updated] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, auth.businessId))
      .limit(1);

    return NextResponse.json({
      data: {
        updated: true,
        business: {
          id: updated.id,
          name: updated.name,
          description: updated.description,
          phone: updated.phone,
          email: updated.email,
          address: updated.address,
          hours: updated.hours,
          websiteUrl: updated.websiteUrl,
          socialLinks: updated.socialLinks,
          photos: updated.photos,
        },
        fieldsUpdated: Object.keys(validated).filter((k) => (validated as Record<string, unknown>)[k] !== undefined),
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid business data", details: error.errors } },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
