# LocalGenius — Austin Launch Checklist

---

## Pre-Launch (Day Before)

### Pages & Rendering
- [x] `/landing` renders with terracotta/sage colors, phone mockup, value props
- [x] `/pricing` renders with two tiers, Pro highlighted, feature comparison
- [x] `/welcome` renders onboarding — 5 steps load, progress bar works
- [x] `/` renders conversation thread with header, input bar, bottom nav
- [x] `/digest` renders Weekly Digest with 3-act structure
- [ ] All pages render correctly on iPhone SE (320px) through iPad Pro
- [x] Source Sans 3 web font loads (check heading rendering)
- [ ] No horizontal scroll on any page at any breakpoint

### Onboarding Flow
- [x] Step 1: business name input + type grid + city auto-detect
- [x] Step 2: discovery animation → business profile card with reviews/rating
- [x] Step 3: photo upload — minimum 3 validation, preview thumbnails, remove
- [x] Step 4: priority selection — single tap advances
- [x] Step 5 (The Reveal): website preview in iframe, social post, Google listing, campaign
- [x] "Publish everything" → celebration confetti → transition to thread
- [x] Onboarding works end-to-end without errors in browser console

### Conversation AI
- [x] Type a message → AI response streams with typewriter effect
- [x] Response is contextual (mentions the business, uses warm voice)
- [x] System prompt follows brand rules (no "AI-powered", first person)
- [x] Approval cards render with Approve + Edit buttons
- [x] Approve → "Publishing..." → Published card with checkmark
- [x] Typing indicator (terracotta dots) appears during AI thinking

### Reviews
- [x] Review alerts appear in thread with star rating and draft response
- [x] "See AI Response" expands the draft
- [x] Approve sends the response
- [x] Negative reviews (1-2 stars) show urgent red border

### Weekly Digest
- [x] Renders 3 acts: What Happened, What I Did, What I Recommend
- [x] Sparkline chart renders (SVG, no external dependency)
- [x] Metrics show with display-size numbers and change indicators
- [x] Recommendation has actionable buttons

### Mobile
- [x] Touch targets >= 44px on all interactive elements
- [x] Input bar stays above keyboard on iOS and Android
- [x] Safe area insets applied (notch, home indicator)
- [x] Bottom nav has exactly 2 tabs: Thread and Digest
- [ ] Swipe gestures work (dismiss notifications, back navigation)

### Auth
- [x] Login with email + password
- [x] Registration with business info
- [x] Forgot password → email reset link
- [x] Reset password → new password → sign in
- [x] Voice input (mic button, push-to-talk)

### Infrastructure
- [x] Vercel deployment succeeds from git push
- [x] Environment variables set: ANTHROPIC_API_KEY, JWT_SECRET, DATABASE_URL
- [x] Database migrations applied (Neon PostgreSQL)
- [ ] Stripe webhook configured for billing events
- [x] CORS configured for production domain

---

## Launch Day

### Morning (Before First Invite)
- [x] Seed Maria's Kitchen demo account for internal testing
- [x] Run full onboarding flow with a real business name
- [x] Send a test message and verify AI response quality
- [x] Demo mode removed (app now uses real backend)
- [x] Check Vercel deployment is green, no function errors

### First 10 Restaurants (10am-12pm)
- [ ] GTM Lead visits first 5 restaurants with iPad demo
- [ ] Each restaurant gets a hands-on guided onboarding
- [ ] Document: time to complete onboarding, questions asked, friction points
- [ ] Verify each restaurant's generated website is live and correct
- [ ] Confirm first social post drafts look natural for each business

### Afternoon Monitoring (1pm-5pm)
- [ ] Check Vercel function logs — any 500 errors?
- [ ] Check Anthropic API usage — any rate limit hits?
- [ ] Check database — are conversations, messages, reviews storing correctly?
- [ ] Monitor AI cost per user (target: under $3/user/month)
- [ ] Verify review sync is pulling from Google Business Profile

### Evening (6pm-9pm)
- [ ] First review responses generated and queued for approval
- [ ] Check notification delivery (push, email)
- [ ] Verify no embarrassing AI content was auto-published (all should require approval in week 1)

---

## Post-Launch (Week 1)

### Daily
- [ ] Check Vercel dashboard — error rate, function duration, cold starts
- [ ] Check Anthropic dashboard — token usage, cost per day
- [ ] Check Sentry/error logs — any new exceptions?
- [ ] Review AI output quality — read 5 random generated posts and responses
- [ ] Check onboarding completion rate — how many started vs. finished?

### Day 3
- [ ] Compile first friction report from GTM Lead's objection log
- [ ] Check: are users returning after onboarding? (DAU/WAU)
- [ ] First check on 7-day activation: features used in first 48 hours
- [ ] Review any support messages — what are people asking?

### Day 5
- [ ] First batch of review responses should be going out
- [ ] Check social post publishing — are posts actually appearing on Instagram/Facebook?
- [ ] Verify Google Business Profile updates are propagating

### Day 7 — First Weekly Digest
- [ ] Sunday night: digest generation cron runs (check logs)
- [ ] Monday 7am: digests delivered via push + email
- [ ] Check open rate on digest emails
- [ ] Check: did any user tap the recommendation action?
- [ ] First NPS survey sent to users active > 5 days

---

## Week 1 Success Metrics

| Metric | Target | How to Measure |
|---|---|---|
| Onboarding completion rate | >80% | Started vs. completed Step 5 |
| 7-day activation (3+ features used) | >60% | Analytics events |
| First message sent within 24h | >70% | Conversation table |
| First review response approved | >50% of users with reviews | Review response status |
| Weekly Digest opened | >60% | Push notification + email open rate |
| AI cost per user | <$3/month | Anthropic dashboard / user count |
| Error rate | <1% of requests | Vercel function logs |
| First user says "this is incredible" | 1 | GTM Lead report |

---

## If Something Goes Wrong

| Problem | Immediate Action |
|---|---|
| AI generates inappropriate content | Disable auto-publish, review system prompt, add content filter |
| Vercel functions timing out | Check Anthropic API latency, add timeout with fallback response |
| Database connection errors | Check Neon status, verify connection string, check pool limits |
| User can't complete onboarding | Check browser console for errors, test with demo mode |
| Reviews not syncing | Check Google API credentials, verify cron job is running |
| Billing webhook failing | Check Stripe dashboard, verify webhook secret |
| User reports "it posted something wrong" | Pull the post immediately, apologize, review what happened |

---

*Launch is not a moment. It's the first day of proving the product works.
Everything after this checklist is listening, fixing, and making it better.*
