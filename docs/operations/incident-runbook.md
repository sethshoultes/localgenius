# Incident Response Runbook

## Severity Levels

| Level | Definition | Response Time | Example |
|---|---|---|---|
| **P0** | All users affected, app is down | 5 minutes | Database completely down, all requests 500 |
| **P1** | Some users affected, core feature broken | 15 minutes | Anthropic API down, Google sync broken, auth failing |
| **P2** | Cosmetic or non-critical feature | 1 hour | Weekly digest formatting wrong, analytics delayed |

## Diagnostic Checklist (Every Incident)

Before diving into specifics, always run these first:

```bash
# 1. Is the app reachable?
curl https://localgenius.vercel.app/api/health

# 2. What does Vercel say?
vercel status --prod

# 3. Recent logs?
vercel logs --prod --limit 50

# 4. Recent deployments?
git log --oneline -10

# 5. Cron job status?
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://localgenius.vercel.app/api/cron/run

# 6. Check Sentry for new errors
# Visit https://sentry.io/localgenius
```

---

## Common Failure Modes & Recovery

### 1. AI Service Not Responding (P1)

**Symptoms:**
- `/api/health` shows `ai: "error"`
- All message generation endpoints return 500
- Sentry errors: "Anthropic API rate limit" or "Invalid API key"

**Root Cause Checklist:**

