import Link from 'next/link';

/**
 * Pricing Page — Two tiers, Pro is the obvious choice.
 *
 * Per marketing-messaging.md:
 * - Never say "AI-powered" or "platform"
 * - Frame value as "worth it" not "ROI"
 * - The employee metaphor: "An agency charges $1,500/month. We charge $29."
 */

const BASE_FEATURES = [
  { text: 'Conversational interface', included: true },
  { text: 'Professional website, built in 5 minutes', included: true },
  { text: 'Review management with draft responses', included: true },
  { text: 'Social posting (Instagram + Facebook)', included: true },
  { text: 'Weekly Digest every Monday', included: true },
  { text: 'One-tap approval for every post and response', included: true },
  { text: 'Google Business Profile optimization', included: false, proOnly: true },
  { text: 'Email & SMS campaigns', included: false, proOnly: true },
  { text: 'Lead attribution (tracking number)', included: false, proOnly: true },
  { text: 'Competitive benchmarking', included: false, proOnly: true },
  { text: 'Priority support', included: false, proOnly: true },
];

const PRO_FEATURES = BASE_FEATURES.map((f) => ({
  ...f,
  included: true,
}));

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-sage flex-shrink-0">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function Dash() {
  return <span className="w-[18px] text-center text-slate-light flex-shrink-0">—</span>;
}

export default function PricingPage() {
  return (
    <>
      {/* Header */}
      <section className="px-screen-margin pt-12 pb-8 text-center max-w-[720px] mx-auto">
        <h1 className="text-[2rem] leading-[1.15] font-semibold text-charcoal tracking-tight sm:text-[2.5rem]">
          Simple pricing.
          <br />
          <span className="text-slate">No surprises.</span>
        </h1>
        <p className="text-body text-slate mt-4 max-w-[480px] mx-auto">
          An agency charges $1,500/month. A part-time social media person costs $500.
          LocalGenius starts at $29.
        </p>
      </section>

      {/* Pricing cards */}
      <section className="px-screen-margin pb-20 max-w-[840px] mx-auto">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Base tier */}
          <div className="card flex flex-col gap-6">
            <div>
              <span className="text-caption text-slate uppercase tracking-[0.1em] font-semibold">Base</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-[2.5rem] font-semibold text-charcoal leading-none">$29</span>
                <span className="text-body text-slate">/month</span>
              </div>
              <p className="text-body text-slate mt-2">
                Everything you need to stop worrying about marketing.
              </p>
            </div>

            <Link
              href="/welcome"
              className="inline-flex items-center justify-center min-h-tap-primary bg-cream text-charcoal font-semibold rounded-sm hover:bg-terracotta-light transition-colors no-underline text-body w-full"
            >
              Get started
            </Link>

            <ul className="flex flex-col gap-3">
              {BASE_FEATURES.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-body">
                  {feature.included ? <Check /> : <Dash />}
                  <span className={feature.included ? 'text-charcoal' : 'text-slate-light'}>
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pro tier — the obvious choice */}
          <div className="relative">
            {/* "Most popular" badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-terracotta text-white text-caption font-semibold px-4 py-1 rounded-full z-10">
              Most popular
            </div>

            <div className="card flex flex-col gap-6 border-2 border-terracotta">
              <div>
                <span className="text-caption text-terracotta uppercase tracking-[0.1em] font-semibold">Pro</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-[2.5rem] font-semibold text-charcoal leading-none">$79</span>
                  <span className="text-body text-slate">/month</span>
                </div>
                <p className="text-body text-slate mt-2">
                  The full employee experience. Your marketing runs itself.
                </p>
              </div>

              <Link
                href="/welcome"
                className="inline-flex items-center justify-center min-h-tap-primary bg-terracotta text-white font-semibold rounded-sm hover:bg-terracotta-hover transition-colors no-underline text-body w-full"
              >
                Get started with Pro
              </Link>

              <ul className="flex flex-col gap-3">
                {PRO_FEATURES.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-body">
                    <Check />
                    <span className="text-charcoal">
                      {feature.text}
                      {feature.proOnly && (
                        <span className="text-caption text-terracotta-text font-semibold ml-1">Pro</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* No contracts note */}
        <p className="text-caption text-slate text-center mt-8">
          No contracts. No setup fees. Cancel anytime. All plans include a 14-day free trial.
        </p>
      </section>

      {/* FAQ */}
      <section className="px-screen-margin py-16 bg-cream">
        <div className="max-w-[640px] mx-auto">
          <h2 className="text-h1 text-charcoal text-center mb-10">Questions</h2>

          <div className="flex flex-col gap-8">
            <div>
              <h3 className="text-h2 text-charcoal">What if it posts something I don&apos;t like?</h3>
              <p className="text-body text-slate mt-2">
                Everything goes through you first. You approve every social post and review response with one tap.
                Over time, you can let LocalGenius handle the easy ones automatically — but that&apos;s always your choice.
              </p>
            </div>

            <div>
              <h3 className="text-h2 text-charcoal">Do I need to be technical?</h3>
              <p className="text-body text-slate mt-2">
                If you can send a text message, you can use LocalGenius. There are no settings pages,
                no dashboards, no menus to learn. You type what you need in plain English. That&apos;s it.
              </p>
            </div>

            <div>
              <h3 className="text-h2 text-charcoal">What&apos;s the difference between Base and Pro?</h3>
              <p className="text-body text-slate mt-2">
                Base handles your website, reviews, and social posts — the essentials. Pro adds email campaigns,
                local SEO improvements, a tracking number so you know exactly which customers came from LocalGenius,
                and competitive benchmarking against nearby businesses.
              </p>
            </div>

            <div>
              <h3 className="text-h2 text-charcoal">Can I switch plans?</h3>
              <p className="text-body text-slate mt-2">
                Anytime. Upgrade to Pro and it kicks in immediately. Downgrade and you keep Pro features until your billing cycle ends. No penalties.
              </p>
            </div>

            <div>
              <h3 className="text-h2 text-charcoal">What if I have multiple locations?</h3>
              <p className="text-body text-slate mt-2">
                We&apos;re building multi-location support right now. If you operate 3, 7, or 50 locations,
                reach out and we&apos;ll set you up. Franchise pricing: $79/location.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-screen-margin py-16 text-center">
        <h2 className="text-h1 text-charcoal">Ready?</h2>
        <p className="text-body text-slate mt-3">Five minutes. That&apos;s all it takes.</p>
        <Link
          href="/welcome"
          className="inline-flex items-center justify-center min-h-tap-primary px-10 mt-6 bg-terracotta text-white font-semibold rounded-sm hover:bg-terracotta-hover transition-colors no-underline text-body"
        >
          Get started free
        </Link>
      </section>

    </>
  );
}
