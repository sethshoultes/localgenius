# LocalGenius Monitoring Dashboard Specification

> Canonical reference for dashboards, metrics, alerting rules, and implementation roadmap.

---

## 1. Dashboard Specifications

### 1.1 Operations Dashboard (Grafana / Datadog)

| Panel | Visualization | Data Source | Notes |
|-------|--------------|-------------|-------|
| **Request Rate** | Time series, stacked by status code | `http.request.duration` histogram count, grouped by `http.request.path` and `http.request.status_code` | Show req/min with 1-minute resolution |
| **Error Rate** | Single stat + time series | `api.error.count / http.request.duration count * 100` | 5-minute rolling window; red when > 5% |
| **Response Time Heatmap** | Heatmap | `http.request.duration` histogram buckets, grouped by `http.request.path` | Overlay p50, p75, p95, p99 lines |
| **Response Time by Endpoint** | Table, sorted by p95 desc | `http.request.duration` percentiles per `http.request.path` | Highlight rows where p95 > 2s (non-AI) or > 10s (AI) |
| **Active DB Connections** | Gauge | Neon dashboard (external link) | Link: `https://console.neon.tech/app/projects/{PROJECT_ID}/monitoring` |
| **Cron Job Status** | Table | `/api/cron/run` job history (scheduler in-memory ring buffer) | Columns: job name, last run, duration_ms, success/fail, consecutive failures |

**Registered cron jobs to track:**

| Job | Schedule | What to watch |
|-----|----------|---------------|
| `weekly-digest` | Mon 10:00 UTC | generated vs failed count |
| `google-review-sync` | Every 6 hours | synced vs failed per run |
| `meta-engagement-sync` | Every 6 hours | synced vs failed per run |
| `analytics-daily-rollup` | Daily 2:00 UTC | success flag, duration |
| `token-refresh` | Every 30 min | refreshed count, errors |
| `stale-event-cleanup` | Sun 3:00 UTC | rows pruned |

---

### 1.2 AI Performance Dashboard

| Panel | Visualization | Data Source | Notes |
|-------|--------------|-------------|-------|
| **AI Generation Latency** | Time series with percentile bands | `ai.generation.duration` histogram (p50, p95, p99) | Group by `ai.generation.model` |
| **Token Usage** | Stacked bar (hourly/daily toggle) | `ai.generation.tokens_input` and `ai.generation.tokens_output` histograms | Sum per period; also available from DB: `messages.tokens_input`, `messages.tokens_output` |
| **AI Cost per User per Day** | Time series | Computed: `(tokens_input / 1M * input_price + tokens_output / 1M * output_price)` grouped by `organizations.id` per day | See cost formula in section 2 |
| **AI Error / Retry Rate** | Counter over time | `api.error.count` filtered to AI endpoints (`http.request.path` matches `/api/*/generate`, `/api/chat`) | Track 4xx and 5xx separately |
| **Model Distribution** | Pie chart | `ai.generation.duration` count grouped by `ai.generation.model` | Target: ~80% `claude-sonnet-4-6-20250514`, ~20% `claude-haiku-4-5-20251001` |
| **Cache Hit Rate** | Single stat | Future: `ai.cache.hit` / `ai.cache.total` counters | Placeholder panel until prompt caching is implemented |

---

### 1.3 Business Metrics Dashboard

All data sourced from the `/api/admin/stats` endpoint and underlying DB queries unless noted.

