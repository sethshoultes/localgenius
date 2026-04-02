/**
 * Telemetry Middleware — auto-instruments API route handlers.
 *
 * Records request duration, status codes, error counts.
 * For AI endpoints, additionally tracks generation metrics.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  tracer,
  meter,
  recordDuration,
  SpanStatusCode,
  type Attributes,
} from "@/lib/telemetry";

// ─── Metric instruments (created once, reused) ──────────────────────────────

const requestDuration = meter.createHistogram("http.request.duration", {
  description: "HTTP request duration in ms",
  unit: "ms",
});

const errorCounter = meter.createCounter("api.error.count", {
  description: "Count of 4xx/5xx API responses",
});

const aiDuration = meter.createHistogram("ai.generation.duration", {
  description: "Time spent in Claude API in ms",
  unit: "ms",
});

const aiTokensInput = meter.createHistogram("ai.generation.tokens_input", {
  description: "Input tokens per AI generation",
});

const aiTokensOutput = meter.createHistogram("ai.generation.tokens_output", {
  description: "Output tokens per AI generation",
});

// ─── Types ───────────────────────────────────────────────────────────────────

type RouteHandler = (
  request: NextRequest,
  context?: unknown
) => Promise<NextResponse> | NextResponse;

export interface AIMetrics {
  durationMs: number;
  tokensInput: number;
  tokensOutput: number;
  model: string;
}

/**
 * Wraps an API route handler with automatic telemetry.
 *
 * Usage:
 *   export const GET = withTelemetry(async (request) => { ... });
 */
export function withTelemetry(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, context?: unknown) => {
    const startTime = Date.now();
    const method = request.method;
    const path = request.nextUrl.pathname;

    const span = tracer.startSpan(`${method} ${path}`, {
      attributes: {
        "http.request.method": method,
        "http.request.path": path,
      },
    });

    let response: NextResponse;
    try {
      response = await handler(request, context);
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      span.end();

      errorCounter.add(1, {
        "http.request.method": method,
        "http.request.path": path,
        "http.request.status_code": 500,
      });

      requestDuration.record(Date.now() - startTime, {
        "http.request.method": method,
        "http.request.path": path,
        "http.request.status_code": 500,
      });

      throw error;
    }

    const statusCode = response.status;
    const attrs: Attributes = {
      "http.request.method": method,
      "http.request.path": path,
      "http.request.status_code": statusCode,
    };

    span.setAttribute("http.request.status_code", statusCode);

    // Record request duration
    requestDuration.record(Date.now() - startTime, attrs);

    // Count errors
    if (statusCode >= 400) {
      errorCounter.add(1, attrs);
      span.setStatus({ code: SpanStatusCode.ERROR });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }

    span.end();
    return response;
  };
}

/**
 * Report AI generation metrics from within a route handler.
 * Call this after a Claude API call completes.
 *
 * Usage:
 *   const result = await generate({ prompt });
 *   reportAIMetrics({ durationMs: 1200, tokensInput: 500, tokensOutput: 200, model: "claude-sonnet-4-20250514" });
 */
export function reportAIMetrics(m: AIMetrics): void {
  const attrs: Attributes = { "ai.generation.model": m.model };

  aiDuration.record(m.durationMs, attrs);
  aiTokensInput.record(m.tokensInput, attrs);
  aiTokensOutput.record(m.tokensOutput, attrs);
}
