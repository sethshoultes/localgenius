# LocalGenius API Reference

Base URL: `https://localgenius.company/api`

Auth: Bearer JWT token in `Authorization` header, or `lg_session` httpOnly cookie.

Response format: `{ data: {...}, meta: { timestamp } }` or `{ error: { code, message } }`

---

## Auth

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| POST | `/auth/register` | No | Create account + org + business |
| POST | `/auth/login` | No | Login, returns JWT + sets cookie |
| POST | `/auth/refresh` | Cookie | Refresh session (30-min grace) |
| POST | `/auth/logout` | Cookie | Clear session cookie |
| GET | `/auth/session` | Cookie | Get current user + business |

### POST /auth/register
```json
// Request
{ "email": "maria@example.com", "password": "min8chars", "name": "Maria Gonzalez",
  "businessName": "Maria's Kitchen", "businessType": "restaurant", "city": "Austin", "state": "TX" }

// Response 201
{ "data": { "user": { "id", "email", "name" }, "business": { "id", "name", "vertical" },
  "organization": { "id", "plan" }, "accessToken": "jwt...", "refreshToken": "jwt..." } }
```

### POST /auth/login
```json
// Request
{ "email": "maria@example.com", "password": "password123" }

// Response 200
{ "data": { "user": { "id", "email", "name" }, "business": { "id", "name" },
  "accessToken": "jwt...", "refreshToken": "jwt..." } }
```

---

## Business Profile

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/business` | Yes | Get full business profile |
| PUT | `/business` | Yes | Update profile (partial) |
| POST | `/business/photos` | Yes | Add a photo |
| DELETE | `/business/photos` | Yes | Remove a photo |

### PUT /business
```json
// Request (all fields optional)
{ "name": "Maria's Kitchen", "phone": "(512) 555-0142",
  "hours": { "Mon-Fri": "11am-9pm", "Sat-Sun": "10am-10pm" },
  "description": "Tex-Mex from scratch on South Lamar" }

// Response 200
{ "data": { "updated": true, "business": {...}, "fieldsUpdated": ["phone", "hours"] } }
```

---

## Conversations

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/conversations` | Yes | Get conversation + 50 recent messages |
| GET | `/conversations/:id/messages` | Yes | Paginated messages (`?before=cursor`) |
| POST | `/conversations/:id/messages` | Yes | Send message → AI responds |

### POST /conversations/:id/messages
```json
// Request
{ "content": "Post something about our fish tacos" }

// Response 201
{ "data": { "ownerMessage": { "id", "role": "owner", "content": {...} },
  "assistantMessage": { "id", "role": "assistant", "content": { "text": "Here's a post..." } } } }
```

---

## Content

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| POST | `/content/generate` | Yes | Generate social post, review response, email |
| GET | `/content/schedule` | Yes | List upcoming scheduled posts |
| POST | `/content/schedule` | Yes | Schedule a post for future |
| DELETE | `/content/schedule` | Yes | Cancel a scheduled post |

### POST /content/generate
```json
// Request
{ "type": "social_post", "topic": "weekend brunch special", "platform": "instagram" }

// Response 201
{ "data": { "contentItem": { "id", "content": { "text": "..." } },
  "action": { "id", "status": "proposed", "type": "social_post" } } }
```

---

## Reviews

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/reviews` | Yes | List reviews + summary (`?platform=google`) |
| POST | `/reviews/:id/respond` | Yes | Draft or post a review response |

### GET /reviews
```json
// Response 200
{ "data": { "reviews": [{ "id", "platform", "rating", "reviewerName", "reviewText", "sentiment", "hasResponse" }],
  "summary": { "total": 28, "averageRating": 4.3, "pendingResponses": 3,
    "sentimentBreakdown": { "positive": 20, "neutral": 5, "negative": 3 } } } }
```

---

## Weekly Digest

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/digest` | Yes | List past digests |
| GET | `/digest?generate=true` | Yes | Generate fresh digest |

---

## Analytics & Attribution

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/analytics` | Yes | Aggregated metrics (`?period=weekly\|monthly`) |
| POST | `/analytics` | Yes | Record an analytics event |
| GET | `/attribution` | Yes | Lead attribution report (`?period=30`) |
| POST | `/attribution` | Yes | Record a lead event |

---

## Insights & Campaigns

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/insights` | Yes | AI-generated insights ranked by priority |
| POST | `/insights` | Yes | Track insight acted/dismissed |
| GET | `/campaigns/suggested` | Yes | AI-generated campaign suggestions |
| POST | `/campaigns/suggested` | Yes | Approve a suggested campaign |

---

## SEO

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/seo/audit` | Yes | SEO score (0-100), findings, recommendations |

---

## Competitors

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/competitors` | Yes | List tracked competitors |
| POST | `/competitors` | Yes | Add a competitor to track |
| DELETE | `/competitors` | Yes | Remove a competitor (`?id=uuid`) |

---

## Notifications

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/notifications/preferences` | Yes | Get notification preferences |
| PUT | `/notifications/preferences` | Yes | Update preferences |

---

## Billing

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| POST | `/billing/subscribe` | Yes | Create Stripe checkout ($29/$79) |
| POST | `/billing/portal` | Yes | Open Stripe billing portal |
| POST | `/billing/webhook` | Stripe sig | Handle Stripe events |

---

## Actions

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| POST | `/actions/:id/approve` | Yes | Approve + execute a proposed action |

---

## Integrations

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/integrations/google/connect` | Yes | Start Google OAuth flow |
| GET | `/integrations/google/callback` | State | Handle Google OAuth callback |
| GET | `/integrations/meta/connect` | Yes | Start Meta OAuth flow |
| GET | `/integrations/meta/callback` | State | Handle Meta OAuth callback |

---

## Website

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| POST | `/website/generate` | Yes | Generate static website |
| GET | `/website/:businessId` | No | Serve the generated website (public) |

---

## Webhooks (Inbound)

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| POST | `/webhooks/stripe` | Stripe sig | Stripe events → thread messages |
| POST | `/webhooks/google` | Channel token | Google review notifications |

---

## Admin

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/admin/stats` | Admin role | System stats: users, revenue, AI costs |

---

## Cron

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/cron/run?job=<name>` | CRON_SECRET | Universal cron handler |
| GET | `/cron/digest` | CRON_SECRET | Generate all weekly digests |
| GET | `/cron/google-sync` | CRON_SECRET | Sync all Google reviews |
| GET | `/cron/meta-sync` | CRON_SECRET | Sync all Meta engagement |

---

## System

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/health` | No | Deep health check: DB, AI, integrations |

### GET /health
```json
// Response 200
{ "data": { "status": "healthy", "version": "0.1.0", "database": "connected",
  "ai": "ready", "integrations": { "google": "configured", "meta": "not_configured",
  "stripe": "configured", "yelp": "not_configured" } } }
```
