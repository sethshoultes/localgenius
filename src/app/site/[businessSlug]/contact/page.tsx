/**
 * Business Site Contact Subpage
 *
 * Route: GET /site/:businessSlug/contact
 * Contact, booking, and hours information for the business.
 *
 * Shows: phone (click-to-call), email (mailto), address, hours table
 * CTA: "Call Now" button with the same design system.
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
 * Generate metadata for the contact page.
 */
export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { businessSlug } = await props.params;

  try {
    const site = await getSiteData(businessSlug);
    if (!site) {
      return {
        title: "Contact Not Found",
        description: "This contact information could not be found.",
      };
    }

    return {
      title: `Contact — ${site.name}`,
      description: `Get in touch with ${site.name}. Phone, email, hours, and address.`,
      openGraph: {
        title: `Contact — ${site.name}`,
        description: `Get in touch with ${site.name}. Phone, email, hours, and address.`,
        url: `https://localgenius.company/site/${businessSlug}/contact`,
        type: "website",
      },
    };
  } catch (error) {
    return {
      title: "Error",
      description: "An error occurred loading contact information.",
    };
  }
}

/**
 * Contact Page Component
 *
 * Displays phone, email, address, and hours.
 * Includes a prominent "Call Now" CTA.
 */
export const dynamic = "force-dynamic";

export default async function ContactPage(props: PageProps) {
  const { businessSlug } = await props.params;

  const site = await getSiteData(businessSlug);

  if (!site) {
    notFound();
  }

  const fullAddress = `${site.address.street}, ${site.address.city}, ${site.address.state} ${site.address.zip}`;
  const phoneDigits = site.phone.replace(/\D/g, "");

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
        .contact-section { padding: 4rem 1.25rem; }
        .contact-header { margin-bottom: 3rem; }
        .contact-label { font-family: 'Source Sans 3', sans-serif; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: #A35535; margin-bottom: 0.5rem; }
        .contact-heading { font-family: 'Lora', Georgia, serif; font-size: 2rem; font-weight: 700; line-height: 1.2; color: #2C2C2C; margin: 0; }
        .contact-grid { display: grid; gap: 3rem; grid-template-columns: 1fr; }
        @media (min-width: 768px) { .contact-grid { grid-template-columns: repeat(2, 1fr); } .contact-heading { font-size: 2.25rem; } }
        .contact-block { }
        .contact-block h2 { font-family: 'Lora', Georgia, serif; font-size: 1.25rem; font-weight: 600; margin: 0 0 1.25rem; color: #2C2C2C; }
        .contact-block-content { font-size: 0.9375rem; line-height: 1.7; }
        .contact-link { display: inline-block; margin-bottom: 0.5rem; color: #A35535; text-decoration: none; font-weight: 500; }
        .contact-link:hover { color: #8A4429; }
        .contact-text { margin: 0.5rem 0; color: #6B7280; }
        .contact-text strong { color: #2C2C2C; }
        .hours-table { width: 100%; border-collapse: collapse; margin-top: 0.75rem; }
        .hours-table tr { border-bottom: 1px solid #E7E5E4; }
        .hours-table td { padding: 0.625rem 0; font-size: 0.9375rem; }
        .hours-table td:first-child { font-weight: 500; color: #2C2C2C; }
        .hours-table td:last-child { text-align: right; color: #6B7280; }
        .hours-notes { font-size: 0.8125rem; color: #8390A0; margin-top: 0.75rem; font-style: italic; }
        .s-btn { display: inline-block; font-family: 'Source Sans 3', sans-serif; font-weight: 600; font-size: 0.875rem; padding: 0.75rem 1.75rem; border-radius: 0.5rem; text-decoration: none; transition: background 150ms; border: none; cursor: pointer; }
        .s-btn--primary { background: #C4704B; color: #fff; }
        .s-btn--primary:hover { background: #A35535; color: #fff; }
        .back-link { display: inline-block; margin-bottom: 2rem; font-size: 0.875rem; color: #A35535; text-decoration: none; font-weight: 500; }
        .back-link:hover { color: #8A4429; }
        .cta-section { margin-top: 3rem; padding: 2rem; background: #F2EDE8; border-radius: 0.75rem; text-align: center; }
        .cta-section h3 { font-family: 'Lora', Georgia, serif; font-size: 1.25rem; margin: 0 0 1rem; color: #2C2C2C; }
        .cta-section p { margin: 0 0 1.5rem; color: #6B7280; }
        .s-footer { text-align: center; padding: 2rem 1.25rem; border-top: 1px solid #E7E5E4; font-size: 0.75rem; color: #8390A0; }
        .s-footer a { color: #8390A0; }
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

        {/* Contact Section */}
        <section className="contact-section">
          <div className="s-container">
            <Link href={`/site/${businessSlug}`} className="back-link">← Back to Main Site</Link>
            <div className="contact-header">
              <p className="contact-label">Get in Touch</p>
              <h1 className="contact-heading">Contact & Hours</h1>
            </div>

            <div className="contact-grid">
              {/* Contact Info */}
              <div className="contact-block">
                <h2>Reach Us</h2>
                <div className="contact-block-content">
                  <a href={`tel:${phoneDigits}`} className="contact-link">
                    {site.phone}
                  </a>
                  <p className="contact-text">
                    <strong>Call to book or get more info</strong>
                  </p>

                  {site.email && (
                    <>
                      <a href={`mailto:${site.email}`} className="contact-link">
                        {site.email}
                      </a>
                      <p className="contact-text">
                        <strong>Email us</strong>
                      </p>
                    </>
                  )}

                  <div style={{ marginTop: "1.5rem" }}>
                    <p className="contact-text">
                      <strong>Location</strong>
                    </p>
                    <p className="contact-text" style={{ marginBottom: 0 }}>
                      {fullAddress}
                    </p>
                  </div>
                </div>
              </div>

              {/* Hours */}
              <div className="contact-block">
                <h2>Hours</h2>
                <div className="contact-block-content">
                  <table className="hours-table">
                    <tbody>
                      {Object.entries(site.hours)
                        .filter(([key]) => key !== "notes")
                        .map(([day, time]) => (
                          <tr key={day}>
                            <td>{day}</td>
                            <td style={time === "Closed" ? { color: "#8390A0" } : undefined}>
                              {time}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {site.hours.notes && (
                    <p className="hours-notes">{site.hours.notes}</p>
                  )}
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="cta-section">
              <h3>Ready to reach out?</h3>
              <p>Give us a call or visit us. We'd love to hear from you.</p>
              <a href={`tel:${phoneDigits}`} className="s-btn s-btn--primary">
                Call Now
              </a>
            </div>
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
