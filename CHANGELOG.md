# Changelog

All notable changes to LocalGenius.

---

## v1.2.0 — Hybrid AI Layer + Voice Input (2026-04-02)

### Added
- **Voice input** — hold-to-talk mic button with Whisper transcription via Cloudflare Workers AI
- **Image preview in ApprovalCard** — AI-generated images with shimmer loading and swap controls
- **Forgot/reset password flow** — /forgot-password, /reset-password pages + API routes
- **Interactive demo page** — /demo shows read-only conversation thread for visitors
- **AI UX specification** — 489-line design spec for hybrid Workers AI layer
- **Onboarding email sequence** — Day 3, Day 7, Day 14 lifecycle emails
- **Sales demo script** — 4-minute walk-in playbook for Austin restaurants
- Cloudflare Sites integration service (provision + update via MCP)
- Voice transcription proxy (/api/voice/transcribe)
- 10 new routing validation tests for Sites

### Fixed
- CORS on all Cloudflare API endpoints (Jensen #5)
- Insights engine persistence (Jensen #6)
- 27 TypeScript errors in test files (QA-002)
- Secondary button color: terracotta → sage per brand guide
- Validation errors: terracotta → error red per brand guide
- 7 microcopy brand violations (banned words, passive voice)
- Landing page nav: added About and Sign in links
- Onboarding page: added header with logo + sign-in link
- Marketing layout: added Sign in to nav
- Broken Unsplash images (tamales + dental hero)
- 5 TODO stubs wired to real API callbacks

### Changed
- Quick actions: generic commands instead of restaurant-specific
- Plan display: shows real tier from JWT, not hardcoded "Pro"
- Pricing page: uses shared marketing layout (removed duplicate nav/footer)
- Onboarding: real reverse geocoding via Nominatim API

### Stats
- Tests: 736 passing
- Source files: 204
- API endpoints: 40+

---

## v1.1.0 — Real Backend + Production Deploy (2026-04-02)

### Added
- **Neon PostgreSQL database** — real data persistence
- **Claude AI integration** — streaming conversations with claude-sonnet-4
- **Cookie-based auth** — httpOnly session cookies, auto-refresh
- **Maria's Kitchen seed data** — 20 reviews, 15 actions, 27 conversation messages
- Session management with JWT access + refresh tokens
- Database schema push via Drizzle
- Health check with DB + AI status

### Fixed
- Auth middleware: accepts cookies, not just Bearer tokens
- API client: credentials: 'include' instead of localStorage tokens
- Message normalization: DB shape (content.text, role: owner) → client types
- Model ID: claude-sonnet-4-20250514 (was incorrect claude-sonnet-4-6)
- Vercel env vars: trailing newlines from echo piping
- Health check: drizzle sql template instead of raw object
- AI SDK: lazy initialization for serverless cold starts
- Error handler: stopped leaking API key in responses

### Removed
- Demo mode files (demo-mode.ts, demo-data.ts, demo-conversation.ts) — 915 lines deleted
- MOCK_DISCOVERY and MOCK_REVEAL from onboarding
- localStorage token management

---

## v1.0.0 — Initial Release (2026-04-02)

### Added
- Conversation thread with 19 component types
- Onboarding flow (5 steps, 5 minutes)
- Weekly Digest with 3-act structure
- Approval cards with approve/edit/dismiss states
- Review alerts with AI-drafted responses
- Settings updates via conversation
- Haptic feedback library
- Celebration moment (confetti on publish)
- TypingIndicator with staggered pulse animation
- Landing page, pricing, about, login, register pages
- Marketing layout with shared nav/footer
- Brand guide with terracotta/sage palette
- Source Sans 3 typography system
- 19 React components
- 14 API endpoints
- Stripe billing integration
- Google/Meta OAuth scaffolding
- Cron jobs (digest, review sync)
- Security audit + timing-safe password comparison
- Error boundary + 404 page

---

*Built by Great Minds Agency — Steve Jobs, Elon Musk, Marcus Aurelius.*
