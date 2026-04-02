import Link from 'next/link';

/**
 * LocalGenius Marketing Landing Page — Pitch-Ready
 *
 * Hero: "Your business, handled." + phone mockup with live conversation
 * Value props: Reviews Handled, Social Posts Created, Weekly Insights
 * Social proof: "Trusted by 500 Austin restaurants"
 * Single CTA: "Get started in 5 minutes"
 *
 * Per marketing-messaging.md: never say "AI-powered", "platform", "solution"
 */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-warm-white">
      {/* ============================================================
       * NAV
       * ============================================================ */}
      <nav className="px-screen-margin py-4 flex items-center justify-between max-w-[1120px] mx-auto">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <div className="w-8 h-8 bg-terracotta rounded-md flex items-center justify-center">
            <span className="text-white font-semibold text-body">L</span>
          </div>
          <span className="text-h2 text-charcoal">LocalGenius</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/pricing" className="text-body text-slate hover:text-charcoal transition-colors no-underline hidden sm:inline">
            Pricing
          </Link>
          <Link
            href="/welcome"
            className="inline-flex items-center justify-center min-h-tap-min px-5 bg-terracotta text-white font-semibold rounded-sm hover:bg-terracotta-hover transition-colors no-underline text-caption"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* ============================================================
       * HERO — Tagline + Phone Mockup with conversation thread
       * ============================================================ */}
      <section className="px-screen-margin pt-12 pb-20 lg:pt-20 lg:pb-28 max-w-[1120px] mx-auto">
        <div className="lg:flex lg:items-center lg:gap-16">
          {/* Left — copy */}
          <div className="lg:flex-1 lg:max-w-[520px]">
            <h1 className="text-[2.25rem] leading-[1.1] font-semibold text-charcoal tracking-tight sm:text-[2.75rem] lg:text-[3.5rem]">
              Your business,
              <br />
              <span className="text-terracotta">handled.</span>
            </h1>

            <p className="text-body text-slate mt-6 max-w-[480px] lg:text-[1.125rem] lg:leading-relaxed">
              You didn&apos;t open a restaurant to do marketing.
              So stop doing it. Tell LocalGenius what you need —
              it handles your website, reviews, social posts, and emails.
              You get back to what you&apos;re actually good at.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/welcome"
                className="inline-flex items-center justify-center min-h-tap-primary px-8 bg-terracotta text-white font-semibold rounded-sm hover:bg-terracotta-hover active:bg-terracotta-active transition-colors no-underline text-body"
              >
                Get started in 5 minutes
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center min-h-tap-primary px-8 text-terracotta font-semibold rounded-sm hover:bg-terracotta-light transition-colors no-underline text-body"
              >
                See pricing
              </Link>
            </div>

            <p className="text-caption text-slate mt-6">
              Trusted by 500 Austin restaurants · No credit card required
            </p>
          </div>

          {/* Right — Phone mockup with conversation thread */}
          <div className="mt-12 lg:mt-0 lg:flex-1 flex justify-center">
            <div className="w-[300px] sm:w-[320px]">
              <div className="rounded-[24px] overflow-hidden border-[3px] border-charcoal/10 shadow-lg bg-warm-white">
                {/* Status bar */}
                <div className="bg-charcoal px-5 pt-3 pb-2 flex items-center justify-between">
                  <span className="text-small text-white/60">9:41</span>
                  <div className="flex gap-1">
                    <div className="w-4 h-2 bg-white/40 rounded-sm" />
                    <div className="w-1.5 h-2 bg-white/40 rounded-sm" />
                  </div>
                </div>

                {/* Header */}
                <div className="px-4 py-3 bg-white border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <span className="text-h2 text-charcoal">Maria&apos;s Kitchen</span>
                  <span className="text-caption text-sage block">Everything&apos;s handled</span>
                </div>

                {/* Conversation thread preview */}
                <div className="px-4 py-4 flex flex-col gap-3 min-h-[380px]">
                  {/* System message */}
                  <div className="flex justify-start">
                    <div className="max-w-[85%] bg-cream rounded-md rounded-bl-sm px-3 py-2">
                      <p className="text-small text-charcoal leading-relaxed">
                        Good morning, Maria. Your site is live — 3 people have already visited.
                      </p>
                    </div>
                  </div>

                  {/* Approval card mini */}
                  <div className="bg-white rounded-md shadow-sm p-3">
                    <p className="text-small text-slate uppercase tracking-wider font-semibold mb-1">Social post</p>
                    <p className="text-small text-charcoal mb-2">
                      Nothing beats fresh guacamole and good company. 🌮
                    </p>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-terracotta text-white text-small text-center py-1.5 rounded-sm font-semibold">
                        Post Now
                      </div>
                      <div className="flex-1 border text-terracotta text-small text-center py-1.5 rounded-sm" style={{ borderColor: 'var(--border-default)' }}>
                        Edit
                      </div>
                    </div>
                  </div>

                  {/* Review alert mini */}
                  <div className="bg-white rounded-md shadow-sm p-3 border-l-[3px] border-gold">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-gold text-small">★★★★★</span>
                      <span className="text-small text-charcoal font-semibold">Jake R.</span>
                    </div>
                    <p className="text-small text-slate italic">&ldquo;Best brisket tacos in Austin!&rdquo;</p>
                    <div className="mt-2 pl-2 border-l-2 border-sage">
                      <p className="text-small text-charcoal">Thanks, Jake — see you next time.</p>
                      <span className="text-small text-sage font-semibold">✓ Sent</span>
                    </div>
                  </div>

                  {/* User message */}
                  <div className="flex justify-end">
                    <div className="max-w-[80%] bg-terracotta-light rounded-md rounded-br-sm px-3 py-2">
                      <p className="text-small text-charcoal">How am I doing this week?</p>
                    </div>
                  </div>

                  {/* Report mini */}
                  <div className="flex justify-start">
                    <div className="max-w-[85%] bg-cream rounded-md rounded-bl-sm px-3 py-2">
                      <p className="text-small text-charcoal leading-relaxed">
                        340 visits (↑12%), 4 new reviews, 23 bookings. Your best week yet.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Input bar */}
                <div className="px-4 py-2 bg-white border-t flex items-center gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex-1 bg-cream rounded-md px-3 py-2">
                    <span className="text-small text-slate-light">Talk to LocalGenius...</span>
                  </div>
                  <div className="w-8 h-8 bg-terracotta rounded-full flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" x2="12" y1="19" y2="5" /><polyline points="5 12 12 5 19 12" />
                    </svg>
                  </div>
                </div>

                {/* Bottom nav */}
                <div className="flex items-center justify-around py-2 bg-white border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex flex-col items-center gap-0.5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" className="text-terracotta"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    <span className="text-small text-terracotta">Thread</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
                    <span className="text-small text-slate">Digest</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
       * VALUE PROPS — Three columns with animated counters
       * ============================================================ */}
      <section className="px-screen-margin py-20 bg-cream">
        <div className="max-w-[1120px] mx-auto">
          <h2 className="text-h1 text-charcoal text-center mb-4 sm:text-[1.5rem]">
            You talk. It does the rest.
          </h2>
          <p className="text-body text-slate text-center mb-12 max-w-[480px] mx-auto">
            One conversation replaces the 6 tools you&apos;re juggling.
          </p>

          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8">
            {/* Reviews Handled */}
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-gold-light flex items-center justify-center mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <span className="text-display text-charcoal">12,400+</span>
              <span className="text-h2 text-charcoal mt-1">Reviews handled</span>
              <p className="text-body text-slate mt-3">
                A 2-star review at 10pm used to ruin your night. Now it gets a thoughtful response before you wake up.
              </p>
            </div>

            {/* Social Posts Created */}
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-terracotta-light flex items-center justify-center mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-terracotta">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" x2="12" y1="2" y2="15" />
                </svg>
              </div>
              <span className="text-display text-charcoal">8,200+</span>
              <span className="text-h2 text-charcoal mt-1">Posts created</span>
              <p className="text-body text-slate mt-3">
                &ldquo;Post something about our lunch special.&rdquo; That&apos;s all it takes. Copy, photo, scheduling — handled.
              </p>
            </div>

            {/* Weekly Insights */}
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-sage-light flex items-center justify-center mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sage">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
                </svg>
              </div>
              <span className="text-display text-charcoal">2,100+</span>
              <span className="text-h2 text-charcoal mt-1">Digests delivered</span>
              <p className="text-body text-slate mt-3">
                Every Monday at 7am. 90 seconds. What happened, what I did, what I recommend. No dashboards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
       * HOW IT WORKS — 3-step story
       * ============================================================ */}
      <section className="px-screen-margin py-20">
        <div className="max-w-[720px] mx-auto">
          <h2 className="text-h1 text-charcoal text-center mb-12 sm:text-[1.5rem]">
            Five minutes from now
          </h2>

          <div className="flex flex-col gap-10">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-terracotta text-white flex items-center justify-center font-semibold text-body flex-shrink-0">1</div>
              <div>
                <h3 className="text-h2 text-charcoal">Tell us your business name</h3>
                <p className="text-body text-slate mt-1">
                  That&apos;s it. We find your Google listing, your reviews, your photos. You confirm and upload a few of your own.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-terracotta text-white flex items-center justify-center font-semibold text-body flex-shrink-0">2</div>
              <div>
                <h3 className="text-h2 text-charcoal">See your business transformed</h3>
                <p className="text-body text-slate mt-1">
                  A professional website, your first social post, an optimized Google listing, and a campaign — all built in five minutes. One tap to publish everything.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-terracotta text-white flex items-center justify-center font-semibold text-body flex-shrink-0">3</div>
              <div>
                <h3 className="text-h2 text-charcoal">Talk to it like an employee</h3>
                <p className="text-body text-slate mt-1">
                  &ldquo;Post about our fish tacos Friday at lunch.&rdquo; &ldquo;Change our Sunday hours.&rdquo; &ldquo;How did we do this month?&rdquo; You talk. It handles the rest.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
       * SOCIAL PROOF
       * ============================================================ */}
      <section className="px-screen-margin py-16 bg-cream">
        <div className="max-w-[720px] mx-auto text-center">
          <p className="text-display text-charcoal">500+</p>
          <p className="text-h2 text-charcoal mt-1">Austin restaurants trust LocalGenius</p>
          <p className="text-body text-slate mt-4 max-w-[480px] mx-auto">
            80% are still here after 30 days — in a market where the average churn is 5-10% per month.
            They stay because every Monday, the Weekly Digest proves it&apos;s working.
          </p>
        </div>
      </section>

      {/* ============================================================
       * FINAL CTA
       * ============================================================ */}
      <section className="px-screen-margin py-20 text-center">
        <div className="max-w-[480px] mx-auto">
          <h2 className="text-h1 text-charcoal sm:text-[1.5rem]">
            Five minutes from now, your business could look like this.
          </h2>
          <p className="text-body text-slate mt-4">
            No credit card. No contracts. No tutorials.
          </p>
          <Link
            href="/welcome"
            className="inline-flex items-center justify-center min-h-tap-primary px-10 mt-8 bg-terracotta text-white font-semibold rounded-sm hover:bg-terracotta-hover active:bg-terracotta-active transition-colors no-underline text-body"
          >
            Get started free
          </Link>
        </div>
      </section>

      {/* ============================================================
       * FOOTER
       * ============================================================ */}
      <footer className="px-screen-margin py-8 border-t text-center" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-[1120px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-terracotta rounded-sm flex items-center justify-center">
              <span className="text-white font-semibold text-small">L</span>
            </div>
            <span className="text-body text-charcoal font-semibold">LocalGenius</span>
          </div>
          <div className="flex items-center gap-4 text-caption text-slate">
            <Link href="/pricing" className="hover:text-charcoal transition-colors no-underline text-caption text-slate">Pricing</Link>
            <span>·</span>
            <span>Austin, TX</span>
          </div>
          <p className="text-small text-slate-light">
            $29/mo base · $79/mo pro · No contracts
          </p>
        </div>
      </footer>
    </div>
  );
}
