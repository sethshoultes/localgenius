/**
 * LocalGenius Animation Utilities
 *
 * Micro-interactions and transitions that make the product feel alive.
 * All animations respect prefers-reduced-motion via CSS (tokens.css)
 * and the prefersReducedMotion() check for programmatic animations.
 *
 * Design principle: "Purposeful, not decorative."
 * Every animation serves a function — confirmation, orientation, or delight.
 */

// ============================================================
// FADE-UP — New content entering the view
// ============================================================

/**
 * Stagger delay calculator.
 * Used in onboarding reveal (4 cards), digest sections (5 acts).
 */
export function staggerDelay(index: number, baseMs = 150): number {
  return index * baseMs;
}

/**
 * Inline style for staggered fade-up animation.
 * Usage: <div style={fadeUpStagger(0)}>First</div>
 *        <div style={fadeUpStagger(1)}>Second (150ms later)</div>
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
 * Single fade-up with custom duration.
 * Usage: <div style={fadeUp(300)}>Slow entrance</div>
 */
export function fadeUp(durationMs = 200, delayMs = 0): React.CSSProperties {
  return {
    animation: `fadeUp ${durationMs}ms cubic-bezier(0, 0, 0.2, 1) ${delayMs}ms both`,
  };
}

// ============================================================
// CHECKMARK — Approval confirmation
// ============================================================

/**
 * SVG path for the checkmark. Use in a <path> element.
 */
export const checkmarkPath = 'M 5 12 L 10 17 L 20 7';
export const checkmarkStrokeDasharray = 24;

/**
 * Inline style for the checkmark draw-on animation.
 * When animate=true, the checkmark "writes" itself with a spring overshoot.
 * When animate=false, the checkmark is static (already drawn).
 */
export function checkmarkStyle(animate: boolean): React.CSSProperties {
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
 * React component props for a complete checkmark SVG.
 * Usage: <svg {...checkmarkSvgProps(animate)} />
 */
export function checkmarkSvgProps(animate: boolean) {
  return {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    children: null, // Caller renders the path
    style: checkmarkStyle(animate),
  };
}

// ============================================================
// TYPING INDICATOR — AI is thinking
// ============================================================

/**
 * Delay for each typing dot in the three-dot indicator.
 * Dots pulse in sequence: 0ms, 200ms, 400ms.
 */
export function typingDotDelay(index: number): React.CSSProperties {
  return {
    animationDelay: `${index * 200}ms`,
  };
}

// ============================================================
// STEP TRANSITIONS — Onboarding flow
// ============================================================

/**
 * Transition style for onboarding step changes.
 * New step slides in from the right and fades up.
 * Exiting step is handled by React's conditional rendering.
 */
export function stepEnter(direction: 'forward' | 'back' = 'forward'): React.CSSProperties {
  const translateX = direction === 'forward' ? '16px' : '-16px';
  return {
    animation: `stepSlide 250ms cubic-bezier(0, 0, 0.2, 1) both`,
    // Custom keyframes injected via CSS — this is the inline fallback
    opacity: 1,
    transform: 'translateX(0)',
  };
}

/**
 * CSS keyframes string for step transitions.
 * Inject this into a <style> tag or globals.css.
 */
export const stepTransitionKeyframes = `
@keyframes stepSlideForward {
  from {
    opacity: 0;
    transform: translateX(16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes stepSlideBack {
  from {
    opacity: 0;
    transform: translateX(-16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
`;

// ============================================================
// APPROVAL CARD — Collapse after action
// ============================================================

/**
 * Smooth collapse of the action buttons area after approval.
 * The buttons area shrinks while the success state fades in.
 */
export function approvalTransition(
  status: 'pending' | 'approved',
): React.CSSProperties {
  return {
    maxHeight: status === 'approved' ? '48px' : '200px',
    overflow: 'hidden',
    transition: 'max-height 300ms cubic-bezier(0.25, 0.1, 0.25, 1)',
  };
}

// ============================================================
// SKELETON SHIMMER — Loading placeholders
// ============================================================

/**
 * CSS for the skeleton shimmer effect.
 * A warm gradient sweeps left-to-right across the placeholder.
 * Uses cream and terracotta-light for warmth (not cold grey).
 */
export const skeletonShimmerKeyframes = `
@keyframes skeletonShimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
`;

/**
 * Inline style for a skeleton shimmer element.
 * Apply to any element that acts as a loading placeholder.
 */
export function skeletonShimmerStyle(): React.CSSProperties {
  return {
    background: 'linear-gradient(90deg, var(--color-cream) 25%, var(--color-terracotta-light) 50%, var(--color-cream) 75%)',
    backgroundSize: '200% 100%',
    animation: 'skeletonShimmer 1.5s ease-in-out infinite',
    borderRadius: 'var(--radius-sm)',
  };
}

// ============================================================
// REVEAL MOMENT — The iPhone moment in onboarding Step 5
// ============================================================

/**
 * Sign-painting animation for the business name in the loading state.
 * Letters appear one by one, left to right.
 */
export function signPaintStyle(durationMs = 1500): React.CSSProperties {
  return {
    animation: `fadeUp ${durationMs}ms cubic-bezier(0, 0, 0.2, 1) both`,
  };
}

/**
 * Tagline appears after the business name with a delay.
 */
export function taglineRevealStyle(delayMs = 500): React.CSSProperties {
  return {
    animation: `fadeUp 1500ms cubic-bezier(0, 0, 0.2, 1) ${delayMs}ms both`,
  };
}

// ============================================================
// MOTION PREFERENCES
// ============================================================

/**
 * Check if user prefers reduced motion.
 * Use for programmatic animations (JS timers, requestAnimationFrame).
 * CSS animations are handled by the @media rule in tokens.css.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Returns 0 if user prefers reduced motion, otherwise the given duration.
 * Usage: setTimeout(callback, safeDuration(300))
 */
export function safeDuration(ms: number): number {
  return prefersReducedMotion() ? 0 : ms;
}

/**
 * Smooth scroll to element, respecting reduced motion.
 */
export function smoothScrollTo(element: HTMLElement): void {
  element.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'nearest',
  });
}

// ============================================================
// NOTIFICATION TOAST — Enter/exit
// ============================================================

/**
 * Toast enters from top, slides down + fades in.
 */
export function toastEnterStyle(): React.CSSProperties {
  return {
    animation: 'toastEnter 200ms cubic-bezier(0, 0, 0.2, 1) both',
  };
}

export const toastKeyframes = `
@keyframes toastEnter {
  from {
    opacity: 0;
    transform: translateY(-12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes toastExit {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-12px);
  }
}
`;