| Panel | Visualization | Data Source | Notes |
|-------|--------------|-------------|-------|
| **MRR** | Single stat + trend | Stripe API: sum of active subscription amounts. Local mirror: `organizations.plan` with price map (`base=$29`, `pro=$79`) | Show month-over-month delta |
| **Plan Distribution** | Donut chart + table | `SELECT plan, count(*) FROM organizations GROUP BY plan` | Show count and MRR contribution per tier |
| **User Growth** | Bar chart (daily/weekly) | `SELECT date_trunc('day', created_at), count(*) FROM users GROUP BY 1` | Overlay cumulative total as line |
| **7-Day Retention** | Single stat | `SELECT count(*) FILTER (WHERE last_active_at > now() - interval '7 days') * 100.0 / count(*) FROM users` | Target: > 70% |
| **Onboarding Completion Rate** | Funnel | `SELECT count(*) FILTER (WHERE onboarding_completed_at IS NOT NULL) * 100.0 / count(*) FROM businesses` | Target: > 60%; 5 steps total |
| **Content Velocity** | Stacked bar (daily) | `SELECT date_trunc('day', created_at), content_type, count(*) FROM content_items GROUP BY 1, 2` | Types: social posts, review responses, emails, digests |
| **Review Response Rate (24h)** | Single stat | `SELECT count(*) FILTER (WHERE rr.created_at - r.fetched_at < interval '24 hours') * 100.0 / count(*) FROM review_responses rr JOIN reviews r ON rr.review_id = r.id` | Target: > 80% |

---

### 1.4 Cost Dashboard

| Panel | Visualization | Data Source | Notes |
|-------|--------------|-------------|-------|
| **Infrastructure Cost Breakdown** | Stacked bar (monthly) | Manual entry or billing API | Vercel, Neon, Upstash, R2, SendGrid |
| **AI Cost (Total)** | Time series (daily) | Computed from `messages.tokens_input` and `messages.tokens_output` columns with model-specific pricing | See formula below |
| **AI Cost per User** | Time series | AI cost / active user count per day | Alert if > $0.15/user/day |
| **AI Cost as % of Revenue** | Gauge | `(ai_cost_total / mrr) * 100` | Ceiling: 15% of revenue. Available pre-computed in admin stats: `revenue.aiCostPercentOfRevenue` |
| **Stripe Processing Fees** | Single stat (monthly) | Stripe dashboard or `balance_transactions` API | ~2.9% + $0.30 per transaction |
| **Cost per User vs ARPU** | Dual-axis chart | `total_infra_cost / active_users` vs blended ARPU ($44) | Healthy when cost/user < 30% of ARPU |

**AI Cost Formula (from `admin/stats/route.ts`):**

```
Sonnet 4.6:  $3.00/M input tokens,  $15.00/M output tokens
Haiku 4.5:   $0.25/M input tokens,   $1.25/M output tokens
Blended (80/20): $2.45/M input, $12.25/M output

cost_cents = (input_tokens / 1,000,000) * 2.45 * 100
           + (output_tokens / 1,000,000) * 12.25 * 100
```

---

## 2. Key Metrics

### 2.1 Operational Metrics

| Metric | Unit | Calculation | Data Source | Target | Alert Trigger |
|--------|------|-------------|-------------|--------|---------------|
| **Request Rate** | req/min | Count of `http.request.duration` records per minute | OTel histogram: `http.request.duration` | N/A (baseline) | Sudden drop > 50% from baseline |
| **Error Rate** | % | `api.error.count / http.request.duration.count * 100`, 5-min window | OTel counter: `api.error.count`, histogram: `http.request.duration` | < 1% | > 5% for 5 min |
| **p95 Response Time (non-AI)** | ms | 95th percentile of `http.request.duration` where path does NOT match AI endpoints | OTel histogram: `http.request.duration` filtered by `http.request.path` | < 2,000 ms | > 5,000 ms for 5 min |
| **p95 Response Time (AI)** | ms | 95th percentile of `http.request.duration` for AI endpoints | OTel histogram: `http.request.duration` filtered by `http.request.path` | < 8,000 ms | > 15,000 ms for 5 min |
| **DB Connection Utilization** | % | `active_connections / max_connections * 100` | Neon monitoring API | < 60% | > 80% |
| **Cron Job Consecutive Failures** | count | Count of sequential `success=false` results per job in scheduler history | Scheduler ring buffer via `/api/cron/run` | 0 | >= 2 consecutive |

### 2.2 AI Metrics

