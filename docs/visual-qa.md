# Visual QA Audit Report

**Date:** 2026-04-01
**Scope:** All `.tsx` components in `src/components/` (excluding `.stories.tsx`) plus key page files.
**Token reference:** `src/styles/tokens.css` and `tailwind.config.ts`

---

## 1. Summary

| Category | Pass | Fail | Notes |
|----------|------|------|-------|
| Hardcoded colors | 5 | 6 | Email templates use inline styles (acceptable for email); app components mostly clean |
| Touch targets | 18 | 5 | Several small interactive elements missing min-h-tap-min |
| Responsive breakpoints | 8 | 3 | Some components assume fixed width or lack breakpoint variants |
| Font sizes | 15 | 3 | A few hardcoded px/rem font sizes outside the type scale |
| Spacing | 14 | 2 | Minor hardcoded spacing in notification banner and onboarding |
| Border radius | 12 | 1 | One hardcoded value in landing page |
| Shadows | 10 | 1 | One hardcoded box-shadow in notification banner inline styles |

**Overall: 21 issues found across app components and pages. Email templates have ~60 additional hardcoded values but are excluded from fail counts since HTML email requires inline styles.**

---

## 2. Hardcoded Colors Found

### App Components (should be fixed)

| File | Line | Value | Should Be |
|------|------|-------|-----------|
| `src/components/shared/Input.tsx` | 100 | `bg-white` | `bg-[var(--surface-elevated)]` or add `surface-elevated` to Tailwind config |
| `src/components/shared/NotificationBanner.tsx` | 175 | `background: '#FFFFFF'` (inline style) | `var(--surface-elevated)` |
| `src/app/(app)/layout.tsx` | 63 | `bg-white` (header) | `bg-[var(--surface-elevated)]` |
| `src/app/(app)/layout.tsx` | 79 | `bg-white` (nav) | `bg-[var(--surface-elevated)]` |
| `src/app/(marketing)/landing/page.tsx` | 126 | `bg-white` (shadow-sm card) | `bg-[var(--surface-elevated)]` |
| `src/app/(marketing)/landing/page.tsx` | 173, 202, 230 | `bg-white` (value prop cards) | `bg-[var(--surface-elevated)]` |

**Note:** `bg-white` is used 6 times across app components where the design token `--surface-elevated: #FFFFFF` exists. While they are currently the same value, using the token ensures consistency if the elevated surface color changes.

### App Components Using `style={}` with Hardcoded Values

| File | Line | Value | Should Be |
|------|------|-------|-----------|
| `src/components/shared/NotificationBanner.tsx` | 175 | `background: '#FFFFFF'` | `background: 'var(--surface-elevated)'` |
| `src/components/shared/NotificationBanner.tsx` | 189 | `width: '3px'` | Minor, acceptable for accent bar |

### Email Templates (acceptable -- HTML email requires inline styles)

The following files use hardcoded hex colors throughout because HTML email does not support CSS variables or Tailwind classes. These are **not failures** but are documented for awareness:

- `src/components/email/WelcomeEmail.tsx` -- 20+ hardcoded hex values (`#FAF8F5`, `#2C2C2C`, `#C4704B`, `#FFFFFF`, `#999999`, `#F0EDE8`, `#7A8B6F`)
- `src/components/email/DigestEmail.tsx` -- 20+ hardcoded hex values (same palette plus `#666666`)
- `src/components/email/ReviewAlertEmail.tsx` -- 20+ hardcoded hex values (same palette)
- `src/components/email/SubscriptionEmail.tsx` -- 15+ hardcoded hex values (same palette plus `#FEF2F2`)
- `src/components/email/PaymentFailedEmail.tsx` -- 15+ hardcoded hex values (same palette plus `#FEF2F2`, `#C0392B`)

**Recommendation for email templates:** Create a shared `EMAIL_COLORS` constant object mapping semantic names to hex values so they stay in sync with `tokens.css` manually. Example:
```ts
const EMAIL_COLORS = {
  background: '#FAF8F5',    // --color-warm-white
  card: '#FFFFFF',           // --surface-elevated
  charcoal: '#2C2C2C',      // --color-charcoal
  terracotta: '#C4704B',    // --color-terracotta
  sage: '#7A8B6F',          // --color-sage
  // etc.
};
```

---

## 3. Touch Target Issues

