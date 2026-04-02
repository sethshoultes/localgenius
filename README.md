# LocalGenius

AI-powered digital presence platform for local businesses. One conversational interface replaces the 6-8 disconnected tools most small businesses juggle. The owner talks to LocalGenius like they'd talk to a marketing employee, and it handles the rest.

## Quick Start

```bash
cd deliverables/local-genius/app
npm install

cp .env.example .env.local
# Set DATABASE_URL, ANTHROPIC_API_KEY, JWT_SECRET at minimum

npm run db:push     # Push schema to database
npm run db:seed     # Seed Maria's Kitchen demo data
npm run dev         # Start at http://localhost:3000
```

Demo login: `maria@mariaskitchen.com` / `localgenius123`

### Docker

```bash
docker compose up -d
DATABASE_URL=postgresql://localgenius:localgenius@localhost:5432/localgenius npm run db:push
DATABASE_URL=postgresql://localgenius:localgenius@localhost:5432/localgenius npm run db:seed
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/auth/register` | POST | Create account + org + business |
| `/api/auth/login` | POST | Login, returns JWT |
| `/api/onboarding` | GET/POST | Resumable onboarding flow |
| `/api/conversations` | GET | Conversation + recent messages |
| `/api/conversations/[id]/messages` | GET/POST | Send message, get AI response |
| `/api/content/generate` | POST | Generate social/review/email content |
| `/api/reviews` | GET | Reviews with sentiment + response status |
| `/api/reviews/[id]/respond` | POST | AI-drafted review response |
| `/api/digest` | GET | Weekly Digests (`?generate=true` for fresh) |
| `/api/analytics` | GET/POST | Record events / aggregated analytics |
| `/api/cron/digest` | GET | Cron: generate all digests (CRON_SECRET) |

## Architecture

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React, Next.js App Router, Tailwind | Mobile-first conversational UI |
| Backend | Next.js API Routes | Single deployable for 3 engineers |
| Database | PostgreSQL (Neon), Drizzle ORM | Multi-tenant RLS, 14 tables |
| AI | Anthropic Claude (Sonnet 4.6 / Haiku 4.5) | 2.1% of revenue in AI costs |
| Infra | Vercel + Cloudflare | Zero ops, auto-scaling |

Full specs: `engineering/tech-stack.md`, `engineering/data-model.md`, `engineering/api-design.md`, `engineering/infrastructure.md`

## Testing

```bash
# Run all tests (99 tests across 13 files)
npm test

# Watch mode (re-runs on file changes)
npm run test:watch
```

Tests cover:
- **API routes** (7 files): auth, conversations, content generation, reviews, digest, analytics, health
- **Components** (6 files): ConversationThread, MessageBubble, ApprovalCard, WeeklyDigest, Button, Input
- All tests mock the database and AI service — no external dependencies needed

## Demo Mode

After seeding, the app runs with a complete demo dataset:

```bash
npm run db:seed   # Creates Maria's Kitchen with reviews, conversations, analytics
npm run dev       # Start the app
```

Login: `maria@mariaskitchen.com` / `localgenius123`

Demo data includes: 8 Google/Yelp reviews, conversation history (onboarding + fish tacos post), 14 days of analytics events, and 5 completed actions.

## Deployment

```bash
# Preview deploy
./scripts/deploy.sh

# Production deploy (requires passing tests)
./scripts/deploy.sh production
```

Or manually via Vercel CLI: `vercel` (preview) / `vercel --prod` (production).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm test` | Run all tests (vitest) |
| `npm run test:watch` | Tests in watch mode |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed demo data (Maria's Kitchen) |
| `npm run db:studio` | Drizzle Studio (DB GUI) |
