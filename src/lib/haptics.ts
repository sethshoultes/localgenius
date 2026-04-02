/**
 * Haptic Feedback — Tactile responses for key moments.
 *
 * Uses navigator.vibrate with patterns tuned to each interaction.
 * Graceful no-op on desktop and unsupported browsers.
 *
 * Patterns:
 *   light tap — approval, button press
 *   success  — content published, onboarding complete
 *   alert    — negative review, error
 *   celebrate — milestone reached, best week
 */

function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Light tap — single short pulse.
 * Used: approving a card, tapping a quick action, confirming settings.
 */
export function tapLight(): void {
  if (canVibrate()) {
    navigator.vibrate(10);
  }
}

/**
 * Success — two quick pulses.
 * Used: content published, review response sent, onboarding complete.
 */
export function tapSuccess(): void {
  if (canVibrate()) {
    navigator.vibrate([15, 50, 15]);
  }
}

/**
 * Alert — single firm pulse.
 * Used: negative review received, error state.
 */
export function tapAlert(): void {
  if (canVibrate()) {
    navigator.vibrate(30);
  }
}

/**
 * Celebrate — rising pattern.
 * Used: milestone reached (100 reviews), best week ever.
 */
export function tapCelebrate(): void {
  if (canVibrate()) {
    navigator.vibrate([10, 30, 10, 30, 20, 30, 30]);
  }
}

/**
 * Selection — micro pulse.
 * Used: business type tile tap, priority selector, photo upload.
 */
export function tapSelect(): void {
  if (canVibrate()) {
    navigator.vibrate(5);
  }
}