| Cause | Check | Fix |
|---|---|---|
| API key invalid or revoked | `echo $ANTHROPIC_API_KEY` in Vercel logs | Go to [console.anthropic.com](https://console.anthropic.com), generate new key, update Vercel env var |
| Rate limit hit (60k tokens/min) | Check [Anthropic dashboard](https://console.anthropic.com/account/usage) | Wait 60 seconds, then retry. Requests auto-backoff. |
| Quota exhausted | Check [Anthropic dashboard](https://console.anthropic.com/account/usage), look at current month spend | Contact Anthropic support or increase billing limit |
| Network timeout to Anthropic | Check Vercel logs for timeout duration (>30s) | Likely temporary. Retry the request. If persistent, post in Anthropic status page. |

**Immediate Action:**

```bash
# 1. Stop users from queuing up messages
# (In production, this would mean returning 503 from /api/messages)

# 2. Check which users are affected
vercel logs --prod --grep "Anthropic"

# 3. Manually verify API key by running a test message
# In a local terminal with proper env vars:
node -e "
const Anthropic = require('@anthropic-ai/sdk').default;
const client = new Anthropic();
client.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 10,
  messages: [{ role: 'user', content: 'hi' }]
}).then(r => console.log('OK')).catch(e => console.error(e.message));
"

# 4. If the key is bad, update it:
vercel env add ANTHROPIC_API_KEY
# Paste the new key from console.anthropic.com

# 5. Redeploy
vercel deploy --prod

# 6. Verify health endpoint
curl https://localgenius.vercel.app/api/health
```

**Post-Incident:**
- If quota was hit, implement usage limits per user/org (throttle AI calls)
- Add Anthropic quota monitoring to alerts

---

### 2. Database Connection Failure (P0/P1)

**Symptoms:**
- `/api/health` shows `database: "disconnected"`
- All database operations return "connect ECONNREFUSED" or "connection timeout"
- Sentry errors: "Error: connect ECONNREFUSED 127.0.0.1:5432" or "no pg_hba.conf entry"

**Root Cause Checklist:**

| Cause | Check | Fix |
|---|---|---|
| Connection string invalid | `echo $DATABASE_URL` in Vercel | Verify format: `postgresql://user:pass@host/db?sslmode=require` |
| Neon database is down | Visit [Neon status](https://status.neon.tech/) | Wait for Neon to recover. Check Slack for incidents. |
| Connection pool exhausted | Check Neon dashboard → Branches → Connection Count | Reduce pool size, scale down consumers, or upgrade plan |
| Network firewall blocking Neon | Check if VPN is active | Disable VPN, or add Vercel IP to Neon allowlist |
| DATABASE_URL not set in production | Check Vercel env vars: `vercel env list --prod` | Set it: `vercel env add DATABASE_URL` |

**Immediate Action:**

```bash
# 1. Verify the connection string is set
vercel env list --prod | grep DATABASE_URL

# 2. Check if Neon is down
# Visit https://status.neon.tech/ (also check their Twitter)

# 3. Test the connection manually
# Using psql (if installed):
psql "$DATABASE_URL"
# Should connect without error

# 4. If psql works but Vercel app doesn't, redeploy
# (The SDK singleton may have cached a stale connection)
vercel deploy --prod

# 5. If still broken, check the exact error in Vercel logs
vercel logs --prod --grep "database\|ECONNREFUSED\|connect"

# 6. If it's a Neon issue, scale down:
# - Log into Neon console
# - Go to Branches → your branch
# - Reduce "Max connections" temporarily
# - Or switch to another branch/database if available
```

**Post-Incident:**
- Add database connection pool monitoring
- Set up alerts if connection count hits 80% of max
- Document: what's the max sustainable RPS for the current pool size?

---

### 3. Auth Failure (P1)

**Symptoms:**
- Users can't log in, `/auth/login` returns 401 or 500
- JWT verification fails: "JsonWebTokenError: invalid signature"
- Session cookies not being set

**Root Cause Checklist:**

| Cause | Check | Fix |
|---|---|---|
| JWT_SECRET changed or missing | Check Vercel env: `vercel env list --prod` | If missing: `vercel env add JWT_SECRET` with old secret. If rotated accidentally, revert to previous value. |
| JWT_SECRET too short (< 32 chars) | Check length | Regenerate: `openssl rand -hex 32` |
| Cookie settings wrong (httpOnly, secure, sameSite) | Check middleware code: `src/middleware.ts` | Verify cookies are httpOnly=true (can't steal via JS) and secure=true (HTTPS only) |
| CORS allowing wrong origin | Check `CORS_ALLOWED_ORIGIN` | Should be `https://localgenius.vercel.app` in production, not `http://localhost` |
| Token expiration very short | Check token generation in `src/lib/auth.ts` | Default 7 days is reasonable. If < 1 hour, extend it. |

**Immediate Action:**

```bash
# 1. Check if JWT_SECRET exists and is valid length
vercel env list --prod | grep JWT_SECRET
# Should show: JWT_SECRET = ******* (hidden)

# 2. Verify it's 32+ characters
# (You can't see it in Vercel UI, but we validate on startup)

# 3. Test auth manually
# In Vercel logs, look for auth-related errors:
vercel logs --prod --grep "JWT\|auth\|401"

# 4. If the error is "invalid signature", the secret changed
# To fix: revert to the previous secret
# (You need to find it in git history or your password manager)
git log -p -- vercel.json | grep JWT_SECRET
# Or contact the person who rotated it

# 5. If that doesn't work, force-rotate the secret
# Generate new secret and update:
openssl rand -hex 32  # Copy this
vercel env add JWT_SECRET  # Paste new secret
vercel deploy --prod

# 6. All existing sessions become invalid (users re-login)
```

**Post-Incident:**
- Add auth token expiration to monitoring (alert if < 1 hour)
- Document where the JWT_SECRET is stored (e.g., 1Password, Vercel UI)
- Create a playbook for rotating it safely

---

### 4. Cron Jobs Not Running (P2)

**Symptoms:**
- Weekly digest not sent on Monday 10am UTC
- Google reviews not syncing (no new reviews in the app)
- Token refresh failing, Google/Meta integration becomes stale

**Root Cause Checklist:**

| Cause | Check | Fix |
|---|---|---|
| CRON_SECRET missing or wrong | Check Vercel: `vercel env list --prod \| grep CRON` | Set it: `vercel env add CRON_SECRET` with a 32-char secret |
| Vercel cron not configured | Check `vercel.json`, does it have a `crons` section? | Add cron definitions (see vercel.json structure below) |
| Cron path incorrect | Check if path in vercel.json exists as a route | Verify all paths in `crons` array match actual route handlers |
| Function timeout (>10min) | Check Vercel logs for "Function timeout" during cron run | Optimize the job: add pagination, split into batches, or increase timeout |
| Job handler threw an error | Visit `/api/cron/run` (no params) to see recent history | Check the error message in the response, fix the root cause |

**Immediate Action:**

```bash
# 1. Check if cron is configured
cat vercel.json | jq '.crons'

# 2. Manually trigger a job to see what happens
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://localgenius.vercel.app/api/cron/run?job=google-review-sync"

# Expected response:
# { "data": { "job": "google-review-sync", "success": true, "duration_ms": 1234, ... } }

# 3. If it fails, check the error message
# Common errors:
# - "Invalid cron secret" → CRON_SECRET not set or wrong
# - "Unknown job: X" → job name doesn't exist in scheduler.ts
# - "Google sync failed for business X" → Google credentials expired (see below)
# - "Function timeout" → job took > 10 minutes, Vercel killed it

# 4. View recent cron history
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://localgenius.vercel.app/api/cron/run
# Shows last 50 cron executions with success/failure

# 5. To trigger a job immediately (for testing):
curl -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://localgenius.vercel.app/api/cron/run?job=weekly-digest"
```

**vercel.json Structure (if you need to add/remove crons):**

```json
{
  "crons": [
    {
      "path": "/api/cron/run?job=google-review-sync",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

Schedule format is cron expression (minute, hour, day-of-month, month, day-of-week).

**Post-Incident:**
- Add monitoring to `/api/cron/run` without job param (check job history in uptime monitor)
- Alert if any job fails 2+ times in a row

---

### 5. Google Review Sync Failing (P1)

**Symptoms:**
- `google-review-sync` cron job fails
- No new reviews appearing in the app
- Users report: "I got a review but LocalGenius didn't show it"

**Root Cause Checklist:**

| Cause | Check | Fix |
|---|---|---|
| Google credentials expired | Check `business_settings` table, `connectionStatus` = "expired" | User must re-authorize: Settings → Connect Google Business Profile → re-login |
| Google API quota hit (60 req/min) | Check Vercel logs for "rate limit" or "429" | Cron has built-in backoff (1000ms between businesses). Wait 1-2 hours, retry. |
| Token refresh broken | Check `business_settings.tokenExpiresAt` vs current time | Run `/api/cron/run?job=token-refresh` to manually refresh all tokens |
| Google credentials invalid (client_id/secret) | Check `.env.production` vs Google Cloud Console | Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` match the OAuth app in Google Cloud |
| User revoked permission | Check Google Account → Connected apps → revoked LocalGenius | User must re-authorize |

**Immediate Action:**

```bash
# 1. Run the sync job manually to see the error
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://localgenius.vercel.app/api/cron/run?job=google-review-sync"

# Look at "details" in the response:
# { "details": { "total": 5, "synced": 3, "failed": 2, "errors": ["business_id_1", "business_id_2"] } }

# 2. For each failed business, check the connection status
# Query the database:
SELECT businessId, connectionStatus, tokenExpiresAt, lastSyncedAt 
FROM business_settings 
WHERE platform = 'google_business' AND businessId IN ('business_id_1');

# 3. If connectionStatus = "expired", user needs to re-authorize
# (They'll see a prompt in Settings when they next log in)

# 4. If token is still valid, manually refresh:
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://localgenius.vercel.app/api/cron/run?job=token-refresh"

# 5. Then retry the sync:
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://localgenius.vercel.app/api/cron/run?job=google-review-sync"

# 6. If still failing, check Vercel logs for detailed error
vercel logs --prod --grep "google"
```

**Post-Incident:**
- Add Google quota monitoring (track 429 responses)
- Alert users proactively when their Google connection is stale (> 30 days)
- Document the Google re-auth flow in user help docs

---

### 6. Stripe Webhook Failing (P2)

**Symptoms:**
- User completes checkout, Stripe charges card, but subscription not activated in LocalGenius
- Sentry errors: "Stripe webhook signature verification failed" or "STRIPE_WEBHOOK_SECRET not set"
- Users are charged but see "free" plan

**Root Cause Checklist:**

| Cause | Check | Fix |
|---|---|---|
| STRIPE_WEBHOOK_SECRET wrong | Check Vercel: `vercel env list --prod \| grep STRIPE` | Get from [Stripe Dashboard](https://dashboard.stripe.com/webhooks). The signing secret (not the API key). Copy and update. |
| Webhook not configured in Stripe | Check Stripe Dashboard → Webhooks, is the endpoint listed? | Add endpoint: `https://localgenius.vercel.app/api/webhooks/stripe` with events: `checkout.session.completed`, `invoice.payment_*`, `customer.subscription.*` |
| CORS blocking webhook | Check Vercel logs for CORS error when webhook tries to POST | Verify `CORS_ALLOWED_ORIGIN` includes Stripe's IPs (or use a different CORS strategy for webhooks) |
| Database error storing subscription | Check Vercel logs for SQL error in webhook handler | Check if `organizations` table has the `stripeSubscriptionId` column. If schema is old, migrate. |

**Immediate Action:**

```bash
# 1. Check the webhook secret is set
vercel env list --prod | grep STRIPE_WEBHOOK_SECRET

# 2. Verify it matches Stripe Dashboard
# Go to https://dashboard.stripe.com/webhooks
# Find the endpoint "localgenius.vercel.app/api/webhooks/stripe"
# Click it, click "Signing secret", copy it

# 3. If it's different, update Vercel
vercel env add STRIPE_WEBHOOK_SECRET
# Paste the correct secret from Stripe

# 4. Verify webhook is set up in Stripe
# Go to https://dashboard.stripe.com/webhooks
# Should show an endpoint for your app with these events:
# - checkout.session.completed
# - invoice.payment_succeeded
# - invoice.payment_failed
# - customer.subscription.updated
# - customer.subscription.deleted

# If the endpoint is missing, add it:
# Add endpoint → URL = https://localgenius.vercel.app/api/webhooks/stripe
# Select the events above
# Signing secret will be generated

# 5. For a failed webhook, Stripe will retry 3 times over 24 hours
# Check if there's a pending delivery in the webhook log

# 6. Manually verify a recent payment
# Go to https://dashboard.stripe.com/payments
# Find the latest payment, click it
# Check the "Events" tab — does it show a successful charge and checkout.session.completed event?
```

**Post-Incident:**
- Test the webhook manually before next payment: use Stripe CLI
  ```bash
  stripe listen --forward-to https://localgenius.vercel.app/api/webhooks/stripe
  stripe trigger checkout.session.completed
  ```
- Add webhook delivery status to monitoring dashboard

---

## Rollback Procedure

If a bad deploy is causing widespread errors (P0), rollback immediately:

**Option 1: Instant Rollback via Vercel Dashboard (Fastest)**

1. Go to [vercel.com/localgenius/deployments](https://vercel.com/localgenius/deployments)
2. Find the previous good deployment
3. Click the three-dots menu → **Promote to Production**
4. Confirm

**Option 2: Git Revert (Better for records)**

```bash
# 1. Find the bad commit
git log --oneline -5

# 2. Revert it
git revert <commit-hash>
# This creates a NEW commit that undoes the changes

# 3. Push to main
git push origin main

# 4. Vercel auto-deploys within 30 seconds
# Verify with: vercel status --prod
```

**Option 3: Manual Hotfix (For minor issues)**

```bash
# 1. Check out the bad commit
git checkout <commit-hash>

# 2. Fix the issue locally
# Edit the file, test

# 3. Commit and push
git add .
git commit -m "Hotfix: [issue]"
git push origin main

# 4. Monitor: vercel logs --prod --follow
```

**After Rollback:**

1. Create a post-incident analysis: what failed, why, how to prevent?
2. Add tests to catch the issue next time
3. Update monitoring/alerting if a new pattern emerged
4. Schedule a team sync to discuss (if it's a P0)

---

## Communication During Incidents

### P0 (App is down)

- **Slack**: "App is down. Investigating. ETA 10min."
- **Users**: In-app banner (if app is partially working) or status page
- **Update every 5 minutes** until resolved

### P1 (Feature broken)

- **Slack**: "Google sync failing for some users. Fixing now."
- **No user notification** (they may not notice)
- **Update every 15 minutes**

### P2 (Minor issue)

- **Slack**: "Weekly digest formatting issue. Fix queued for next deploy."
- **No urgent response** (batch fix with next release)

---

## Escalation & Help

If you're stuck:

1. **Check the health endpoint** → reveals the symptom
2. **Check Vercel logs** → reveals the root cause
3. **Check Sentry** → reveals error patterns
4. **Check cron history** → reveals job status
5. **Ask in Slack** → ops team or on-call
6. **External status pages**:
   - [Neon status](https://status.neon.tech/) — database
   - [Anthropic status](https://status.anthropic.com/) — AI
   - [Stripe status](https://status.stripe.com/) — billing
   - [Google status](https://www.google.com/appsstatus) — OAuth/Business Profile API
   - [Vercel status](https://www.vercel-status.com/) — deployment platform

---

## Post-Incident Template

After any P0 or P1, fill this out within 24 hours:

```markdown
# Incident: [Descriptive Title]

**Date**: April 2, 2026
**Duration**: 15 minutes
**Severity**: P1
**Resolved**: Yes

## Timeline

- 15:30 UTC — Alert: AI service not responding
- 15:32 UTC — Checked health endpoint: `ai: "error"`
- 15:35 UTC — Found ANTHROPIC_API_KEY was invalid
- 15:37 UTC — Updated key in Vercel env vars
- 15:38 UTC — Redeployed to production
- 15:40 UTC — Verified health endpoint shows `ai: "ready"`
- 15:45 UTC — Users confirmed messages working again

## Root Cause

API key was accidentally revoked in the Anthropic console during a security audit.

## Prevention

- Add a "key rotation" reminder to the team calendar (quarterly)
- Automate API key validation in health check (we do this now)
- Document where API keys are stored (1Password vault)

## Follow-up

- [x] Add Anthropic quota alerts
- [ ] Test key rotation procedure in staging
- [ ] Update runbook with key rotation steps
```
