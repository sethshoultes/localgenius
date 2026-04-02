# LocalGenius Onboarding — Complete Copywriting Spec

*Every word. Every screen. Every state. A developer opens this file and never asks "what does this say?"*

---

## Global Elements

### Progress Bar
No text. A 3px terracotta line at the top. 20% per step. No step numbers, no labels, no dots.

### Back Button (Steps 2–4)
```
← Back
```

---

## Step 1: Tell Me About Your Business

**Progress**: 20%

### Heading
```
Let's get your business set up.
```

### Body
```
I just need a few things from you — this will take about five minutes.
```

### Business Name Input
| Element | Text |
|---|---|
| Placeholder | `Your business name` |
| aria-label | `Business name` |

### Business Type Grid
| Tile | Label |
|---|---|
| 🍽️ | `Restaurant` |
| 💇 | `Salon` |
| 🦷 | `Dental` |
| 🏥 | `Medical` |
| 🔧 | `Home Services` |
| 🏋️ | `Fitness` |
| 🛍️ | `Retail` |
| 📦 | `Other` |

### City
| State | Text |
|---|---|
| Auto-detected | `📍 Austin, TX` with `Edit` link |
| Manual entry placeholder | `What city are you in?` |
| Manual entry aria-label | `City` |

### Button
```
Continue
```

### Validation Errors
| Condition | Message |
|---|---|
| Business name empty | `What's your business called?` |
| No business type selected | `Tap your business type above.` |

---

## Step 2: Here's What I Found

**Progress**: 40%

### Loading State
```
Finding your business...
```
*(Centered. Pulsing glow animation. No other text on screen.)*

### Business Profile Card

**Business name**: `{businessName}` *(from Step 1 input)*

| Field | Format |
|---|---|
| Address | `📍 {address}` |
| Google rating | `⭐ {rating} on Google ({count} reviews) · {yelpStatus}` |
| Photos | `📸 {count} photos on Google · {instagramStatus}` |
| Website | `🌐 {websiteStatus}` |

### Affirmation Messages

| Condition | Message |
|---|---|
| Has reviews (any count) | `You've got a good foundation — {count} reviews with a {rating} average is solid. Let me help you build on that.` |
| Has reviews, minimal presence | `Good news — you already have {count} reviews. That's a head start. Let me fill in the gaps.` |
| No presence at all | `Starting fresh? Perfect. A blank page means we get to do this right from the beginning.` |
| Data still loading | `I found some things — still looking for more. Let's keep going.` |

### Competitors Section Header
```
NEARBY COMPETITION
```

### Competitor Row
```
{name}                    ⭐ {rating} ({reviewCount})
```

### Buttons
| Button | Text |
|---|---|
| Primary | `That's me` |
| Secondary (text link) | `Something wrong? Edit details` |

### Error States
| Condition | Message |
|---|---|
| No business found | *(Show empty card with)* `Starting fresh? Perfect. A blank page means we get to do this right from the beginning.` |
| All API calls failed | `I couldn't look you up right now — that's okay. I'll work with what you give me.` |
| Wrong business matched | *(User taps "Edit details" to correct — no separate error message)* |

---

## Step 3: Show Me Your Best

**Progress**: 60%

### Heading
```
Now show me what makes your business special.
```

### Body
```
Upload a few photos — your space, your team, your best work. I'll use these everywhere.
```

### Photo Grid
| Element | Text |
|---|---|
| Add button | `+` icon with `Add` label below |
| Add button aria-label | `Add photo` |
| Remove button aria-label | `Remove photo {n}` |
| Photo alt text | `Business photo {n}` |

### Description Input
| Element | Text |
|---|---|
| Placeholder | `What makes you special? (optional)` |
| aria-label | `Business description (optional)` |

### Hint
```
💡 the more photos you share, the better your site and posts will look
```

### Button
```
Continue
```

### Validation Errors
| Condition | Message |
|---|---|
| Fewer than 3 photos | `A few more photos will make your site and posts look great. Can you add at least 3?` |

### Photo Upload Errors
| Condition | Message |
|---|---|
| Upload failed | `That photo didn't upload. Tap to try again.` |
| File too large | `That photo is pretty large. Let me resize it.` |
| Camera permission denied | *(No error — just hide camera option, show camera roll only)* |

---

## Step 4: What Matters Most

**Progress**: 80%

### Heading
```
What matters most to you right now?
```

### Options

| Icon | Label | Sublabel |
|---|---|---|
| 🔍 | `Get found online` | `I need people to find me on Google` |
| ⭐ | `Manage my reviews` | `I need help with reviews and reputation` |
| 📱 | `Stay active on social` | `I need to post more consistently` |

