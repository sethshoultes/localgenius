import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateWebsite } from "@/services/website-generator";

/**
 * GET /api/website/:businessId
 * Serves the generated static site for a business.
 *
 * Public endpoint — this is the URL Maria shares with customers.
 * In production: served from Cloudflare Pages with a custom domain.
 * For v1: dynamically generated from business data.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params;

    const [biz] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!biz || biz.deletedAt) {
      return new NextResponse(
        "<html><body><h1>Site not found</h1></body></html>",
        { status: 404, headers: { "Content-Type": "text/html" } }
      );
    }

    // Generate the site on-the-fly from current business data
    // In production: cache this and regenerate on content updates
    const site = await generateWebsite(biz.id, biz.organizationId, {
      name: biz.name,
      vertical: biz.vertical,
      city: biz.city,
      state: biz.state,
      address: biz.address,
      phone: biz.phone,
    });

    return new NextResponse(site.html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    return new NextResponse(
      "<html><body><h1>Something went wrong</h1><p>We're working on it.</p></body></html>",
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
}
