/**
 * LocalGenius Animation Utilities
 *
 * Shared animation logic for the approval checkmark, fade-up entrance,
 * reveal stagger, and loading glow. All animations respect
 * prefers-reduced-motion via CSS (see tokens.css).
 *
 * These utilities are for programmatic animation control —
 * CSS-only animations are defined in globals.css and tokens.css.
 */

/**
 * Stagger delay calculator for reveal cards.
 * Used in onboarding Step 5 where 4 cards appear sequentially.
 */
export function staggerDelay(index: number, baseMs = 150): number {
  return index * baseMs;
}

/**
 * Returns inline style for staggered fade-up animation.
 * Usage: <div style={fadeUpStagger(index)}>
 */
export function fadeUpStagger(
  index: number,
  baseDelayMs = 150,
): React.CSSProperties {
  return {
    animation: `fadeUp 200ms cubic-bezier(0, 0, 0.2, 1) ${index * baseDelayMs}ms both`,
  };
}

/**
 * Checkmark SVG path animation.
 * Returns props for an SVG polyline element that draws itself.
 * The checkmark "writes" from left to right with a brief overshoot.
 */
export const checkmarkPath = 'M 5 12 L 10 17 L 20 7';
export const checkmarkStrokeDasharray = 24;

export function checkmarkStyle(
  animate: boolean,
): React.CSSProperties {
  if (!animate) {
    return { strokeDashoffset: 0 };
  }
  return {
    strokeDasharray: checkmarkStrokeDasharray,
    strokeDashoffset: checkmarkStrokeDasharray,
    animation: 'checkmark 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
  };
}

/**
 * Typing indicator dot delays.
 * Three dots that pulse in sequence to indicate the AI is thinking.
 */
export function typingDotDelay(index: number): React.CSSProperties {
  return {
    animationDelay: `${index * 200}ms`,
  };
}

/**
 * Approval card collapse.
 * After approval, the action buttons area smoothly collapses
 * while the success state fades in.
 */
export function approvalTransition(
  status: 'pending' | 'approved',
): React.CSSProperties {
  if (status === 'approved') {
    return {
      maxHeight: '48px',
      overflow: 'hidden',
      transition: 'max-height 300ms cubic-bezier(0.25, 0.1, 0.25, 1)',
    };
  }
  return {
    maxHeight: '200px',
    overflow: 'hidden',
    transition: 'max-height 300ms cubic-bezier(0.25, 0.1, 0.25, 1)',
  };
}

/**
 * Detect if user prefers reduced motion.
 * Use this for programmatic animations that can't be handled by CSS alone.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Safe animation duration — returns 0 if user prefers reduced motion.
 */
export function safeDuration(ms: number): number {
  return prefersReducedMotion() ? 0 : ms;
}

/**
 * Smooth scroll to element, respecting reduced motion preference.
 */
export function smoothScrollTo(element: HTMLElement): void {
  element.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'nearest',
  });
}