| Metric | Unit | Calculation | Data Source | Target | Alert Trigger |
|--------|------|-------------|-------------|--------|---------------|
| **AI Generation Latency (p50)** | ms | 50th percentile of `ai.generation.duration` | OTel histogram: `ai.generation.duration` | < 2,000 ms | N/A |
| **AI Generation Latency (p95)** | ms | 95th percentile of `ai.generation.duration` | OTel histogram: `ai.generation.duration` | < 8,000 ms | > 15,000 ms |
| **AI Generation Latency (p99)** | ms | 99th percentile of `ai.generation.duration` | OTel histogram: `ai.generation.duration` | < 15,000 ms | > 30,000 ms |
| **Token Usage (Input)** | tokens/hour | Sum of `ai.generation.tokens_input` per hour | OTel histogram: `ai.generation.tokens_input`; DB: `SUM(messages.tokens_input)` | Varies | Spike > 3x hourly average |
| **Token Usage (Output)** | tokens/hour | Sum of `ai.generation.tokens_output` per hour | OTel histogram: `ai.generation.tokens_output`; DB: `SUM(messages.tokens_output)` | Varies | Spike > 3x hourly average |
| **AI Cost per User per Day** | USD | See cost formula, grouped by org, divided by active user count | DB: `messages` table joined with `users` | < $0.10 | > $0.15 |
| **Model Distribution** | % | Count per `ai.generation.model` / total count | OTel histogram: `ai.generation.duration` grouped by `ai.generation.model` | ~80% Sonnet, ~20% Haiku | Haiku < 10% (cost risk) |

### 2.3 Business Metrics

| Metric | Unit | Calculation | Data Source | Target | Alert Trigger |
|--------|------|-------------|-------------|--------|---------------|
| **MRR** | USD | `SUM(price_map[org.plan]) for all orgs with active subscriptions` | DB: `organizations.plan`; Stripe: `subscriptions.list(status=active)` | Growth | Drop > 10% WoW |
| **Plan Distribution** | count | `SELECT plan, count(*) FROM organizations GROUP BY plan` | DB: `organizations` | Pro > 30% of total | N/A |
| **Daily New Registrations** | count | `SELECT count(*) FROM users WHERE created_at > now() - interval '1 day'` | DB: `users` | Growth | Drop to 0 for 48 hours |
| **7-Day Active Retention** | % | Active users in last 7 days / total users * 100 | DB: `users.last_active_at` | > 70% | < 50% |
| **Onboarding Completion** | % | Businesses with `onboarding_completed_at IS NOT NULL` / total * 100 | DB: `businesses.onboarding_completed_at` | > 60% | < 60% |
| **Content Velocity** | items/day | `SELECT count(*) FROM content_items WHERE created_at > now() - interval '1 day'` | DB: `content_items` | Growth | Drop > 50% WoW |
| **Review Response Rate (24h)** | % | Responses within 24h of review fetch / total responses * 100 | DB: `review_responses` joined with `reviews` | > 80% | < 50% |

---

## 3. Alerting Rules

### P1 -- Critical (PagerDuty + Slack #localgenius-alerts)

| Alert Name | Condition | Duration | Action |
|------------|-----------|----------|--------|
| **High Error Rate** | `api.error.count / http.request.duration.count > 0.05` (5%) | 5 minutes sustained | Page on-call. Check Sentry for stack traces. Verify Neon/Upstash connectivity. |
| **Payment Webhook Failure** | HTTP 5xx on `/api/webhooks/stripe` OR Stripe webhook dashboard shows failures | Any single occurrence | Page on-call. Verify `STRIPE_WEBHOOK_SECRET` is correct. Check Stripe event replay. |
| **Complete Outage** | Zero requests for 3+ minutes during business hours (6 AM - 11 PM CT) | 3 minutes | Page on-call. Check Vercel status, DNS, deployment state. |

### P2 -- Warning (Slack #localgenius-alerts)

