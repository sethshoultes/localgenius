import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getSiteData, getAllSiteSlugs } from './data';

/**
 * /site/[businessSlug] — Public business website
 *
 * This is what LocalGenius builds for every business. The proof moment.
 * Maria's site lives at /site/marias-kitchen. Prospective customers
 * see this before they sign up — it's the selling feature.
 *
 * Design: warm Craft theme (Lora + Source Sans 3, terracotta accent).
 * Mobile-first. No JavaScript. Server-rendered.
 */

export async function generateStaticParams() {
  const slugs = await getAllSiteSlugs();
  return slugs.map((slug) => ({ businessSlug: slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ businessSlug: string }> }
): Promise<Metadata> {
  const { businessSlug } = await params;
  const site = await getSiteData(businessSlug);
  if (!site) return { title: 'Site Not Found' };
  return {
    title: site.meta.title,
    description: site.meta.description,
    openGraph: { title: site.meta.title, description: site.meta.description },
  };
}

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ color: '#D4A853', letterSpacing: '0.08em' }} aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => i < rating ? '\u2605' : '\u2606').join('')}
    </span>
  );
}

export default async function SitePage({ params }: { params: Promise<{ businessSlug: string }> }) {
  const { businessSlug } = await params;
  const site = await getSiteData(businessSlug);
  if (!site) notFound();

  const fullAddress = `${site.address.street}, ${site.address.city}, ${site.address.state} ${site.address.zip}`;

  const isRestaurant = site.vertical === 'restaurant';
  const servicesLabel = isRestaurant ? 'From the Kitchen' : 'Our Services';
  const servicesHeading = isRestaurant ? 'What to Order' : 'What We Offer';
  const servicesNavLabel = isRestaurant ? 'Menu' : 'Services';
  const ctaHeading = isRestaurant
    ? 'Ready to taste what everyone is talking about?'
    : `Ready to visit ${site.name}?`;
  const ctaText = isRestaurant
    ? 'Walk-ins are always welcome. For parties of 6 or more, give us a call.'
    : 'New patients welcome. Give us a call to schedule your first visit.';
  const ctaButton = isRestaurant ? 'Call to Book a Table' : 'Call to Schedule';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Source+Sans+3:wght@400;600&display=swap');
        .site-page { font-family: 'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif; background: #FAF8F5; color: #2C2C2C; margin: 0; line-height: 1.65; }
        .site-page * { box-sizing: border-box; }
        .site-page img { max-width: 100%; height: auto; display: block; }
        .site-page a { color: #A35535; text-decoration: none; }
        .site-page a:hover { color: #8A4429; }
        .s-container { max-width: 1120px; margin: 0 auto; padding: 0 1.25rem; }
        .s-section { padding: 4rem 0; }
        .s-section--muted { background: #F2EDE8; }
        .s-label { font-family: 'Source Sans 3', sans-serif; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: #A35535; margin-bottom: 0.5rem; }
        .s-heading { font-family: 'Lora', Georgia, serif; font-size: 1.875rem; font-weight: 700; line-height: 1.2; color: #2C2C2C; margin-bottom: 1.5rem; }
        .s-nav { position: sticky; top: 0; z-index: 100; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border-bottom: 1px solid #E7E5E4; }
        .s-nav-inner { display: flex; align-items: center; justify-content: space-between; height: 3.5rem; }
        .s-nav-brand { font-family: 'Lora', Georgia, serif; font-weight: 700; font-size: 1.25rem; color: #2C2C2C; text-decoration: none; }
        .s-nav-links { display: flex; gap: 1.5rem; list-style: none; margin: 0; padding: 0; }
        .s-nav-links a { font-size: 0.875rem; font-weight: 500; color: #6B7280; text-decoration: none; transition: color 150ms; }
        .s-nav-links a:hover { color: #A35535; }
        .s-hero { position: relative; min-height: 80vh; display: flex; align-items: center; justify-content: center; text-align: center; overflow: hidden; }
        .s-hero-bg { position: absolute; inset: 0; background-size: cover; background-position: center; z-index: 0; }
        .s-hero-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(28,25,23,0.45), rgba(28,25,23,0.75)); z-index: 1; }
        .s-hero-content { position: relative; z-index: 2; max-width: 700px; padding: 2rem 1.25rem; color: #FFFFFF !important; }
        .s-hero h1 { font-family: 'Lora', Georgia, serif; font-size: 2.25rem; font-weight: 700; line-height: 1.2; margin: 0 0 1rem; color: #FFFFFF !important; }
        .s-hero p { font-size: 1.125rem; opacity: 0.92; margin: 0 0 2rem; color: #FFFFFF !important; }
        .s-btn { display: inline-block; font-family: 'Source Sans 3', sans-serif; font-weight: 600; font-size: 0.875rem; padding: 0.75rem 1.75rem; border-radius: 0.5rem; text-decoration: none; transition: background 150ms; border: none; cursor: pointer; }
        .s-btn--primary { background: #C4704B; color: #fff; }
        .s-btn--primary:hover { background: #A35535; color: #fff; }
        .s-btn--outline { background: transparent; color: #fff; border: 2px solid rgba(255,255,255,0.6); }
        .s-btn--outline:hover { background: rgba(255,255,255,0.15); color: #fff; }
        .s-about p { margin-bottom: 1rem; color: #6B7280; line-height: 1.7; }
        .s-about blockquote { font-family: 'Lora', Georgia, serif; font-style: italic; font-size: 1.25rem; color: #A35535; border-left: 3px solid #C4704B; padding-left: 1.25rem; margin: 1rem 0 0; line-height: 1.5; }
        .s-menu-grid { display: grid; gap: 1.5rem; grid-template-columns: 1fr; }
        @media (min-width: 768px) { .s-menu-grid { grid-template-columns: repeat(2, 1fr); } .s-hero h1 { font-size: 3.75rem; } .s-heading { font-size: 2.25rem; } .s-hours-grid { grid-template-columns: 1fr 1fr; } .s-reviews-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 1024px) { .s-menu-grid { grid-template-columns: repeat(4, 1fr); } }
        .s-menu-card { background: #fff; border-radius: 0.75rem; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: box-shadow 250ms; }
        .s-menu-card:hover { box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
        .s-menu-card img { width: 100%; height: 200px; object-fit: cover; }
        .s-menu-card-body { padding: 1.25rem; }
        .s-menu-card-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem; }
        .s-menu-card-name { font-family: 'Lora', Georgia, serif; font-size: 1.125rem; font-weight: 600; }
        .s-menu-card-price { font-weight: 600; color: #A35535; }
        .s-menu-card-desc { font-size: 0.875rem; color: #6B7280; line-height: 1.5; }
        .s-hours-grid { display: grid; gap: 2.5rem; grid-template-columns: 1fr; }
        .s-hours-table { width: 100%; border-collapse: collapse; }
        .s-hours-table tr { border-bottom: 1px solid #E7E5E4; }
        .s-hours-table td { padding: 0.625rem 0; font-size: 0.9375rem; }
        .s-hours-table td:first-child { font-weight: 500; }
        .s-hours-table td:last-child { text-align: right; color: #6B7280; }
        .s-reviews-grid { display: grid; gap: 1.5rem; grid-template-columns: 1fr; }
        .s-review-card { background: #fff; border-radius: 0.75rem; padding: 1.5rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .s-review-quote { font-size: 0.9375rem; color: #6B7280; line-height: 1.65; margin: 0.75rem 0 1rem; }
        .s-review-author { font-size: 0.8125rem; font-weight: 600; }
        .s-review-source { font-size: 0.75rem; color: #8390A0; }
        .s-cta-banner { text-align: center; padding: 4rem 1.25rem; background: #2C2C2C; color: #fff; }
        .s-cta-banner h2 { font-family: 'Lora', Georgia, serif; font-size: 1.875rem; font-weight: 700; margin: 0 0 0.75rem; }
        .s-cta-banner p { opacity: 0.8; margin: 0 0 2rem; }
        .s-footer { text-align: center; padding: 2rem 1.25rem; border-top: 1px solid #E7E5E4; font-size: 0.75rem; color: #8390A0; }
        .s-footer a { color: #8390A0; }
        .s-whisper { color: #7A8B6F; }
        .s-whisper a { color: #5C6B52; text-decoration: none; }
      `}</style>

      <div className="site-page">
        {/* Nav */}
        <nav className="s-nav">
          <div className="s-container s-nav-inner">
            <Link href={`/site/${businessSlug}`} className="s-nav-brand">{site.name}</Link>
            <ul className="s-nav-links">
              <li><a href="#menu">{servicesNavLabel}</a></li>
              <li><a href="#hours">Hours</a></li>
              <li><a href="#reviews">Reviews</a></li>
            </ul>
          </div>
        </nav>

        {/* Hero */}
        <section className="s-hero">
          <div className="s-hero-bg" style={{ backgroundImage: `url('${site.hero.backgroundImage}')` }} />
          <div className="s-hero-overlay" />
          <div className="s-hero-content">
            <h1>{site.hero.headline}</h1>
            <p>{site.hero.subheadline}</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href={site.vertical === 'restaurant' ? '#menu' : '#services'} className="s-btn s-btn--primary">
                {site.vertical === 'restaurant' ? 'View Our Menu' : 'View Services'}
              </a>
              <a href={`tel:${site.phone.replace(/\D/g, '')}`} className="s-btn s-btn--outline">
                {site.vertical === 'restaurant' ? 'Call to Book' : 'Book an Appointment'}
              </a>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="s-section" id="about">
          <div className="s-container">
            <p className="s-label">Our Story</p>
            <h2 className="s-heading">{site.about.heading}</h2>
            <div className="s-about">
              {site.about.body.split('\n').filter(p => p.trim()).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
              <blockquote>{site.about.highlight}</blockquote>
            </div>
          </div>
        </section>

        {/* Menu Highlights */}
        <section className="s-section s-section--muted" id="menu">
          <div className="s-container">
            <p className="s-label">{servicesLabel}</p>
            <h2 className="s-heading">{servicesHeading}</h2>
            <div className="s-menu-grid">
              {site.menuHighlights.map((item) => (
                <div key={item.name} className="s-menu-card">
                  <img src={item.image} alt={item.name} loading="lazy" width={600} height={400} />
                  <div className="s-menu-card-body">
                    <div className="s-menu-card-header">
                      <span className="s-menu-card-name">{item.name}</span>
                      <span className="s-menu-card-price">${item.price}</span>
                    </div>
                    <p className="s-menu-card-desc">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Hours & Location */}
        <section className="s-section" id="hours">
          <div className="s-container">
            <p className="s-label">Visit Us</p>
            <h2 className="s-heading">Hours & Location</h2>
            <div className="s-hours-grid">
              <div>
                <table className="s-hours-table">
                  <tbody>
                    {Object.entries(site.hours).filter(([key]) => key !== 'notes').map(([day, time]) => (
                      <tr key={day}>
                        <td>{day}</td>
                        <td style={time === 'Closed' ? { color: '#8390A0' } : undefined}>{time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {site.hours.notes && (
                  <p style={{ fontSize: '0.8125rem', color: '#8390A0', marginTop: '0.75rem', fontStyle: 'italic' }}>
                    {site.hours.notes}
                  </p>
                )}
              </div>
              <div>
                <p style={{ color: '#6B7280', lineHeight: 1.6, marginBottom: '1rem' }}>
                  {site.address.street}<br />
                  {site.address.city}, {site.address.state} {site.address.zip}
                </p>
                <p>
                  <a href={`tel:${site.phone.replace(/\D/g, '')}`} style={{ fontWeight: 500, color: '#2C2C2C' }}>
                    {site.phone}
                  </a>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Reviews */}
        <section className="s-section s-section--muted" id="reviews">
          <div className="s-container">
            <p className="s-label">What People Say</p>
            <h2 className="s-heading">From Our Guests</h2>
            <div className="s-reviews-grid">
              {site.reviews.map((review) => (
                <div key={review.author} className="s-review-card">
                  <Stars rating={review.rating} />
                  <p className="s-review-quote">&ldquo;{review.quote}&rdquo;</p>
                  <p className="s-review-author">{review.author}</p>
                  <p className="s-review-source">{review.source}</p>
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#6B7280' }}>
              <Stars rating={Math.round(site.aggregateRating.score)} />
              {' '}<strong style={{ color: '#2C2C2C' }}>{site.aggregateRating.score}</strong> out of 5 based on {site.aggregateRating.count} reviews on {site.aggregateRating.source}
            </p>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="s-cta-banner">
          <h2>{ctaHeading}</h2>
          <p>{ctaText}</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={`tel:${site.phone.replace(/\D/g, '')}`} className="s-btn s-btn--primary">{ctaButton}</a>
          </div>
        </section>

        {/* Footer */}
        <footer className="s-footer">
          <p>&copy; {new Date().getFullYear()} {site.name}. {fullAddress}.</p>
          <p style={{ marginTop: '0.5rem' }} className="s-whisper">
            Made with <a href="https://localgenius.company">LocalGenius</a>
          </p>
        </footer>
      </div>
    </>
  );
}
