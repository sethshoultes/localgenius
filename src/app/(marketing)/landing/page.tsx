import Link from 'next/link';

/**
 * LocalGenius Marketing Landing Page
 *
 * This is what visitors see before signing up.
 * Tagline: "Your business, handled."
 * Single emotion: relief.
 * Single CTA: Get started.
 *
 * Per marketing-messaging.md:
 * - Never say "AI-powered", "platform", "solution", "streamline"
 * - Lead with relief, not technology
 * - The product IS the marketing — show the proof moment
 */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-warm-white">
      {/* ============================================================
       * HERO
       * ============================================================ */}
      <section className="px-screen-margin pt-12 pb-16 lg:pt-20 lg:pb-24 max-w-[640px] mx-auto lg:max-w-[960px] lg:text-center">
        {/* Logo / wordmark */}
        <div className="flex items-center gap-2 mb-12 lg:justify-center">
          <div className="w-8 h-8 bg-terracotta rounded-md flex items-center justify-center">
            <span className="text-white font-semibold text-body">L</span>
          </div>
          <span className="text-h2 text-charcoal">LocalGenius</span>
        </div>

        {/* Tagline */}
        <h1 className="text-[2rem] leading-[1.15] font-semibold text-charcoal tracking-tight sm:text-[2.5rem] lg:text-[3.25rem]">
          Your business,
          <br />
          <span className="text-terracotta">handled.</span>
        </h1>

        <p className="text-body text-slate mt-6 max-w-[480px] lg:mx-auto lg:text-[1.125rem] lg:leading-relaxed">
          You didn&apos;t open a restaurant to do marketing.
          So stop doing it. Tell LocalGenius what you need —
          it handles your website, reviews, social posts, and emails.
          You get back to what you&apos;re actually good at.
        </p>

        {/* CTA */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4 lg:justify-center">
          <Link
            href="/welcome"
            className="inline-flex items-center justify-center min-h-tap-primary px-8 bg-terracotta text-white font-semibold rounded-sm hover:bg-terracotta-hover active:bg-terracotta-active transition-colors duration-instant no-underline text-body"
          >
            Get started — it takes 5 minutes
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex items-center justify-center min-h-tap-primary px-8 text-terracotta font-semibold rounded-sm hover:bg-terracotta-light transition-colors duration-instant no-underline text-body"
          >
            See how it works
          </Link>
        </div>

        {/* Social proof line */}
        <p className="text-caption text-slate mt-6 lg:mt-8">
          Trusted by 300+ Austin restaurants · $29/month · No contracts
        </p>
      </section>

      {/* ============================================================
       * THE PROOF MOMENT — Animated mockup of the 5-minute onboarding
       * ============================================================ */}
      <section className="px-screen-margin pb-16 lg:pb-24">
        <div className="max-w-[480px] mx-auto">
          {/* Phone frame mockup */}
          <div className="rounded-xl overflow-hidden border-2 shadow-lg" style={{ borderColor: 'var(--border-default)' }}>
            {/* Status bar */}
            <div className="bg-charcoal px-4 py-2 flex items-center justify-between">
              <span className="text-small text-white/60">9:41</span>
              <div className="flex gap-1">
                <div className="w-4 h-2 bg-white/40 rounded-sm" />
                <div className="w-1.5 h-2 bg-white/40 rounded-sm" />
              </div>
            </div>

            {/* App screen — showing the Reveal moment */}
            <div className="bg-warm-white p-5">
              {/* Progress bar at 100% */}
              <div className="h-[2px] bg-cream rounded-full mb-6">
                <div className="h-full bg-terracotta rounded-full w-full" />
              </div>

              <p className="text-h1 text-charcoal mb-5">
                Here&apos;s what I built for you.
              </p>

              {/* Mini website card */}
              <div className="rounded-md overflow-hidden border mb-4" style={{ borderColor: 'var(--border-default)' }}>
                <div className="bg-cream px-2.5 py-1.5 flex items-center gap-1.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-light/40" />
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-light/40" />
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-light/40" />
                  </div>
                  <div className="flex-1 bg-warm-white rounded-sm px-2 py-0.5 text-small text-slate text-center">
                    mariaskitchenatx.com
                  </div>
                </div>
                <div className="bg-warm-white p-3">
                  <div className="h-20 bg-terracotta/10 rounded-sm flex items-center justify-center mb-2">
                    <span className="text-h2 text-terracotta">Maria&apos;s Kitchen</span>
                  </div>
                  <p className="text-small text-slate">
                    Real Tex-Mex. Real people. Since 2019.
                  </p>
                  <div className="flex gap-1.5 mt-2">
                    <div className="flex-1 bg-terracotta text-white text-small text-center py-1.5 rounded-sm">
                      Book a Table
                    </div>
                    <div className="flex-1 bg-cream text-charcoal text-small text-center py-1.5 rounded-sm">
                      View Menu
                    </div>
                  </div>
                </div>
              </div>

              {/* Mini approval card */}
              <div className="bg-white rounded-md shadow-sm p-3 mb-3">
                <p className="text-caption text-slate uppercase tracking-widest font-semibold mb-1">
                  Your First Post
                </p>
                <p className="text-small text-charcoal">
                  Nothing beats a slow Tuesday with fresh guacamole and good company...
                </p>
                <div className="flex gap-2 mt-2">
                  <div className="flex-1 bg-terracotta text-white text-small text-center py-1.5 rounded-sm font-semibold">
                    Post Now
                  </div>
                  <div className="flex-1 border text-terracotta text-small text-center py-1.5 rounded-sm" style={{ borderColor: 'var(--border-default)' }}>
                    Edit
                  </div>
                </div>
              </div>

              <p className="text-caption text-slate text-center">
                All of this — in five minutes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
       * THREE VALUE PROPS
       * ============================================================ */}
      <section id="how-it-works" className="px-screen-margin py-16 bg-cream lg:py-24">
        <div className="max-w-[960px] mx-auto">
          <h2 className="text-h1 text-charcoal text-center mb-12 sm:text-[1.5rem]">
            You talk. It does the rest.
          </h2>

          <div className="flex flex-col gap-10 lg:flex-row lg:gap-8">
            {/* Value prop 1: Reviews */}
            <div className="flex-1 flex flex-col items-center text-center lg:items-start lg:text-left">
              <div className="w-12 h-12 rounded-full bg-gold-light flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <h3 className="text-h2 text-charcoal mb-2">Reviews, handled.</h3>
              <p className="text-body text-slate">
                A 2-star review at 10pm used to ruin your night. Now it gets a thoughtful, professional response before you wake up. You approve it with one tap — or let LocalGenius handle the good ones automatically.
              </p>
              {/* Mini example */}
              <div className="mt-4 w-full bg-white rounded-md shadow-sm p-3 text-left">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-gold text-small">★★★★★</span>
                  <span className="text-caption text-charcoal font-semibold">Jake R.</span>
                </div>
                <p className="text-small text-slate italic">&ldquo;Best brisket tacos in Austin!&rdquo;</p>
                <div className="mt-2 pl-3 border-l-2 border-sage">
                  <p className="text-small text-charcoal">
                    Thanks, Jake — glad you loved the brisket tacos. See you next time.
                  </p>
                  <span className="text-small text-sage font-semibold">✓ Sent</span>
                </div>
              </div>
            </div>

            {/* Value prop 2: Social */}
            <div className="flex-1 flex flex-col items-center text-center lg:items-start lg:text-left">
              <div className="w-12 h-12 rounded-full bg-terracotta-light flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-terracotta">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" x2="12" y1="2" y2="15" />
                </svg>
              </div>
              <h3 className="text-h2 text-charcoal mb-2">Social posts, created.</h3>
              <p className="text-body text-slate">
                &ldquo;Post something about our lunch special.&rdquo; That&apos;s all it takes. LocalGenius writes the copy, picks your best photo, and schedules it for when your customers are hungry.
              </p>
              {/* Mini example */}
              <div className="mt-4 w-full bg-white rounded-md shadow-sm p-3 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-terracotta/10 rounded-full flex items-center justify-center">
                    <span className="text-small text-terracotta">📱</span>
                  </div>
                  <span className="text-caption text-charcoal font-semibold">Instagram + Facebook</span>
                  <span className="text-caption text-slate ml-auto">11:30am</span>
                </div>
                <p className="text-small text-charcoal">
                  Nothing beats a slow Tuesday with fresh guacamole and good company. 🌮
                </p>
                <span className="text-small text-sage font-semibold mt-1 block">✓ Scheduled</span>
              </div>
            </div>

            {/* Value prop 3: Weekly Digest */}
            <div className="flex-1 flex flex-col items-center text-center lg:items-start lg:text-left">
              <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sage">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
              </div>
              <h3 className="text-h2 text-charcoal mb-2">Weekly insights, delivered.</h3>
              <p className="text-body text-slate">
                Every Monday at 7am, you get a 90-second read: what happened, what LocalGenius did, and what it recommends next. No dashboards. No jargon. Just a clear picture.
              </p>
              {/* Mini example */}
              <div className="mt-4 w-full bg-white rounded-md shadow-sm p-3 text-left">
                <p className="text-small text-charcoal font-semibold mb-2">
                  This week at Maria&apos;s Kitchen
                </p>
                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-h2 text-charcoal">340</span>
                    <span className="text-small text-slate">website visits</span>
                    <span className="text-small text-sage font-semibold">↑ 12%</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-h2 text-charcoal">23</span>
                    <span className="text-small text-slate">bookings</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-h2 text-charcoal">4</span>
                    <span className="text-small text-slate">new reviews</span>
                    <span className="text-small text-gold">★ all 4+</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
       * THE ASK — Single CTA
       * ============================================================ */}
      <section className="px-screen-margin py-16 lg:py-24 text-center">
        <div className="max-w-[480px] mx-auto">
          <h2 className="text-h1 text-charcoal sm:text-[1.5rem]">
            Five minutes from now, your business
            <br className="hidden sm:block" /> could look like this.
          </h2>
          <p className="text-body text-slate mt-4">
            No credit card. No contracts. No tutorials.
            <br />
            Just tell us your business name, and we&apos;ll show you.
          </p>
          <Link
            href="/welcome"
            className="inline-flex items-center justify-center min-h-tap-primary px-10 mt-8 bg-terracotta text-white font-semibold rounded-sm hover:bg-terracotta-hover active:bg-terracotta-active transition-colors duration-instant no-underline text-body"
          >
            Get started free
          </Link>
        </div>
      </section>

      {/* ============================================================
       * FOOTER — Minimal
       * ============================================================ */}
      <footer className="px-screen-margin py-8 border-t text-center" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 bg-terracotta rounded-sm flex items-center justify-center">
            <span className="text-white font-semibold text-small">L</span>
          </div>
          <span className="text-body text-charcoal font-semibold">LocalGenius</span>
        </div>
        <p className="text-caption text-slate">
          Your business, handled. · Austin, TX
        </p>
        <p className="text-small text-slate-light mt-2">
          $29/month base · $79/month pro · No contracts
        </p>
      </footer>
    </div>
  );
}
