/**
 * Website Generator — The 5-Minute Proof Moment Engine
 * Spec: product-design.md Step 5 "The Reveal"
 *
 * Takes business info + photos → generates a live, mobile-optimized static site.
 * This is what Maria sees during onboarding. The moment she tears up.
 *
 * Design tokens from product-design.md Section 5:
 *   Warm Charcoal #2C2C2C, Warm White #FAF8F5, Terracotta #C4704B,
 *   Sage #7A8B6F, Soft Gold #D4A853, Source Sans 3 typeface.
 */

import { db } from "@/lib/db";
import { businesses, reviews } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { generate } from "./ai";

interface BusinessInput {
  name: string;
  vertical: string;
  city: string;
  state: string;
  address?: string | null;
  phone?: string | null;
  description?: string;
  photos?: string[];
  hours?: Record<string, string>;
}

interface GeneratedSite {
  html: string;
  metadata: {
    title: string;
    description: string;
    generatedAt: string;
  };
}

/**
 * Generate a complete static website for a business.
 * Called during onboarding Step 5 — The Reveal.
 */
export async function generateWebsite(
  businessId: string,
  organizationId: string,
  input: BusinessInput
): Promise<GeneratedSite> {
  // Generate AI copy if no description provided
  let description = input.description;
  if (!description) {
    description = await generate({
      prompt: `Write a warm, confident 2-3 sentence description for ${input.name}, a ${input.vertical} in ${input.city}, ${input.state}. Write as if you are the owner speaking about your business. No marketing jargon. Local, authentic, proud.`,
      maxTokens: 200,
    });
  }

  // Generate a tagline
  const tagline = await generate({
    prompt: `Write a 5-8 word tagline for ${input.name}, a ${input.vertical} in ${input.city}. Warm, memorable, local. No clichés. Examples of the tone: "Tex-Mex from scratch on South Lamar" or "Where neighbors become regulars." Just the tagline, nothing else.`,
    maxTokens: 50,
  });

  // Pull recent positive reviews for the site
  const topReviews = await db
    .select()
    .from(reviews)
    .where(
      and(
        eq(reviews.businessId, businessId),
        sql`${reviews.rating} >= 4`
      )
    )
    .orderBy(desc(reviews.rating), desc(reviews.reviewDate))
    .limit(3);

  const heroPhoto = input.photos?.[0] || null;
  const galleryPhotos = input.photos?.slice(1, 4) || [];

  const defaultHours: Record<string, string> = {
    "Mon-Thu": "11am - 9pm",
    "Fri-Sat": "11am - 10pm",
    "Sun": "10am - 8pm",
  };
  const hours = input.hours || defaultHours;

  const metaDescription = `${input.name} — ${tagline.trim()}. ${input.vertical.charAt(0).toUpperCase() + input.vertical.slice(1)} in ${input.city}, ${input.state}.`;

  const html = renderSite({
    name: input.name,
    tagline: tagline.trim(),
    description: description.trim(),
    vertical: input.vertical,
    city: input.city,
    state: input.state,
    address: input.address || "",
    phone: input.phone || "",
    heroPhoto,
    galleryPhotos,
    hours,
    reviews: topReviews.map((r) => ({
      name: r.reviewerName || "A happy customer",
      rating: r.rating,
      text: r.reviewText || "",
    })),
    metaDescription,
  });

  // Store generated site content on the business record
  await db
    .update(businesses)
    .set({
      updatedAt: new Date(),
    })
    .where(
      and(eq(businesses.id, businessId), eq(businesses.organizationId, organizationId))
    );

  return {
    html,
    metadata: {
      title: `${input.name} — ${tagline.trim()}`,
      description: metaDescription,
      generatedAt: new Date().toISOString(),
    },
  };
}

// ─── HTML Template ────────────────────────────────────────────────────────────

interface SiteData {
  name: string;
  tagline: string;
  description: string;
  vertical: string;
  city: string;
  state: string;
  address: string;
  phone: string;
  heroPhoto: string | null;
  galleryPhotos: string[];
  hours: Record<string, string>;
  reviews: Array<{ name: string; rating: number; text: string }>;
  metaDescription: string;
}

