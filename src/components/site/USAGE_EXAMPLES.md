# Site Components — Usage Examples

Complete examples for each site component.

## SiteNav

### Basic Usage

```tsx
import { SiteNav } from '@/components/site';

export default function BusinessLayout() {
  return (
    <>
      <SiteNav 
        businessName="Café Luna" 
        businessSlug="cafe-luna"
      />
      {/* Page content */}
    </>
  );
}
```

### With Custom Links

```tsx
import { SiteNav } from '@/components/site';

export default function RestaurantLayout() {
  return (
    <SiteNav 
      businessName="Bella's Trattoria" 
      businessSlug="bellas-trattoria"
      links={[
        { label: 'Menu', href: '#menu' },
        { label: 'Gallery', href: '#gallery' },
        { label: 'Reservations', href: '#reservations' },
        { label: 'Contact', href: '#contact' },
      ]}
    />
  );
}
```

### Generated href Structure

With `businessSlug="my-business"`, links generate URLs like:
- `#menu` → `/site/my-business/menu`
- `#contact` → `/site/my-business/contact`
- `#gallery` → `/site/my-business/gallery`

---

## SiteFooter

### Basic Usage

```tsx
import { SiteFooter } from '@/components/site';

export default function BusinessLayout() {
  return (
    <>
      {/* Page content */}
      <SiteFooter 
        businessName="Coffee House"
        address="456 Oak Ave, Seattle, WA 98101"
        phone="(206) 555-0123"
      />
    </>
  );
}
```

### With Special Characters in Phone

```tsx
import { SiteFooter } from '@/components/site';

export default function Page() {
  return (
    <SiteFooter 
      businessName="Global Boutique"
      address="789 Park St, New York, NY 10001"
      phone="+1 (212) 555-0456"  // International format
    />
  );
}
```

### Phone Number Handling

The phone prop accepts various formats:

```
"(206) 555-0123"      → tel:2065550123
"+1-206-555-0123"     → tel:+12065550123
"206.555.0123"        → tel:2065550123
"206 555 0123 ext 123" → tel:2065550123
```

Non-digit characters are stripped, except `+` is preserved for international numbers.

---

## StarRating

### Basic Rating Display

```tsx
import { StarRating } from '@/components/site';

export default function ReviewPreview() {
  return (
    <div>
      <StarRating rating={4.5} />
      <p>Highly recommended!</p>
    </div>
  );
}
```

### With Review Count

```tsx
import { StarRating } from '@/components/site';

export default function AggregateRating() {
  return (
    <div className="flex items-center gap-2">
      <StarRating rating={4.8} count={287} />
      <span className="text-sm text-gray-600">287 reviews</span>
    </div>
  );
}
```

### Half-Star Support

```tsx
import { StarRating } from '@/components/site';

export default function Examples() {
  return (
    <>
      <StarRating rating={5} />      {/* 5 full stars */}
      <StarRating rating={4.5} />    {/* 4 full + 1 half */}
      <StarRating rating={4} />      {/* 4 full + 1 empty */}
      <StarRating rating={3.5} />    {/* 3 full + 1 half + 1 empty */}
      <StarRating rating={2.3} />    {/* 2 full + 1 empty + 2 empty (auto-clamped) */}
    </>
  );
}
```

### Edge Cases

```tsx
import { StarRating } from '@/components/site';

export default function EdgeCases() {
  return (
    <>
      {/* Auto-clamped to 0-5 range */}
      <StarRating rating={-1} />    {/* Displays as 0 stars */}
      <StarRating rating={7} />     {/* Displays as 5 stars */}
      <StarRating rating={0} />     {/* All empty stars */}
      <StarRating rating={5} />     {/* All full stars */}
      
      {/* Without count */}
      <StarRating rating={4} />
      
      {/* With count = 0 */}
      <StarRating rating={3.5} count={0} />
    </>
  );
}
```

---

## ReviewCard

### Single Review

```tsx
import { ReviewCard } from '@/components/site';

export default function ReviewExample() {
  return (
    <ReviewCard
      reviewer="Sarah M."
      rating={5}
      text="Absolutely fantastic experience! The atmosphere was lovely and the service was impeccable. We'll definitely be back soon for another visit."
      date="2025-03-15"
      platform="google"
    />
  );
}
```

### Review Grid

```tsx
import { ReviewCard } from '@/components/site';

const reviews = [
  {
    id: 1,
    reviewer: "Sarah M.",
    rating: 5,
    text: "Amazing! Best coffee in town.",
    date: "2025-03-15",
    platform: "google" as const,
  },
  {
    id: 2,
    reviewer: "James K.",
    rating: 4.5,
    text: "Great food and atmosphere. Only minor thing was the wait time.",
    date: "2025-03-10",
    platform: "yelp" as const,
  },
  {
    id: 3,
    reviewer: "Emma L.",
    rating: 4,
    text: "Nice place with friendly staff. The pastries are excellent.",
    date: "2025-03-05",
    platform: "google" as const,
  },
];

export default function ReviewsSection() {
  return (
    <section>
      <h2>Recent Reviews</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            reviewer={review.reviewer}
            rating={review.rating}
            text={review.text}
            date={review.date}
            platform={review.platform}
          />
        ))}
      </div>
    </section>
  );
}
```

