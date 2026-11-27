import {
  computeOverlapDepth,
  computeParallaxOffset,
  computeScrollVelocity,
  computeVelocityKinetic,
  dampVelocity,
  getViewportMotionScale,
} from '../utils/scrollMotion';

export interface VelocitySubscriberConfig {
  element: HTMLElement;
  /** Bidirectional scroll parallax speed (-0.6..0.6). */
  speed: number;
  /** Velocity momentum responsiveness (0..1.8). */
  velocityFactor: number;
  /** Max parallax offset in px. */
  maxOffsetPx: number;
  /** Max velocity-induced shift in px. */
  maxVelocityShiftPx: number;
  /** Optional subtle skewY in deg during fast scroll (always settles to 0). */
  maxSkewDeg: number;
  /** Base scale (e.g. 1.26 for parallax hero image frames so edges never show). */
  baseScale: number;
  /**
   * Optional scroll distance (px from top of page) for elements inside a top sticky
   * section (e.g. Hero). Drives parallax smoothly from 0 at scrollY=0 to full
   * maxOffsetPx over [0..scrollRangePx] even while the parent section is sticky-pinned.
   */
  scrollRangePx?: number;
}

export interface OverlapAnchorConfig {
  sectionEl: HTMLElement;
  innerEl: HTMLElement;
  shadeEl: HTMLElement | null;
}

interface VelocityEntry extends VelocitySubscriberConfig {
  lastTransform: string;
}

interface OverlapEntry extends OverlapAnchorConfig {
  lastTransform: string;
  lastShade: string;
  lastRadius: string;
}

function readScrollY(): number {
  if (typeof window === 'undefined') return 0;
  return (
    window.scrollY ||
    window.pageYOffset ||
    document.documentElement?.scrollTop ||
    document.body?.scrollTop ||
    0
  );
}

/**
 * Single shared, cross-browser, GPU-composited scroll motion engine.
 * - Listens passively to window + document scroll events (handles iframe & all engines).
 * - Batches ALL DOM reads before ALL GPU-composited style writes in one rAF loop.
 * - Does NOT rely on IntersectionObserver gating, eliminating missed detections when
 *   dynamic Firestore content hydrates or inside sticky/iframe contexts.
 * - Zero React state updates on scroll; idles cleanly at 0% CPU when motion settles.
 * - Respects `prefers-reduced-motion: reduce` dynamically.
 */
class ScrollVelocityEngine {
  private velocityEntries = new Map<HTMLElement, VelocityEntry>();
  private overlapEntries = new Map<HTMLElement, OverlapEntry>();
  private rafId: number | null = null;
  private listening = false;
  private reducedMotion = false;
  private mediaQuery: MediaQueryList | null = null;

  private lastScrollY = 0;
  private lastEventTime = 0;
  private lastFrameTime = 0;
  private rawVelocity = 0;
  private smoothVelocity = 0;
  private needsSettleFrame = false;

  private initIfNeeded() {
    if (typeof window === 'undefined' || this.listening) return;

    this.listening = true;
    this.lastScrollY = readScrollY();
    this.lastEventTime = performance.now();
    this.lastFrameTime = this.lastEventTime;

    if (typeof window.matchMedia === 'function') {
      this.mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion = this.mediaQuery.matches;
      const onMotionChange = (e: MediaQueryListEvent) => {
        this.reducedMotion = e.matches;
        if (this.reducedMotion) {
          this.resetAllTransforms();
        } else {
          this.needsSettleFrame = true;
          this.scheduleTick();
        }
      };
      if (typeof this.mediaQuery.addEventListener === 'function') {
        this.mediaQuery.addEventListener('change', onMotionChange);
      } else if (typeof this.mediaQuery.addListener === 'function') {
        this.mediaQuery.addListener(onMotionChange);
      }
    }

    window.addEventListener('scroll', this.handleScroll, { passive: true });
    document.addEventListener('scroll', this.handleScroll, { passive: true, capture: true });
    window.addEventListener('resize', this.handleResize, { passive: true });
  }

  private getThemeMode(): 'neo_brutalist' | 'clean_bento' {
    if (typeof document === 'undefined') return 'neo_brutalist';
    return document.documentElement.getAttribute('data-theme') === 'clean_bento'
      ? 'clean_bento'
      : 'neo_brutalist';
  }

  private handleScroll = () => {
    if (this.reducedMotion) return;
    const now = performance.now();
    const currentY = readScrollY();
    const deltaY = currentY - this.lastScrollY;
    const dt = now - this.lastEventTime;

    if (Math.abs(deltaY) < 0.05) {
      return;
    }

    this.lastScrollY = currentY;
    this.lastEventTime = now;

    this.rawVelocity = computeScrollVelocity(deltaY, dt > 0 ? dt : 16);
    this.needsSettleFrame = true;
    this.scheduleTick();
  };

  private handleResize = () => {
    if (this.reducedMotion) return;
    this.needsSettleFrame = true;
    this.scheduleTick();
  };

