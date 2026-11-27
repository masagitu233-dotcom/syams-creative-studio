import React, { useEffect, useRef, useState } from 'react';
import {
  computeFadeStaggerDelay,
  FADE_SCROLL_DEFAULTS,
  isRectReadyToReveal,
  normalizeFadeConfig,
} from '../utils/fadeScroll';

interface FadeScrollProps {
  children: React.ReactNode;
  /** Position index within a sibling group or grid for stagger calculation. */
  index?: number;
  /** Number of columns per row (restarts stagger cleanly per row in multi-row grids). */
  columnsPerRow?: number;
  /** Base delay in ms before stagger offset is added. */
  delayMs?: number;
  /** Stagger step in ms between adjacent items (clamped to 80–120 ms). */
  staggerMs?: number;
  /** Transition duration in ms (clamped to 600–800 ms). */
  durationMs?: number;
  /** Initial vertical offset in px (clamped to 20–35 px). */
  distancePx?: number;
  className?: string;
}

function prefersReducedMotionNow(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Global, theme-agnostic Fade Scrolling wrapper.
 * - Uses IntersectionObserver + viewport rect checks (never leaves items stuck hidden).
 * - Triggers once on enter (`opacity: 0 -> 1`, `translateY: 26px -> 0`) and stays visible on exit.
 * - Honors `prefers-reduced-motion` and keeps content visible if JS fails.
 */
export function FadeScroll({
  children,
  index = 0,
  columnsPerRow,
  delayMs = 0,
  staggerMs = FADE_SCROLL_DEFAULTS.staggerMs,
  durationMs = FADE_SCROLL_DEFAULTS.durationMs,
  distancePx = FADE_SCROLL_DEFAULTS.distancePx,
  className = '',
}: FadeScrollProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const initialReduced =
    prefersReducedMotionNow() || typeof IntersectionObserver === 'undefined';

  const [visible, setVisible] = useState<boolean>(initialReduced);
  const [settled, setSettled] = useState<boolean>(initialReduced);

  const normalized = normalizeFadeConfig({ durationMs, distancePx, staggerMs });
  const computedDelayMs = computeFadeStaggerDelay({
    index,
    staggerMs: normalized.staggerMs,
    columnsPerRow,
    baseDelayMs: delayMs,
  });

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el || prefersReducedMotionNow() || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      setSettled(true);
      return;
    }

    let revealed = false;
    let rafId: number | null = null;
    let scrollRafId: number | null = null;
    let observer: IntersectionObserver | null = null;

    const reveal = () => {
      if (revealed) return;
      revealed = true;
      setVisible(true);
      cleanupListeners();
    };

    const checkRect = () => {
      if (revealed) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight || 900;
      if (
        isRectReadyToReveal({
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          viewportHeight: vh,
          offsetPx: 16,
        })
      ) {
        reveal();
      }
    };

    const onScrollOrResize = () => {
      if (revealed || scrollRafId !== null) return;
      scrollRafId = window.requestAnimationFrame(() => {
        scrollRafId = null;
        checkRect();
      });
    };

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotionChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        reveal();
        setSettled(true);
      }
    };

    function cleanupListeners() {
      observer?.disconnect();
      observer = null;
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (scrollRafId !== null) {
        window.cancelAnimationFrame(scrollRafId);
        scrollRafId = null;
      }
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      if (typeof mq.removeEventListener === 'function') {
        mq.removeEventListener('change', onMotionChange);
      }
    }

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.boundingClientRect.top <= (window.innerHeight || 900)) {
            reveal();
            break;
          }
        }
      },
      {
        threshold: 0.01,
        rootMargin: '0px 0px -16px 0px',
      }
    );

    observer.observe(el);
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onMotionChange);
    }

    // Trigger on next animation frame for items already inside or above the viewport at mount
    rafId = window.requestAnimationFrame(() => {
      rafId = null;
      checkRect();
    });

    return cleanupListeners;
  }, [visible]);

  useEffect(() => {
    if (!visible || settled) return;
    const timer = window.setTimeout(() => {
      setSettled(true);
    }, normalized.durationMs + computedDelayMs + 80);
    return () => window.clearTimeout(timer);
  }, [visible, settled, normalized.durationMs, computedDelayMs]);

  const inlineStyle = {
    '--scs-fade-duration': `${normalized.durationMs}ms`,
    '--scs-fade-distance': `${normalized.distancePx}px`,
    '--scs-fade-delay': `${computedDelayMs}ms`,
  } as React.CSSProperties;

  return (
    <div
      ref={ref}
      data-scs-fade="true"
      data-fade-state={visible ? 'visible' : 'hidden'}
      data-fade-settled={settled ? 'true' : 'false'}
      style={inlineStyle}
      className={`scs-fade-item ${className}`}
    >
      {children}
    </div>
  );
}
