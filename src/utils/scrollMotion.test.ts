import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp,
  computeOverlapDepth,
  computeParallaxOffset,
  computeSafeStickyTop,
  computeScrollVelocity,
  computeVelocityKinetic,
  dampVelocity,
  getViewportMotionScale,
} from './scrollMotion';

test('clamp and getViewportMotionScale scale motion across desktop, tablet, and smartphone', () => {
  assert.equal(clamp(120, -50, 50), 50);
  assert.equal(clamp(-90, -50, 50), -50);
  assert.equal(clamp(Number.NaN, -10, 10), -10);

  assert.equal(getViewportMotionScale(1440), 1);
  assert.equal(getViewportMotionScale(768), 0.86);
  assert.equal(getViewportMotionScale(390), 0.72);
});

test('computeScrollVelocity normalizes up/down direction and clamps extreme flicks', () => {
  const down = computeScrollVelocity(32, 16);
  const up = computeScrollVelocity(-32, 16);
  assert.ok(down > 0 && down <= 1);
  assert.ok(up < 0 && up >= -1);
  assert.equal(Math.abs(down), Math.abs(up));

  assert.equal(computeScrollVelocity(5000, 8), 1);
  assert.equal(computeScrollVelocity(-5000, 8), -1);
  assert.equal(computeScrollVelocity(10, 0), 0);
});

test('dampVelocity converges smoothly toward zero when scrolling stops across refresh rates', () => {
  let v60 = 1;
  for (let i = 0; i < 60; i++) {
    v60 = dampVelocity(v60, 0, 16.67, 7.5);
  }
  assert.ok(v60 < 0.015, `expected damped velocity near 0, got ${v60}`);

  let v120 = 1;
  for (let i = 0; i < 120; i++) {
    v120 = dampVelocity(v120, 0, 8.33, 7.5);
  }
  assert.ok(Math.abs(v60 - v120) < 0.005, 'damping should be frame-rate independent');
});

test('computeParallaxOffset and computeVelocityKinetic deliver visible travel and honor reducedMotion', () => {
  // Hero-range parallax (40-80px)
  const heroShift = computeParallaxOffset({
    viewportProgress: 0.9,
    speed: -0.48,
    maxOffsetPx: 64,
    viewportScale: 1,
    reducedMotion: false,
  });
  assert.ok(Math.abs(heroShift) >= 40 && Math.abs(heroShift) <= 64, `got ${heroShift}`);

  // Opposite scroll direction reverses sign cleanly
  const heroReverse = computeParallaxOffset({
    viewportProgress: -0.9,
    speed: -0.48,
    maxOffsetPx: 64,
    viewportScale: 1,
    reducedMotion: false,
  });
  assert.equal(heroShift, -heroReverse);

  // Reduced motion zeroes parallax & kinetic shift
  assert.equal(
    computeParallaxOffset({
      viewportProgress: 0.9,
      speed: -0.48,
      maxOffsetPx: 64,
      viewportScale: 1,
      reducedMotion: true,
    }),
    0
  );

  const downKinetic = computeVelocityKinetic({
    velocityNorm: 0.85,
    velocityFactor: 1.1,
    maxVelocityShiftPx: 28,
    maxSkewDeg: 1.5,
  });
  assert.ok(downKinetic.shiftY < -10 && downKinetic.shiftY >= -28);
  assert.ok(downKinetic.skewY > 0.5 && downKinetic.skewY <= 1.5);

  const reducedKinetic = computeVelocityKinetic({
    velocityNorm: 0.85,
    velocityFactor: 1.1,
    maxVelocityShiftPx: 28,
    maxSkewDeg: 1.5,
    reducedMotion: true,
  });
  assert.deepEqual(reducedKinetic, { shiftY: 0, skewY: 0 });
});

test('computeSafeStickyTop prevents clipping on tall sections and disables cleanly on reducedMotion', () => {
  assert.equal(
    computeSafeStickyTop({
      sectionHeight: 420,
      viewportHeight: 900,
      headerOffset: 56,
    }),
    56
  );

  const tallTop = computeSafeStickyTop({
    sectionHeight: 1120,
    viewportHeight: 800,
    headerOffset: 56,
  });
  assert.equal(tallTop, 800 - 1120 - 16);

  assert.equal(
    computeSafeStickyTop({
      sectionHeight: 420,
      viewportHeight: 900,
      reducedMotion: true,
    }),
    null
  );
});

test('computeOverlapDepth stays strictly 0 before overlap begins and ramps clearly during overlap', () => {
  // At scrollY = 0: Hero occupies y=56..466, next section starts right at y=466 -> ZERO premature recession
  const beforeOverlap = computeOverlapDepth({
    anchorTopPx: 56,
    anchorBottomPx: 466,
    nextSectionTopPx: 466,
    themeMode: 'clean_bento',
  });
  assert.equal(beforeOverlap.progress, 0);
  assert.equal(beforeOverlap.recedeScale, 1);
  assert.equal(beforeOverlap.recedeY, 0);
  assert.equal(beforeOverlap.shadeOpacity, 0);

  // Mid-overlap: next section has climbed halfway over Hero (y=261)
  const midOverlap = computeOverlapDepth({
    anchorTopPx: 56,
    anchorBottomPx: 466,
    nextSectionTopPx: 261,
    themeMode: 'clean_bento',
  });
  assert.ok(midOverlap.progress > 0.45 && midOverlap.progress < 0.55);
  assert.ok(midOverlap.recedeScale < 0.96, `expected clearly visible scale-down, got ${midOverlap.recedeScale}`);
  assert.ok(midOverlap.recedeY < -15);
  assert.ok(midOverlap.shadeOpacity > 0.15);

  // Full overlap: next section reached top of Hero (y=56)
  const fullOverlap = computeOverlapDepth({
    anchorTopPx: 56,
    anchorBottomPx: 466,
    nextSectionTopPx: 56,
    themeMode: 'neo_brutalist',
  });
  assert.equal(fullOverlap.progress, 1);
  assert.ok(fullOverlap.recedeScale <= 0.93);
  assert.ok(fullOverlap.shadeOpacity >= 0.3);

  // Reduced motion disables completely
  const reduced = computeOverlapDepth({
    anchorTopPx: 56,
    anchorBottomPx: 466,
    nextSectionTopPx: 56,
    reducedMotion: true,
  });
  assert.deepEqual(reduced, {
    progress: 0,
    recedeScale: 1,
    recedeY: 0,
    shadeOpacity: 0,
    recedeRadiusPx: 0,
  });
});
