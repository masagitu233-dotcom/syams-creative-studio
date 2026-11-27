// Pure scroll velocity, parallax, and overlapping section math utilities.
// Kept 100% framework-agnostic and DOM-free for deterministic unit testing.

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Scales motion amplitude gracefully across device classes so desktop gets
 * full expressive studio depth while tablets and smartphones stay controlled.
 */
export function getViewportMotionScale(viewportWidth: number): number {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) return 1;
  if (viewportWidth < 640) return 0.72;
  if (viewportWidth < 1024) return 0.86;
  return 1;
}

/**
 * Computes normalized scroll velocity in [-1, 1] from scroll delta (px) and
 * elapsed time (ms). Positive = scrolling down, negative = scrolling up.
 */
export function computeScrollVelocity(
  deltaY: number,
  deltaTimeMs: number,
  maxVelocityPxPerSec = 1800
): number {
  if (!Number.isFinite(deltaY) || !Number.isFinite(deltaTimeMs) || deltaTimeMs <= 0) {
    return 0;
  }
  const safeDt = Math.max(deltaTimeMs, 6);
  const pxPerSec = (deltaY / safeDt) * 1000;
  return clamp(pxPerSec / Math.max(100, maxVelocityPxPerSec), -1, 1);
}

/**
 * Frame-rate independent exponential smoothing (works identically at 60Hz, 90Hz, 120Hz, 144Hz).
 */
export function dampVelocity(
  current: number,
  target: number,
  deltaTimeMs: number,
  smoothing = 7.5
): number {
  if (!Number.isFinite(current) || !Number.isFinite(target)) return 0;
  const dtSec = clamp(deltaTimeMs, 0, 100) / 1000;
  const factor = 1 - Math.exp(-Math.max(0.1, smoothing) * dtSec);
  const next = current + (target - current) * factor;
  return Math.abs(next) < 0.0008 && target === 0 ? 0 : next;
}

export interface ParallaxInput {
  /** Normalized position of element center relative to viewport center in [-1, 1]. */
  viewportProgress: number;
  /** Depth speed multiplier (negative = deeper/slower, positive = foreground/faster). */
  speed: number;
  /** Maximum pixel shift in either direction on desktop. */
  maxOffsetPx?: number;
  /** Device viewport scale factor from getViewportMotionScale(). */
  viewportScale?: number;
  /** Accessibility reduced-motion flag. */
  reducedMotion?: boolean;
}

/**
 * Computes bidirectional scroll-position parallax offset (px) that responds
 * consistently when scrolling both up and down.
 */
export function computeParallaxOffset({
  viewportProgress,
  speed,
  maxOffsetPx = 60,
  viewportScale = 1,
  reducedMotion = false,
}: ParallaxInput): number {
  if (reducedMotion || speed === 0 || viewportScale <= 0) return 0;
  const clampedProgress = clamp(viewportProgress, -1.35, 1.35);
  const raw = clampedProgress * speed * 145 * viewportScale;
  const limit = Math.abs(maxOffsetPx) * viewportScale;
  return clamp(raw, -limit, limit);
}

export interface VelocityKineticInput {
  /** Damped normalized scroll velocity in [-1, 1]. */
  velocityNorm: number;
  /** Kinetic responsiveness multiplier for this element (can vary by column/layer). */
  velocityFactor: number;
  /** Max pixel shift induced by velocity momentum. */
  maxVelocityShiftPx?: number;
  /** Max subtle skewY angle (deg) on fast scroll; always settles to 0 at rest. */
  maxSkewDeg?: number;
  /** Device viewport scale factor. */
  viewportScale?: number;
  /** Accessibility reduced-motion flag. */
  reducedMotion?: boolean;
}

export interface VelocityKineticResult {
  shiftY: number;
  skewY: number;
}

/**
 * Computes kinetic scroll-velocity translation and optional micro-skew.
 * Always settles smoothly back to 0 when scroll velocity decays to 0.
 */
export function computeVelocityKinetic({
  velocityNorm,
  velocityFactor,
  maxVelocityShiftPx = 28,
  maxSkewDeg = 0,
  viewportScale = 1,
  reducedMotion = false,
}: VelocityKineticInput): VelocityKineticResult {
  if (reducedMotion || viewportScale <= 0 || Math.abs(velocityNorm) < 0.001) {
    return { shiftY: 0, skewY: 0 };
  }
  const v = clamp(velocityNorm, -1, 1);
  const shiftLimit = Math.abs(maxVelocityShiftPx) * viewportScale;
  const shiftY = clamp(-v * velocityFactor * 36 * viewportScale, -shiftLimit, shiftLimit);

  const skewLimit = Math.abs(maxSkewDeg) * viewportScale;
  const skewY =
    skewLimit > 0 ? clamp(v * Math.sign(velocityFactor || 1) * skewLimit, -skewLimit, skewLimit) : 0;

  return { shiftY, skewY };
}