*(Single tap advances to Step 5. No "Continue" button. The tap IS the action.)*

---

## Step 5: The Reveal

**Progress**: 100%

### Phase A: Loading (3–8 seconds)

**Business name**: `{businessName}` *(large, centered, fades in)*

**Tagline**: `{tagline}` *(appears 0.5s after business name)*

**Loading text** *(appears 1s after business name)*:
```
Building something beautiful...
```

### Phase B: The Reveal

**Heading**:
```
Here's what I built for you.
```

### Card 1: Website

**Section label**:
```
YOUR WEBSITE
```

**URL line**:
```
{businessname}atx.com — live now
```

**Buttons**: `View Site` · `Edit`

### Card 2: Social Post

**Section label**:
```
YOUR FIRST POST
```

**Post copy** *(AI-generated, example)*:
```
Nothing beats a slow Tuesday with fresh guacamole and good company. Come see us on South Lamar — your table is ready. 🌮
```

**Buttons**: `Post Now` · `Edit`

### Card 3: Google Listing

**Section label**:
```
YOUR GOOGLE LISTING
```

**Optimization list**:
```
✓ Updated business description with local keywords
✓ Added hours and holiday schedule
✓ Drafted response for latest review
```

**Buttons**: `Looks Good` · `Edit`

### Card 4: Campaign

**Section label**:
```
FIRST CAMPAIGN
```

**Campaign suggestion** *(varies by Step 4 priority)*:

| Priority | Suggestion |
|---|---|
| Get found online | `Ask your 5 most recent customers for a Google review.` |
| Manage my reviews | `Respond to your latest reviews and ask happy customers for more.` |
| Stay active on social | `Post your best dish photo with a story about why it's special.` |

**Buttons**: `Start Campaign` · `Later`

### Master Publish Button
```
Looks good — publish everything
```

### Post-Publish Success

**Icon**: Sage green circle with white checkmark

**Heading**:
```
Published!
```

**Body**:
```
Welcome to LocalGenius.
```

*(Holds for 2 seconds, then transitions to the main conversation thread.)*

### Reveal Error States

| Condition | Message |
|---|---|
| Website generation failed | `Your website is almost ready — I'll have it live within the hour. I'll let you know.` |
| Social post generation failed | `I'm still working on your first post. It'll be in your thread shortly.` |
| Google API timeout | `Your Google listing updates can take 24-48 hours to appear. I've submitted the changes — I'll confirm when they're live.` |
| All generation failed | `I hit a snag setting things up. Give me a few minutes and check back — everything will be in your thread.` |
| Partial results (2 of 4 ready) | *(Show what's ready. Placeholder for what's not. The reveal still works.)* |

---

## Post-Onboarding: First Message in Thread

**System message** *(appears within 1 hour of onboarding completion)*:
```
Your site is live at {businessname}atx.com — {n} people have already visited. I'll post your first social update tomorrow morning. In the meantime, I drafted responses to your {n} most recent Google reviews. Want to take a look?
```

---

## Network & System Error States

These can appear on any step.

| Condition | Message |
|---|---|
| No internet connection | `I need an internet connection to look up your business. Can you check your connection?` |
| Connection lost mid-step | *(Subtle banner at top, not a modal)* `Reconnecting...` |
| Connection restored | `Back online` *(shows for 2 seconds, then fades)* |
| Server error (500) | `Something went wrong on my end. Let me try that again.` with retry button |
| Timeout (>10 seconds) | `This is taking longer than usual. Still working...` |

---

## Copy Rules (For Anyone Writing New Screens)

1. **First person.** LocalGenius says "I" — not "we," not "the system," not passive voice.
2. **Warm, not cute.** "Let me help you build on that." — not "Let's gooo! 🚀"
3. **Specific, not vague.** "28 reviews with a 4.3 average" — not "a good online presence."
4. **Short.** If a heading needs more than 8 words, rewrite it.
5. **No jargon.** See the full banned-words list in `docs/brand-guide.md`.
6. **Errors are conversations.** "I couldn't find your business — no worries, I'll build from scratch." Not "Error: Business not found (404)."
7. **Never blame the user.** "I hit a snag" — not "Something you entered was incorrect."
8. **Buttons are verbs.** "Continue," "Save," "Post Now." Not "Submit," "Next," "OK."
9. **Placeholders are examples.** "Your business name" — not "Enter business name here."
10. **Every screen answers one question.** Step 1: "Who are you?" Step 2: "Is this you?" Step 3: "Show me." Step 4: "What do you need?" Step 5: "Here's what I built."