| Alert Name | Condition | Duration | Action |
|------------|-----------|----------|--------|
| **AI Cost Overrun** | AI cost per user per day > $0.15 | Rolling 24-hour window | Review prompt sizes. Check for runaway loops. Consider shifting more traffic to Haiku. |
| **Slow Non-AI Routes** | p95 of `http.request.duration` > 5,000 ms for paths NOT matching `/api/*/generate`, `/api/chat` | 5 minutes | Check DB query performance. Review Neon connection pool. |
| **Slow AI Routes** | p95 of `ai.generation.duration` > 15,000 ms | 5 minutes | Check Anthropic status page. Review prompt token counts. |
| **DB Connection Saturation** | Active connections > 80% of Neon plan limit | 1 minute | Scale connection pool. Review long-running queries. |
| **Cron Job Consecutive Failure** | Any job in scheduler returns `success: false` 2 times in a row | Immediate on 2nd failure | Check job-specific logs. Run job manually via `/api/cron/run?job=<name>`. Review `details.errors` array. |
| **Token Refresh Failure** | `token-refresh` job fails | Immediate | OAuth tokens may expire. Check Google/Meta API status. |
| **AI Cost % of Revenue** | `estimatedAiCostCents / (mrr * 100) > 0.15` (15%) | Daily check | Tighten token budgets. Increase Haiku ratio. Review `maxTokens` settings in `ai.ts`. |

### P3 -- Informational (Email to founders / Slack #localgenius-business)

| Alert Name | Condition | Frequency | Action |
|------------|-----------|-----------|--------|
| **MRR Drop** | MRR decreases > 10% week-over-week | Weekly check (Mon) | Investigate churn. Review cancellation reasons in Stripe. |
| **Low Onboarding Completion** | Onboarding completion rate < 60% | Daily check | Review onboarding UX. Check for errors in setup steps. |
| **Low Review Response Rate** | < 50% of reviews responded within 24 hours | Daily check | Check `google-review-sync` job health. Review notification delivery. |
| **User Growth Stall** | Zero new registrations for 48 hours | Daily check | Verify registration flow. Check for deployment issues. |

---

## 4. Implementation Plan

### Phase 1: Launch (0-100 users) -- Use what we have

**Tools:**
- **Sentry** -- Error tracking, performance monitoring, release health
- **BetterUptime** -- Uptime monitoring, status page, incident management
- **Vercel Analytics** -- Web vitals, request volume, edge function duration
- **Stripe Dashboard** -- MRR, subscription status, payment failures
- **Neon Dashboard** -- DB connections, query performance, storage

**Actions:**
1. Configure Sentry alerts for error rate > 5% (maps to P1 High Error Rate)
2. Set up BetterUptime checks on `/api/health` endpoint every 1 minute
3. Create a BetterUptime status page at `status.localgenius.com`
4. Enable Vercel Analytics for web vitals and serverless function duration
5. Set Stripe webhook failure notifications to email
6. Build an internal `/admin/dashboard` page that calls `/api/admin/stats` and displays:
   - User count, business count, content generated
   - Token usage, AI cost estimate, AI cost % of revenue
   - MRR, plan breakdown
   - Cron job status (via `/api/cron/run` with no job param)
7. Ensure all API routes use `withTelemetry()` wrapper from `src/api/middleware/telemetry.ts`
8. Ensure all AI calls invoke `reportAIMetrics()` after completion

**Estimated cost:** $0/month (all free tiers)

---

### Phase 2: Growth (100-1,000 users) -- Add structured observability

**Tools (add):**
- **Grafana Cloud Free Tier** -- 10K metrics, 50GB logs, 50GB traces
  - OR **Datadog Free Trial** (14-day) then Dev plan ($0 for 5 hosts)

**Actions:**
1. Point OTLP exporter to Grafana Cloud (set `OTEL_EXPORTER_OTLP_ENDPOINT` env var)
   - The `src/lib/telemetry.ts` setup already supports this -- just set the env var in Vercel
2. Import dashboard JSON for Operations Dashboard (section 1.1)
3. Import dashboard JSON for AI Performance Dashboard (section 1.2)
4. Create Grafana alerting rules for all P1 and P2 alerts
5. Set up PagerDuty integration for P1 alerts
6. Create Slack webhook integration for P2 alerts
7. Persist cron job history to DB table (`job_executions`) instead of in-memory ring buffer
8. Add `ai.cache.hit` and `ai.cache.total` counters when prompt caching ships

**Dashboard query examples (PromQL / Grafana):**

```promql
# Error rate (5-min rolling)
sum(rate(api_error_count_total[5m])) / sum(rate(http_request_duration_count[5m])) * 100

# AI generation p95 by model
histogram_quantile(0.95, sum(rate(ai_generation_duration_bucket[5m])) by (le, ai_generation_model))

# Token usage per hour
sum(increase(ai_generation_tokens_input_sum[1h]))
sum(increase(ai_generation_tokens_output_sum[1h]))
```

