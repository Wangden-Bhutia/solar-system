import test from 'node:test'; import assert from 'node:assert/strict';
import { createPush, atLimit, edgeHint, LEVELS } from '../zoom-ladder.js';
test('push builds only at the matching limit, decays on pause or reversal, then fires once', () => {
  const p = createPush({ threshold: 260, idleMs: 900 }); let t = 0; const at = (o, i) => ({ atOuter: o, atInner: i, now: t += 100 });
  assert.equal(p.feed(120, at(false, false)), null); assert.equal(p.progress, 0);
  assert.equal(p.feed(120, at(true, false)), null); assert.equal(p.direction, 'out'); assert.ok(p.progress > 0.4);
  assert.equal(p.feed(-50, at(true, true)), null); assert.equal(p.direction, 'in', 'reversing starts over');
  p.reset(); p.feed(120, at(true, false)); t += 2000; assert.equal(p.feed(120, at(true, false)), null); assert.ok(p.progress < 0.5, 'a pause resets');
  assert.equal(p.feed(120, at(true, false)), null); assert.equal(p.feed(120, at(true, false)), 'out'); assert.equal(p.progress, 0, 'fires once');
  assert.equal(p.feed(-140, at(false, true)), null); assert.equal(p.feed(-140, at(false, true)), 'in');
});
test('limits, hints and order', () => {
  assert.deepEqual(atLimit(118, 0.4, 120), { atOuter: true, atInner: false }); assert.deepEqual(atLimit(0.41, 0.4, 120), { atOuter: false, atInner: true });
  assert.match(edgeHint('solar', 'out'), /Solar System/); assert.equal(edgeHint('galaxy', 'out'), null); assert.equal(edgeHint('solar', 'in'), null);
  assert.deepEqual(LEVELS, ['solar', 'stars', 'galaxy']);
});
