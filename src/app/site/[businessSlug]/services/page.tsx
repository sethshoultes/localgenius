/**
 * Business Site Services Subpage
 *
 * Route: GET /site/:businessSlug/services
 * Displays service offerings for service-based businesses (dental, salon, etc.)
 *
 * Shows menuHighlights as "services" with name, description, and price.
 * Uses the same design system as the main site and menu pages.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { getSiteData } from "../data";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{
    businessSlug: string;
  }>;
}

/**
 * Generate metadata for the services page.
 */
export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { businessSlug } = await props.params;

  try {
    const site = await getSiteData(businessSlug);
    if (!site) {
      return {
        title: "Services Not Found",
        description: "These services could not be found.",
      };
    }

    return {
      title: `Services — ${site.name}`,
      description: `Services and offerings from ${site.name}`,
      openGraph: {
        title: `Services — ${site.name}`,
        description: `Services and offerings from ${site.name}`,
        url: `https://localgenius.company/site/${businessSlug}/services`,
        type: "website",
      },
    };
  } catch (error) {
    return {
      title: "Error",
      description: "An error occurred loading these services.",
    };
  }
}

/**
 * Services Page Component
 *
 * Displays service highlights from the business data in a grid layout.
 */
export const dynamic = "force-dynamic";

export default async function ServicesPage(props: PageProps) {
  const { businessSlug } = await props.params;

  const site = await getSiteData(businessSlug);

  if (!site) {
    notFound();
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Source+Sans+3:wght@400;600&display=swap');
        .site-page { font-family: 'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif; background: #FAF8F5; color: #2C2C2C; margin: 0; line-height: 1.65; }
        .site-page * { box-sizing: border-box; }
        .s-container { max-width: 1120px; margin: 0 auto; padding: 0 1.25rem; }
        .s-nav { position: sticky; top: 0; z-index: 100; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border-bottom: 1px solid #E7E5E4; }
        .s-nav-inner { display: flex; align-items: center; justify-content: space-between; height: 3.5rem; }
        .s-nav-brand { font-family: 'Lora', Georgia, serif; font-weight: 700; font-size: 1.25rem; color: #2C2C2C; text-decoration: none; }
        .s-nav-links { display: flex; gap: 1.5rem; list-style: none; margin: 0; padding: 0; }
        .s-nav-links a { font-size: 0.875rem; font-weight: 500; color: #6B7280; text-decoration: none; transition: color 150ms; }
        .s-nav-links a:hover { color: #A35535; }
        .services-section { padding: 4rem 1.25rem; }
        .services-header { margin-bottom: 3rem; }
        .services-label { font-family: 'Source Sans 3', sans-serif; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: #A35535; margin-bottom: 0.5rem; }
        .services-heading { font-family: 'Lora', Georgia, serif; font-size: 2rem; font-weight: 700; line-height: 1.2; color: #2C2C2C; margin: 0; }
        .services-grid { display: grid; gap: 1.5rem; grid-template-columns: 1fr; }
        @media (min-width: 768px) { .services-grid { grid-template-columns: repeat(2, 1fr); } .services-heading { font-size: 2.25rem; } }
        @media (min-width: 1024px) { .services-grid { grid-template-columns: repeat(4, 1fr); } }
        .service-card { background: #fff; border-radius: 0.75rem; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: box-shadow 250ms; }
        .service-card:hover { box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
        .service-card img { width: 100%; height: 200px; object-fit: cover; }
        .service-card-body { padding: 1.25rem; }
        .service-card-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem; }
        .service-card-name { font-family: 'Lora', Georgia, serif; font-size: 1.125rem; font-weight: 600; color: #2C2C2C; }
        .service-card-price { font-weight: 600; color: #A35535; font-size: 0.9375rem; }
        .service-card-desc { font-size: 0.875rem; color: #6B7280; line-height: 1.5; margin: 0; }
        .back-link { display: inline-block; margin-bottom: 2rem; font-size: 0.875rem; color: #A35535; text-decoration: none; font-weight: 500; }
        .back-link:hover { color: #8A4429; }
        .s-footer { text-align: center; padding: 2rem 1.25rem; border-top: 1px solid #E7E5E4; font-size: 0.75rem; color: #8390A0; }
        .s-footer a { color: #8390A0; }
        .empty-state { text-align: center; padding: 3rem 0; }
        .empty-state p { color: #6B7280; font-size: 1rem; }
      `}</style>

      <div className="site-page">
        {/* Nav */}
        <nav className="s-nav">
          <div className="s-container s-nav-inner">
            <Link href={`/site/${businessSlug}`} className="s-nav-brand">{site.name}</Link>
            <ul className="s-nav-links">
              <li><a href={`/site/${businessSlug}#menu`}>Menu</a></li>
              <li><a href={`/site/${businessSlug}#hours`}>Hours</a></li>
              <li><a href={`/site/${businessSlug}#reviews`}>Reviews</a></li>
            </ul>
          </div>
        </nav>

        {/* Services Section */}
        <section className="services-section">
          <div className="s-container">
            <Link href={`/site/${businessSlug}`} className="back-link">← Back to Main Site</Link>
            <div className="services-header">
              <p className="services-label">Our Offerings</p>
              <h1 className="services-heading">Services</h1>
            </div>

            {site.menuHighlights && site.menuHighlights.length > 0 ? (
              <div className="services-grid">
                {site.menuHighlights.map((service) => (
                  <div key={service.name} className="service-card">
                    <img src={service.image} alt={service.name} loading="lazy" width={600} height={400} />
                    <div className="service-card-body">
                      <div className="service-card-header">
                        <span className="service-card-name">{service.name}</span>
                        <span className="service-card-price">${service.price}</span>
                      </div>
                      <p className="service-card-desc">{service.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>Services coming soon. Check back later!</p>
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="s-footer">
          <p>&copy; {new Date().getFullYear()} {site.name}. All rights reserved.</p>
          <p style={{ marginTop: "0.5rem" }}>
            Made with <a href="https://localgenius.company">LocalGenius</a>
          </p>
        </footer>
      </div>
    </>
  );
}
