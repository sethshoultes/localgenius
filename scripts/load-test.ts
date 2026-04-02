#!/usr/bin/env tsx
/**
 * LocalGenius Load Testing Script
 *
 * Dependency-free load tester using native Node.js fetch.
 * Run: npm run load-test -- --base-url http://localhost:3000 --token <jwt>
 */

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface CLIArgs {
  baseUrl: string;
  scenario: string;
  token: string;
  duration: number;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const opts: CLIArgs = {
    baseUrl: "http://localhost:3000",
    scenario: "all",
    token: "",
    duration: 30,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--base-url":
        opts.baseUrl = args[++i];
        break;
      case "--scenario":
        opts.scenario = args[++i];
        break;
      case "--token":
        opts.token = args[++i];
        break;
      case "--duration":
        opts.duration = parseInt(args[++i], 10);
        break;
      case "--help":
        console.log(`
Usage: npm run load-test -- [options]

Options:
  --base-url <url>      Target URL (default: http://localhost:3000)
  --scenario <name>     Run a specific scenario or "all" (default: all)
  --token <jwt>         JWT token for authenticated requests
  --duration <seconds>  Test duration override (default: 30)

Scenarios:
  health-check, auth-flow, conversation, content-generation,
  reviews-list, digest-generation, mixed-realistic, all
`);
        process.exit(0);
    }
  }

  return opts;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RequestResult {
  status: number;
  latencyMs: number;
  ok: boolean;
  error?: string;
}

interface ScenarioResult {
  name: string;
  totalRequests: number;
  successful: number;
  failed: number;
  errorRate: number;
  p50: number;
  p95: number;
  p99: number;
  rps: number;
  durationMs: number;
  threshold: number;
  healthThreshold?: number;
}

