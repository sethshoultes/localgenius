'use client';

import Button from '../shared/Button';
import { fadeUpStagger } from '@/lib/animations';

interface DigestMetric {
  label: string;
  value: string;
  change?: string;
  isBest?: boolean; // "Your best week" — triggers celebration styling
}

interface DigestAction {
  description: string;
  highlight?: boolean; // Best-performing action gets emphasis
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
  trendData?: number[]; // Simple array of values for sparkline
}

/**
 * Simple SVG sparkline — no chart library needed.
 * Renders a smooth line + fill area from an array of numbers.
 */
function Sparkline({ data, className = '' }: { data: number[]; className?: string }) {
  if (data.length < 2) return null;

  const width = 280;
  const height = 80;
  const padding = 4;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => ({
    x: padding + (i / (data.length - 1)) * (width - padding * 2),
    y: padding + (1 - (val - min) / range) * (height - padding * 2),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const fillPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full ${className}`}
      style={{ maxHeight: '80px' }}
      role="img"
      aria-label="Weekly trend showing growth"
    >
      {/* Fill area */}
      <path d={fillPath} fill="var(--color-terracotta-light)" opacity="0.5" />
      {/* Line */}
      <path d={linePath} fill="none" stroke="var(--color-terracotta)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* End dot — current week */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="4"
        fill="var(--color-terracotta)"
      />
    </svg>
  );
}

export default function WeeklyDigest({
  businessName,
  ownerName,
  weekOf,
  highlights,
  actions,
  recommendation,
  trendData,
}: WeeklyDigestProps) {
  return (
    <div className="digest-container px-screen-margin py-8 flex flex-col gap-10">
      {/* ============================================================
       * GREETING — Personal, warm, sets the tone
       * ============================================================ */}
      <header style={fadeUpStagger(0)}>
        <h1 className="text-h1 text-charcoal">
          Good morning, {ownerName}.
        </h1>
        <p className="text-body text-slate mt-1">
          This week at {businessName}
        </p>
        <p className="text-caption text-slate-light mt-0.5">{weekOf}</p>
      </header>

      {/* ============================================================
       * ACT 1: "Here's what happened" — Numbers with soul
       * Per product-design.md: "Never a number without comparison"
       * ============================================================ */}
      <section
        className="flex flex-col gap-6"
        style={fadeUpStagger(1)}
        aria-label="What happened this week"
      >
        <h2 className="text-caption text-slate uppercase tracking-[0.1em] font-semibold">
          Here&apos;s what happened
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {highlights.map((metric, i) => (
            <div
              key={i}
              className={[
                'flex flex-col gap-1 p-4 rounded-md',
                metric.isBest
                  ? 'bg-gold-light border-l-[3px] border-gold'
                  : 'bg-cream',
              ].join(' ')}
            >
              <span className="text-display text-charcoal leading-none">
                {metric.value}
              </span>
              <span className="text-body text-charcoal">
                {metric.label}
              </span>
              {metric.change && (
                <span className={[
                  'text-caption font-semibold',
                  metric.change.startsWith('↓') || metric.change.startsWith('down')
                    ? 'text-error'
                    : 'text-sage-text',
                ].join(' ')}>
                  {metric.change}
                </span>
              )}
              {metric.isBest && (
                <span className="text-caption text-gold-text font-semibold mt-1">
                  Your best week yet
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================
       * SPARKLINE — One chart, the metric that matters most
       * Per product-design.md: "One chart maximum — a simple trend line"
       * ============================================================ */}
      {trendData && trendData.length >= 2 && (
        <div
          className="px-2"
          style={fadeUpStagger(2)}
        >
          <Sparkline data={trendData} />
          <p className="text-caption text-slate text-center mt-2">
            Last {trendData.length} weeks
          </p>
        </div>
      )}

      {/* ============================================================
       * ACT 2: "Here's what I did" — Trust through transparency
       * This reads like a brief from a trusted employee, not a task log
       * ============================================================ */}
      <section
        className="flex flex-col gap-4"
        style={fadeUpStagger(3)}
        aria-label="What LocalGenius did this week"
      >
        <h2 className="text-caption text-slate uppercase tracking-[0.1em] font-semibold">
          Here&apos;s what I did
        </h2>

        <div className="flex flex-col gap-3">
          {actions.map((action, i) => (
            <div
              key={i}
              className={[
                'flex items-start gap-3 text-body text-charcoal',
                action.highlight ? 'p-3 bg-cream rounded-md' : '',
              ].join(' ')}
            >
              <span className="text-sage-text mt-0.5 flex-shrink-0">
                {action.highlight ? '★' : '·'}
              </span>
              <span>
                {action.description}
                {action.highlight && (
                  <span className="text-caption text-sage-text font-semibold ml-1">
                    — your best this month
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================
       * DIVIDER — Visual breathing room between "what was" and "what's next"
       * ============================================================ */}
      {recommendation && (
        <div className="flex items-center gap-4 px-4">
          <div className="flex-1 h-px bg-charcoal/8" />
          <span className="text-small text-slate-light">What&apos;s next</span>
          <div className="flex-1 h-px bg-charcoal/8" />
        </div>
      )}

      {/* ============================================================
       * ACT 3: "Here's what I recommend" — Actionable, one-tap
       * Per product-design.md: "Each one has a one-tap action attached"
       * ============================================================ */}
      {recommendation && (
        <section
          className="card flex flex-col gap-card-gap"
          style={fadeUpStagger(4)}
          aria-label="Recommendation"
        >
          <h2 className="text-caption text-slate uppercase tracking-[0.1em] font-semibold">
            Here&apos;s what I recommend
          </h2>
          <p className="text-body text-charcoal leading-relaxed">
            {recommendation.text}
          </p>
          {recommendation.preview && (
            <div className="rounded-sm overflow-hidden">
              {recommendation.preview}
            </div>
          )}
          <div className="flex gap-3 pt-1">
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

      {/* ============================================================
       * SIGN-OFF — Warm, brief, human
       * ============================================================ */}
      <footer className="text-center py-4" style={fadeUpStagger(5)}>
        <p className="text-caption text-slate">
          That&apos;s your week. I&apos;ll keep working — see you Monday.
        </p>
      </footer>
    </div>
  );
}
