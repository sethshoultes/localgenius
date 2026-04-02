#!/usr/bin/env bash
#
# LocalGenius Deploy Script
# Usage: ./scripts/deploy.sh [environment]
#   environments: preview (default), production
#
# Prerequisites:
#   - Vercel CLI: npm i -g vercel
#   - Authenticated: vercel login
#   - Project linked: vercel link
#   - Environment variables set in Vercel dashboard
#
# This script:
#   1. Runs type checking
#   2. Runs tests (if available)
#   3. Builds the application
#   4. Pushes database migrations (if any)
#   5. Deploys to Vercel
#

set -euo pipefail

ENVIRONMENT="${1:-preview}"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "╔══════════════════════════════════════════╗"
echo "║  LocalGenius Deploy — $ENVIRONMENT"
echo "╚══════════════════════════════════════════╝"
echo ""

cd "$APP_DIR"

# ─── Step 1: Type Check ───────────────────────────────────────────────────────
echo "→ Step 1: Type checking..."
npx tsc --noEmit
echo "  ✓ Types OK"
echo ""

# ─── Step 2: Tests ─────────────────────────────────────────────────────────────
if [ -f "vitest.config.ts" ] && command -v npx &>/dev/null; then
  echo "→ Step 2: Running tests..."
  npx vitest run --reporter=verbose 2>/dev/null || {
    echo "  ⚠ Tests failed or not configured — continuing (non-blocking in preview)"
    if [ "$ENVIRONMENT" = "production" ]; then
      echo "  ✗ Tests MUST pass for production deploy. Aborting."
      exit 1
    fi
  }
  echo ""
else
  echo "→ Step 2: No test runner configured — skipping"
  echo ""
fi

# ─── Step 3: Build ─────────────────────────────────────────────────────────────
echo "→ Step 3: Building..."
npm run build
echo "  ✓ Build OK"
echo ""

# ─── Step 4: Database Migrations ───────────────────────────────────────────────
if [ -n "${DATABASE_URL:-}" ]; then
  echo "→ Step 4: Pushing database schema..."
  npx drizzle-kit push
  echo "  ✓ Schema synced"
else
  echo "→ Step 4: No DATABASE_URL set — skipping migration"
  echo "  (Vercel will use the DATABASE_URL from its env vars)"
fi
echo ""

# ─── Step 5: Deploy ───────────────────────────────────────────────────────────
echo "→ Step 5: Deploying to Vercel ($ENVIRONMENT)..."

if [ "$ENVIRONMENT" = "production" ]; then
  vercel --prod
  echo ""
  echo "  ✓ Deployed to PRODUCTION"
  echo "  → https://localgenius.com (or your configured domain)"
else
  DEPLOY_URL=$(vercel 2>&1 | grep -o 'https://[^ ]*' | head -1)
  echo ""
  echo "  ✓ Deployed to PREVIEW"
  echo "  → $DEPLOY_URL"
fi

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  Deploy complete                         ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Post-deploy checklist:"
echo "  [ ] Verify /api/health returns ok"
echo "  [ ] Test login with demo credentials"
echo "  [ ] Send a test conversation message"
echo "  [ ] Check Sentry for any errors"
echo "  [ ] Verify cron job registered (Vercel dashboard → Crons)"
