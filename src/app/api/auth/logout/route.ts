import { NextResponse } from "next/server";

const COOKIE_NAME = "lg_session";

/**
 * POST /api/auth/logout
 * Clears the auth cookie. Client-side redirect to /login handled by useAuth().
 */
export async function POST() {
  const response = NextResponse.json({
    data: { loggedOut: true },
    meta: { timestamp: new Date().toISOString() },
  });

  // Clear the session cookie
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0, // expire immediately
  });

  return response;
}
