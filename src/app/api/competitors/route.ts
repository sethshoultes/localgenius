import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/api/middleware/auth";
import {
  addCompetitor,
  removeCompetitor,
  getCompetitors,
} from "@/services/competitor-monitor";

/**
 * GET /api/competitors — List tracked competitors for the authenticated business.
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  const comps = await getCompetitors(auth.businessId);

  return NextResponse.json({
    data: {
      competitors: comps.map((c) => ({
        id: c.id,
        competitorName: c.competitorName,
        googlePlaceId: c.googlePlaceId,
        googleRating: c.googleRating ? Number(c.googleRating) : null,
        googleReviewCount: c.googleReviewCount,
        lastRating: c.lastRating ? Number(c.lastRating) : null,
        lastReviewCount: c.lastReviewCount,
        ratingDelta:
          c.googleRating && c.lastRating
            ? Number(c.googleRating) - Number(c.lastRating)
            : null,
        reviewCountDelta:
          c.googleReviewCount != null && c.lastReviewCount != null
            ? c.googleReviewCount - c.lastReviewCount
            : null,
        lastCheckedAt: c.lastCheckedAt,
        createdAt: c.createdAt,
      })),
    },
    meta: { timestamp: new Date().toISOString() },
  });
}

/**
 * POST /api/competitors — Add a competitor to track.
 * Body: { name: string, googlePlaceId?: string }
 * If no googlePlaceId, searches by name + business city.
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { name, googlePlaceId } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Competitor name is required",
        },
      },
      { status: 400 }
    );
  }

  try {
    const competitor = await addCompetitor(
      auth.businessId,
      auth.organizationId,
      name.trim(),
      googlePlaceId
    );

    return NextResponse.json(
      {
        data: { competitor },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 201 }
    );
  } catch (error) {
    // Handle unique constraint violation (duplicate place_id for business)
    if (
      error instanceof Error &&
      error.message.includes("unique")
    ) {
      return NextResponse.json(
        {
          error: {
            code: "DUPLICATE",
            message: "This competitor is already being tracked",
          },
        },
        { status: 409 }
      );
    }
    throw error;
  }
}

/**
 * DELETE /api/competitors — Remove a tracked competitor.
 * Query param: id (competitor UUID)
 */
export async function DELETE(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  const competitorId = request.nextUrl.searchParams.get("id");

  if (!competitorId) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Competitor id is required as a query parameter",
        },
      },
      { status: 400 }
    );
  }

  const removed = await removeCompetitor(competitorId, auth.businessId);

  if (!removed) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Competitor not found or not owned by this business",
        },
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    data: { deleted: true },
    meta: { timestamp: new Date().toISOString() },
  });
}
