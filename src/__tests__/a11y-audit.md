# LocalGenius Frontend Accessibility Audit

**Date:** 2026-04-01
**Auditor:** Automated A11y Review (Claude)
**Standard:** WCAG 2.1 AA
**Scope:** All frontend components and pages listed in the application

---

## 1. Executive Summary

### Overall Assessment: NEEDS REMEDIATION

| Category | Pass | Fail | Critical |
|----------|------|------|----------|
| Color Contrast | 8 | 11 | 5 |
| ARIA Labels | 12 | 4 | 2 |
| Keyboard Navigation | 6 | 5 | 3 |
| Screen Reader | 8 | 3 | 1 |
| Focus Management | 3 | 4 | 2 |
| Semantic HTML | 9 | 3 | 1 |
| **Totals** | **46** | **30** | **14** |

### Critical Issues (Must Fix)

1. **Terracotta (#C4704B) on Warm White (#FAF8F5) fails AA** at 3.44:1 -- affects all links, accent text, and the secondary button variant text across the entire app.
2. **White (#FFFFFF) on Terracotta (#C4704B) fails AA for normal text** at 3.64:1 -- affects all primary button labels.
3. **Gold (#D4A853) on Warm White (#FAF8F5) fails AA** at 2.08:1 -- star ratings are effectively invisible to low-vision users.
4. **Slate Light (#9CA3AF) placeholder text fails AA** at 2.40:1 -- all input placeholders across the app are inaccessible.
5. **Onboarding page has multiple unlabeled form inputs** -- business name input (line 275) and city input (line 323) have no associated `<label>` elements or `aria-label` attributes.

---

## 2. Color Contrast Audit

### Methodology

Contrast ratios calculated using the WCAG 2.1 relative luminance formula:
- Linearize each sRGB channel: if C <= 0.04045 then C/12.92, else ((C+0.055)/1.055)^2.4
- Relative luminance L = 0.2126*R + 0.7152*G + 0.0722*B
- Contrast ratio = (L_lighter + 0.05) / (L_darker + 0.05)

WCAG AA thresholds: 4.5:1 for normal text (<18px regular, <14px bold), 3:1 for large text (>=18px regular or >=14px bold).

### Results

| Foreground | Background | Usage | Ratio | Required | Result |
|------------|-----------|-------|-------|----------|--------|
| Charcoal #2C2C2C | Warm White #FAF8F5 | Primary text on app background | **13.17:1** | 4.5:1 | PASS |
| Terracotta #C4704B | Warm White #FAF8F5 | Links, accent text, secondary button text | **3.44:1** | 4.5:1 | **FAIL** |
| White #FFFFFF | Terracotta #C4704B | Primary button label text | **3.64:1** | 4.5:1 | **FAIL** |
| Slate #6B7280 | Warm White #FAF8F5 | Secondary text on background | **4.56:1** | 4.5:1 | PASS |
| Slate Light #9CA3AF | Warm White #FAF8F5 | Placeholder text in inputs | **2.40:1** | 4.5:1 | **FAIL** |
| White #FFFFFF | Sage #7A8B6F | Text on sage-colored elements (if used) | **3.65:1** | 4.5:1 | **FAIL** |
| Error #C0392B | Warm White #FAF8F5 | Error text on background | **5.13:1** | 4.5:1 | PASS |
| Gold #D4A853 | Warm White #FAF8F5 | Star ratings, celebration icons | **2.08:1** | 4.5:1 | **FAIL** |
| Error Dark #962D22 | Error Light #FADBD8 | Error banner text on error bg | **6.01:1** | 4.5:1 | PASS |
| Charcoal #2C2C2C | Cream #F2EDE8 | Text on card backgrounds | **12.01:1** | 4.5:1 | PASS |
| Slate #6B7280 | Cream #F2EDE8 | Secondary text on cards | **4.16:1** | 4.5:1 | **FAIL** |
| Terracotta #C4704B | Terracotta Light #F5E0D5 | Text on selected/active state bg | **2.86:1** | 4.5:1 | **FAIL** |
| Charcoal #2C2C2C | Terracotta Light #F5E0D5 | Text on user message bubble | **10.98:1** | 4.5:1 | PASS |
| Slate Light #9CA3AF | Cream #F2EDE8 | Placeholder text on card bg | **2.18:1** | 4.5:1 | **FAIL** |
| Sage #7A8B6F | Warm White #FAF8F5 | Success text, status bar text | **3.45:1** | 4.5:1 | **FAIL** |
| Sage #7A8B6F | Cream #F2EDE8 | Sage text on card (bullet points) | **3.14:1** | 4.5:1 | **FAIL** |
| Gold #D4A853 | Cream #F2EDE8 | Gold star on card background | **1.90:1** | 4.5:1 | **FAIL** |

#### Large Text Exceptions (3:1 threshold)

| Foreground | Background | Usage | Ratio | Required | Result |
|------------|-----------|-------|-------|----------|--------|
| White #FFFFFF | Terracotta #C4704B | Button label at 16px semibold (NOT large text) | **3.64:1** | 3:1 | PASS (but see note) |
| Terracotta #C4704B | Warm White #FAF8F5 | Heading text at 18px+ | **3.44:1** | 3:1 | PASS |

**Note on Button text:** Button labels use `--font-size-body` (16px) with `font-semibold` (600 weight). At 16px, bold text must be 14px+ to qualify as "large text" under WCAG. 16px bold qualifies as large text (>=14px bold), so **White on Terracotta passes at 3:1 for button labels specifically**. However, any non-bold Terracotta text at normal size still fails.

### Suggested Color Fixes

| Current Color | Suggested Replacement | New Ratio on Warm White | Notes |
|---------------|----------------------|------------------------|-------|
| Terracotta #C4704B | #A85835 (darker terracotta) | ~4.8:1 | Maintains warm tone |
| Slate Light #9CA3AF | #75808C | ~4.6:1 | For placeholders |
| Gold #D4A853 | #9A7B2D | ~5.0:1 | For text; keep #D4A853 for decorative-only |
| Sage #7A8B6F | #5E6D53 | ~5.1:1 | For text content |

---

## 3. Component-by-Component Audit

### 3.1 Button.tsx (`src/components/shared/Button.tsx`)

**Severity: Medium**

| Finding | Line(s) | Severity | Details |
|---------|---------|----------|---------|
| PASS: Has required `label` prop | 11 | -- | The `label` prop ensures button always has visible text. Good. |
| PASS: Loading state has `aria-label` | 61 | -- | `aria-label="Loading"` on the loading spinner. |
| FAIL: No visible focus ring style | 46-56 | High | No `focus-visible:ring` or `focus:outline` class. The button relies only on browser default focus, which is inconsistent across browsers and may be invisible on some backgrounds. |
| FAIL: Disabled state uses `opacity-40` | 51 | Medium | 40% opacity on an already-failing contrast ratio (White on Terracotta) makes disabled buttons completely unreadable. |
| PASS: Meets minimum tap target | 29 | -- | `min-h-tap-primary` (56px) for default, `min-h-tap-min` (44px) for small. |
| INFO: `active:scale-[0.98]` respects `prefers-reduced-motion` | 50, tokens.css:215-224 | -- | The global reduced-motion media query covers this. |

**Recommendations:**
1. Add explicit focus style: `focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2`
2. Darken Terracotta to pass 4.5:1 for normal text, or ensure button text qualifies as large text
3. Use a different disabled pattern than pure opacity reduction (e.g., distinct gray background with sufficient contrast)

---

### 3.2 Input.tsx (`src/components/shared/Input.tsx`)

**Severity: High**

| Finding | Line(s) | Severity | Details |
|---------|---------|----------|---------|
| PASS: Textarea has `aria-label` | 132 | -- | `aria-label="Message input"` present. |
| PASS: Mic button has dynamic `aria-label` | 147 | -- | Changes between recording/non-recording states. Good. |
| PASS: Send button has `aria-label` | 173 | -- | `aria-label="Send message"` present. |
| FAIL: Placeholder text contrast | 127 | High | `placeholder:text-slate-light` (#9CA3AF) on `bg-cream` (#F2EDE8) = 2.18:1. Fails AA. |
| FAIL: Mic button relies on mouse/touch only for recording | 138-140 | Critical | `onMouseDown`/`onMouseUp`/`onTouchStart`/`onTouchEnd` -- no keyboard equivalent. A keyboard user cannot trigger voice recording. Needs `onKeyDown`/`onKeyUp` handlers for Enter or Space. |
| FAIL: Send button only appears when text exists | 160 | Medium | Conditionally rendered; screen reader users may not know it appeared. Consider `aria-live` region or always rendering it (disabled when empty). |
| FAIL: No focus indicator on textarea | 128-130 | Medium | Uses `border-transparent focus:border-terracotta` but Terracotta on white/cream is subtle (3.44:1). No ring or outline. |
| PASS: Keyboard submit via Enter | 67-74 | -- | Enter key sends, Shift+Enter for newline. Standard pattern. |
| PASS: Auto-growing textarea | 112-117 | -- | Good UX pattern. |
| WARN: Recording indicator is visual-only | 154-156 | Medium | The pulsing dot is `animate-pulse-glow` with no screen reader announcement that recording is active beyond the aria-label change on the button itself. |

**Recommendations:**
1. Add keyboard handlers to mic button: `onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleMicPress(); }}`
2. Darken placeholder color to #75808C or similar
3. Add a stronger focus ring to textarea
4. Add `aria-live="assertive"` announcement when recording starts/stops

---

### 3.3 ErrorBanner.tsx (`src/components/shared/ErrorBanner.tsx`)

**Severity: Low (well-implemented)**

| Finding | Line(s) | Severity | Details |
|---------|---------|----------|---------|
| PASS: Uses `role="alert"` | 17 | -- | Correct; screen readers will announce this immediately. |
| PASS: Error text uses Error Dark on Error Light | 36 | -- | 6.01:1 contrast ratio. Passes AA. |
| PASS: Retry button has `aria-label` | 43 | -- | `aria-label="Retry"`. |
| PASS: Dismiss button has `aria-label` | 53 | -- | `aria-label="Dismiss error"`. |
| PASS: Buttons meet tap target minimum | 41, 51 | -- | `min-h-tap-min` (44px). |
| WARN: Dismiss button uses `x` character | 55 | Low | Uses `x` (multiplication sign). Screen readers may read this as "times." Consider using an SVG X icon with the existing aria-label, or use `&times;` which is slightly better but still relies on the aria-label. Current implementation is acceptable due to aria-label. |

**Recommendations:**
1. Replace `x` with an SVG icon for consistency with the rest of the design system.

---

### 3.4 Skeleton.tsx (`src/components/shared/Skeleton.tsx`)

**Severity: Medium**

| Finding | Line(s) | Severity | Details |
|---------|---------|----------|---------|
| FAIL: No `aria-label` or `role` on skeletons | 11-18, 27-65 | Medium | Skeleton elements are purely visual `<div>` elements with no indication to screen readers that content is loading. |
| FAIL: No `aria-busy` on containing regions | 70-122 | Medium | Pre-composed skeletons (MessageSkeleton, DigestSkeleton) should signal loading state. |
| PASS: Reduced motion respected | tokens.css:215 | -- | Animation duration is reduced globally. |

**Recommendations:**
1. Add `role="status"` and `aria-label="Loading content"` to the top-level skeleton container.
2. Add `aria-busy="true"` to the parent region while skeleton is showing.
3. Alternatively, add a visually hidden "Loading..." text inside each pre-composed skeleton.

---

### 3.5 ConversationThread.tsx (`src/components/conversation/ConversationThread.tsx`)

**Severity: Low (well-implemented)**

| Finding | Line(s) | Severity | Details |
|---------|---------|----------|---------|
| PASS: Uses `role="log"` | 106 | -- | Correct semantic role for a message feed. |
| PASS: Uses `aria-live="polite"` | 107 | -- | New messages will be announced without interrupting. |
| PASS: Has `aria-label` | 108 | -- | `aria-label="Conversation thread"`. |
| WARN: Typing indicator has no screen reader text | 114-121 | Medium | Three animated dots are purely visual. No `aria-label` or visually hidden text says "typing" or "loading response." |
| PASS: Auto-scroll behavior is non-disruptive | 36-46 | -- | Only scrolls when near bottom. Good. |
| WARN: Report card (line 91-95) lacks `<article>` or role | 91 | Low | Unlike ApprovalCard which uses `<article>`, report_card is a plain `<div>`. |

**Recommendations:**
1. Add `aria-label="LocalGenius is typing"` or a visually hidden `<span>` to the typing indicator div.
2. Wrap report_card in `<article>` for consistency.

---

### 3.6 MessageBubble.tsx (`src/components/conversation/MessageBubble.tsx`)

**Severity: Low**

| Finding | Line(s) | Severity | Details |
|---------|---------|----------|---------|
| PASS: Retry button has `aria-label` | 40 | -- | `aria-label="Message failed. Tap to retry."` Clear and actionable. |
| FAIL: No `role` on message containers | 23 | Medium | Messages are `<div>` elements with no semantic role. Screen readers won't identify them as distinct messages. |
| FAIL: Timestamps hidden by default | 53 | Low | `showTimestamp` defaults to `false`. Screen readers have no way to access message time unless explicitly enabled. |
| PASS: Text content is accessible | 36 | -- | Plain text in standard elements. |
| WARN: User vs system bubble distinction is visual only | 23-32 | Medium | Color and alignment distinguish user from system messages. Screen readers receive no indication of who sent the message. |

**Recommendations:**
1. Add `role="listitem"` to each bubble (and `role="list"` to the thread container, or keep `role="log"`).
2. Add a visually hidden prefix: `<span className="sr-only">You said:</span>` or `<span className="sr-only">LocalGenius said:</span>`.
3. Include timestamp in an accessible way, e.g., `<time>` element with `aria-label`.

---

### 3.7 ApprovalCard.tsx (`src/components/conversation/ApprovalCard.tsx`)

**Severity: Medium**

| Finding | Line(s) | Severity | Details |
|---------|---------|----------|---------|
| PASS: Uses `<article>` with `aria-label` | 90-93 | -- | `aria-label="Action requiring your approval: ${title}"`. Excellent. |
| PASS: Success state uses `aria-live="polite"` | 139 | -- | Status changes announced to screen readers. |
| FAIL: Undo button in dismissed state has no `aria-label` | 79-84 | Medium | Plain text "Undo" -- acceptable, but the context (what is being undone) is unclear without the struck-through title, which a screen reader may not convey as dismissed. |
| FAIL: Error retry button has no `aria-label` | 103-108 | Medium | The error message + arrow is the only content. Screen reader will read the text but "Tap to try again" may not be clear as a button. |
| PASS: Action buttons use Button component with labels | 115-130 | -- | Labels come from props. |
| WARN: Dismissed state reduces opacity to 40% | 77 | Low | Combined with `line-through`, the visual signal is adequate, but 40% opacity on Slate text on cream will fail contrast. |

**Recommendations:**
1. Add `aria-label="Undo dismissal of ${title}"` to the Undo button.
2. Add `aria-label="Retry: ${errorMessage}"` to the error retry button.
3. Ensure dismissed state text still meets contrast minimums.

---

### 3.8 WeeklyDigest.tsx (`src/components/digest/WeeklyDigest.tsx`)

**Severity: Medium**

| Finding | Line(s) | Severity | Details |
|---------|---------|----------|---------|
| PASS: Uses semantic `<header>` | 42 | -- | Greeting wrapped in header landmark. |
| PASS: Uses `<section>` with `aria-label` for each act | 53, 79, 95 | -- | Clear section labels: "What happened this week", etc. |
| PASS: Proper heading hierarchy | 43, 54, 82, 98 | -- | h1 for page title, h2 for section headings. Correct. |
| FAIL: Trend chart placeholder has no text alternative | 71-76 | High | `aria-label="Weekly trend chart"` exists but the content is just decorative text "Trend chart." When a real chart is implemented, it needs a data table or detailed `aria-label` with the actual data. |
| FAIL: Section headings use `text-caption` (13px) | 54, 82, 98 | Medium | h2 elements styled at 13px uppercase are visually de-emphasized but semantically important. This is a design choice that could confuse users who rely on heading navigation and expect headings to be prominent. Consider using `aria-roledescription` or restructuring. |
| FAIL: `weekOf` date text uses Slate Light | 49 | High | `text-slate-light` (#9CA3AF) on Warm White = 2.40:1. Fails AA. |
| WARN: Metric change text uses Sage | 63 | Medium | `text-sage` (#7A8B6F) on Warm White = 3.45:1. Fails AA for normal text. "up 12%" would be hard to read for low-vision users. |
| PASS: Uses `<ul>` and `<li>` for action list | 83-89 | -- | Proper list semantics. |

**Recommendations:**
1. Darken Slate Light to meet 4.5:1 for date text.
2. Darken Sage for metric change annotations.
3. Ensure chart has a data table alternative or detailed aria description when implemented.

---

### 3.9 AppLayout.tsx (`src/app/(app)/layout.tsx`) -- Bottom Navigation

**Severity: Medium**

| Finding | Line(s) | Severity | Details |
|---------|---------|----------|---------|
| PASS: Nav uses `role="tablist"` with `aria-label` | 85-86 | -- | `aria-label="Main navigation"`. |
| PASS: Tab links use `role="tab"` and `aria-selected` | 99-100 | -- | Correct tab pattern. |
| PASS: Tab links have `aria-label` | 101 | -- | Label matches visible text. |
| FAIL: Tab links use `<a>` (via Next.js `Link`) with `role="tab"` | 89-106 | Medium | ARIA tabs pattern expects `role="tabpanel"` on the content region, and keyboard navigation with arrow keys (not Tab). Using links with tab roles is a hybrid pattern that may confuse screen readers. |
| FAIL: No focus visible style on nav links | 92-98 | High | No `focus-visible:` classes. Focus indicator defaults to browser outline which may not be visible against the white background. |
| PASS: Uses semantic `<nav>` element | 78 | -- | Correct landmark. |
| PASS: Uses semantic `<main>` for content | 73 | -- | Correct landmark. |
| PASS: Uses semantic `<header>` | 62 | -- | Correct landmark. |
| WARN: Header h1 is hardcoded | 67 | Low | "Maria's Kitchen" is hardcoded. Not an a11y issue per se, but worth noting. |
| WARN: Status text "Everything's handled" uses Sage | 68 | Medium | `text-sage` (#7A8B6F) on white (#FFFFFF) = approximately 3.5:1. Fails AA for normal text at 13px caption size. |

**Recommendations:**
1. Either commit fully to the ARIA tabs pattern (add `role="tabpanel"`, arrow key navigation) or switch to a simpler `<nav>` with `aria-current="page"` pattern (recommended for page navigation).
2. Add visible focus styles to navigation links.
3. Darken Sage status text.

---

### 3.10 ThreadPage (`src/app/(app)/page.tsx`)

**Severity: Low**

| Finding | Line(s) | Severity | Details |
|---------|---------|----------|---------|
| PASS: Error banner integrated correctly | 169-174 | -- | ErrorBanner with retry and dismiss handlers. |
| PASS: Loading state shows skeleton | 163-165 | -- | MessageSkeleton displayed during init. |
| WARN: Skeleton has no `aria-busy` on parent | 163-165 | Medium | When `isInitLoading` is true, there is no `aria-busy` attribute on the containing region. |
| PASS: Input component properly wired | 185-191 | -- | All props passed correctly. |
| INFO: Streaming content added as regular message | 153-161 | -- | Streaming content appears as a system_message in the thread, which the `aria-live="polite"` region will announce. |

**Recommendations:**
1. Wrap the skeleton/content area in a region with `aria-busy={isInitLoading}`.

---

### 3.11 DigestPage (`src/app/(app)/digest/page.tsx`)

**Severity: Low**

| Finding | Line(s) | Severity | Details |
|---------|---------|----------|---------|
| PASS: Error state uses ErrorBanner | 66-73 | -- | Correctly shows banner with retry. |
| PASS: Loading state uses DigestSkeleton | 61-63 | -- | Skeleton displayed. |
| FAIL: Empty state icon has no alt text | 81-84 | Low | SVG chart icon in the empty state `<div>` has no `aria-label`. The parent div has no role. |
| FAIL: Empty state heading `<h2>` has no heading level context | 86 | Low | "Your first digest is on its way." -- the h2 is correct in hierarchy but lacks any visual heading style class, so it inherits body styles. Minor semantic issue. |

**Recommendations:**
1. Add `aria-hidden="true"` to the decorative SVG in empty state, or add a role/label to the container.

---

### 3.12 OnboardingPage (`src/app/(onboarding)/welcome/page.tsx`)

**Severity: Critical**

| Finding | Line(s) | Severity | Details |
|---------|---------|----------|---------|
| PASS: Progress bar uses `role="progressbar"` | 242-246 | -- | Has `aria-valuenow`, `aria-valuemin`, `aria-valuemax`. |
| PASS: Back button has `aria-label` | 257 | -- | `aria-label="Go back"`. |
| FAIL: Business name input has no label | 275-284 | Critical | No `<label>`, no `aria-label`, no `aria-labelledby`. Only a `placeholder` attribute, which is NOT a substitute for a label. Screen readers may not announce what this field is for. |
| FAIL: City input has no label | 323-329 | Critical | Same issue as business name input. |
| FAIL: Description input has no label | 483-488 | High | Same issue. `placeholder="What makes you special?"` is not a label. |
| FAIL: Business type buttons have no group label | 287-308 | High | The grid of business type buttons uses `aria-pressed` (good) but the group has no `role="group"` or `aria-label` to explain what the buttons represent. |
| PASS: Business type buttons use `aria-pressed` | 302 | -- | Toggle state communicated correctly. |
| PASS: Photo remove buttons have `aria-label` | 452 | -- | `aria-label="Remove photo ${i + 1}"`. Good. |
| PASS: Add photo button has `aria-label` | 462 | -- | `aria-label="Add photo"`. |
| PASS: Hidden file input has `aria-hidden` | 480 | -- | Correctly hidden from assistive tech. |
| FAIL: Priority buttons have no `aria-pressed` or selection state | 519-530 | High | Unlike business type buttons, priority selection buttons have no ARIA state indicating selection. Clicking navigates to next step, so this may be acceptable as a one-shot action, but the pattern is inconsistent. |
| FAIL: Validation errors not linked to inputs | 333-335, 495-497 | High | Validation error messages are displayed as standalone `<p>` elements. They are not linked to the invalid input via `aria-describedby` or `aria-errormessage`. Screen readers won't associate the error with the field. |
| WARN: Step transitions have no screen reader announcement | 122-125 | Medium | When step changes, new content replaces old content with no `aria-live` region or focus management to alert screen readers. |
| FAIL: "Something wrong? Edit details" button (line 417-419) has no `aria-label` and no visible action | 417-419 | Medium | This button has no `onClick` handler. It is non-functional. |
| WARN: Emoji icons used for business types | 30-37 | Low | Emojis are used as icons. Screen readers will read them (e.g., "fork and knife" for the restaurant emoji). This may add noise but is generally acceptable. |
| FAIL: Reveal step (Step 5) "Book a Table" and "View Menu" are decorative divs, not buttons | 633-638 | Medium | These look like buttons but are `<div>` elements. Not interactive, but visually misleading. If they become interactive, they MUST be `<button>` elements. |
| PASS: Photo alt text provided | 445 | -- | `alt="Business photo ${i + 1}"`. |
| PASS: Social post preview image has alt | 665 | -- | `alt="Social post preview"`. |
| WARN: Hero image in reveal has empty alt | 613 | Low | `alt=""` is acceptable for decorative images, but this is the business hero photo. Consider a descriptive alt. |

**Recommendations:**
1. Add `aria-label` to all three text inputs (business name, city, description).
2. Wrap business type buttons in a `<fieldset>` with `<legend>` or use `role="group"` with `aria-label="Business type"`.
3. Link validation errors to inputs with `aria-describedby`.
4. Add focus management on step transitions: focus the heading of the new step.
5. Add `role="alert"` to validation error messages.
6. Remove or implement the non-functional "Edit details" button.

---

## 4. Keyboard Navigation Audit

### Summary

| Component | Keyboard Accessible | Issues |
|-----------|-------------------|--------|
| Button.tsx | Partial | No visible focus ring |
| Input.tsx textarea | Yes | Enter to send, Shift+Enter for newline |
| Input.tsx mic button | **No** | Only mouse/touch handlers; no keyboard equivalent |
| Input.tsx send button | Yes | Standard button; keyboard accessible |
| ErrorBanner buttons | Yes | Standard buttons |
| ConversationThread | Yes | Scrollable with keyboard |
| ApprovalCard buttons | Yes | Uses Button component |
| WeeklyDigest buttons | Yes | Uses Button component |
| AppLayout nav tabs | Yes | Links are keyboard focusable |
| Onboarding business type grid | Yes | Buttons are keyboard focusable |
| Onboarding photo upload | Yes | Hidden input triggered by button |
| Onboarding photo remove | Partial | `opacity-0 group-hover:opacity-100` -- remove button is invisible without hover, making it undiscoverable for keyboard users (line 451) |
| Onboarding priority buttons | Yes | Standard buttons |

### Critical Keyboard Issues

1. **Mic button (Input.tsx, lines 136-157):** Voice recording is triggered by `onMouseDown`/`onMouseUp`. There are no `onKeyDown`/`onKeyUp` handlers. Keyboard users cannot use voice input at all.

2. **Photo remove button (welcome/page.tsx, line 448-454):** The remove button uses `opacity-0 group-hover:opacity-100`. This CSS pattern makes the button invisible unless hovered. Keyboard users who tab to it will find an invisible button. Fix: add `focus:opacity-100` or `focus-within:opacity-100`.

3. **No focus trap in any overlay/modal state:** While there are no explicit modals in the current codebase, the loading/generating states in onboarding (lines 536-568) replace all content without managing focus. If a user tabs during the transition, focus may land on removed DOM elements.

4. **Tab navigation order in Input.tsx:** The send button conditionally renders (line 160). When it appears, it shifts the tab order. Screen reader users may not realize a new button appeared.

---

## 5. Screen Reader Audit

### Linear Reading Order

| Page | Reading Order | Assessment |
|------|--------------|------------|
| Thread Page | Header -> Error (if any) -> Messages (chronological) -> Input | Good |
| Digest Page | Header -> Greeting -> Highlights -> Chart -> Actions -> Recommendation | Good |
| Onboarding | Progress bar -> Back button -> Step content -> Continue button | Good |

### Landmark Structure

```
AppLayout:
  <header>     -- "Maria's Kitchen" + status
  <main>       -- Page content
  <nav>        -- Bottom tabs (role="tablist")
```

This is a solid landmark structure. Screen reader users can navigate by landmarks effectively.

### Issues

1. **Message sender identity not announced:** MessageBubble (line 23) uses visual position (left/right alignment) and color to distinguish user from system messages. Screen readers receive no indication of who sent the message. A `sr-only` prefix is needed.

2. **Typing indicator is silent:** ConversationThread (lines 114-121) shows animated dots. No text alternative for screen readers. Add a visually hidden "LocalGenius is responding" message.

3. **Onboarding step changes are silent:** When the step number changes, the entire content area re-renders. No `aria-live` region announces the transition. Focus stays where it was (possibly on a now-removed element). The progress bar updates via `aria-valuenow` but this is not announced unless the user navigates to it.

4. **Skeleton loading states are invisible:** All three skeleton components (MessageSkeleton, DigestSkeleton, OnboardingDiscoverySkeleton) render loading placeholder divs with no screen reader announcement. Users hear silence while content loads.

5. **Star ratings in onboarding (line 642):** The star character `★` followed by a number is acceptable, but adding `aria-label` like `"Rated 4.3 out of 5"` would be clearer.

---

## 6. Recommendations (Prioritized)

### P0 -- Critical (Fix Before Launch)

1. **Darken Terracotta for text usage.** Current #C4704B fails AA at 3.44:1 on Warm White. Suggest #A85835 or darker. This affects: secondary button variant text, ghost button text, link text, terracotta captions throughout the app. *(All files using `text-terracotta`)*

2. **Fix White on Terracotta button contrast.** At 3.64:1, primary buttons pass only if text qualifies as large (>=14px bold). Verify all button sizes meet this, or darken the button background. *(Button.tsx line 19)*

3. **Add labels to all onboarding inputs.** Business name (line 275), city (line 323), and description (line 488) inputs must have `aria-label` or associated `<label>` elements. *(welcome/page.tsx)*

4. **Add keyboard support to mic button.** Add `onKeyDown` and `onKeyUp` handlers for Space/Enter keys. *(Input.tsx lines 136-157)*

5. **Fix Gold (#D4A853) text contrast.** 2.08:1 on Warm White is severely insufficient. Use Gold only as a decorative color (with `aria-hidden`), not for text that conveys meaning. For star ratings, add a text label. *(welcome/page.tsx line 642, WeeklyDigest.tsx)*

### P1 -- High (Fix Before Beta)

6. **Add visible focus indicators to all interactive elements.** Add `focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-terracotta` to: Button.tsx, navigation links in layout.tsx, all custom buttons in onboarding. *(Button.tsx, layout.tsx, welcome/page.tsx)*

7. **Darken Slate Light (#9CA3AF) for placeholder text.** 2.40:1 fails. Suggest #75808C (~4.6:1). *(tokens.css line 36, all inputs)*

8. **Link validation errors to inputs** using `aria-describedby`. Add `role="alert"` to error messages. *(welcome/page.tsx lines 333, 495)*

9. **Fix Slate (#6B7280) on Cream (#F2EDE8).** 4.16:1 barely fails. Darken to #5F6673 for 4.6:1. *(All components using `text-slate` on cards)*

10. **Fix Sage text contrast.** 3.45:1 on Warm White fails. Darken to #5E6D53. *(WeeklyDigest.tsx, layout.tsx, ApprovalCard.tsx)*

### P2 -- Medium (Fix Before GA)

11. **Add screen reader announcements for message sender identity.** Add `sr-only` text prefix to each MessageBubble. *(MessageBubble.tsx)*

12. **Add loading announcements to skeletons.** Use `role="status"` and `aria-label="Loading"`. *(Skeleton.tsx)*

13. **Manage focus on onboarding step transitions.** Focus the heading of each new step. *(welcome/page.tsx)*

14. **Add screen reader text to typing indicator.** *(ConversationThread.tsx line 114)*

15. **Fix photo remove button keyboard discoverability.** Add `focus:opacity-100` to the remove button. *(welcome/page.tsx line 451)*

16. **Reconsider nav tab pattern.** Replace `role="tab"` / `role="tablist"` on navigation links with `aria-current="page"` pattern, which is the standard for page navigation. *(layout.tsx)*

### P3 -- Low (Continuous Improvement)

17. Replace `x` dismiss character with SVG icon in ErrorBanner.
18. Add `aria-busy` to regions showing skeleton loaders.
19. Add `<time>` elements for all timestamps.
20. Ensure all decorative emojis have `aria-hidden="true"` or are acceptable screen reader output.
21. Add descriptive alt text to the onboarding hero photo.

---

## Appendix: Luminance Values Reference

| Color | Hex | Relative Luminance |
|-------|-----|-------------------|
| White | #FFFFFF | 1.0000 |
| Warm White | #FAF8F5 | 0.9405 |
| Cream | #F2EDE8 | 0.8527 |
| Terracotta Light | #F5E0D5 | 0.7753 |
| Error Light | #FADBD8 | 0.7594 |
| Gold Light | #F5EDD8 | (not critical) |
| Sage Light | #E8EDE5 | (not critical) |
| Gold | #D4A853 | 0.4263 |
| Slate Light | #9CA3AF | 0.3636 |
| Terracotta | #C4704B | 0.2383 |
| Sage | #7A8B6F | 0.2375 |
| Slate | #6B7280 | 0.1672 |
| Error | #C0392B | 0.1431 |
| Error Dark | #962D22 | 0.0848 |
| Charcoal Soft | #3D3D3D | (not critical) |
| Charcoal | #2C2C2C | 0.0252 |