  private scheduleTick() {
    if (this.rafId !== null || typeof window === 'undefined') return;
    this.lastFrameTime = performance.now();
    this.rafId = window.requestAnimationFrame(this.tick);
  }

  private resetAllTransforms() {
    this.rawVelocity = 0;
    this.smoothVelocity = 0;
    this.needsSettleFrame = false;
    if (this.rafId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    for (const entry of this.velocityEntries.values()) {
      entry.element.style.transform = '';
      entry.lastTransform = '';
    }
    for (const entry of this.overlapEntries.values()) {
      entry.innerEl.style.transform = '';
      entry.innerEl.style.borderRadius = '';
      entry.lastTransform = '';
      entry.lastRadius = '';
      if (entry.shadeEl) {
        entry.shadeEl.style.opacity = '0';
        entry.lastShade = '0';
      }
    }
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--scs-scroll-velocity', '0');
      document.documentElement.style.setProperty('--scs-scroll-progress', '0');
      document.documentElement.style.setProperty('--scs-scroll-y', '0');
    }
  }

  private tick = (now: number) => {
    this.rafId = null;
    if (this.reducedMotion) {
      this.resetAllTransforms();
      return;
    }

    const dt = Math.max(4, Math.min(64, now - this.lastFrameTime));
    this.lastFrameTime = now;

    // Also poll current scrollY directly inside rAF in case scroll happened programmatically
    const currentY = readScrollY();
    if (Math.abs(currentY - this.lastScrollY) > 0.25) {
      const deltaY = currentY - this.lastScrollY;
      this.lastScrollY = currentY;
      this.lastEventTime = now;
      this.rawVelocity = computeScrollVelocity(deltaY, dt);
      this.needsSettleFrame = true;
    }

    // Decay target velocity back to 0 once scrolling pauses
    const timeSinceScroll = now - this.lastEventTime;
    if (timeSinceScroll > 48) {
      this.rawVelocity = 0;
    }

    const themeMode = this.getThemeMode();
    // Smooth, tactile inertia curve: silkier in Clean Bento (6.8), snappier in Neo Brutalist (8.8)
    const smoothing = themeMode === 'clean_bento' ? 6.8 : 8.8;
    this.smoothVelocity = dampVelocity(this.smoothVelocity, this.rawVelocity, dt, smoothing);
    if (Math.abs(this.rawVelocity) < 0.001 && Math.abs(this.smoothVelocity) < 0.003) {
      this.smoothVelocity = 0;
    }

    const vw = window.innerWidth || 1280;
    const vh = window.innerHeight || 800;
    const viewportScale = getViewportMotionScale(vw);
    const halfVh = vh / 2;

    const docEl = document.documentElement;
    const maxScroll = Math.max(1, (docEl.scrollHeight || 0) - vh);
    const scrollProgress = Math.min(1, Math.max(0, currentY / maxScroll));

    docEl.style.setProperty('--scs-scroll-velocity', this.smoothVelocity.toFixed(4));
    docEl.style.setProperty('--scs-scroll-progress', scrollProgress.toFixed(4));
    docEl.style.setProperty('--scs-scroll-y', currentY.toFixed(1));

    // Phase 1: Batch ALL DOM reads first (zero layout thrashing!)
    const velocityWrites: Array<{ entry: VelocityEntry; transform: string }> = [];
    for (const entry of this.velocityEntries.values()) {
      const rect = entry.element.getBoundingClientRect();
      const nearViewport = rect.bottom > -320 && rect.top < vh + 320;

      if (!nearViewport) {
        const neutral = entry.baseScale !== 1 ? `scale(${entry.baseScale})` : '';
        if (entry.lastTransform !== neutral) {
          velocityWrites.push({ entry, transform: neutral });
        }
        continue;
      }

      let parallaxY = 0;
      if (entry.scrollRangePx && entry.scrollRangePx > 0 && entry.speed !== 0) {
        const parentSection = entry.element.closest('section');
        const effectiveRange = Math.max(
          entry.scrollRangePx,
          parentSection ? parentSection.offsetHeight : 0
        );
        const progress = Math.min(1, Math.max(0, currentY / effectiveRange));
        parallaxY = progress * Math.sign(entry.speed) * entry.maxOffsetPx * viewportScale;
      } else {
        const center = rect.top + rect.height / 2;
        const viewportProgress = (center - halfVh) / Math.max(1, halfVh);

        parallaxY = computeParallaxOffset({
          viewportProgress,
          speed: entry.speed,
          maxOffsetPx: entry.maxOffsetPx,
          viewportScale,
          reducedMotion: false,
        });
      }

      const kinetic = computeVelocityKinetic({
        velocityNorm: this.smoothVelocity,
        velocityFactor: entry.velocityFactor,
        maxVelocityShiftPx: entry.maxVelocityShiftPx,
        maxSkewDeg: entry.maxSkewDeg,
        viewportScale,
        reducedMotion: false,
      });

      const totalY = Number((parallaxY + kinetic.shiftY).toFixed(2));
      const skewY = Number(kinetic.skewY.toFixed(3));
      const scalePart = entry.baseScale !== 1 ? ` scale(${entry.baseScale})` : '';
      const skewPart = Math.abs(skewY) > 0.005 ? ` skewY(${skewY}deg)` : '';

      const transform =
        Math.abs(totalY) < 0.05 && !skewPart && !scalePart
          ? 'translate3d(0, 0, 0)'
          : `translate3d(0, ${totalY}px, 0)${skewPart}${scalePart}`;

      if (transform !== entry.lastTransform) {
        velocityWrites.push({ entry, transform });
      }
    }

    const overlapWrites: Array<{
      entry: OverlapEntry;
      transform: string;
      shade: string;
      radius: string;
    }> = [];

    for (const entry of this.overlapEntries.values()) {
      const nextSibling = entry.sectionEl.nextElementSibling as HTMLElement | null;
      if (!nextSibling) continue;

      const anchorRect = entry.sectionEl.getBoundingClientRect();
      const nextTop = nextSibling.getBoundingClientRect().top;

      const depth = computeOverlapDepth({
        anchorTopPx: anchorRect.top,
        anchorBottomPx: anchorRect.bottom,
        nextSectionTopPx: nextTop,
        viewportScale,
        reducedMotion: false,
        themeMode,
      });

      const transform =
        depth.progress <= 0.001
          ? 'translate3d(0, 0, 0) scale(1)'
          : `translate3d(0, ${depth.recedeY}px, 0) scale(${depth.recedeScale})`;
      const shade = depth.shadeOpacity.toFixed(3);
      const radius = depth.recedeRadiusPx > 0.2 ? `${depth.recedeRadiusPx}px` : '';

      if (
        transform !== entry.lastTransform ||
        shade !== entry.lastShade ||
        radius !== entry.lastRadius
      ) {
        overlapWrites.push({ entry, transform, shade, radius });
      }
    }

    // Phase 2: Batch ALL GPU-composited style writes
    for (const item of velocityWrites) {
      item.entry.element.style.transform = item.transform;
      item.entry.lastTransform = item.transform;
    }

    for (const item of overlapWrites) {
      item.entry.innerEl.style.transform = item.transform;
      item.entry.innerEl.style.borderRadius = item.radius;
      item.entry.lastTransform = item.transform;
      item.entry.lastRadius = item.radius;
      if (item.entry.shadeEl) {
        item.entry.shadeEl.style.opacity = item.shade;
        item.entry.lastShade = item.shade;
      }
    }

    // Continue rAF ONLY while velocity is settling; idle at 0% CPU when still
    const stillMoving =
      Math.abs(this.smoothVelocity) > 0.001 ||
      Math.abs(this.rawVelocity) > 0.001 ||
      this.needsSettleFrame;

    this.needsSettleFrame = false;

    if (stillMoving && (this.velocityEntries.size > 0 || this.overlapEntries.size > 0)) {
      this.rafId = window.requestAnimationFrame(this.tick);
    }
  };

