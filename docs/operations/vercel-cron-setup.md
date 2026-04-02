# Vercel Cron Jobs — Operations Guide

How to activate, monitor, and troubleshoot the six scheduled jobs that keep LocalGenius data fresh.

---

## 1. Prerequisites

- **Vercel Pro plan** (or higher). Cron jobs are not available on the Hobby plan.
- **Project linked** to Vercel. Confirm with `vercel whoami` and check that `.vercel/project.json` exists in the repo root.
- **Production deployment** live. Cron jobs only run against the production deployment URL.

---

## 2. Environment Variables Required

Every cron job authenticates with `CRON_SECRET`. Individual jobs also depend on service-specific variables.

| Variable | Purpose | Required by |
|---|---|---|
| `CRON_SECRET` | Bearer token Vercel sends with every cron request | All jobs |
| `DATABASE_URL` | Neon Postgres connection string (set automatically via Neon integration) | All jobs |
| `ANTHROPIC_API_KEY` | Claude API key for AI-generated digest content | `weekly-digest` |
| `GOOGLE_CLIENT_ID` | Google OAuth app client ID | `google-review-sync`, `token-refresh` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth app client secret | `google-review-sync`, `token-refresh` |
| `META_APP_ID` | Meta (Facebook/Instagram) app ID | `meta-engagement-sync`, `token-refresh` |
| `META_APP_SECRET` | Meta app secret | `meta-engagement-sync`, `token-refresh` |
| `RESEND_API_KEY` | Resend email API key for delivering digest emails | `weekly-digest` |

> **Note:** `DATABASE_URL` is auto-provisioned by the Neon Vercel integration. You should not need to set it manually. The Google/Meta variables are only needed if businesses have connected those platforms.

---

## 3. Jobs Reference

All jobs route through a single universal endpoint: `GET /api/cron/run?job=<name>`. Vercel sends the `Authorization: Bearer <CRON_SECRET>` header automatically.

| Job name | Schedule | Human-readable | What it does | Service env vars needed |
|---|---|---|---|---|
| `weekly-digest` | `0 10 * * 1` | Monday at 10:00 UTC | Generates and emails weekly performance digests for all businesses | `ANTHROPIC_API_KEY`, `RESEND_API_KEY` |
| `google-review-sync` | `0 */6 * * *` | Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC) | Syncs Google Business Profile reviews and insights for all connected accounts. Staggers requests with 1s delay per business to stay within Google's 60 req/min quota. | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| `meta-engagement-sync` | `0 */6 * * *` | Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC) | Syncs Facebook and Instagram post engagement metrics for all connected accounts. Staggers requests with 500ms delay per business. | `META_APP_ID`, `META_APP_SECRET` |
| `analytics-daily-rollup` | `0 2 * * *` | Daily at 02:00 UTC | Aggregates raw analytics events into the `business_metrics` table | (database only) |
| `token-refresh` | `*/30 * * * *` | Every 30 minutes | Proactively refreshes OAuth tokens that expire within 60 minutes | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `META_APP_ID`, `META_APP_SECRET` |
| `stale-event-cleanup` | `0 3 * * 0` | Sunday at 03:00 UTC | Prunes `analytics_events` rows older than 13 months | (database only) |

Legacy individual endpoints (`/api/cron/digest`, `/api/cron/google-sync`, `/api/cron/meta-sync`) also exist and use the same `CRON_SECRET` auth, but `vercel.json` routes everything through the universal `/api/cron/run` endpoint.

---

## 4. Activation Steps

### 4a. Generate CRON_SECRET

```bash
openssl rand -hex 32
```

Copy the output. This is your cron secret token.

### 4b. Set it in Vercel

```bash
vercel env add CRON_SECRET
```

When prompted:
- **Value:** paste the hex string from step 4a
- **Environments:** select **Production** (required), optionally Preview and Development
- **Sensitive:** yes

Alternatively, set it in the Vercel dashboard under **Settings > Environment Variables**.

### 4c. Set remaining service variables

If not already configured, add the service-specific variables listed in section 2:

```bash
vercel env add ANTHROPIC_API_KEY
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
vercel env add META_APP_ID
vercel env add META_APP_SECRET
vercel env add RESEND_API_KEY
```

