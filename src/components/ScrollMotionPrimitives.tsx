import React, { useEffect, useRef, useState } from 'react';
import { scrollVelocityEngine } from '../lib/scrollVelocityEngine';
import { computeSafeStickyTop } from '../utils/scrollMotion';

interface VelocityLayerProps {
  children: React.ReactNode;
  /**
   * Bidirectional scroll parallax speed relative to page scroll.
   * Negative = moves slower (deep background feel), Positive = moves faster (foreground feel).
   */
  speed?: number;
  /**
   * Velocity momentum responsiveness when scrolling fast (settles smoothly back to 0 at rest).
   */
  velocityFactor?: number;
  /** Maximum parallax pixel travel on desktop. */
  maxOffsetPx?: number;
  /** Maximum velocity momentum shift on desktop. */
  maxVelocityShiftPx?: number;
  /** Optional subtle skewY angle (deg) on fast scroll; always settles to 0 at rest. */
  maxSkewDeg?: number;
  /** Base scale (useful for parallax image frames so edges never show). */
  baseScale?: number;
  /** Optional top-of-page scroll range (px) for parallax inside sticky Hero. */
  scrollRangePx?: number;
  className?: string;
}

/**
 * GPU-composited velocity & parallax wrapper.
 * Wraps cards/visuals externally so inner card `:hover` transforms and CSS transitions
 * NEVER collide with scroll-driven transforms.
 */
export function VelocityLayer({
  children,
  speed = 0,
  velocityFactor = 0.75,
  maxOffsetPx = 36,
  maxVelocityShiftPx = 22,
  maxSkewDeg = 0,
  baseScale = 1,
  scrollRangePx,
  className = '',
}: VelocityLayerProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return scrollVelocityEngine.registerVelocity({
      element: el,
      speed,
      velocityFactor,
      maxOffsetPx,
      maxVelocityShiftPx,
      maxSkewDeg,
      baseScale,
      scrollRangePx,
    });
  }, [speed, velocityFactor, maxOffsetPx, maxVelocityShiftPx, maxSkewDeg, baseScale, scrollRangePx]);

  return (
    <div
      ref={ref}
      data-scs-velocity="true"
      className={`scs-velocity-layer ${className}`}
    >
      {children}
    </div>
  );
}

interface OverlapSectionProps {
  children: React.ReactNode;
  id?: string;
  /**
   * Ascending visual layer index (1..12). Maps to z-index (10 + layerIndex),
   * strictly below sticky Navbar (z-40) and Modals (z-50).
   */
  layerIndex: number;
  /**
   * When true, this section acts as a pinned receding anchor layer so the next
   * OverlapSection rises visibly over it. Uses safe sticky offset math so tall
   * sections NEVER clip content on any screen height.
   */
  stickyAnchor?: boolean;
  /**
   * When true, renders the elevated overlapping top-curtain border & depth shadow
   * as this section glides up over the previous layer.
   */
  risingCurtain?: boolean;
  className?: string;
}

const NAVBAR_HEIGHT_PX = 56;

/**
 * Overlapping Section primitive combining safe CSS sticky positioning,
 * ascending z-index curtains, and GPU-composited receding depth transforms.
 */
export function OverlapSection({
  children,
  id,
  layerIndex,
  stickyAnchor = false,
  risingCurtain = false,
  className = '',
}: OverlapSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const shadeRef = useRef<HTMLDivElement | null>(null);
  const [stickyTop, setStickyTop] = useState<number | null>(
    stickyAnchor ? NAVBAR_HEIGHT_PX : null
  );

  // Compute safe sticky offset dynamically via ResizeObserver so tall sections never clip
  useEffect(() => {
    const sectionEl = sectionRef.current;
    if (!sectionEl || !stickyAnchor) {
      setStickyTop(null);
      return;
    }

    const mq =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    const recalc = () => {
      const reduced = Boolean(mq?.matches);
      const vh = window.innerHeight || 800;
      const height = sectionEl.offsetHeight;

      // computeSafeStickyTop automatically pins short sections at 56px and tall sections
      // at (vh - height - 16) so bottom content is NEVER clipped on Desktop, Split-Screen Preview, or Smartphone.
      const nextTop = computeSafeStickyTop({
        sectionHeight: height,
        viewportHeight: vh,
        headerOffset: NAVBAR_HEIGHT_PX,
        enabled: stickyAnchor,
        reducedMotion: reduced,
      });
      setStickyTop(nextTop);
      scrollVelocityEngine.refresh();
    };

    recalc();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(recalc);
      ro.observe(sectionEl);
    }
    window.addEventListener('resize', recalc, { passive: true });
    if (mq && typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', recalc);
    }

    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', recalc);
      if (mq && typeof mq.removeEventListener === 'function') {
        mq.removeEventListener('change', recalc);
      }
    };
  }, [stickyAnchor]);

  // Register receding depth effect when this section is a sticky anchor
  useEffect(() => {
    const sectionEl = sectionRef.current;
    const innerEl = innerRef.current;
    if (!sectionEl || !innerEl || !stickyAnchor) return;

    return scrollVelocityEngine.registerOverlapAnchor({
      sectionEl,
      innerEl,
      shadeEl: shadeRef.current,
    });
  }, [stickyAnchor]);

  const zIndex = 10 + Math.min(14, Math.max(0, layerIndex));
  const isStickyActive = stickyAnchor && stickyTop !== null;
  const overlapRole =
    stickyAnchor && risingCurtain
      ? 'anchor-curtain'
      : stickyAnchor
        ? 'anchor'
        : risingCurtain
          ? 'curtain'
          : 'layer';

  return (
    <section
      ref={sectionRef}
      id={id}
      data-scs-overlap={overlapRole}
      data-scs-layer={layerIndex}
      className={`scs-overlap-section ${
        risingCurtain ? 'scs-overlap-curtain' : ''
      } ${className}`}
      style={{
        position: isStickyActive ? 'sticky' : 'relative',
        top: isStickyActive ? `${stickyTop}px` : undefined,
        zIndex,
      }}
    >
      {stickyAnchor ? (
        <>
          <div ref={innerRef} className="scs-overlap-inner">
            {children}
          </div>
          <div
            ref={shadeRef}
            aria-hidden="true"
            className="scs-overlap-shade pointer-events-none absolute inset-0"
            style={{ opacity: 0 }}
          />
        </>
      ) : (
        children
      )}
    </section>
  );
}
