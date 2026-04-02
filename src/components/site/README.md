# Site Components

Public-facing components for business site display pages. Converted from Astro to React/TypeScript.

## Components

### SiteNav

Sticky navigation bar for public business sites.

**Props:**
```typescript
interface SiteNavProps {
  businessName: string;        // Business name (displays in Lora serif)
  businessSlug: string;        // URL slug for href resolution
  links?: NavLink[];           // Optional custom links (defaults to Menu, Contact)
}

interface NavLink {
  label: string;               // Link text
  href: string;                // Relative href (appended to /site/{slug}/)
}
```

**Features:**
- Sticky positioning with subtle shadow
- Business name in Lora serif font
- Responsive hamburger menu (CSS-only on mobile)
- Brand color hover states on links
- Default links: "Menu" (#menu), "Contact" (#contact)

**Usage:**
```tsx
import { SiteNav } from '@/components/site';

export default function Page() {
  return (
    <SiteNav 
      businessName="Café Luna" 
      businessSlug="cafe-luna"
      links={[
        { label: 'Menu', href: '#menu' },
        { label: 'Reservations', href: '#reservations' },
        { label: 'Contact', href: '#contact' },
      ]}
    />
  );
}
```

---

### SiteFooter

Footer with business information and LocalGenius credit.

**Props:**
```typescript
interface SiteFooterProps {
  businessName: string;        // Business name (Lora serif)
  address: string;             // Physical address
  phone: string;               // Phone number (displays as tel: link)
}
```

**Features:**
- Business name in Lora serif
- Address and phone (clickable tel: links)
- Phone number auto-sanitized for tel: links
- "Made with LocalGenius" credit in sage color (#7A8B6F)
- Responsive layout

**Usage:**
```tsx
import { SiteFooter } from '@/components/site';

export default function Page() {
  return (
    <SiteFooter 
      businessName="Café Luna"
      address="123 Main St, Portland, OR 97214"
      phone="(503) 555-1234"
    />
  );
}
```

---

### StarRating

Pure CSS star display component for review ratings.

**Props:**
```typescript
interface StarRatingProps {
  rating: number;              // 0-5 star rating
  count?: number;              // Optional review count
}
```

**Features:**
- Displays 1-5 stars with gold color (#D4A853)
- Supports half-star ratings (0.5 precision)
- Optional review count display (e.g., "(42)")
- CSS clip-path stars (no icon library required)
- Accessible with ARIA labels
- Automatically clamps rating to 0-5 range

**Usage:**
```tsx
import { StarRating } from '@/components/site';

export default function Example() {
  return (
    <>
      <StarRating rating={4.5} count={128} />
      <StarRating rating={3} />
    </>
  );
}
```

---

### ReviewCard

Single review card with star rating and platform badge.

**Props:**
```typescript
interface ReviewCardProps {
  reviewer: string;            // Reviewer name
  rating: number;              // 0-5 star rating
  text: string;                // Review text (auto-truncated to 280 chars)
  date: string;                // ISO date string (formatted automatically)
  platform: 'google' | 'yelp'; // Review platform
}
```

**Features:**
- Star rating display via `<StarRating />`
- Platform badge with brand colors (Google: blue, Yelp: red)
- Reviewer name and formatted date
- Review text truncated to 280 characters with "..."
- Hover shadow effect
- Responsive layout

**Usage:**
```tsx
import { ReviewCard } from '@/components/site';

export default function ReviewsSection() {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <ReviewCard
        reviewer="Sarah M."
        rating={5}
        text="Absolutely fantastic experience! The atmosphere was lovely and the service was impeccable. We'll definitely be back!"
        date="2025-03-15"
        platform="google"
      />
      <ReviewCard
        reviewer="James K."
        rating={4.5}
        text="Great food and atmosphere. Only minor thing was the wait time, but totally worth it."
        date="2025-03-10"
        platform="yelp"
      />
    </div>
  );
}
```

---

## Design System Integration

All components use the LocalGenius design tokens defined in `src/styles/tokens.css`:

**Colors:**
- **Brand**: `--color-terracotta` (#C4704B)
- **Sage**: `--color-sage` (#7A8B6F) — LocalGenius credit
- **Gold**: `--color-gold` (#D4A853) — Stars
- **Text**: `--text-primary` (#2C2C2C)
- **Background**: `--surface-primary` (#FAF8F5)

**Typography:**
- **Display**: Lora serif (business names)
- **Body**: Source Sans 3 (navigation, content)

**Spacing & Shadows:**
- Uses semantic spacing tokens (`--space-*`)
- Uses semantic shadow tokens (`--shadow-*`)

---

## Architecture Notes

- **Server Components**: All components are server components (no 'use client' directive)
- **No External Dependencies**: No icon libraries; uses CSS clip-path for stars
- **Styling**: Inline styles + Tailwind utilities for responsive behavior
- **Type Safety**: Full TypeScript interfaces exported for consumers
- **Accessibility**: ARIA labels on interactive elements, semantic HTML

---

## Export Pattern

Import components from the index:

```tsx
// Named imports
import { SiteNav, SiteFooter, StarRating, ReviewCard } from '@/components/site';

// Type imports
import type { SiteNavProps, ReviewCardProps, Platform } from '@/components/site';
```
