# Database Setup — Neon PostgreSQL

Get LocalGenius connected to a real database in 5 minutes.

---

## Step 1: Create a Neon Project

1. Go to [neon.tech](https://neon.tech) and sign in (or create a free account)
2. Click **New Project**
3. Settings:
   - **Name**: `localgenius`
   - **Region**: `US East (Ohio)` (closest to Vercel's default region)
   - **Postgres version**: 16 (default)
4. Click **Create Project**
5. Copy the **connection string** — it looks like:
   ```
   postgresql://neondb_owner:abc123@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

---

## Step 2: Set DATABASE_URL Locally

```bash
cd /Users/sethshoultes/Local\ Sites/localgenius

# Create .env.local if it doesn't exist
touch .env.local

# Add your connection string (paste the one from Step 1)
echo 'DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-YOUR-ENDPOINT.us-east-2.aws.neon.tech/neondb?sslmode=require' >> .env.local

# Also set a JWT secret for auth
echo 'JWT_SECRET=localgenius-dev-jwt-secret-change-in-prod-32chars' >> .env.local
```

---

## Step 3: Push Schema to Database

This creates all 17 tables (organizations, businesses, users, conversations, messages, actions, etc.):

```bash
npx drizzle-kit push
```

You should see output like:
```
[✓] Changes applied
17 tables created
```

If you get an error about `DATABASE_URL`, make sure `.env.local` is in the project root and the connection string is correct.

---

## Step 4: Seed Demo Data

This creates Maria's Kitchen (Tex-Mex restaurant, Austin TX) with reviews, conversations, and analytics:

```bash
npm run db:seed
```

Output:
```
Seeding demo data...
  Created org: ...
  Created business: Maria's Kitchen (...)
  Created user: maria@mariaskitchen.com
  Created 20+ sample reviews
  Created 27 sample messages
  Created 14 days of analytics events
  Created 15 sample actions

Seed complete!
  Login: maria@mariaskitchen.com / localgenius123
```

---

## Step 5: Set DATABASE_URL in Vercel

```bash
# Option A: Vercel CLI
npx vercel env add DATABASE_URL production
# Paste your Neon connection string when prompted

# Option B: Vercel Dashboard
# Go to: Project → Settings → Environment Variables
# Add DATABASE_URL with your Neon connection string
# Select: Production, Preview, Development
```

Also add these in Vercel:
```bash
npx vercel env add JWT_SECRET production
# Use a strong random string: openssl rand -hex 32

npx vercel env add CRON_SECRET production
# Use another random string: openssl rand -hex 16
```

---

## Step 6: Verify with Drizzle Studio

```bash
npx drizzle-kit studio
```

Opens a browser GUI at `https://local.drizzle.studio` where you can browse all tables, see the seeded data, and run queries.

---

## Step 7: Verify the Live App

After setting Vercel env vars, redeploy (push any commit or run `npx vercel --prod`), then:

```bash
npm run smoke-test -- --base-url https://localgenius-beige.vercel.app
```

Expected output:
```
[1/8] Health check        ✓  200 OK (45ms)
[2/8] Register            ✓  201 Created (320ms)
[3/8] Login               ✓  200 OK (180ms)
[4/8] Get conversation    ✓  200 OK (95ms)
[5/8] Send message        ✓  201 Created (3200ms) — AI responded
[6/8] Generate content    ✓  201 Created (2800ms)
[7/8] List reviews        ✓  200 OK (85ms)
[8/8] Get digest          ✓  200 OK (70ms)

8/8 passed (6.8s total)
```

---

## Quick Reference

| Command | What It Does |
|---------|-------------|
| `npx drizzle-kit push` | Create/update tables from schema |
| `npm run db:seed` | Seed Maria's Kitchen demo data |
| `npx drizzle-kit studio` | Browse database in browser GUI |
| `npx drizzle-kit generate` | Generate SQL migration files |
| `npm run smoke-test` | End-to-end test against running app |

## Troubleshooting

**"No database connection string was provided"**
→ Check `.env.local` exists and has `DATABASE_URL=...`

**"connection refused" or SSL error**
→ Make sure `?sslmode=require` is at the end of the connection string

**"relation does not exist"**
→ Run `npx drizzle-kit push` to create the tables

**Seed fails with "duplicate key"**
→ The seed was already run. Drop and recreate: `npx drizzle-kit push --force`
