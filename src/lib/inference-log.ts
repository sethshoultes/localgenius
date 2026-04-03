/**
 * Inference Logging — Jensen Issue #8
 *
 * Logs every AI call with model, tokens, latency, success/failure.
 * Non-blocking: logging failures never break the AI call.
 */

import { db } from "@/lib/db";
import { inferenceLogs } from "@/db/schema";

interface InferenceLogEntry {
  model: string;
  provider: string;
  taskType?: string;
  tokensInput?: number;
  tokensOutput?: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  businessId?: string;
}

/**
 * Log an inference call. Fire-and-forget — never throws.
 */
export async function logInference(entry: InferenceLogEntry): Promise<void> {
  try {
    await db.insert(inferenceLogs).values({
      model: entry.model,
      provider: entry.provider,
      taskType: entry.taskType,
      tokensInput: entry.tokensInput,
      tokensOutput: entry.tokensOutput,
      latencyMs: entry.latencyMs,
      success: entry.success,
      errorMessage: entry.errorMessage,
      businessId: entry.businessId,
    });
  } catch {
    // Never block AI calls on logging failures
  }
}

/**
 * Wrap an async function with inference logging.
 * Measures latency, catches errors, logs everything.
 */
export async function withInferenceLog<T>(
  meta: { model: string; provider: string; taskType?: string; businessId?: string },
  fn: () => Promise<T>,
  extractTokens?: (result: T) => { input?: number; output?: number }
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const latencyMs = Date.now() - start;
    const tokens = extractTokens?.(result);
    logInference({
      ...meta,
      latencyMs,
      success: true,
      tokensInput: tokens?.input,
      tokensOutput: tokens?.output,
    });
    return result;
  } catch (error) {
    const latencyMs = Date.now() - start;
    logInference({
      ...meta,
      latencyMs,
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
