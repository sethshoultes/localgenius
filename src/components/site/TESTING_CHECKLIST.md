# Site Components — Testing Checklist

Use this checklist to verify all components work correctly in your Next.js pages.

## SiteNav

- [ ] **Renders with default links**
  - Default links are "Menu" and "Contact"
  - Links navigate to `/site/{businessSlug}/#menu` and `/site/{businessSlug}/#contact`

- [ ] **Custom links work**
  - Pass `links` prop with custom link array
  - Verify hrefs are appended to `/site/{businessSlug}/`

- [ ] **Brand name displays correctly**
  - Business name uses Lora serif font
  - Appears in warm color, clickable to `/site/{businessSlug}/`
  - Hover color changes to brand terracotta (#C4704B)

- [ ] **Desktop layout**
  - Hamburger menu hidden on desktop (md breakpoint)
  - Navigation links visible in horizontal row
  - Underline animation on hover for each link

- [ ] **Mobile layout**
  - Hamburger menu visible on mobile
  - Menu opens on click (state-managed)
  - Links appear vertically in dropdown
  - Menu closes when link is clicked
  - Hamburger animates: bars transform to X shape

- [ ] **Accessibility**
  - `aria-label="Main navigation"` on nav element
  - `aria-label="Toggle navigation menu"` on checkbox
  - `aria-hidden="true"` on hamburger (decorative)
  - Semantic HTML structure

---

## SiteFooter

- [ ] **Business name displays**
  - Uses Lora serif font
  - Size: 1.25rem (20px)
  - Weight: 700 (bold)
  - Color: --text-primary (#2C2C2C)

- [ ] **Address displays correctly**
  - Font size: 0.9375rem (15px)
  - Color: --text-secondary (#6B7280)
  - Line height: 1.5

- [ ] **Phone number is clickable tel: link**
  - Formatted correctly: `tel:+12065550123`
  - Phone number characters are preserved (except formatting removed)
  - Plus sign (+) preserved for international numbers
  - Color: brand terracotta (#C4704B)
  - Hover: underline, color darkens

- [ ] **LocalGenius credit**
  - Text: "Made with LocalGenius"
  - Color: sage-text (#5C6B52)
  - Font size: 0.8125rem (13px)
  - Appears below border separator

- [ ] **Layout responsive**
  - Desktop: business info left, spacing right
  - Mobile: stacks vertically
  - Border separators render correctly

- [ ] **Background color**
  - Background: --surface-card (cream #F2EDE8)
  - Top border: --border-default

---

## StarRating

- [ ] **Displays correct number of stars**
  - 5.0 rating: 5 full stars
  - 4.5 rating: 4 full + 1 half star
  - 4.0 rating: 4 full + 1 empty star
  - 3.5 rating: 3 full + 1 half + 1 empty
  - 0.0 rating: 5 empty stars

- [ ] **Star colors**
  - Full stars: gold (#D4A853)
  - Half stars: left half gold, right half gray
  - Empty stars: light gray (#d6d3d1)

- [ ] **Auto-clamping works**
  - Negative rating: displays as 0 stars
  - Rating > 5: displays as 5 stars
  - -1 input: 5 empty stars
  - 10 input: 5 full stars

- [ ] **Half-star precision**
  - 0.4 rating: shows empty (< 0.5 threshold)
  - 0.5 rating: shows half star
  - 0.6 rating: shows half star (>= 0.5)

- [ ] **Review count badge**
  - Shows "(count)" when count prop provided
  - Font size: smaller than rating
  - Color: --text-secondary
  - Hidden when count is undefined or omitted

- [ ] **Accessibility**
  - `aria-label` includes rating and count
  - Example: "4.5 out of 5 stars, 128 reviews"
  - `aria-hidden="true"` on decorative star span

- [ ] **Sizing**
  - Each star: 1.125em (scales with font size)
  - Gap between stars: 2px
  - Overall height matches text baseline

---

## ReviewCard

- [ ] **Star rating displays**
  - Uses `<StarRating />` component
  - Positioned in header with platform badge
  - Correctly shows rating value

- [ ] **Platform badge renders**
  - Google reviews: blue background (#e8f0fe), blue text (#1a73e8)
  - Yelp reviews: red background (#fce4e4), red text (#d32323)
  - Text: "Google" or "Yelp" (capitalized)
  - Size: small pill shape with padding

- [ ] **Review text truncation**
  - Text longer than 280 chars: truncates with "..."
  - Text shorter than 280 chars: displays fully
  - Truncation preserves word boundaries (uses trimEnd)
  - Example: very long text → "...This is the first 280 characters..."

- [ ] **Date formatting**
  - Input: ISO string (e.g., "2025-03-15")
  - Output: "Mar 15, 2025"
  - Uses Intl.DateTimeString with en-US locale

- [ ] **Reviewer name**
  - Font weight: 600 (semibold)
  - Font size: 0.875rem (14px)
  - Color: --text-primary

- [ ] **Review date**
  - Font size: 0.8125rem (13px)
  - Color: --color-slate-light
  - Positioned bottom-right of card

- [ ] **Card styling**
  - Background: white (--surface-elevated)
  - Border: 1px solid --border-default
  - Border radius: --radius-md (12px)
  - Padding: 20px
  - Gap between sections: 0.875rem

- [ ] **Hover effect**
  - Shadow increases on hover
  - Transition: 200ms ease
  - No color change on text

- [ ] **Responsive layout**
  - Single column on mobile
  - Grid layout on desktop (easily stackable)
  - Header (stars + badge) stacks on small screens

- [ ] **Accessibility**
  - `<article>` semantic tag
  - Proper heading hierarchy in parent
  - Text colors meet WCAG AA contrast ratios

---

## Integration Tests

- [ ] **All components import from index**
  ```tsx
  import { SiteNav, SiteFooter, StarRating, ReviewCard } from '@/components/site';
  ```

- [ ] **Type imports work**
  ```tsx
  import type { SiteNavProps, ReviewCardProps, Platform } from '@/components/site';
  ```

- [ ] **Full page layout works**
  - Create test page with all 4 components
  - Verify spacing, colors, alignment
  - Test responsive breakpoints (mobile, tablet, desktop)

- [ ] **Design tokens apply**
  - Colors come from CSS variables
  - If you override --color-terracotta, nav hover changes
  - Fonts are loaded correctly

- [ ] **No console errors**
  - Build: `npm run build` — no errors
  - Dev: `npm run dev` — no warnings
  - Production: deploy without issues

- [ ] **Performance**
  - No unnecessary re-renders
  - No layout shifts on load
  - Images/fonts load without flashing

---

## Browser Compatibility

Test in:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS 15+)
- [ ] Chrome Mobile (Android 12+)

### Known Issues & Workarounds

None currently documented.

---

## Performance Metrics

Expected performance:
- **SiteNav**: ~1-2ms to render (no data fetching)
- **SiteFooter**: ~0.5-1ms to render (no data fetching)
- **StarRating**: ~0.5ms to render (pure CSS stars)
- **ReviewCard**: ~1-2ms to render (no data fetching)

All are server components with zero JavaScript overhead on client (until interacted).

---

## Rollback Plan

If issues arise:

1. Components are stored at: `src/components/site/`
2. Previous version at: `localgenius-sites/src/components/` (Astro)
3. To revert: Remove `src/components/site/` and use Astro components
4. Git: `git reset` to remove added files

---

## Next Steps

1. **Add to your pages:**
   ```tsx
   import { SiteNav, SiteFooter } from '@/components/site';
   
   export default function Page() {
     return (
       <>
         <SiteNav businessName="..." businessSlug="..." />
         {/* Page content */}
         <SiteFooter businessName="..." address="..." phone="..." />
       </>
     );
   }
   ```

2. **Run tests:** Check all items in this checklist

3. **Deploy:** No additional configuration needed; works with standard Next.js build

4. **Monitor:** Check browser console for any warnings after deployment

5. **Iterate:** Adjust colors, spacing, etc. via design tokens or inline styles

---

## Support

- **Documentation:** `README.md`
- **Examples:** `USAGE_EXAMPLES.md`
- **Technical Details:** `CONVERSION_NOTES.md`
- **Type Definitions:** `index.ts` and each component `.tsx` file

Good luck!
