# Monitoring & Alerting Setup

LocalGenius uses a layered monitoring approach: Sentry for error tracking, OpenTelemetry for distributed tracing, structured JSON logs for aggregation, and a health endpoint for external monitoring.

## Health Endpoint

**GET /api/health** — The single source of truth for system status. Used by Vercel deployment checks and external monitoring services.

### Response Format

```json
{
  "data": {
    "status": "healthy|degraded|unconfigured|unhealthy",
    "version": "0.1.0",
    "database": "connected|disconnected|not_configured",
    "ai": "ready|no_key|error",
    "integrations": {
      "google": "configured|not_configured",
      "meta": "configured|not_configured",
      "stripe": "configured|not_configured",
      "yelp": "configured|not_configured",
      "email": "configured|not_configured",
      "sms": "configured|not_configured"
    },
    "monitoring": "configured|not_configured"
  },
  "meta": {
    "timestamp": "2026-04-02T15:30:00.000Z"
  }
}
```

### Status Codes

- **200 OK** — `healthy`: database connected AND AI ready
- **200 OK** — `degraded`: database connected OR AI ready (but not both)
- **200 OK** — `unconfigured`: app is set up but required vars not loaded yet
- **503 Service Unavailable** — `unhealthy`: database disconnected AND AI not ready

### What the Endpoint Checks

1. **Database connectivity**: Executes `SELECT 1` against Neon PostgreSQL. Confirms both the connection string and pool limits are healthy.
2. **AI service**: Instantiates the Anthropic SDK with the configured API key. Does NOT make an API call (no cost). Just verifies the SDK can initialize.
3. **Integration status**: Checks if each optional service (Google, Meta, Stripe, etc.) has an env var configured. Does NOT verify credentials are valid.

### Monitoring Setup

Add external uptime monitoring (BetterUptime, Datadog, etc.) to hit `/api/health` every 5 minutes:

```bash
# Example: BetterUptime
curl -X GET https://localgenius.vercel.app/api/health
```

BetterUptime should alert when:
- Response status code is 503
- Response time exceeds 5 seconds (indicates database or Anthropic slowness)
- Endpoint is down (network failure, Vercel function timeout)

## Error Tracking with Sentry

All unhandled errors are automatically captured and sent to Sentry. Zero-config: if `SENTRY_DSN` is set, errors are tracked.

### Environment Variables

| Variable | Purpose | Set In |
|---|---|---|
| `SENTRY_DSN` | Server-side error reporting | Vercel production env vars |
| `NEXT_PUBLIC_SENTRY_DSN` | Client-side error reporting (optional) | Vercel production env vars |

### Setting Up Sentry

