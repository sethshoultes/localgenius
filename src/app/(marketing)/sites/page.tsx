import Link from 'next/link';
import type { Metadata } from 'next';

/**
 * /sites — Directory of example business sites built by LocalGenius.
 *
 * This is the proof. Prospective customers see what we build before
 * they sign up. Each card links to a live site at /site/[slug].
 */

export const metadata: Metadata = {
  title: 'Example Sites — LocalGenius',
  description: 'See what LocalGenius builds for local businesses. Live restaurant and professional websites, created in 5 minutes by AI.',
};

const examples = [
  {
    slug: 'marias-kitchen',
    name: "Maria's Kitchen",
    type: 'Restaurant',
    location: 'Austin, TX',
    description: 'Authentic Tex-Mex on South Lamar. Menu, hours, reviews, and booking — all built from a business name and three photos.',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
    rating: 4.8,
    reviews: 247,
  },
  {
    slug: 'bright-smile',
    name: 'Bright Smile Dental',
    type: 'Dental',
    location: 'Austin, TX',
    description: 'Family dentistry in North Austin. Services, booking, patient reviews, and insurance info — generated from a 5-minute conversation.',
    image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&q=80',
    rating: 4.9,
    reviews: 183,
  },
];

export default function SitesPage() {
  return (
    <div className="px-screen-margin py-16 max-w-[1120px] mx-auto">
      <h1 className="text-[2rem] font-semibold text-charcoal leading-tight sm:text-[2.5rem]">
        See what we build.
      </h1>
      <p className="text-body text-slate mt-3 max-w-xl">
        Every LocalGenius business gets a professional website — built by AI in five
        minutes, managed through conversation. No CMS. No drag-and-drop. Here are
        real examples.
      </p>

      <div className="grid gap-6 mt-10">
        {examples.map((site) => (
          <Link
            key={site.slug}
            href={`/site/${site.slug}`}
            className="group block bg-white rounded-md border overflow-hidden no-underline transition-shadow hover:shadow-md"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <div className="sm:flex">
              <div className="sm:w-80 h-48 sm:h-auto flex-shrink-0 overflow-hidden">
                <img
                  src={site.image}
                  alt={site.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-6 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-small font-semibold text-terracotta bg-terracotta-light px-2 py-0.5 rounded-sm">
                    {site.type}
                  </span>
                  <span className="text-small text-slate">{site.location}</span>
                </div>
                <h2 className="text-h1 text-charcoal font-semibold group-hover:text-terracotta transition-colors">
                  {site.name}
                </h2>
                <p className="text-body text-slate mt-2">
                  {site.description}
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <span className="text-gold text-body">{'★'.repeat(Math.round(site.rating))}</span>
                  <span className="text-caption text-slate">
                    {site.rating} ({site.reviews} reviews)
                  </span>
                </div>
                <span className="text-caption text-terracotta font-semibold mt-3 inline-flex items-center gap-1">
                  View live site →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-body text-slate mb-4">
          Want your business to look like this?
        </p>
        <Link
          href="/welcome"
          className="inline-flex items-center justify-center min-h-tap-primary px-8 bg-terracotta text-white font-semibold rounded-sm hover:bg-terracotta-hover transition-colors no-underline text-body"
        >
          Get started in 5 minutes
        </Link>
      </div>
    </div>
  );
}
