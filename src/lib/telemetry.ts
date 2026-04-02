/**
 * OpenTelemetry Setup — Observability infrastructure
 * Spec: engineering/infrastructure.md
 *
 * Dev: console exporters. Prod: OTLP (Datadog, Grafana, etc.).
 */

import { trace, metrics, Span, SpanStatusCode, Attributes } from "@opentelemetry/api";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { SimpleSpanProcessor, ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
  ConsoleMetricExporter,
} from "@opentelemetry/sdk-metrics";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { Resource } from "@opentelemetry/resources";

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || "localgenius";
const IS_PROD = process.env.NODE_ENV === "production";
const OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

// ─── Resource ────────────────────────────────────────────────────────────────

const resource = new Resource({
  "service.name": SERVICE_NAME,
  "service.version": process.env.npm_package_version || "0.1.0",
  "deployment.environment": process.env.NODE_ENV || "development",
});

// ─── Traces ──────────────────────────────────────────────────────────────────

const tracerProvider = new NodeTracerProvider({ resource });

if (IS_PROD && OTLP_ENDPOINT) {
  tracerProvider.addSpanProcessor(
    new SimpleSpanProcessor(
      new OTLPTraceExporter({ url: `${OTLP_ENDPOINT}/v1/traces` })
    )
  );
} else {
  tracerProvider.addSpanProcessor(
    new SimpleSpanProcessor(new ConsoleSpanExporter())
  );
}

tracerProvider.register();

// ─── Metrics ─────────────────────────────────────────────────────────────────

const metricReader = new PeriodicExportingMetricReader({
  exporter:
    IS_PROD && OTLP_ENDPOINT
      ? new OTLPMetricExporter({ url: `${OTLP_ENDPOINT}/v1/metrics` })
      : new ConsoleMetricExporter(),
  exportIntervalMillis: IS_PROD ? 60_000 : 10_000,
});

const meterProvider = new MeterProvider({ resource, readers: [metricReader] });
metrics.setGlobalMeterProvider(meterProvider);

// ─── Named instances ─────────────────────────────────────────────────────────

export const tracer = trace.getTracer(SERVICE_NAME);
export const meter = metrics.getMeter(SERVICE_NAME);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Start a span for manual instrumentation.
 * Returns the span — caller is responsible for calling span.end().
 */
export function startSpan(name: string, attributes?: Attributes): Span {
  return tracer.startSpan(name, { attributes });
}

/**
 * Record a gauge-style metric value.
 */
export function recordMetric(
  name: string,
  value: number,
  attributes?: Attributes
): void {
  const histogram = meter.createHistogram(name);
  histogram.record(value, attributes);
}

/**
 * Record a duration metric from a start time (ms since epoch or performance.now()).
 */
export function recordDuration(
  name: string,
  startTime: number,
  attributes?: Attributes
): void {
  const duration = Date.now() - startTime;
  const histogram = meter.createHistogram(name, { unit: "ms" });
  histogram.record(duration, attributes);
}

export { SpanStatusCode };
export type { Attributes };
