import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { businesses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyAuth } from "@/api/middleware/auth";

const addPhotoSchema = z.object({
  url: z.string().url(),
  altText: z.string().max(200).optional(),
});

const removePhotoSchema = z.object({
  url: z.string().url(),
});

/**
 * POST /api/business/photos — add a photo to the business profile.
 * Stores as URL (R2 upload handled separately, or external URL).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const validated = addPhotoSchema.parse(body);

    const [biz] = await db
      .select({ photos: businesses.photos })
      .from(businesses)
      .where(and(eq(businesses.id, auth.businessId), eq(businesses.organizationId, auth.organizationId)))
      .limit(1);

    if (!biz) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Business not found" } }, { status: 404 });
    }

    const currentPhotos = (biz.photos as string[]) || [];
    if (currentPhotos.length >= 20) {
      return NextResponse.json({ error: { code: "LIMIT_REACHED", message: "Maximum 20 photos" } }, { status: 400 });
    }

    const updatedPhotos = [...currentPhotos, validated.url];

    await db
      .update(businesses)
      .set({ photos: updatedPhotos, updatedAt: new Date() })
      .where(and(eq(businesses.id, auth.businessId), eq(businesses.organizationId, auth.organizationId)));

    return NextResponse.json({
      data: { photos: updatedPhotos, count: updatedPhotos.length },
      meta: { timestamp: new Date().toISOString() },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid photo data", details: error.errors } }, { status: 400 });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Photo upload failed" } }, { status: 500 });
  }
}

/**
 * DELETE /api/business/photos — remove a photo by URL.
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const validated = removePhotoSchema.parse(body);

    const [biz] = await db
      .select({ photos: businesses.photos })
      .from(businesses)
      .where(and(eq(businesses.id, auth.businessId), eq(businesses.organizationId, auth.organizationId)))
      .limit(1);

    if (!biz) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Business not found" } }, { status: 404 });
    }

    const currentPhotos = (biz.photos as string[]) || [];
    const updatedPhotos = currentPhotos.filter((p) => p !== validated.url);

    if (updatedPhotos.length === currentPhotos.length) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Photo not found" } }, { status: 404 });
    }

    await db
      .update(businesses)
      .set({ photos: updatedPhotos, updatedAt: new Date() })
      .where(and(eq(businesses.id, auth.businessId), eq(businesses.organizationId, auth.organizationId)));

    return NextResponse.json({
      data: { photos: updatedPhotos, count: updatedPhotos.length, removed: validated.url },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid request", details: error.errors } }, { status: 400 });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Photo removal failed" } }, { status: 500 });
  }
}
