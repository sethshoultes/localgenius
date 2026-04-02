import Link from 'next/link';

/**
 * About page — the LocalGenius story.
 * Short. Three sections. Brand voice throughout.
 */
export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="px-screen-margin pt-16 pb-12 max-w-[720px] mx-auto">
        <h1 className="text-[2rem] leading-[1.15] font-semibold text-charcoal tracking-tight sm:text-[2.5rem]">
          We started with one question.
        </h1>
        <p className="text-[1.25rem] text-terracotta font-semibold mt-4 sm:text-[1.5rem]">
          What if every local business had a marketing employee?
        </p>
      </section>

      {/* The Problem */}
      <section className="px-screen-margin py-12 max-w-[720px] mx-auto">
        <h2 className="text-h1 text-charcoal mb-6">The Problem</h2>
        <div className="flex flex-col gap-4 text-body text-slate leading-relaxed">
          <p>
            Maria owns a Tex-Mex restaurant in Austin. She&apos;s been open for seven years.
            She manages a kitchen, a team, vendors, health inspections — all with competence and grit.
            But marketing? Marketing makes her feel like she&apos;s drowning in a language she doesn&apos;t speak.
          </p>
          <p>
            She&apos;s tried hiring her nephew to post on Instagram. She&apos;s tried Mailchimp.
            She&apos;s paid an agency $1,200 a month for generic posts that didn&apos;t sound like her restaurant.
            Nothing stuck. Every tool assumed she was a marketer. She&apos;s not. She&apos;s a chef.
          </p>
          <p>
            There are 33 million Marias in America. Sixty percent of them have an inadequate digital presence.
            Not because they don&apos;t care — because every tool they&apos;ve tried was built for someone else.
          </p>
        </div>
      </section>

      {/* What we built */}
      <section className="px-screen-margin py-12 bg-cream">
        <div className="max-w-[720px] mx-auto">
          <h2 className="text-h1 text-charcoal mb-6">What we built</h2>
          <div className="flex flex-col gap-4 text-body text-slate leading-relaxed">
            <p>
              LocalGenius is the employee Maria always needed but could never afford.
              One conversation. Everything handled.
            </p>
            <p>
              She talks to it the way she&apos;d talk to a person: &ldquo;Post something about our lunch special.&rdquo;
              &ldquo;Respond to that bad review.&rdquo; &ldquo;How did we do this month?&rdquo;
              It handles her website, her reviews, her social posts, her email campaigns, her Google listing,
              and a weekly report that takes 90 seconds to read.
            </p>
            <p>
              She doesn&apos;t learn a new tool. She doesn&apos;t configure anything. She doesn&apos;t choose fonts or templates.
              She talks, and it does the rest. An agency charges $1,500 a month. A part-time social media person costs $500.
              LocalGenius costs $29.
            </p>
            <p className="text-charcoal font-semibold">
              Five minutes to set up. Three minutes a day to run. And every Monday,
              a 90-second report that proves it&apos;s working.
            </p>
          </div>
        </div>
      </section>

      {/* The Team */}
      <section className="px-screen-margin py-12 max-w-[720px] mx-auto">
        <h2 className="text-h1 text-charcoal mb-6">The Team</h2>
        <div className="flex flex-col gap-4 text-body text-slate leading-relaxed">
          <p>
            We&apos;re a small team in Austin, Texas. Six people who believe that
            local businesses deserve the same marketing power that big companies take for granted —
            without the complexity, the jargon, or the $1,500 monthly invoice.
          </p>
          <p>
            Half of us have built consumer products used by millions.
            The other half have sat across from small business owners and felt the weight
            of how hard it is to run a business and do marketing at the same time.
          </p>
          <p>
            We eat at Austin restaurants every Friday. Not just for lunch —
            to notice the owner behind the counter, the Google listing on the door,
            the Instagram handle on the receipt. That&apos;s who we build for. We know them.
          </p>
        </div>

        {/* Team grid placeholder */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8">
          {[
            { role: 'CEO', trait: 'Empathy' },
            { role: 'Tech Lead', trait: 'Speed' },
            { role: 'Designer', trait: 'Empathy' },
            { role: 'AI Engineer', trait: 'Speed' },
            { role: 'GTM Lead', trait: 'Empathy' },
            { role: 'Mobile Engineer', trait: 'Speed' },
          ].map((member) => (
            <div key={member.role} className="bg-cream rounded-md p-4 flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-full bg-terracotta-light flex items-center justify-center">
                <span className="text-body text-terracotta font-semibold">
                  {member.role[0]}
                </span>
              </div>
              <span className="text-body text-charcoal font-semibold">{member.role}</span>
              <span className="text-caption text-slate">{member.trait}-primary</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-screen-margin py-16 text-center">
        <h2 className="text-h1 text-charcoal">Ready to stop worrying about marketing?</h2>
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
