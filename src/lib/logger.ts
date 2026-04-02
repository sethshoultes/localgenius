/**
 * Structured Logging Utility
 *
 * JSON format for log aggregation in production.
 * Pretty-print to console in development.
 *
 * Every log entry includes: timestamp, level, route, user_id,
 * business_id, duration_ms, error details.
 */

type LogLevel = "info" | "warn" | "error";

interface LogContext {
  route?: string;
  method?: string;
  userId?: string;
  businessId?: string;
  organizationId?: string;
  durationMs?: number;
  statusCode?: number;
  error?: string;
  stack?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  route?: string;
  method?: string;
  userId?: string;
  businessId?: string;
  organizationId?: string;
  durationMs?: number;
  statusCode?: number;
  error?: string;
  stack?: string;
  [key: string]: unknown;
}

const isDev = process.env.NODE_ENV !== "production";

function formatEntry(level: LogLevel, message: string, context: LogContext): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
}

function emit(entry: LogEntry) {
  if (isDev) {
    // Pretty-print in development
    const color = entry.level === "error" ? "\x1b[31m" : entry.level === "warn" ? "\x1b[33m" : "\x1b[36m";
    const reset = "\x1b[0m";
    const duration = entry.durationMs ? ` ${entry.durationMs}ms` : "";
    const status = entry.statusCode ? ` ${entry.statusCode}` : "";
    const route = entry.route ? ` ${entry.method || "GET"} ${entry.route}` : "";

    console.log(
      `${color}[${entry.level.toUpperCase()}]${reset}${route}${status}${duration} ${entry.message}`
    );

    if (entry.error) console.log(`  Error: ${entry.error}`);
    if (entry.stack && entry.level === "error") console.log(`  ${entry.stack.split("\n")[1]?.trim()}`);
  } else {
    // Structured JSON in production
    const output = JSON.stringify(entry);
    if (entry.level === "error") {
      console.error(output);
    } else if (entry.level === "warn") {
      console.warn(output);
    } else {
      console.log(output);
    }
  }
}

export const logger = {
  info(message: string, context: LogContext = {}) {
    emit(formatEntry("info", message, context));
  },

  warn(message: string, context: LogContext = {}) {
    emit(formatEntry("warn", message, context));
  },

  error(message: string, context: LogContext = {}) {
    emit(formatEntry("error", message, context));
  },
};

/**
 * Wrap an API route handler with automatic request/response logging.
 * Logs: method, route, status, duration, user context.
 */
export function withLogging<T extends (...args: unknown[]) => Promise<Response>>(
  handler: T,
  route: string
): T {
  return (async (...args: unknown[]) => {
    const start = Date.now();
    const request = args[0] as Request | undefined;
    const method = request?.method || "UNKNOWN";

    // Extract auth context from headers (set by middleware)
    const userId = request?.headers?.get?.("x-user-id") || undefined;
    const bizId = request?.headers?.get?.("x-biz-id") || undefined;
    const orgId = request?.headers?.get?.("x-org-id") || undefined;

    try {
      const response = await handler(...args);
      const durationMs = Date.now() - start;

      logger.info("Request completed", {
        route,
        method,
        userId,
        businessId: bizId,
        organizationId: orgId,
        statusCode: response.status,
        durationMs,
      });

      return response;
    } catch (err) {
      const durationMs = Date.now() - start;
      const error = err instanceof Error ? err : new Error(String(err));

      logger.error("Request failed", {
        route,
        method,
        userId,
        businessId: bizId,
        organizationId: orgId,
        statusCode: 500,
        durationMs,
        error: error.message,
        stack: error.stack,
      });

      throw err;
    }
  }) as T;
}