function renderStars(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

function renderSite(data: SiteData): string {
  const reviewsHtml = data.reviews.length > 0
    ? data.reviews
        .map(
          (r) => `
        <div class="review-card">
          <div class="review-stars">${renderStars(r.rating)}</div>
          <p class="review-text">"${r.text}"</p>
          <p class="review-author">— ${r.name}</p>
        </div>`
        )
        .join("")
    : "";

  const galleryHtml = data.galleryPhotos.length > 0
    ? `<section class="gallery">
        <div class="gallery-grid">
          ${data.galleryPhotos.map((url) => `<img src="${url}" alt="${data.name}" loading="lazy" />`).join("")}
        </div>
      </section>`
    : "";

  const hoursHtml = Object.entries(data.hours)
    .map(([day, time]) => `<div class="hours-row"><span>${day}</span><span>${time}</span></div>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${data.metaDescription}">
  <title>${data.name} — ${data.tagline}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --charcoal: #2C2C2C;
      --warm-white: #FAF8F5;
      --terracotta: #C4704B;
      --sage: #7A8B6F;
      --gold: #D4A853;
      --slate: #6B7280;
      --cream: #F2EDE8;
      --blush: #F5E6E0;
    }

    body {
      font-family: 'Source Sans 3', system-ui, -apple-system, sans-serif;
      color: var(--charcoal);
      background: var(--warm-white);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    /* ─── Hero ─── */
    .hero {
      position: relative;
      min-height: 60vh;
      display: flex;
      align-items: flex-end;
      padding: 40px 24px;
      background: ${data.heroPhoto ? `linear-gradient(to top, rgba(44,44,44,0.85) 0%, rgba(44,44,44,0.3) 50%, transparent 100%), url('${data.heroPhoto}') center/cover no-repeat` : "linear-gradient(135deg, var(--terracotta) 0%, #8B4B3A 100%)"};
    }
    .hero-content { max-width: 640px; color: white; }
    .hero h1 { font-size: 2.5rem; font-weight: 700; line-height: 1.15; margin-bottom: 8px; }
    .hero .tagline { font-size: 1.25rem; opacity: 0.9; margin-bottom: 16px; }
    .hero .cta-row { display: flex; gap: 12px; flex-wrap: wrap; }
    .btn {
      display: inline-block; padding: 14px 28px; border-radius: 8px;
      text-decoration: none; font-weight: 600; font-size: 1rem; transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
    .btn-primary { background: var(--terracotta); color: white; }
    .btn-secondary { background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.3); }

    /* ─── Sections ─── */
    section { padding: 48px 24px; max-width: 720px; margin: 0 auto; }
    h2 { font-size: 1.5rem; font-weight: 600; margin-bottom: 16px; color: var(--charcoal); }

    .about p { font-size: 1.1rem; color: var(--slate); line-height: 1.8; }

    /* ─── Gallery ─── */
    .gallery-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px; border-radius: 12px; overflow: hidden;
    }
    .gallery-grid img { width: 100%; height: 200px; object-fit: cover; border-radius: 8px; }

    /* ─── Hours ─── */
    .hours-card { background: var(--cream); border-radius: 12px; padding: 24px; }
    .hours-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.06); }
    .hours-row:last-child { border-bottom: none; }

    /* ─── Reviews ─── */
    .reviews-grid { display: grid; gap: 16px; }
    .review-card { background: white; border: 1px solid var(--cream); border-radius: 12px; padding: 20px; }
    .review-stars { color: var(--gold); font-size: 1.1rem; margin-bottom: 8px; }
    .review-text { font-style: italic; color: var(--slate); margin-bottom: 8px; }
    .review-author { font-size: 0.875rem; color: var(--slate); }

    /* ─── Contact ─── */
    .contact-card { background: var(--cream); border-radius: 12px; padding: 24px; }
    .contact-item { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .contact-item:last-child { margin-bottom: 0; }
    .contact-icon { width: 20px; text-align: center; color: var(--terracotta); }

    /* ─── Footer ─── */
    footer {
      text-align: center; padding: 32px 24px; color: var(--slate);
      font-size: 0.8rem; border-top: 1px solid var(--cream);
    }
    footer a { color: var(--terracotta); text-decoration: none; }

    @media (max-width: 480px) {
      .hero h1 { font-size: 1.75rem; }
      .hero { min-height: 50vh; padding: 32px 20px; }
      section { padding: 32px 20px; }
    }
  </style>
</head>
<body>
  <header class="hero">
    <div class="hero-content">
      <h1>${data.name}</h1>
      <p class="tagline">${data.tagline}</p>
      <div class="cta-row">
        ${data.phone ? `<a href="tel:${data.phone.replace(/[^+\d]/g, "")}" class="btn btn-primary">Call Us</a>` : ""}
        ${data.address ? `<a href="https://maps.google.com/?q=${encodeURIComponent(data.address)}" class="btn btn-secondary" target="_blank">Get Directions</a>` : ""}
      </div>
    </div>
  </header>

  <section class="about">
    <h2>About Us</h2>
    <p>${data.description}</p>
  </section>

  ${galleryHtml}

  ${data.reviews.length > 0 ? `
  <section class="reviews">
    <h2>What People Are Saying</h2>
    <div class="reviews-grid">
      ${reviewsHtml}
    </div>
  </section>` : ""}

  <section class="hours-section">
    <h2>Hours</h2>
    <div class="hours-card">
      ${hoursHtml}
    </div>
  </section>

  <section class="contact-section">
    <h2>Visit Us</h2>
    <div class="contact-card">
      ${data.address ? `<div class="contact-item"><span class="contact-icon">&#x1F4CD;</span><span>${data.address}</span></div>` : ""}
      ${data.phone ? `<div class="contact-item"><span class="contact-icon">&#x1F4DE;</span><a href="tel:${data.phone.replace(/[^+\d]/g, "")}">${data.phone}</a></div>` : ""}
    </div>
  </section>

  <footer>
    <p>&copy; ${new Date().getFullYear()} ${data.name}. All rights reserved.</p>
    <p style="margin-top: 8px;">Powered by <a href="https://localgenius.com">LocalGenius</a></p>
  </footer>
</body>
</html>`;
}
