import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FADE_SCROLL_DEFAULTS,
  computeFadeStaggerDelay,
  isRectReadyToReveal,
  normalizeFadeConfig,
} from './fadeScroll';

test('FADE_SCROLL_DEFAULTS stays within requested duration, distance, and stagger bounds', () => {
  assert.ok(FADE_SCROLL_DEFAULTS.durationMs >= 600 && FADE_SCROLL_DEFAULTS.durationMs <= 800);
  assert.ok(FADE_SCROLL_DEFAULTS.distancePx >= 20 && FADE_SCROLL_DEFAULTS.distancePx <= 35);
  assert.ok(FADE_SCROLL_DEFAULTS.staggerMs >= 80 && FADE_SCROLL_DEFAULTS.staggerMs <= 120);
});

test('computeFadeStaggerDelay staggers rows cleanly without cumulative lag on multi-row grids', () => {
  assert.equal(computeFadeStaggerDelay({ index: 0, columnsPerRow: 5, staggerMs: 95 }), 0);
  assert.equal(computeFadeStaggerDelay({ index: 1, columnsPerRow: 5, staggerMs: 95 }), 95);
  assert.equal(computeFadeStaggerDelay({ index: 4, columnsPerRow: 5, staggerMs: 95 }), 380);
  // Second row restarts at 0ms stagger
  assert.equal(computeFadeStaggerDelay({ index: 5, columnsPerRow: 5, staggerMs: 95 }), 0);
  assert.equal(computeFadeStaggerDelay({ index: 6, columnsPerRow: 5, staggerMs: 95 }), 95);

  // Sequential list without columnsPerRow caps at maxSteps
  assert.equal(computeFadeStaggerDelay({ index: 10, maxSteps: 4, staggerMs: 100 }), 400);
});

test('isRectReadyToReveal reveals above-fold, entering, and scrolled-past elements while keeping below-fold hidden', () => {
  // Above/inside viewport at load
  assert.equal(
    isRectReadyToReveal({ top: 120, bottom: 400, width: 300, height: 280, viewportHeight: 900 }),
    true
  );
  // Already scrolled above viewport
  assert.equal(
    isRectReadyToReveal({ top: -400, bottom: -100, width: 300, height: 300, viewportHeight: 900 }),
    true
  );
  // Below viewport — remains hidden until scrolled into view
  assert.equal(
    isRectReadyToReveal({ top: 960, bottom: 1260, width: 300, height: 300, viewportHeight: 900 }),
    false
  );
  // Zero-sized detached/display:none node does not falsely trigger reveal
  assert.equal(
    isRectReadyToReveal({ top: 0, bottom: 0, width: 0, height: 0, viewportHeight: 900 }),
    false
  );
});

test('normalizeFadeConfig clamps parameters strictly into spec ranges', () => {
  const clampedLow = normalizeFadeConfig({ durationMs: 300, distancePx: 8, staggerMs: 20 });
  assert.deepEqual(clampedLow, { durationMs: 600, distancePx: 20, staggerMs: 80 });

  const clampedHigh = normalizeFadeConfig({ durationMs: 1400, distancePx: 80, staggerMs: 250 });
  assert.deepEqual(clampedHigh, { durationMs: 800, distancePx: 35, staggerMs: 120 });
});