export interface SafeStickyTopInput {
  sectionHeight: number;
  viewportHeight: number;
  headerOffset?: number;
  enabled?: boolean;
  reducedMotion?: boolean;
}

/**
 * Computes a safe CSS sticky `top` offset so a section taller than the viewport
 * NEVER clips its bottom content before the next overlapping section rises over it.
 * - If section fits inside viewport: pins cleanly at `headerOffset` (e.g. 56px).
 * - If section is taller than viewport: pins at `viewportHeight - sectionHeight - 16`,
 *   allowing full natural scrolling to the very bottom of the section first.
 */
export function computeSafeStickyTop({
  sectionHeight,
  viewportHeight,
  headerOffset = 56,
  enabled = true,
  reducedMotion = false,
}: SafeStickyTopInput): number | null {
  if (!enabled || reducedMotion) return null;
  if (
    !Number.isFinite(sectionHeight) ||
    !Number.isFinite(viewportHeight) ||
    sectionHeight <= 0 ||
    viewportHeight <= 0
  ) {
    return headerOffset;
  }
  const availableHeight = viewportHeight - headerOffset;
  if (sectionHeight <= availableHeight) {
    return headerOffset;
  }
  return Math.round(viewportHeight - sectionHeight - 16);
}

export interface OverlapDepthInput {
  /** Top of the pinned anchor section relative to viewport top (px). */
  anchorTopPx: number;
  /** Bottom of the pinned anchor section relative to viewport top (px). */
  anchorBottomPx: number;
  /** Top of the NEXT overlapping section relative to viewport top (px). */
  nextSectionTopPx: number;
  /** Device viewport scale factor. */
  viewportScale?: number;
  /** Accessibility reduced-motion flag. */
  reducedMotion?: boolean;
  /** Active visual theme. */
  themeMode?: 'neo_brutalist' | 'clean_bento';
}

export interface OverlapDepthResult {
  /** Normalized 0 (not overlapping yet) -> 1 (fully overlapped). */
  progress: number;
  /** Visible scale-down of the underlying section as the next section rises over it. */
  recedeScale: number;
  /** Visible upward depth pull of the underlying section (px). */
  recedeY: number;
  /** Dimming overlay opacity [0..0.38] for unmistakable foreground/background separation. */
  shadeOpacity: number;
  /** Inner corner softening while receding in Clean Bento (px). */
  recedeRadiusPx: number;
}

/**
 * Computes layered recession transform for an underlying sticky anchor section
 * measured from the exact moment the next section crosses the anchor's bottom
 * edge (`anchorBottomPx`) until it covers the anchor's top edge (`anchorTopPx`).
 *
 * At rest (when `nextSectionTopPx >= anchorBottomPx`), `progress` is strictly 0,
 * so there is ZERO premature scaling before overlap actually begins.
 */
export function computeOverlapDepth({
  anchorTopPx,
  anchorBottomPx,
  nextSectionTopPx,
  viewportScale = 1,
  reducedMotion = false,
  themeMode = 'neo_brutalist',
}: OverlapDepthInput): OverlapDepthResult {
  if (
    reducedMotion ||
    !Number.isFinite(anchorTopPx) ||
    !Number.isFinite(anchorBottomPx) ||
    !Number.isFinite(nextSectionTopPx)
  ) {
    return { progress: 0, recedeScale: 1, recedeY: 0, shadeOpacity: 0, recedeRadiusPx: 0 };
  }

  const span = Math.max(140, anchorBottomPx - anchorTopPx);
  const overlapPx = anchorBottomPx - nextSectionTopPx;
  const progress = clamp(overlapPx / span, 0, 1);

  if (progress <= 0.001) {
    return { progress: 0, recedeScale: 1, recedeY: 0, shadeOpacity: 0, recedeRadiusPx: 0 };
  }

  // Distinct, clearly visible depth pullback for both visual themes
  const maxScaleDrop = (themeMode === 'clean_bento' ? 0.095 : 0.075) * viewportScale;
  const maxRecedeY = (themeMode === 'clean_bento' ? 36 : 26) * viewportScale;
  const maxShade = (themeMode === 'clean_bento' ? 0.34 : 0.32) * viewportScale;
  const maxRadius = themeMode === 'clean_bento' ? 20 * viewportScale : 0;

  // Smooth quad-out curve so initial overlap onset is immediately noticeable
  const eased = 1 - Math.pow(1 - progress, 1.65);

  return {
    progress: Number(progress.toFixed(4)),
    recedeScale: Number((1 - maxScaleDrop * eased).toFixed(4)),
    recedeY: Number((-maxRecedeY * eased).toFixed(2)),
    shadeOpacity: Number((maxShade * eased).toFixed(3)),
    recedeRadiusPx: Number((maxRadius * eased).toFixed(1)),
  };
}