interface ScenarioConfig {
  name: string;
  concurrency: number;
  durationSeconds: number;
  /** p95 threshold in ms */
  threshold: number;
  /** Special threshold for health checks */
  healthThreshold?: number;
  makeRequest: (baseUrl: string, token: string) => Promise<RequestResult>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function authHeaders(token: string): Record<string, string> {
  if (!token) return { "Content-Type": "application/json" };
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function timedFetch(
  url: string,
  init?: RequestInit
): Promise<RequestResult> {
  const start = performance.now();
  try {
    const res = await fetch(url, init);
    const latencyMs = performance.now() - start;
    // Consume body to ensure connection is freed
    await res.text();
    return { status: res.status, latencyMs, ok: res.ok };
  } catch (err: unknown) {
    const latencyMs = performance.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    return { status: 0, latencyMs, ok: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Scenario runner
// ---------------------------------------------------------------------------

async function runScenario(
  config: ScenarioConfig,
  baseUrl: string,
  token: string,
  durationOverride?: number
): Promise<ScenarioResult> {
  const duration = (durationOverride ?? config.durationSeconds) * 1000;
  const results: RequestResult[] = [];
  const startTime = performance.now();

  console.log(
    `\n  Running "${config.name}" — ${config.concurrency} concurrent, ${(duration / 1000).toFixed(0)}s ...`
  );

  // Fire batches of concurrent requests until time runs out
  while (performance.now() - startTime < duration) {
    const batch = Array.from({ length: config.concurrency }, () =>
      config.makeRequest(baseUrl, token)
    );
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
  }

  const elapsed = performance.now() - startTime;
  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  const successful = results.filter((r) => r.ok).length;
  const failed = results.length - successful;

  return {
    name: config.name,
    totalRequests: results.length,
    successful,
    failed,
    errorRate: results.length > 0 ? (failed / results.length) * 100 : 0,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    rps: results.length / (elapsed / 1000),
    durationMs: elapsed,
    threshold: config.threshold,
    healthThreshold: config.healthThreshold,
  };
}

// ---------------------------------------------------------------------------
// Scenario definitions
// ---------------------------------------------------------------------------

function buildScenarios(): ScenarioConfig[] {
  return [
    // 1. Health check — GET /api/health
    {
      name: "health-check",
      concurrency: 200,
      durationSeconds: 30,
      threshold: 2000,
      healthThreshold: 100,
      makeRequest: async (baseUrl) =>
        timedFetch(`${baseUrl}/api/health`),
    },

    // 2. Auth flow — POST /api/auth/login
    {
      name: "auth-flow",
      concurrency: 50,
      durationSeconds: 30,
      threshold: 2000,
      makeRequest: async (baseUrl) =>
        timedFetch(`${baseUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "loadtest@localgenius.test",
            password: "LoadTest1234!",
          }),
        }),
    },

    // 3. Conversation — POST /api/conversations/{id}/messages
    {
      name: "conversation",
      concurrency: 20,
      durationSeconds: 60,
      threshold: 10000,
      makeRequest: async (baseUrl, token) =>
        timedFetch(
          `${baseUrl}/api/conversations/00000000-0000-0000-0000-000000000001/messages`,
          {
            method: "POST",
            headers: authHeaders(token),
            body: JSON.stringify({
              content:
                "What marketing strategies would work best for my restaurant this weekend?",
            }),
          }
        ),
    },

    // 4. Content generation — POST /api/content/generate
    {
      name: "content-generation",
      concurrency: 10,
      durationSeconds: 60,
      threshold: 10000,
      makeRequest: async (baseUrl, token) =>
        timedFetch(`${baseUrl}/api/content/generate`, {
          method: "POST",
          headers: authHeaders(token),
          body: JSON.stringify({
            type: "social_post",
            topic: "Weekend brunch special with live music",
            platform: "instagram",
          }),
        }),
    },

    // 5. Reviews list — GET /api/reviews
    {
      name: "reviews-list",
      concurrency: 50,
      durationSeconds: 30,
      threshold: 2000,
      makeRequest: async (baseUrl, token) =>
        timedFetch(`${baseUrl}/api/reviews`, {
          headers: authHeaders(token),
        }),
    },

    // 6. Digest generation — GET /api/digest?generate=true
    {
      name: "digest-generation",
      concurrency: 5,
      durationSeconds: 60,
      threshold: 10000,
      makeRequest: async (baseUrl, token) =>
        timedFetch(`${baseUrl}/api/digest?generate=true`, {
          headers: authHeaders(token),
        }),
    },

    // 7. Mixed realistic — simulates 100 users with weighted distribution
    {
      name: "mixed-realistic",
      concurrency: 100,
      durationSeconds: 60,
      threshold: 10000,
      makeRequest: async (baseUrl, token) => {
        const roll = Math.random() * 100;
        // 40% conversation
        if (roll < 40) {
          return timedFetch(
            `${baseUrl}/api/conversations/00000000-0000-0000-0000-000000000001/messages`,
            {
              method: "POST",
              headers: authHeaders(token),
              body: JSON.stringify({
                content: "How can I improve my online reviews?",
              }),
            }
          );
        }
        // 25% reviews
        if (roll < 65) {
          return timedFetch(`${baseUrl}/api/reviews`, {
            headers: authHeaders(token),
          });
        }
        // 15% content generation
        if (roll < 80) {
          return timedFetch(`${baseUrl}/api/content/generate`, {
            method: "POST",
            headers: authHeaders(token),
            body: JSON.stringify({
              type: "social_post",
              topic: "Happy hour tonight",
              platform: "facebook",
            }),
          });
        }
        // 10% digest
        if (roll < 90) {
          return timedFetch(`${baseUrl}/api/digest?generate=true`, {
            headers: authHeaders(token),
          });
        }
        // 10% auth
        return timedFetch(`${baseUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "loadtest@localgenius.test",
            password: "LoadTest1234!",
          }),
        });
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Results display
// ---------------------------------------------------------------------------

function printResults(results: ScenarioResult[]): void {
  const SEP = "-".repeat(120);

  console.log(`\n${SEP}`);
  console.log("  LOAD TEST RESULTS");
  console.log(SEP);
  console.log(
    "  Scenario               | Reqs   | OK     | Fail   | Err%   | p50 ms  | p95 ms   | p99 ms   | RPS     | Result"
  );
  console.log(SEP);

  let allPass = true;

  for (const r of results) {
    const p95Pass = r.p95 <= r.threshold;
    const errPass = r.errorRate < 1;
    const healthPass =
      r.healthThreshold != null ? r.p95 <= r.healthThreshold : true;
    const pass = p95Pass && errPass && healthPass;
    if (!pass) allPass = false;

    const status = pass ? "PASS" : "FAIL";
    const name = r.name.padEnd(24);
    const total = String(r.totalRequests).padStart(6);
    const ok = String(r.successful).padStart(6);
    const fail = String(r.failed).padStart(6);
    const errPct = r.errorRate.toFixed(2).padStart(6);
    const p50 = r.p50.toFixed(0).padStart(7);
    const p95 = r.p95.toFixed(0).padStart(8);
    const p99 = r.p99.toFixed(0).padStart(8);
    const rps = r.rps.toFixed(1).padStart(7);

    console.log(
      `  ${name}| ${total} | ${ok} | ${fail} | ${errPct}% | ${p50} | ${p95} | ${p99} | ${rps} | ${status}`
    );
  }

  console.log(SEP);

  // Print threshold details
  console.log("\n  Thresholds:");
  for (const r of results) {
    const notes: string[] = [];
    if (r.healthThreshold != null) {
      const hPass = r.p95 <= r.healthThreshold;
      notes.push(
        `    health p95: ${r.p95.toFixed(0)}ms ${hPass ? "<=" : ">"} ${r.healthThreshold}ms  ${hPass ? "PASS" : "FAIL"}`
      );
    }
    const p95Pass = r.p95 <= r.threshold;
    notes.push(
      `    p95: ${r.p95.toFixed(0)}ms ${p95Pass ? "<=" : ">"} ${r.threshold}ms  ${p95Pass ? "PASS" : "FAIL"}`
    );
    const errPass = r.errorRate < 1;
    notes.push(
      `    error rate: ${r.errorRate.toFixed(2)}% ${errPass ? "<" : ">="} 1%  ${errPass ? "PASS" : "FAIL"}`
    );
    console.log(`  ${r.name}:`);
    notes.forEach((n) => console.log(n));
  }

  console.log(
    `\n  Overall: ${allPass ? "ALL PASS" : "SOME FAILURES — see above"}\n`
  );

  if (!allPass) process.exitCode = 1;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs();

  console.log("========================================");
  console.log("  LocalGenius Load Test");
  console.log("========================================");
  console.log(`  Base URL : ${args.baseUrl}`);
  console.log(`  Scenario : ${args.scenario}`);
  console.log(`  Token    : ${args.token ? args.token.slice(0, 20) + "..." : "(none — unauthenticated)"}`);
  console.log(`  Duration : ${args.duration}s (override)`);
  console.log("========================================");

  if (!args.token) {
    console.log(
      "\n  WARNING: No --token provided. Authenticated endpoints will return 401.\n" +
        "  Provide a JWT with: --token <jwt>\n"
    );
  }

  const allScenarios = buildScenarios();
  const toRun =
    args.scenario === "all"
      ? allScenarios
      : allScenarios.filter((s) => s.name === args.scenario);

  if (toRun.length === 0) {
    console.error(
      `  Unknown scenario: "${args.scenario}". Available: ${allScenarios.map((s) => s.name).join(", ")}`
    );
    process.exit(1);
  }

  // Quick connectivity check
  console.log(`\n  Checking connectivity to ${args.baseUrl}/api/health ...`);
  try {
    const probe = await fetch(`${args.baseUrl}/api/health`);
    if (!probe.ok) {
      console.error(
        `  Health check returned ${probe.status}. Is the server running?`
      );
      process.exit(1);
    }
    console.log("  Server is reachable. Starting load tests.\n");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  Cannot reach server: ${msg}`);
    process.exit(1);
  }

  const results: ScenarioResult[] = [];

  for (const scenario of toRun) {
    // Use CLI duration override only for non-default scenarios (or when explicitly set)
    const durationOverride =
      args.scenario !== "all" ? args.duration : undefined;
    const result = await runScenario(
      scenario,
      args.baseUrl,
      args.token,
      durationOverride
    );
    results.push(result);
  }

  printResults(results);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