### Truncation Example

Long reviews are automatically truncated to 280 characters:

```tsx
import { ReviewCard } from '@/components/site';

export default function LongReview() {
  return (
    <ReviewCard
      reviewer="Detailed Reviewer"
      rating={5}
      text="This is an incredibly long review that contains many details about the experience. We spent several hours at the restaurant and tried multiple dishes. The appetizers were outstanding, with perfect seasoning and presentation. The main courses arrived promptly and were cooked to perfection. The desserts were creative and delicious. The service staff was attentive without being intrusive. The ambiance was warm and inviting. The prices were fair for the quality. We would definitely recommend this restaurant to friends and family..."
      date="2025-02-28"
      platform="google"
    />
  );
}
```

Displays as: "This is an incredibly long review that contains many details about the experience. We spent several hours at the restaurant and tried multiple dishes. The appetizers were outstanding, with perfect..."

---

## Full Page Example

### Business Site Template

```tsx
import { SiteNav, SiteFooter, ReviewCard, StarRating } from '@/components/site';

export default function BusinessPage() {
  const businessName = "Artisan Bakery";
  const businessSlug = "artisan-bakery";
  
  return (
    <>
      <SiteNav 
        businessName={businessName}
        businessSlug={businessSlug}
        links={[
          { label: 'Menu', href: '#menu' },
          { label: 'About', href: '#about' },
          { label: 'Contact', href: '#contact' },
        ]}
      />

      <main>
        {/* Hero Section */}
        <section className="py-12">
          <h1>{businessName}</h1>
          <div className="flex items-center gap-2">
            <StarRating rating={4.9} count={156} />
          </div>
        </section>

        {/* Menu Section */}
        <section id="menu" className="py-12">
          <h2>Our Menu</h2>
          {/* Menu content */}
        </section>

        {/* Reviews Section */}
        <section id="reviews" className="py-12">
          <h2>Customer Reviews</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <ReviewCard
              reviewer="Alice B."
              rating={5}
              text="Best sourdough bread I've ever had. Fresh, delicious, and reasonably priced."
              date="2025-03-10"
              platform="google"
            />
            <ReviewCard
              reviewer="Bob T."
              rating={4.5}
              text="Love their croissants. The only issue is they often sell out by noon."
              date="2025-03-08"
              platform="yelp"
            />
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-12">
          <h2>Get in Touch</h2>
          {/* Contact form */}
        </section>
      </main>

      <SiteFooter 
        businessName={businessName}
        address="123 Baker St, Portland, OR 97201"
        phone="(503) 555-0789"
      />
    </>
  );
}
```

---

## Type Safety

All components provide TypeScript interfaces for full type safety:

```tsx
import type { 
  SiteNavProps, 
  NavLink,
  SiteFooterProps,
  StarRatingProps,
  ReviewCardProps,
  Platform
} from '@/components/site';

// Use in function signatures
function renderBusinessNav(props: SiteNavProps) {
  // ...
}

// Use in array definitions
const reviews: ReviewCardProps[] = [
  {
    reviewer: "John",
    rating: 5,
    text: "Great!",
    date: "2025-03-01",
    platform: "google",
  },
];
```

---

## Styling Customization

Components use CSS variables. Override in parent styles:

```tsx
import { SiteNav } from '@/components/site';

export default function CustomNav() {
  return (
    <div style={{
      '--color-terracotta': '#E85D04',
      '--color-gold': '#F5B041',
      '--text-primary': '#1A1A1A',
    } as React.CSSProperties}>
      <SiteNav 
        businessName="Custom Brand"
        businessSlug="custom-brand"
      />
    </div>
  );
}
```

---

## Accessibility Features

All components include:
- ARIA labels on interactive elements
- Semantic HTML (`<nav>`, `<footer>`, `<article>`)
- Keyboard navigation support
- Focus management
- Color contrast ratios (WCAG AA compliant)

```tsx
// All components work with screen readers
import { SiteNav, StarRating, ReviewCard } from '@/components/site';

// ARIA labels are automatically included
<SiteNav businessName="..." businessSlug="..." />
{/* <nav aria-label="Main navigation"> */}

<StarRating rating={4.5} count={100} />
{/* <span aria-label="4.5 out of 5 stars, 100 reviews"> */}

<ReviewCard ... />
{/* <article> with semantic footer structure */}
```
