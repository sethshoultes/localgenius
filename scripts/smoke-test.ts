/**
 * LocalGenius End-to-End Smoke Test
 *
 * Hits a RUNNING app instance to verify the full flow works.
 * No mocks — real HTTP requests only.
 *
 * Usage:
 *   npx tsx scripts/smoke-test.ts
 *   npx tsx scripts/smoke-test.ts --base-url http://staging.example.com
 *
 * Exit codes:
 *   0 — all checks passed
 *   1 — one or more checks failed or server unreachable
 */

const TOTAL_CHECKS = 8;

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

function getBaseUrl(): string {
  const idx = process.argv.indexOf("--base-url");
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1].replace(/\/+$/, "");
  }
  return "http://localhost:3000";
}

const BASE_URL = getBaseUrl();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface CheckResult {
  name: string;
  passed: boolean;
  ms: number;
  detail: string;
}

const results: CheckResult[] = [];

async function request(
  path: string,
  options: RequestInit = {},
): Promise<{ status: number; body: any; ms: number }> {
  const url = `${BASE_URL}${path}`;
  const start = performance.now();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> | undefined),
    },
  });
  const ms = Math.round(performance.now() - start);
  const body = await res.json();
  return { status: res.status, body, ms };
}

function record(name: string, passed: boolean, ms: number, detail: string) {
  results.push({ name, passed, ms, detail });
  const icon = passed ? "\u2713" : "\u2717";
  const color = passed ? "\x1b[32m" : "\x1b[31m";
  const reset = "\x1b[0m";
  console.log(`${color}${icon}${reset} ${name} ${dim(`(${ms}ms)`)} — ${detail}`);
}

function dim(text: string): string {
  return `\x1b[2m${text}\x1b[0m`;
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

async function run() {
  const totalStart = performance.now();
  const ts = Date.now();
  const email = `smoke-${ts}@test.com`;
  const password = "SmokeTe$t1234";
  const userName = "Smoke Tester";
  const businessName = `SmokeTest Bistro ${ts}`;

  let accessToken = "";
  let conversationId = "";

  // 1. Health check
  try {
    const { status, body, ms } = await request("/api/health");
    const ok = status === 200 && body?.data?.status === "ok";
    record(
      "[1/8] Health check",
      ok,
      ms,
      ok ? `status=ok, version=${body.data.version}` : `unexpected response: ${JSON.stringify(body).slice(0, 120)}`,
    );
  } catch (err) {
    handleFatal(err);
    return;
  }

  // 2. Register
  try {
    const { status, body, ms } = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        name: userName,
        businessName,
        businessType: "restaurant",
        city: "Austin",
        state: "TX",
      }),
    });
    const ok = status === 201 && !!body?.data?.accessToken && !!body?.data?.business;
    if (ok) accessToken = body.data.accessToken;
    record(
      "[2/8] Register",
      ok,
      ms,
      ok ? `registered as ${email}` : `status=${status}, error=${body?.error?.message || "unknown"}`,
    );
  } catch (err) {
    record("[2/8] Register", false, 0, errorMsg(err));
  }

  // 3. Login
  try {
    const { status, body, ms } = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const ok = status === 200 && !!body?.data?.accessToken;
    if (ok) accessToken = body.data.accessToken; // refresh token in case register one expired
    record(
      "[3/8] Login",
      ok,
      ms,
      ok ? `logged in as ${email}` : `status=${status}, error=${body?.error?.message || "unknown"}`,
    );
  } catch (err) {
    record("[3/8] Login", false, 0, errorMsg(err));
  }

  // 4. Get conversation
  try {
    const { status, body, ms } = await request("/api/conversations", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const ok = status === 200 && !!body?.data?.conversation?.id;
    if (ok) conversationId = body.data.conversation.id;
    record(
      "[4/8] Get conversation",
      ok,
      ms,
      ok ? `conversationId=${conversationId}` : `status=${status}, error=${body?.error?.message || "unknown"}`,
    );
  } catch (err) {
    record("[4/8] Get conversation", false, 0, errorMsg(err));
  }

  // 5. Send message
  try {
    const { status, body, ms } = await request(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ content: "What can you do for my restaurant?" }),
    });
    const ok = status === 201 && !!body?.data?.ownerMessage && !!body?.data?.assistantMessage;
    const assistantText = (body?.data?.assistantMessage?.content as any)?.text || "";
    record(
      "[5/8] Send message",
      ok,
      ms,
      ok
        ? `AI replied (${assistantText.length} chars)`
        : `status=${status}, error=${body?.error?.message || "unknown"}`,
    );
  } catch (err) {
    record("[5/8] Send message", false, 0, errorMsg(err));
  }

  // 6. Generate content
  try {
    const { status, body, ms } = await request("/api/content/generate", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ type: "social_post", topic: "weekend brunch special" }),
    });
    const ok = status === 201 && !!body?.data?.contentItem;
    record(
      "[6/8] Generate content",
      ok,
      ms,
      ok
        ? `contentItemId=${body.data.contentItem.id}`
        : `status=${status}, error=${body?.error?.message || "unknown"}`,
    );
  } catch (err) {
    record("[6/8] Generate content", false, 0, errorMsg(err));
  }

  // 7. List reviews
  try {
    const { status, body, ms } = await request("/api/reviews", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const ok = status === 200 && Array.isArray(body?.data?.reviews) && !!body?.data?.summary;
    record(
      "[7/8] List reviews",
      ok,
      ms,
      ok
        ? `${body.data.reviews.length} reviews, avg rating ${body.data.summary.averageRating}`
        : `status=${status}, error=${body?.error?.message || "unknown"}`,
    );
  } catch (err) {
    record("[7/8] List reviews", false, 0, errorMsg(err));
  }

  // 8. Get digest
  try {
    const { status, body, ms } = await request("/api/digest", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const ok = status === 200 && Array.isArray(body?.data?.digests);
    record(
      "[8/8] Get digest",
      ok,
      ms,
      ok
        ? `${body.data.digests.length} digests returned`
        : `status=${status}, error=${body?.error?.message || "unknown"}`,
    );
  } catch (err) {
    record("[8/8] Get digest", false, 0, errorMsg(err));
  }

  // Summary
  const totalMs = Math.round(performance.now() - totalStart);
  const passed = results.filter((r) => r.passed).length;
  console.log("");
  console.log("=".repeat(50));
  console.log(`${passed}/${TOTAL_CHECKS} passed in ${totalMs}ms`);
  console.log("=".repeat(50));

  process.exit(passed === TOTAL_CHECKS ? 0 : 1);
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

function errorMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function handleFatal(err: unknown) {
  if (
    err instanceof TypeError &&
    (err.message.includes("fetch failed") || err.message.includes("ECONNREFUSED"))
  ) {
    console.error(`\nCould not connect to ${BASE_URL}. Is the server running?\n`);
    process.exit(1);
  }
  // Node 18+ may wrap connection errors differently
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("ECONNREFUSED") || msg.includes("connect ECONNREFUSED") || msg.includes("fetch failed")) {
    console.error(`\nCould not connect to ${BASE_URL}. Is the server running?\n`);
    process.exit(1);
  }
  console.error(`\nUnexpected error: ${msg}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

run().catch((err) => {
  handleFatal(err);
});
