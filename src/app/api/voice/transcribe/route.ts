/**
 * POST /api/voice/transcribe
 *
 * Proxy endpoint — receives audio from the browser, forwards to the
 * Cloudflare Workers AI Whisper endpoint. This avoids CORS entirely
 * because the frontend stays on the same domain.
 *
 * Flow: Browser mic → FormData → this proxy → Cloudflare Whisper → text
 *
 * Auth: httpOnly session cookie (same as all other API routes).
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/api/middleware/auth";

const SITES_API_URL = process.env.LOCALGENIUS_SITES_URL || "https://localgenius-sites.pages.dev";
const SITES_API_TOKEN = process.env.LOCALGENIUS_SITES_API_TOKEN;

export async function POST(request: NextRequest) {
  // Verify the user is authenticated
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    // Read the audio from the request
    const contentType = request.headers.get("content-type") || "";
    let audioBody: FormData | ArrayBuffer;

    if (contentType.includes("multipart/form-data")) {
      // Forward FormData as-is
      const formData = await request.formData();
      const audioFile = formData.get("audio");

      if (!audioFile || !(audioFile instanceof File)) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "Missing 'audio' file" } },
          { status: 400 },
        );
      }

      // Rebuild FormData for the upstream request
      const upstreamForm = new FormData();
      upstreamForm.append("audio", audioFile, audioFile.name);
      audioBody = upstreamForm;
    } else {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Send multipart/form-data with 'audio' field" } },
        { status: 400 },
      );
    }

    // Forward to Cloudflare Whisper endpoint
    const headers: Record<string, string> = {};
    if (SITES_API_TOKEN) {
      headers["Authorization"] = `Bearer ${SITES_API_TOKEN}`;
    }

    const upstream = await fetch(`${SITES_API_URL}/api/voice/transcribe`, {
      method: "POST",
      body: audioBody as FormData,
      headers,
    });

    if (!upstream.ok) {
      const errorBody = await upstream.text();
      console.error("[voice] Upstream error:", upstream.status, errorBody);
      return NextResponse.json(
        { error: { code: "TRANSCRIPTION_FAILED", message: "I couldn't make that out. Want to try again or type it?" } },
        { status: 502 },
      );
    }

    const result = await upstream.json();

    return NextResponse.json({
      data: {
        text: result.text || "",
        durationMs: result.duration_ms || 0,
        wordCount: result.word_count || 0,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    console.error("[voice] Error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "I couldn't make that out. Want to try again or type it?" } },
      { status: 500 },
    );
  }
}
