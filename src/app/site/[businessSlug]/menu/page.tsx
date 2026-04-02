/**
 * Business Site Menu Subpage
 *
 * Route: GET /site/:businessSlug/menu
 * Placeholder for menu functionality.
 *
 * In a full implementation, this would display food/service menus from the business.
 * For now: returns a simple placeholder page.
 */

import { notFound } from "next/navigation";
import { getSiteData } from "../data";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{
    businessSlug: string;
  }>;
}

/**
 * Generate metadata for the menu page.
 */
export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { businessSlug } = await props.params;

  try {
    const site = await getSiteData(businessSlug);
    if (!site) {
      return {
        title: "Menu Not Found",
        description: "This menu could not be found.",
      };
    }

    return {
      title: `Menu — ${site.name}`,
      description: `Menu for ${site.name}`,
      openGraph: {
        title: `Menu — ${site.name}`,
        description: `Menu for ${site.name}`,
        url: `https://localgenius.company/site/${businessSlug}/menu`,
        type: "website",
      },
    };
  } catch (error) {
    return {
      title: "Error",
      description: "An error occurred loading this menu.",
    };
  }
}

/**
 * Menu Page Component
 *
 * Placeholder implementation. Future: fetch and render menu items from business data.
 */
export default async function MenuPage(props: PageProps) {
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
        .menu-section { padding: 4rem 1.25rem; }
        .menu-content { text-align: center; }
        .menu-content h1 { font-family: 'Lora', Georgia, serif; font-size: 2rem; margin-bottom: 1rem; }
        .menu-content p { color: #6B7280; font-size: 1rem; margin-bottom: 1rem; }
        .menu-link { display: inline-block; margin-top: 2rem; padding: 0.75rem 1.75rem; background: #C4704B; color: white; text-decoration: none; border-radius: 0.5rem; font-weight: 600; }
        .menu-link:hover { background: #A35535; }
        .s-footer { text-align: center; padding: 2rem 1.25rem; border-top: 1px solid #E7E5E4; font-size: 0.75rem; color: #8390A0; }
        .s-footer a { color: #8390A0; }
      `}</style>

      <div className="site-page">
        {/* Nav */}
        <nav className="s-nav">
          <div className="s-container s-nav-inner">
            <a href={`/site/${businessSlug}`} className="s-nav-brand">{site.name}</a>
            <ul className="s-nav-links">
              <li><a href={`/site/${businessSlug}#menu`}>Menu</a></li>
              <li><a href={`/site/${businessSlug}#hours`}>Hours</a></li>
              <li><a href={`/site/${businessSlug}#reviews`}>Reviews</a></li>
            </ul>
          </div>
        </nav>

        {/* Menu Section */}
        <section className="menu-section">
          <div className="s-container menu-content">
            <h1>Menu Coming Soon</h1>
            <p>We're preparing a digital menu for {site.name}.</p>
            <p>This feature will showcase your offerings, prices, and descriptions in a beautiful, mobile-friendly format.</p>
            <a href={`/site/${businessSlug}`} className="menu-link">Back to Main Site</a>
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
