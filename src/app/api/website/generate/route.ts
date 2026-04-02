import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { businesses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyAuth } from "@/api/middleware/auth";
import { generateWebsite } from "@/services/website-generator";

const generateSchema = z.object({
  description: z.string().optional(),
  photos: z.array(z.string().url()).optional(),
  hours: z.record(z.string()).optional(),
});

/**
 * POST /api/website/generate
 * Generates a complete static website for the authenticated business.
 * This is the onboarding Step 5 — "The Reveal."
 *
 * Returns the generated HTML + metadata. The site is immediately live.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const validated = generateSchema.parse(body);

    const [biz] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, auth.businessId))
      .limit(1);

    if (!biz) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Business not found" } },
        { status: 404 }
      );
    }

    const site = await generateWebsite(auth.businessId, auth.organizationId, {
      name: biz.name,
      vertical: biz.vertical,
      city: biz.city,
      state: biz.state,
      address: biz.address,
      phone: biz.phone,
      description: validated.description,
      photos: validated.photos,
      hours: validated.hours,
    });

    return NextResponse.json(
      {
        data: {
          site: {
            html: site.html,
            metadata: site.metadata,
            previewUrl: `/api/website/${auth.businessId}`,
          },
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: error.errors } },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Website generation failed";
    return NextResponse.json(
      { error: { code: "GENERATION_FAILED", message } },
      { status: 500 }
    );
  }
}
