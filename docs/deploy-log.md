# LocalGenius — Deploy Log

## First Production Deployment

| Field | Value |
|-------|-------|
| **Date** | 2026-04-02 |
| **Commit** | `15dee5d` (Refactor pages — extract ThreadPage and DigestPage) |
| **Previous deploy commit** | `fc41ad0` (Fix usage metering — upsell power users) |
| **Platform** | Vercel (auto-deploy from GitHub main branch) |
| **Project** | seths-projects-e6ef81b9/localgenius |
| **Build time** | 31 seconds |
| **Status** | Ready (Production) |
| **Deployment URL** | `https://localgenius-agplw637d-seths-projects-e6ef81b9.vercel.app` |
| **Production URL** | `https://localgenius-beige.vercel.app` |
| **GitHub repo** | `https://github.com/sethshoultes/localgenius` |

---

## Health Check

```
GET /api/health → 200 OK
Response: {"data":{"status":"ok","version":"0.1.0","timestamp":"2026-04-02T13:46:44.736Z"}}
```

**Result: PASS** — App is live and responding on Vercel.

---

## What Works (No Credentials Needed)

| Feature | Endpoint | Status |
|---------|----------|:------:|
| Health check | `GET /api/health` | LIVE |
| Static pages | `/`, `/welcome`, `/digest`, `/landing` | LIVE |
| Auth (register/login) | `POST /api/auth/*` | Needs DATABASE_URL |
| Rate limiting middleware | All `/api/*` routes | LIVE |
| CORS headers | All `/api/*` routes | LIVE |

---

## What Needs Credentials

### Required for Core Functionality

| Credential | Env Var | What It Enables | Priority |
|-----------|---------|----------------|:--------:|
| **PostgreSQL (Neon)** | `DATABASE_URL` | All database operations — auth, conversations, reviews, analytics | P0 |
| **Anthropic Claude** | `ANTHROPIC_API_KEY` | AI conversation, content generation, review responses, digest narrative | P0 |
| **JWT Secret** | `JWT_SECRET` | User authentication token signing | P0 |

### Required for Billing

| Credential | Env Var | What It Enables | Priority |
|-----------|---------|----------------|:--------:|
| **Stripe** | `STRIPE_SECRET_KEY` | Subscription billing ($29/$79) | P0 |
| **Stripe** | `STRIPE_WEBHOOK_SECRET` | Payment event processing | P0 |
| **Stripe** | `STRIPE_PRICE_BASE`, `STRIPE_PRICE_PRO` | Price IDs for checkout | P0 |

### Required for Integrations

| Credential | Env Var | What It Enables | Priority |
|-----------|---------|----------------|:--------:|
| **Google OAuth** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Business Profile connection | P1 |
| **Meta OAuth** | `META_APP_ID`, `META_APP_SECRET` | Instagram + Facebook posting | P1 |
| **Yelp** | `YELP_API_KEY` | Review monitoring from Yelp | P2 |

### Required for Notifications

| Credential | Env Var | What It Enables | Priority |
|-----------|---------|----------------|:--------:|
| **Resend** | `RESEND_API_KEY` | Transactional emails (welcome, digest, alerts) | P1 |
| **Twilio** | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | SMS notifications | P2 |

### Required for Infrastructure

| Credential | Env Var | What It Enables | Priority |
|-----------|---------|----------------|:--------:|
| **Cron secret** | `CRON_SECRET` | Secures cron endpoints (digest, sync) | P1 |
| **Encryption** | `ENCRYPTION_KEY` | OAuth token encryption at rest | P1 |
| **Sentry** | `SENTRY_DSN` | Error tracking + performance monitoring | P2 |
| **OpenTelemetry** | `OTEL_EXPORTER_OTLP_ENDPOINT` | Metrics export to Grafana/Datadog | P3 |

---

## Deployment Configuration

### vercel.json Cron Jobs

| Job | Schedule | Path |
|-----|----------|------|
| Weekly Digest | Monday 10:00 UTC | `/api/cron/run?job=weekly-digest` |
| Google Review Sync | Every 6 hours | `/api/cron/run?job=google-review-sync` |
| Meta Engagement Sync | Every 6 hours | `/api/cron/run?job=meta-engagement-sync` |
| Analytics Rollup | Daily 2:00 UTC | `/api/cron/run?job=analytics-daily-rollup` |
| Token Refresh | Every 30 min | `/api/cron/run?job=token-refresh` |
| Stale Event Cleanup | Sunday 3:00 UTC | `/api/cron/run?job=stale-event-cleanup` |

### Next Steps to Full Production

1. Provision Neon database → set `DATABASE_URL` in Vercel env vars
2. Push database schema: `DATABASE_URL=<neon_url> npx drizzle-kit push`
3. Set `ANTHROPIC_API_KEY` and `JWT_SECRET` in Vercel env vars
4. Set `STRIPE_SECRET_KEY` + configure Stripe webhook endpoint
5. Seed demo data: `DATABASE_URL=<neon_url> npm run db:seed`
6. Verify: `npm run smoke-test -- --base-url https://localgenius-beige.vercel.app`

---

## Build Stats at Deploy

| Metric | Count |
|--------|------:|
| API Routes | 35 |
| Source Files | 144 |
| Lines of Code | 23,335 |
| Database Tables | 17 |
| Services | 21 |
| Tests | 139 passing |
| Build Time | 31s |