1. Create a project at [sentry.io](https://sentry.io) (or use existing).
2. Copy the DSN from **Settings → Projects → localgenius → Client Keys (DSN)**.
3. Set `SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz` in Vercel:
   ```bash
   vercel env add SENTRY_DSN
   # Paste the DSN when prompted
   ```
4. Redeploy to production. Sentry will now capture all errors.

### What Gets Tracked

- **Unhandled exceptions** in route handlers, middleware, and server actions
- **Database errors** (connection timeouts, query failures, constraint violations)
- **API errors** from external services (Anthropic, Google, Meta, Stripe)
- **Auth errors** (invalid JWT, missing middleware context)

### What Gets Filtered

- **Development errors** (local `NODE_ENV !== "production"`)
- **Health check errors** (don't clutter error logs)

### Viewing Errors in Sentry

1. Go to [sentry.io/localgenius](https://sentry.io/localgenius).
2. Filter by **Release** (e.g., main branch SHA) to isolate new deployments.
3. Group by **Error Message** to find recurring patterns (e.g., "Anthropic rate limit").
4. Click into an error to see:
   - Full stack trace
   - Request headers and body (if applicable)
   - User context (userId, businessId, organizationId from `x-*` headers)
   - Breadcrumbs (logs leading up to the error)

## Application Logging

All requests are logged in structured JSON format. In production, logs go to stderr/stdout for aggregation into Vercel's built-in log storage or a third-party service.

### Log Format (Production)

```json
{
  "timestamp": "2026-04-02T15:30:45.123Z",
  "level": "error",
  "message": "Request failed",
  "route": "/api/messages",
  "method": "POST",
  "userId": "user_abc123",
  "businessId": "biz_xyz789",
  "statusCode": 500,
  "durationMs": 1245,
  "error": "Anthropic API rate limit exceeded",
  "stack": "at generateMessage (src/services/ai.ts:84:15)"
}
```

### Log Format (Development)

Pretty-printed to console with colors:
```
[ERROR] POST /api/messages 500 1245ms Anthropic API rate limit exceeded
  Error: Anthropic API rate limit exceeded
  at generateMessage (src/services/ai.ts:84:15)
```

### Key Fields to Monitor

- `level: "error"` — All errors logged with full stack trace
- `durationMs` — Track slow requests (>3000ms indicates Anthropic latency or DB query issue)
- `statusCode: 5xx` — Any 500+ error is a real problem
- `userId` / `businessId` — Correlate errors to affected users

### Accessing Logs

**Vercel Dashboard:**
- Go to [vercel.com/localgenius/logs](https://vercel.com/localgenius/logs)
- Filter by Function to see production logs
- Search for `level: "error"` to find errors

**Command Line:**
```bash
vercel logs --prod
```

**Real-time Streaming (Recommended):**
```bash
vercel logs --prod --follow
```

## OpenTelemetry Metrics & Traces

LocalGenius exports optional metrics and traces to an external observability platform (e.g., Datadog, Grafana Cloud).

### Configuration

Set `OTEL_EXPORTER_OTLP_ENDPOINT` to enable export:

```bash
# Example: Datadog
vercel env add OTEL_EXPORTER_OTLP_ENDPOINT
# https://api.datadoghq.com/v1/input/xxx

# Example: Grafana
vercel env add OTEL_EXPORTER_OTLP_ENDPOINT
# https://otlp-gateway-prod-xxx.grafana.net/otlp
```

### What Gets Exported

- **Traces**: Each API request becomes a span tree with service name, method, route, duration
- **Metrics**: Request count, histogram of latencies, error rates

### Without OTEL Setup

- In production: nothing exported (logs still work)
- In development: console output with traces and metrics

## Key Metrics to Watch

### AI Cost & Quota

Monitor daily on [console.anthropic.com](https://console.anthropic.com/account/usage):

- **Tokens per user** — Target < 100k tokens/user/month (~ $1.50 per user)
- **Rate limits** — If you hit 60k tokens/min, requests fail with 429 rate limit errors
- **Model usage** — Sonnet 4.6 (interactive) vs Haiku 4.5 (batch digests). Sonnet is 5x more expensive.

### Database Performance

Monitor on Neon dashboard:

- **Connection pool** — Max 100 connections (default). If saturated, new requests queue and timeout.
- **Query P95 latency** — Healthy: < 100ms. If > 500ms, check for slow queries (missing indexes).
- **Active connections** — Should drop to 0 during off-hours. If stuck high, check for leaked connections.

### Function Duration & Cold Starts

Monitor on Vercel dashboard (**Monitoring** tab):

- **Average duration** — Healthy: 200-800ms. If > 3s, something is calling Anthropic synchronously.
- **Cold starts** — Visible in the duration histogram. Each cold start adds 1-2s.
- **Error rate** — Alert if > 1% of requests fail.

### Cron Job Health

Visit **GET /api/cron/run** (no job param) to see the job registry and recent execution history:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://localgenius.vercel.app/api/cron/run
```

Response includes:
- All registered jobs with cron expressions
- Last 50 executions: success/failure, duration, error message

Key jobs to monitor:

| Job | Schedule | Alert If |
|---|---|---|
| `google-review-sync` | Every 6 hours | Failed 2+ times in a row → likely API credential issue |
| `weekly-digest` | Monday 10:00 UTC | Failed → check Anthropic quota, database connectivity |
| `token-refresh` | Every 30 minutes | Many failures → credential refresh broken, need manual relink |

## Common Monitoring Scenarios

### Scenario: "Function timeout, request took >10s"

1. Check Anthropic dashboard for rate limit or quota issues
2. Run the health endpoint: is AI status "ready"?
3. If AI failed, force a redeploy to reset the SDK singleton
4. If AI is ready, check Vercel logs for the actual bottleneck (database? external API?)

### Scenario: "Database errors, can't insert review"

1. Visit Neon dashboard, check if the database is in "Error" state
2. Check Vercel logs for the actual SQL error (foreign key? type mismatch?)
3. If connection pool is maxed, scale up or add connection pooling middleware

### Scenario: "Google reviews not syncing, cron fails"

1. Run `/api/cron/run` to see error message from the last execution
2. Common causes:
   - Google credentials expired → visit Settings, reconnect Google account
   - API quota hit (60 req/min) → back off and retry
   - Invalid token in database → run token-refresh job manually

### Scenario: "High error rate in Sentry"

1. Check if a new deployment was just shipped (compare to recent commits)
2. Filter errors by **Release** to isolate the deploy
3. Check if a new external API was added (Stripe webhook? Google API?)
4. Rollback with `git revert` or `vercel rollback` if critical

## Alerting Best Practices

### Set Up Alerts For

1. **Health endpoint 503** — (BetterUptime or similar)
2. **Sentry error rate > 5%** — New bug introduced
3. **Anthropic quota warning** — Approaching rate limit
4. **Cron job failure** — Check scheduler job history
5. **Database pool at 80%+ capacity** — Scale up connections

### Do NOT Alert For

- Health endpoint response time (false positives from cold starts)
- Individual Sentry errors (too noisy, use error grouping)
- Anthropic 429 rate limit (it's temporary, auto-retries work)

### On-Call Runbook

When you wake up to an alert:

1. **Check health endpoint** — Is the app actually down?
2. **Check recent commits** — Was something deployed?
3. **Check Sentry** — Is there a new error pattern?
4. **Check Vercel logs** — What's the actual error?
5. **Run /api/cron/run** — Are scheduled jobs succeeding?
6. **Decide**: Fix now, rollback, or create an incident post?

See `docs/operations/incident-runbook.md` for detailed troubleshooting steps.
