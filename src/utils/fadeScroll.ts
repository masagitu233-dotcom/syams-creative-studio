export const FADE_SCROLL_DEFAULTS = {
  durationMs: 700,
  distancePx: 26,
  staggerMs: 95,
  maxStaggerSteps: 5,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

export interface StaggerOptions {
  index: number;
  staggerMs?: number;
  columnsPerRow?: number;
  maxSteps?: number;
  baseDelayMs?: number;
}

/**
 * Computes light stagger delay (default 95ms step) for sibling elements in a group
 * or multi-column grid row so items enter smoothly in sequence without long waits
 * for lower rows.
 */
export function computeFadeStaggerDelay({
  index,
  staggerMs = FADE_SCROLL_DEFAULTS.staggerMs,
  columnsPerRow,
  maxSteps = FADE_SCROLL_DEFAULTS.maxStaggerSteps,
  baseDelayMs = 0,
}: StaggerOptions): number {
  const safeIndex = Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0;
  const safeStagger = Number.isFinite(staggerMs) ? Math.max(0, Math.min(200, staggerMs)) : 95;
  const safeBase = Number.isFinite(baseDelayMs) ? Math.max(0, baseDelayMs) : 0;

  let step: number;
  if (typeof columnsPerRow === 'number' && Number.isFinite(columnsPerRow) && columnsPerRow > 0) {
    step = safeIndex % Math.max(1, Math.floor(columnsPerRow));
  } else {
    const cap = Number.isFinite(maxSteps) ? Math.max(0, Math.floor(maxSteps)) : 5;
    step = Math.min(safeIndex, cap);
  }

  return safeBase + step * safeStagger;
}

export interface ViewportRevealCheck {
  top: number;
  bottom: number;
  width: number;
  height: number;
  viewportHeight: number;
  offsetPx?: number;
}

/**
 * Determines whether an element rect is currently entering, inside, or already
 * scrolled above the viewport so elements never remain stuck hidden when scrolling fast
 * or loading mid-page. Zero-box hidden elements (`width === 0 && height === 0`) are ignored.
 */
export function isRectReadyToReveal({
  top,
  bottom,
  width,
  height,
  viewportHeight,
  offsetPx = 16,
}: ViewportRevealCheck): boolean {
  if (width <= 0 && height <= 0) return false;
  if (!Number.isFinite(top) || !Number.isFinite(viewportHeight) || viewportHeight <= 0) {
    return true;
  }
  const thresholdY = viewportHeight - Math.max(0, offsetPx);
  return top <= thresholdY || bottom <= viewportHeight;
}

export interface FadeConfigInput {
  durationMs?: number;
  distancePx?: number;
  staggerMs?: number;
}

export function normalizeFadeConfig(input: FadeConfigInput = {}): {
  durationMs: number;
  distancePx: number;
  staggerMs: number;
} {
  const rawDuration = input.durationMs ?? FADE_SCROLL_DEFAULTS.durationMs;
  const rawDistance = input.distancePx ?? FADE_SCROLL_DEFAULTS.distancePx;
  const rawStagger = input.staggerMs ?? FADE_SCROLL_DEFAULTS.staggerMs;

  return {
    durationMs: Math.min(800, Math.max(600, Math.round(rawDuration))),
    distancePx: Math.min(35, Math.max(20, Math.round(rawDistance))),
    staggerMs: Math.min(120, Math.max(80, Math.round(rawStagger))),
  };
}