| File | Line | Element | Current Size | Required | Fix |
|------|------|---------|-------------|----------|-----|
| `src/components/conversation/ApprovalCard.tsx` | 79-82 | "Undo" button (dismissed state) | No min-height set | 44px (min-h-tap-min) | Add `min-h-tap-min` and `inline-flex items-center` |
| `src/components/conversation/ApprovalCard.tsx` | 103-108 | Error retry button | `py-3` (~12px padding) gives ~40px total | 44px (min-h-tap-min) | Add `min-h-tap-min` |
| `src/components/conversation/MessageBubble.tsx` | 38-48 | "Retry" inline button | No min-height, inline text only | 44px (min-h-tap-min) | Wrap in a container with `min-h-tap-min min-w-tap-min` or add padding |
| `src/components/conversation/PublishedCard.tsx` | 68-79 | "View live post" link | No min-height set | 44px (min-h-tap-min) | Add `min-h-tap-min inline-flex items-center` |
| `src/app/(onboarding)/welcome/page.tsx` | 268-275 | "Back" button | No min-height set | 44px (min-h-tap-min) | Add `min-h-tap-min` |
| `src/app/(onboarding)/welcome/page.tsx` | 329-332 | City "Edit" button | No min-height, text-caption size | 44px (min-h-tap-min) | Add `min-h-tap-min inline-flex items-center` |
| `src/app/(onboarding)/welcome/page.tsx` | 431 | "Something wrong? Edit details" button | `py-2` only | 44px (min-h-tap-min) | Add `min-h-tap-min` |
| `src/app/(onboarding)/welcome/page.tsx` | 462-468 | Photo remove "x" button | `w-6 h-6` (24px) | 44px (min-h-tap-min) | Increase to `w-tap-min h-tap-min` (44px) or add an invisible touch-target overlay |

### Touch Targets That Pass

- `Button.tsx`: default size uses `min-h-tap-primary` (56px), small uses `min-h-tap-min` (44px) -- PASS
- `ErrorBanner.tsx`: Retry and Dismiss buttons both use `min-h-tap-min` -- PASS
- `Input.tsx`: Textarea has `min-h-[44px]`, mic button `w-[44px] h-[44px]`, send button `w-[44px] h-[44px]` -- PASS
- `NotificationBanner.tsx`: Action button uses `minHeight: 'var(--tap-target-min)'` -- PASS
- `SettingsCard.tsx`: Input has `min-h-[44px]` -- PASS (but should use `min-h-tap-min` token)
- `Layout.tsx` nav links: `w-[var(--tap-target-nav)] h-[var(--tap-target-nav)]` (48px) -- PASS
- Landing page CTAs: `min-h-tap-primary` -- PASS

---

## 4. Responsive Issues

### Components Missing Responsive Variants

| File | Line | Issue | Recommendation |
|------|------|-------|----------------|
| `src/components/shared/Input.tsx` | 107 | `max-w-[640px]` is hardcoded but acceptable as a max constraint. However, the fixed bottom position (`fixed left-0 right-0`) with `bottom: '60px'` hardcoded assumes the nav height. | Extract `60px` to a CSS variable or Tailwind token for the nav bar height. |
| `src/components/conversation/MessageBubble.tsx` | 24 | `max-w-[${isUser ? '80' : '85'}%]` -- Dynamic string interpolation in Tailwind classes does NOT work. Tailwind cannot detect `max-w-[80%]` or `max-w-[85%]` generated at runtime. | Change to: `isUser ? 'max-w-[80%]' : 'max-w-[85%]'` as complete static strings, or use predefined classes. |
| `src/app/(onboarding)/welcome/page.tsx` | 300-322 | `grid grid-cols-4 gap-3` for business types -- on very narrow screens (320px), 4 columns can be too tight. No responsive override. | Add `grid-cols-2 sm:grid-cols-4` for better mobile support. |
| `src/app/(onboarding)/welcome/page.tsx` | 454 | `grid grid-cols-3 gap-2` for photo grid -- no responsive variant, but 3 columns at 320px width is very tight. | Consider `grid-cols-2 sm:grid-cols-3`. |

### Components With Good Responsive Design (pass)

- `WeeklyDigest.tsx` line 118: `grid grid-cols-1 gap-4 sm:grid-cols-3` -- PASS
- `LandingPage.tsx`: Extensive `sm:`, `lg:` breakpoint usage throughout -- PASS
- `LandingPage.tsx` line 47: `flex-col sm:flex-row` for CTA buttons -- PASS
- `LandingPage.tsx` line 160: `flex-col lg:flex-row` for value props -- PASS

### Critical Bug: Dynamic Tailwind Class

**File:** `src/components/conversation/MessageBubble.tsx`, **Line 24**
```tsx
<div className={`max-w-[${isUser ? '80' : '85'}%] flex flex-col ...`}>
```
This generates `max-w-[80%]` or `max-w-[85%]` at runtime, but Tailwind purges classes at build time and cannot detect dynamically constructed class names. This class will be MISSING from the production CSS.

**Fix:**
```tsx
<div className={`${isUser ? 'max-w-[80%]' : 'max-w-[85%]'} flex flex-col ...`}>
```

---

## 5. Font Size Issues

