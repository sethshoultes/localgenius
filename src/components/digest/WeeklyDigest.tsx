'use client';

import Button from '../shared/Button';

interface DigestMetric {
  label: string;
  value: string;
  change?: string;
}

interface DigestAction {
  description: string;
}

interface DigestRecommendation {
  text: string;
  primaryAction: { label: string; onPress: () => void };
  secondaryAction: { label: string; onPress: () => void };
  preview?: React.ReactNode;
}

interface WeeklyDigestProps {
  businessName: string;
  ownerName: string;
  weekOf: string;
  highlights: DigestMetric[];
  actions: DigestAction[];
  recommendation: DigestRecommendation | null;
}

export default function WeeklyDigest({
  businessName,
  ownerName,
  weekOf,
  highlights,
  actions,
  recommendation,
}: WeeklyDigestProps) {
  return (
    <div className="digest-container px-screen-margin py-6 flex flex-col gap-section-gap">
      {/* Greeting */}
      <header>
        <h1 className="text-h1 text-charcoal">
          Good morning, {ownerName}.
        </h1>
        <p className="text-body text-slate mt-1">
          This week at {businessName}
        </p>
        <p className="text-caption text-slate-light">{weekOf}</p>
      </header>

      {/* Act 1: Here's what happened */}
      <section className="card-subtle flex flex-col gap-card-gap" aria-label="What happened this week">
        <h2 className="text-caption text-slate uppercase tracking-widest font-semibold">
          Here&apos;s what happened
        </h2>
        <div className="flex flex-col gap-3">
          {highlights.map((metric, i) => (
            <div key={i} className="flex items-baseline gap-2">
              <span className="text-display text-charcoal">{metric.value}</span>
              <span className="text-body text-charcoal">{metric.label}</span>
              {metric.change && (
                <span className="text-caption text-sage font-semibold">{metric.change}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Trend chart placeholder */}
      <div
        className="h-[120px] bg-cream rounded-md flex items-center justify-center"
        aria-label="Weekly trend chart"
      >
        <span className="text-caption text-slate-light">Trend chart</span>
      </div>

      {/* Act 2: Here's what I did */}
      <section className="card-subtle flex flex-col gap-card-gap" aria-label="What LocalGenius did this week">
        <h2 className="text-caption text-slate uppercase tracking-widest font-semibold">
          Here&apos;s what I did
        </h2>
        <ul className="flex flex-col gap-2">
          {actions.map((action, i) => (
            <li key={i} className="text-body text-charcoal flex items-start gap-2">
              <span className="text-sage mt-0.5">•</span>
              {action.description}
            </li>
          ))}
        </ul>
      </section>

      {/* Act 3: Here's what I recommend */}
      {recommendation && (
        <section className="card flex flex-col gap-card-gap" aria-label="Recommendation">
          <h2 className="text-caption text-slate uppercase tracking-widest font-semibold">
            Here&apos;s what I recommend
          </h2>
          <p className="text-body text-charcoal">{recommendation.text}</p>
          {recommendation.preview && (
            <div className="rounded-sm overflow-hidden">
              {recommendation.preview}
            </div>
          )}
          <div className="flex gap-3">
            <div className="flex-[3]">
              <Button
                variant="primary"
                label={recommendation.primaryAction.label}
                onClick={recommendation.primaryAction.onPress}
                fullWidth
              />
            </div>
            <div className="flex-[2]">
              <Button
                variant="secondary"
                label={recommendation.secondaryAction.label}
                onClick={recommendation.secondaryAction.onPress}
                fullWidth
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
