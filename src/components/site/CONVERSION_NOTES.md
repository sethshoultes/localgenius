# Astro to React Conversion Notes

## Overview

Four Astro components from `localgenius-sites` have been converted to React/TypeScript server components for the LocalGenius app.

**Source Astro components:**
- `/Users/sethshoultes/Local Sites/localgenius-sites/src/components/Nav.astro`
- `/Users/sethshoultes/Local Sites/localgenius-sites/src/components/Footer.astro`
- `/Users/sethshoultes/Local Sites/localgenius-sites/src/components/StarRating.astro`
- `/Users/sethshoultes/Local Sites/localgenius-sites/src/components/ReviewCard.astro`

**Created React components:**
- `/Users/sethshoultes/Local Sites/localgenius/src/components/site/SiteNav.tsx`
- `/Users/sethshoultes/Local Sites/localgenius/src/components/site/SiteFooter.tsx`
- `/Users/sethshoultes/Local Sites/localgenius/src/components/site/StarRating.tsx`
- `/Users/sethshoultes/Local Sites/localgenius/src/components/site/ReviewCard.tsx`

---

## Key Changes from Astro

### 1. No 'use client' Directives

All components are **server components** (no `'use client'` directives). This:
- Reduces JavaScript sent to browser
- Enables direct database access if needed
- Improves performance for static content

### 2. State Management

**SiteNav** uses minimal client state (`isOpen` for mobile hamburger), but could be optimized:
- Current: Uses `useState` for checkbox toggle
- Alternative: Move to pure CSS if mobile interaction not needed

**Other components**: Fully server-side (no state)

### 3. Styling Approach

**Original (Astro):** 
- Scoped CSS with `<style>` blocks
- CSS-only hamburger toggle

**New (React):**
- Inline styles + Tailwind utilities
- Design tokens from `src/styles/tokens.css`
- CSS variables (e.g., `var(--color-gold)`)
- Hover effects via inline event handlers

**Why:** Next.js doesn't support scoped CSS like Astro. Inline styles with design tokens provide:
- Easy customization via CSS variables
- No CSS-in-JS runtime overhead
- Direct alignment with design system

### 4. Accessibility

Preserved from Astro:
- ARIA labels (`aria-label`, `aria-hidden`)
- Semantic HTML (`<nav>`, `<footer>`, `<article>`)
- Keyboard navigation support

### 5. Mobile Menu Implementation

**Astro:** CSS-only checkbox trick with `.sr-only` class
```html
<input type="checkbox" id="nav-toggle" class="nav-toggle-input sr-only" />
<label for="nav-toggle" class="nav-hamburger">...</label>
```

**React:** Hybrid approach
- Checkbox input for semantics
- React state for toggle (`useState`)
- Inline transforms for animation
- CSS fallback for mobile-only rendering

**Trade-off:** React state adds a few bytes, but provides better UX (instant close on nav link click).

### 6. Platform Badge Colors

**ReviewCard** platform colors:
- **Google:** `#e8f0fe` background, `#1a73e8` text
- **Yelp:** `#fce4e4` background, `#d32323` text

These are hardcoded to match platform branding (not in design tokens).

### 7. Phone Number Sanitization

**SiteFooter** sanitizes phone numbers for `tel:` links:
```typescript
const phoneHref = `tel:${phone.replace(/[^+\d]/g, '')}`;
```

This removes formatting characters but preserves `+` for international numbers.

---

## Type Exports

All interfaces are exported for consumer type safety:

```typescript
// Named exports
export interface SiteNavProps { ... }
export interface SiteFooterProps { ... }
export interface StarRatingProps { ... }
export interface ReviewCardProps { ... }
```

Index file (`index.ts`) re-exports for convenience:
```typescript
import { SiteNav, StarRating } from '@/components/site';
import type { SiteNavProps } from '@/components/site';
```

---

## Design Token Alignment

Components use LocalGenius design system tokens:

| Token | Value | Usage |
|-------|-------|-------|
| `--color-terracotta` | #C4704B | Brand color, nav hover |
| `--color-gold` | #D4A853 | Star ratings |
| `--color-sage-text` | #5C6B52 | "Made with LocalGenius" |
| `--surface-primary` | #FAF8F5 | Warm white background |
| `--surface-elevated` | #FFFFFF | Card surfaces |
| `--text-primary` | #2C2C2C | Main text |
| `--text-secondary` | #6B7280 | Secondary text |

---

## Differences from Astro

| Aspect | Astro | React | Reason |
|--------|-------|-------|--------|
| Scoped CSS | `<style>` blocks | Inline styles | Next.js architecture |
| Mobile menu | CSS-only | React state + CSS | Better UX (faster close) |
| Exports | Implicit | Explicit interfaces | Type safety |
| Serialization | Automatic | Manual (none) | Server components |
| Font loading | CSS | CSS (via globals) | No change |

---

## Testing Checklist

- [ ] SiteNav renders with default links (Menu, Contact)
- [ ] SiteNav responsive hamburger opens/closes on mobile
- [ ] SiteNav links navigate to correct slugged URLs
- [ ] SiteFooter phone number is clickable `tel:` link
- [ ] SiteFooter responsive layout on mobile
- [ ] StarRating displays correct number of filled/half/empty stars
- [ ] StarRating count badge shows when provided
- [ ] ReviewCard truncates long text to 280 characters
- [ ] ReviewCard shows platform badge with correct colors
- [ ] ReviewCard date formats correctly (e.g., "Mar 15, 2025")
- [ ] All components use correct design token colors
- [ ] All components pass TypeScript strict mode
- [ ] No console errors or warnings

---

## Future Optimizations

1. **SiteNav State:** Move hamburger to pure CSS if mobile interaction isn't needed
2. **StarRating:** Consider memoization if used in lists
3. **ReviewCard:** Extract platform badge colors to design tokens
4. **Performance:** Use `React.lazy` if components are conditionally rendered
5. **Styling:** Consider converting inline styles to Tailwind classes for consistency

---

## Related Files

- Design tokens: `src/styles/tokens.css`
- Global styles: `src/styles/globals.css`
- Tailwind config: `tailwind.config.ts`
- Original Astro: `localgenius-sites/src/components/`