| File | Line | Value | Should Be |
|------|------|-------|-----------|
| `src/app/(marketing)/landing/page.tsx` | 33 | `text-[2rem]`, `sm:text-[2.5rem]`, `lg:text-[3.25rem]` | These are larger than `text-display` (1.75rem). Consider adding a `text-hero` token to the design system, or document this as an intentional marketing-only override. |
| `src/app/(marketing)/landing/page.tsx` | 156 | `sm:text-[1.5rem]` | Between `text-h1` (1.25rem) and `text-display` (1.75rem). Add a token or use `text-display`. |
| `src/app/(marketing)/landing/page.tsx` | 261 | `sm:text-[1.5rem]` | Same as above. |
| `src/app/(marketing)/landing/page.tsx` | 39 | `lg:text-[1.125rem]` | This equals `text-h2` -- use `lg:text-h2` instead. |
| `src/app/(onboarding)/welcome/page.tsx` | 318 | `text-[28px]` (emoji icons) | Acceptable for decorative emoji sizing, not actual text. |
| `src/app/(onboarding)/welcome/page.tsx` | 536 | `text-[28px]` (priority emoji icons) | Same as above -- acceptable. |

---

## 6. Spacing Issues

| File | Line | Value | Should Be |
|------|------|-------|-----------|
| `src/components/shared/NotificationBanner.tsx` | 231 | `padding: '4px 8px'` (inline style on action button) | Use `var(--space-1) var(--space-2)` or Tailwind `px-2 py-1` |
| `src/components/shared/Input.tsx` | 103 | `bottom: '60px'` (hardcoded nav bar height) | Extract to a shared constant or CSS variable like `--nav-height: 60px` |
| `src/app/(onboarding)/welcome/page.tsx` | 536 | `p-5` (priority cards) | Close to `p-card-padding` (20px) -- `p-5` is 20px so this is actually fine. PASS. |
| `src/components/shared/SettingsCard.tsx` | 138 | `min-h-[44px]` on input | Use `min-h-tap-min` token instead |

All other spacing in app components uses the Tailwind token classes (`px-screen-margin`, `gap-card-gap`, `gap-content-gap`, `py-6`, `gap-3`, etc.) correctly.

---

## 7. Border Radius Issues

| File | Line | Value | Should Be |
|------|------|-------|-----------|
| `src/app/(marketing)/landing/page.tsx` | 74 | `rounded-xl` | This maps to Tailwind's `24px` which matches `--radius-xl` -- actually PASS since it was configured in tailwind.config.ts. |

All other components use `rounded-sm` (6px), `rounded-md` (12px), `rounded-lg` (16px), `rounded-full` correctly per the token system. No issues found.

---

## 8. Shadow Issues

| File | Line | Value | Should Be |
|------|------|-------|-----------|
| `src/components/shared/NotificationBanner.tsx` | 176 | `boxShadow: 'var(--shadow-lg)'` (inline style) | This correctly references the token but via inline style instead of Tailwind `shadow-lg`. Minor inconsistency. |

All other shadow usage (`shadow-sm`, `shadow-lg`) uses Tailwind classes correctly.

---

## 9. Recommendations

### Critical (fix before launch)

1. **MessageBubble.tsx line 24 -- Dynamic Tailwind class bug.** The `max-w-[${isUser ? '80' : '85'}%]` pattern will produce missing styles in production. Change to static class selection: `isUser ? 'max-w-[80%]' : 'max-w-[85%]'`.

2. **Touch targets on interactive elements.** Five buttons/links are below the 44px minimum. This violates WCAG 2.5.8 (Target Size) and hurts usability on mobile. Priority fixes:
   - `ApprovalCard.tsx` "Undo" button (line 79)
   - `MessageBubble.tsx` "Retry" button (line 38)
   - `PublishedCard.tsx` "View live post" link (line 68)
   - `welcome/page.tsx` photo remove button (line 462, only 24px)

### Important (fix soon)

3. **Add `surface-elevated` color token to Tailwind config.** Replace 6 instances of `bg-white` with `bg-surface-elevated`. This ensures all elevated surfaces update together if the design evolves.

4. **Onboarding grid responsiveness.** The 4-column business type grid (`grid-cols-4`) and 3-column photo grid (`grid-cols-3`) need responsive breakpoints for narrow screens (320px devices).

5. **SettingsCard.tsx line 138:** Replace `min-h-[44px]` with `min-h-tap-min` to use the token.

6. **Input.tsx line 125:** Replace `min-h-[44px]` with `min-h-tap-min` to use the token.

### Nice to Have

7. **Landing page hero font sizes.** Add a `text-hero` token (or similar) to the Tailwind config for the marketing hero sizes (`2rem`, `2.5rem`, `3.25rem`) rather than using arbitrary values. This documents the intentional override.

8. **Landing page line 39:** Replace `lg:text-[1.125rem]` with `lg:text-h2` since they are the same value.

9. **Email template color consolidation.** Create a shared `EMAIL_COLORS` constant so email templates reference a single source of truth for the color palette, reducing drift risk.

10. **NotificationBanner.tsx** is heavily inline-styled (required for dynamic toast positioning). Consider extracting to Tailwind classes where possible, particularly the action button padding (`4px 8px` -> `px-2 py-1`).

11. **Input.tsx line 103:** Extract the hardcoded `bottom: '60px'` nav height to a CSS variable so it stays in sync with the layout nav height.
