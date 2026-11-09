import test from 'node:test'; import assert from 'node:assert/strict';
import { bridgeFrame, stepBridge, atLimit, pairFor, PAIRS, STAR_NEAR, STAR_FAR, GALAXY_NEAR, LEVELS, BRIDGE_SPAN } from '../zoom-ladder.js';
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} vs ${b}`);
test('bridges meet the scenes exactly at their limits, so there is no jump at either end', () => {
  const s0 = bridgeFrame('solar>stars', 0), s1 = bridgeFrame('solar>stars', 1);
  near(s0.inner.recede, 1); near(s0.inner.dim, 0); near(s0.outer.opacity, 0); near(s1.outer.d, STAR_NEAR); near(s1.outer.opacity, 1); near(s1.inner.dim, 1);
  const g0 = bridgeFrame('stars>galaxy', 0), g1 = bridgeFrame('stars>galaxy', 1);
  near(g0.inner.d, STAR_FAR); near(g0.outer.opacity, 0); near(g1.outer.d, GALAXY_NEAR); near(g1.inner.dim, 1);
  for (let t = 0; t <= 1; t += 0.05) { const g = bridgeFrame('stars>galaxy', t); near(g.outer.d * 1000, g.inner.d, 1e-6); } // same scale throughout: kly × 1000 = ly
});
test('the blend is continuous and monotonic', () => {
  for (const pair of Object.keys(PAIRS)) { let prev = -1; for (let t = 0; t <= 1.0001; t += 0.01) { const o = bridgeFrame(pair, t).outer.opacity; assert.ok(o >= prev - 1e-12); prev = o; } }
  assert.ok(bridgeFrame('solar>stars', 0.5).inner.recede > 1 && bridgeFrame('solar>stars', 1).inner.recede > bridgeFrame('solar>stars', 0.5).inner.recede);
});
test('stepping: zoom amount moves t; settles only at the ends; reversing goes back', () => {
  let r = stepBridge(0, 120); near(r.t, 120 / BRIDGE_SPAN); assert.equal(r.settled, null);
  r = stepBridge(r.t, -60); near(r.t, 60 / BRIDGE_SPAN); r = stepBridge(0.9, 200); assert.equal(r.settled, 'outer'); assert.equal(r.t, 1);
  r = stepBridge(0.1, -200); assert.equal(r.settled, 'inner'); assert.equal(r.t, 0);
});
test('which bridge a direction opens, and limits', () => {
  assert.equal(pairFor('solar', 1), 'solar>stars'); assert.equal(pairFor('stars', 1), 'stars>galaxy'); assert.equal(pairFor('galaxy', 1), null);
  assert.equal(pairFor('stars', -1), 'solar>stars'); assert.equal(pairFor('galaxy', -1), 'stars>galaxy'); assert.equal(pairFor('solar', -1), null);
  assert.deepEqual(atLimit(118, 0.4, 120), { atOuter: true, atInner: false }); assert.deepEqual(LEVELS, ['solar', 'stars', 'galaxy']);
});