### 4d. Deploy to production

Cron jobs only activate after a production deployment that includes the `vercel.json` cron config:

```bash
vercel deploy --prod
```

Or push to your production branch (typically `main`) if git-based deployments are configured.

### 4e. Verify activation

1. Open the Vercel dashboard for the project.
2. Navigate to **Settings > Cron Jobs** (or **Logs > Cron**).
3. Confirm all 6 jobs appear with their schedules.
4. Wait for the next scheduled run, or trigger a test run from the dashboard.

---

## 5. Monitoring

### Vercel Dashboard

- **Cron Jobs tab** (under project settings or deployments) shows each job's last run, status, and duration.
- **Function Logs** — filter by `/api/cron/run` to see execution output, including the `[scheduler]` log lines emitted by the job runner.

### Job Registry Endpoint

Hit the universal cron endpoint without a `job` param to get a status overview:

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" \
  https://your-app.vercel.app/api/cron/run
```

This returns:
- All registered jobs with their names, descriptions, and schedules.
- Recent execution history (last 50 runs) with timestamps, duration, and success/failure status.

> **Note:** Execution history is stored in-memory and resets on each new deployment. It reflects runs since the current deployment went live.

### Per-Job History

Add the `job` param to run (and get results for) a specific job on demand:

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" \
  https://your-app.vercel.app/api/cron/run?job=weekly-digest
```

The response includes `success`, `duration_ms`, and job-specific `details` (e.g., number of digests generated, sync counts).

---

## 6. Troubleshooting

### 401 Unauthorized

**Cause:** `CRON_SECRET` is missing or does not match.

- Verify the variable is set in production: `vercel env ls` (look for `CRON_SECRET` in the Production column).
- Make sure you redeployed after adding the variable. Env var changes require a new deployment.
- The endpoint checks `Authorization: Bearer <CRON_SECRET>` exactly. Vercel sends this header automatically for cron invocations, so a 401 almost always means the env var is not set or is set to an empty string.

### Job Returns 500

**Cause:** The job ran but threw an error. Check which service it depends on.

- **weekly-digest fails:** Verify `ANTHROPIC_API_KEY` and `RESEND_API_KEY` are set and valid.
- **google-review-sync fails:** Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. Check that at least one business has an active Google connection (`connectionStatus = "active"` in `business_settings`).
- **meta-engagement-sync fails:** Verify `META_APP_ID` and `META_APP_SECRET` are set. Same active-connection prerequisite.
- **token-refresh fails:** Needs the Google and/or Meta credentials above.
- **analytics-daily-rollup / stale-event-cleanup fail:** These only need the database. Check `DATABASE_URL` and Neon dashboard for connectivity issues.

### Jobs Not Appearing in Dashboard

- Confirm `vercel.json` is committed and includes the `crons` array.
- Confirm the latest production deployment includes that `vercel.json`.
- Cron jobs require the **Pro plan**. On Hobby, the `crons` config is silently ignored.

### Jobs Run But Do Nothing

- **google-review-sync / meta-engagement-sync:** These skip if no businesses have active platform connections. This is expected behavior, not an error.
- **weekly-digest:** Requires businesses to exist in the database with enough data to generate a digest.

### Timeout Issues

Vercel Serverless Functions have a default timeout of 10 seconds (Hobby) or 60 seconds (Pro). Long-running sync jobs (Google/Meta with many businesses) may hit this limit.

- Check function duration in the Vercel logs.
- If timeouts occur, consider increasing the function timeout in `vercel.json` by adding a `functions` config, or reduce batch size in the sync handlers.

### Rate Limit Errors from Google or Meta

- **Google:** The sync handler staggers requests with a 1-second delay per business. At ~3 API calls per business, the limit is roughly 300 businesses per 6-hour window before hitting Google's 60 req/min quota.
- **Meta:** The sync handler uses a 500ms delay. Meta allows 200 calls/user/hour, so large account counts are unlikely to hit limits.

If you see rate limit errors in logs, reduce the number of active connections or increase the stagger delay in `src/services/scheduler.ts`.
