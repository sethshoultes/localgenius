import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — LocalGenius',
  description: 'How LocalGenius collects, uses, and protects your data.',
};

export default function PrivacyPage() {
  return (
    <div className="px-screen-margin py-16 max-w-[720px] mx-auto">
      <h1 className="text-[2rem] font-semibold text-charcoal leading-tight mb-8">
        Privacy Policy
      </h1>
      <p className="text-caption text-slate mb-8">Last updated: April 2, 2026</p>

      <div className="flex flex-col gap-8 text-body text-slate leading-relaxed">
        <section>
          <h2 className="text-h2 text-charcoal mb-3">What we collect</h2>
          <p>When you create an account, we collect your name, email address, business name, city, and state. When you use LocalGenius, we store your conversation history, business information, and any content generated on your behalf.</p>
        </section>

        <section>
          <h2 className="text-h2 text-charcoal mb-3">How we use your data</h2>
          <p>We use your information to provide the LocalGenius service — generating content, managing your online presence, and delivering your Weekly Digest. We do not sell your data to third parties. We do not use your business data to train AI models.</p>
        </section>

        <section>
          <h2 className="text-h2 text-charcoal mb-3">AI and your content</h2>
          <p>LocalGenius uses AI models (Anthropic Claude and Cloudflare Workers AI) to generate content for your business. Your business information is sent to these services to produce personalized output. We do not share your data beyond what is necessary to deliver the service.</p>
        </section>

        <section>
          <h2 className="text-h2 text-charcoal mb-3">Cookies</h2>
          <p>We use a single httpOnly session cookie (lg_session) for authentication. We do not use tracking cookies, analytics cookies, or third-party advertising cookies.</p>
        </section>

        <section>
          <h2 className="text-h2 text-charcoal mb-3">Data storage</h2>
          <p>Your data is stored in a PostgreSQL database hosted by Neon (neon.tech) in the United States. Passwords are hashed with PBKDF2 and never stored in plain text.</p>
        </section>

        <section>
          <h2 className="text-h2 text-charcoal mb-3">Your rights</h2>
          <p>You can request a copy of your data or ask us to delete your account at any time by emailing hello@localgenius.company. We will respond within 30 days.</p>
        </section>

        <section>
          <h2 className="text-h2 text-charcoal mb-3">Contact</h2>
          <p>Questions about privacy? Email hello@localgenius.company.</p>
        </section>
      </div>
    </div>
  );
}
