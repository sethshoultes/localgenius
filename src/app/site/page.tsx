/**
 * LocalGenius Sites Directory
 *
 * Route: GET /site
 * Public listing of all available business websites.
 *
 * Shows: Site name, tagline, and link to view the full site.
 * Grid layout with the same design system (Lora + Source Sans 3, terracotta accents).
 */

import Link from "next/link";
import type { Metadata } from "next";
import { getAllSiteSlugs, getSiteData } from "./[businessSlug]/data";

/**
 * Page metadata
 */
export const metadata: Metadata = {
  title: "LocalGenius Sites — Live Business Websites",
  description: "Explore live business websites built with LocalGenius. Beautiful, fast websites for your business.",
  openGraph: {
    title: "LocalGenius Sites — Live Business Websites",
    description: "Explore live business websites built with LocalGenius.",
    url: "https://localgenius.company/site",
    type: "website",
  },
};

/**
 * Sites Directory Page
 *
 * Lists all available business sites with their names, taglines, and links.
 */
export default async function SitesDirectoryPage() {
  // Get all available site slugs
  const slugs = await getAllSiteSlugs();

  // Fetch data for each site
  const sites = await Promise.all(
    slugs.map(async (slug) => {
      const siteData = await getSiteData(slug);
      return {
        slug,
        data: siteData,
      };
    })
  );

  // Filter out any failed fetches and sort by name
  const validSites = sites
    .filter((s) => s.data !== null)
    .sort((a, b) => (a.data?.name || "").localeCompare(b.data?.name || ""));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Source+Sans+3:wght@400;600&display=swap');
        .directory-page { font-family: 'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif; background: #FAF8F5; color: #2C2C2C; margin: 0; line-height: 1.65; }
        .directory-page * { box-sizing: border-box; }
        .directory-page img { max-width: 100%; height: auto; display: block; }
        .d-container { max-width: 1120px; margin: 0 auto; padding: 0 1.25rem; }
        .d-header { padding: 4rem 1.25rem; text-align: center; }
        .d-nav { position: sticky; top: 0; z-index: 100; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border-bottom: 1px solid #E7E5E4; }
        .d-nav-inner { display: flex; align-items: center; justify-content: center; height: 3.5rem; }
        .d-nav a { font-family: 'Lora', Georgia, serif; font-weight: 700; font-size: 1.25rem; color: #2C2C2C; text-decoration: none; }
        .d-nav a:hover { color: #A35535; }
        .d-label { font-family: 'Source Sans 3', sans-serif; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: #A35535; margin-bottom: 0.5rem; }
        .d-heading { font-family: 'Lora', Georgia, serif; font-size: 2.25rem; font-weight: 700; line-height: 1.2; color: #2C2C2C; margin: 0 0 1rem; }
        .d-subheading { font-size: 1rem; color: #6B7280; margin: 0; }
        .d-grid { display: grid; gap: 2rem; grid-template-columns: 1fr; padding: 3rem 1.25rem; }
        @media (min-width: 768px) { .d-grid { grid-template-columns: repeat(2, 1fr); } .d-heading { font-size: 2.75rem; } }
        @media (min-width: 1024px) { .d-grid { grid-template-columns: repeat(3, 1fr); } }
        .d-card { background: #fff; border-radius: 0.75rem; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: box-shadow 250ms, transform 250ms; text-decoration: none; color: inherit; display: flex; flex-direction: column; }
        .d-card:hover { box-shadow: 0 4px 6px rgba(0,0,0,0.07); transform: translateY(-2px); }
        .d-card-img { width: 100%; height: 200px; object-fit: cover; background: #F2EDE8; }
        .d-card-body { padding: 1.5rem; flex: 1; display: flex; flex-direction: column; }
        .d-card-name { font-family: 'Lora', Georgia, serif; font-size: 1.25rem; font-weight: 700; color: #2C2C2C; margin: 0 0 0.5rem; line-height: 1.3; }
        .d-card-tagline { font-size: 0.875rem; color: #6B7280; margin: 0; line-height: 1.5; flex: 1; }
        .d-card-link { display: inline-block; margin-top: 1rem; font-weight: 600; color: #A35535; text-decoration: none; transition: color 150ms; }
        .d-card-link:hover { color: #8A4429; }
        .d-footer { text-align: center; padding: 3rem 1.25rem; border-top: 1px solid #E7E5E4; font-size: 0.75rem; color: #8390A0; }
        .d-footer a { color: #8390A0; }
        .d-cta { text-align: center; padding: 2rem 1.25rem; }
        .d-cta a { display: inline-block; margin-top: 1rem; font-family: 'Source Sans 3', sans-serif; font-weight: 600; font-size: 0.875rem; padding: 0.75rem 1.75rem; background: #C4704B; color: #fff; text-decoration: none; border-radius: 0.5rem; transition: background 150ms; }
        .d-cta a:hover { background: #A35535; }
        .empty-state { text-align: center; padding: 4rem 1.25rem; }
        .empty-state p { color: #6B7280; font-size: 1rem; }
      `}</style>

      <div className="directory-page">
        {/* Nav */}
        <nav className="d-nav">
          <div className="d-nav-inner">
            <Link href="/site">LocalGenius Sites</Link>
          </div>
        </nav>

        {/* Header */}
        <section className="d-header">
          <p className="d-label">Live Examples</p>
          <h1 className="d-heading">LocalGenius Sites</h1>
          <p className="d-subheading">Explore beautiful, fast business websites built with LocalGenius</p>
        </section>

        {/* Sites Grid */}
        {validSites.length > 0 ? (
          <section className="d-grid">
            {validSites.map(({ slug, data }) => (
              <Link key={slug} href={`/site/${slug}`} className="d-card">
                <img
                  src={data!.hero.backgroundImage}
                  alt={data!.name}
                  className="d-card-img"
                  loading="lazy"
                  width={600}
                  height={400}
                />
                <div className="d-card-body">
                  <h2 className="d-card-name">{data!.name}</h2>
                  <p className="d-card-tagline">{data!.tagline}</p>
                  <span className="d-card-link">View Site →</span>
                </div>
              </Link>
            ))}
          </section>
        ) : (
          <section className="empty-state">
            <p>No sites available yet. Check back soon!</p>
          </section>
        )}

        {/* CTA */}
        <section className="d-cta">
          <p style={{ color: "#6B7280", margin: 0 }}>
            Want a website like these?
          </p>
          <a href="https://localgenius.company">
            Get Your Site
          </a>
        </section>

        {/* Footer */}
        <footer className="d-footer">
          <p>&copy; {new Date().getFullYear()} LocalGenius. All rights reserved.</p>
          <p style={{ marginTop: "0.5rem" }}>
            <a href="https://localgenius.company">LocalGenius.company</a>
          </p>
        </footer>
      </div>
    </>
  );
}