  /** Forces an immediate layout-synced animation frame (e.g. after theme switch or filter change). */
  refresh() {
    if (this.reducedMotion) return;
    this.needsSettleFrame = true;
    this.scheduleTick();
  }

  registerVelocity(config: VelocitySubscriberConfig): () => void {
    this.initIfNeeded();
    const entry: VelocityEntry = {
      ...config,
      lastTransform: '',
    };
    this.velocityEntries.set(config.element, entry);

    if (!this.reducedMotion) {
      this.needsSettleFrame = true;
      this.scheduleTick();
    } else {
      config.element.style.transform = '';
    }

    return () => {
      this.velocityEntries.delete(config.element);
      config.element.style.transform = '';
      this.cleanupIfEmpty();
    };
  }

  registerOverlapAnchor(config: OverlapAnchorConfig): () => void {
    this.initIfNeeded();
    const entry: OverlapEntry = {
      ...config,
      lastTransform: '',
      lastShade: '',
      lastRadius: '',
    };
    this.overlapEntries.set(config.sectionEl, entry);

    if (!this.reducedMotion) {
      this.needsSettleFrame = true;
      this.scheduleTick();
    } else {
      config.innerEl.style.transform = '';
      config.innerEl.style.borderRadius = '';
      if (config.shadeEl) config.shadeEl.style.opacity = '0';
    }

    return () => {
      this.overlapEntries.delete(config.sectionEl);
      config.innerEl.style.transform = '';
      config.innerEl.style.borderRadius = '';
      if (config.shadeEl) config.shadeEl.style.opacity = '0';
      this.cleanupIfEmpty();
    };
  }

  private cleanupIfEmpty() {
    if (this.velocityEntries.size > 0 || this.overlapEntries.size > 0) return;
    if (this.rafId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.listening && typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.handleScroll);
      document.removeEventListener('scroll', this.handleScroll, true);
      window.removeEventListener('resize', this.handleResize);
      this.listening = false;
    }
  }
}

export const scrollVelocityEngine = new ScrollVelocityEngine();