**Estimated cost:** $0-$23/month (Grafana Cloud free tier or Datadog Dev plan)

---

### Phase 3: Scale (1,000+ users) -- Full observability stack

**Tools (upgrade):**
- **Datadog Pro** ($23/host/month) with APM + Log Management
  - OR **Self-hosted Grafana + Prometheus + Loki** on a dedicated VPS ($20-40/month)

**Actions:**
1. Enable distributed tracing across all services
2. Add custom Datadog/Grafana dashboards for Business Metrics (section 1.3) with Stripe API integration
3. Implement Cost Dashboard (section 1.4) with billing API integrations for all vendors
4. Set up anomaly detection on request rate and error rate (Datadog ML monitors)
5. Create SLO definitions:
   - API availability: 99.9% (43.8 min downtime/month max)
   - Non-AI p95 latency: < 2s
   - AI p95 latency: < 10s
6. Add real user monitoring (RUM) for frontend performance
7. Create monthly cost report automation
8. Add per-tenant (per-organization) metrics for enterprise customers

**Estimated cost:** $50-150/month depending on stack choice

---

## Appendix A: OpenTelemetry Metric Reference

These are the metrics instrumented in the codebase (`src/lib/telemetry.ts` and `src/api/middleware/telemetry.ts`):

| OTel Metric Name | Type | Unit | Attributes | Source File |
|-------------------|------|------|------------|-------------|
| `http.request.duration` | Histogram | ms | `http.request.method`, `http.request.path`, `http.request.status_code` | `telemetry.ts` middleware |
| `api.error.count` | Counter | 1 | `http.request.method`, `http.request.path`, `http.request.status_code` | `telemetry.ts` middleware |
| `ai.generation.duration` | Histogram | ms | `ai.generation.model` | `telemetry.ts` middleware |
| `ai.generation.tokens_input` | Histogram | tokens | `ai.generation.model` | `telemetry.ts` middleware |
| `ai.generation.tokens_output` | Histogram | tokens | `ai.generation.model` | `telemetry.ts` middleware |

**Service resource attributes:**
- `service.name`: `localgenius` (from `OTEL_SERVICE_NAME` env var)
- `service.version`: from `package.json`
- `deployment.environment`: from `NODE_ENV`

## Appendix B: Admin Stats API Response Shape

`GET /api/admin/stats` returns:

```json
{
  "data": {
    "users": { "total": 0 },
    "businesses": { "total": 0 },
    "conversations": { "total": 0 },
    "content": { "totalGenerated": 0, "reviewsResponded": 0 },
    "actions": { "total": 0, "completed": 0, "proposed": 0, "failed": 0 },
    "ai": {
      "totalMessages": 0,
      "tokensInput": 0,
      "tokensOutput": 0,
      "estimatedCostCents": 0,
      "estimatedCostFormatted": "$0.00"
    },
    "revenue": {
      "mrrCents": 0,
      "mrrFormatted": "$0",
      "planBreakdown": [{ "plan": "base", "count": 0, "mrrContribution": 0 }],
      "aiCostPercentOfRevenue": "N/A"
    },
    "timestamp": "2026-04-01T00:00:00.000Z"
  }
}
```

## Appendix C: Cron Job Registry

Available via `GET /api/cron/run` (no `?job` param). Jobs are defined in `src/services/scheduler.ts`.

| Job Name | Schedule | Description |
|----------|----------|-------------|
| `weekly-digest` | `0 10 * * 1` | Generate weekly digests for all businesses |
| `google-review-sync` | `0 */6 * * *` | Sync Google reviews for all connected accounts |
| `meta-engagement-sync` | `0 */6 * * *` | Sync Meta post engagement for all connected accounts |
| `analytics-daily-rollup` | `0 2 * * *` | Aggregate daily analytics into business_metrics |
| `token-refresh` | `*/30 * * * *` | Proactively refresh OAuth tokens expiring within 60 min |
| `stale-event-cleanup` | `0 3 * * 0` | Prune analytics_events older than 13 months |
