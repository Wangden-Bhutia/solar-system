// Per-object LOD rules (lod.js): pure maths, no rendering.
import test from 'node:test';import assert from 'node:assert/strict';
import { PX, WINDOW, apparentPx, sizeFade, mergeFade, seamWindow, swapFade, crossFade, kindOf, ruleFade, createLod } from '../lod.js';
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e, `${a} ≈ ${b}`);
test('apparent size: L/D × (vh/2)/tan(fov/2); size and merge fades are log-px smoothsteps', () => {
  near(apparentPx(1, 1, 915, 90), 457.5); assert.equal(apparentPx(1, 0, 915, 50), Infinity);
  assert.equal(sizeFade(PX.tinyLo), 0); assert.equal(sizeFade(PX.tinyHi), 1); assert.equal(sizeFade(0), 0); assert.equal(sizeFade(NaN), 0);
  near(sizeFade(Math.sqrt(PX.tinyLo * PX.tinyHi)), 0.5); near(mergeFade(Math.sqrt(PX.mergeLo * PX.mergeHi)), 0.5);
  let last = -1; for (let px = 1; px < 30; px *= 1.1) { const f = sizeFade(px); assert.ok(f >= last); last = f; }
});
test('seam window: each scene is exactly invisible at the end where it stops being drawn', () => {
  assert.equal(seamWindow(null), 1);
  assert.equal(seamWindow({ role: 'inner', t: 0 }), 1); assert.equal(seamWindow({ role: 'inner', t: 1 - WINDOW }), 1); assert.equal(seamWindow({ role: 'inner', t: 1 }), 0);
  assert.equal(seamWindow({ role: 'outer', t: 0 }), 0); assert.equal(seamWindow({ role: 'outer', t: WINDOW }), 1); assert.equal(seamWindow({ role: 'outer', t: 1 }), 1);
});
test('proxy pairs swap at t = 0.5 (one copy, never two, never none); models cross-fade to a constant sum', () => {
  for (let t = 0; t <= 1; t += 0.01) {
    const i = { role: 'inner', t }, o = { role: 'outer', t };
    assert.equal(swapFade(i) + swapFade(o), 1, `exactly one proxy at t=${t}`);
    near(crossFade(i) + crossFade(o), 1, 1e-12);
  }
  assert.equal(swapFade({ role: 'inner', t: 0.49 }), 1); assert.equal(swapFade({ role: 'outer', t: 0.5 }), 1);
  assert.equal(crossFade({ role: 'inner', t: 0 }), 1); assert.equal(crossFade({ role: 'outer', t: 0 }), 0);
});
test('rules pick a kind by seam role; fixed is full outside the window, hidden is always off', () => {
  const r = { inner: 'model', outer: 'proxy', alone: 'fixed' };
  assert.equal(kindOf(r, null), 'fixed'); assert.equal(kindOf(r, { role: 'inner', t: 0.3 }), 'model'); assert.equal(kindOf(r, { role: 'outer', t: 0.3 }), 'proxy');
  assert.equal(kindOf({ alone: 'marker' }, { role: 'inner', t: 0 }), 'marker'); assert.equal(kindOf('size', null), 'size');
  assert.equal(ruleFade('fixed', { seam: { role: 'inner', t: 0.5 } }), 1); assert.equal(ruleFade('hidden'), 0);
  assert.equal(ruleFade('marker', { mergePx: 100, seam: { role: 'outer', t: 0 } }), 0);
});
test('createLod: objects fade by their own size or distance from the anchor; a shared material takes the brightest', () => {
  const mat = { opacity: 0.8, userData: {} }, tiny = { material: mat, position: { x: 1000, y: 0, z: 0 }, userData: {}, scale: { x: 1 } }, big = { material: mat, position: { x: 1, y: 0, z: 0 }, userData: {}, scale: { x: 1 } };
  const lod = createLod(); lod.add(tiny, 'size', { L: 1, centre: { x: 0, y: 0, z: 0 } }); lod.add(big, 'size', { L: 1, centre: { x: 0, y: 0, z: 0 } });
  const cam = { x: 0, y: 0, z: 0 };
  lod.update(cam, cam, 915, 50, null);
  assert.equal(tiny.userData.fade, 0); assert.equal(big.userData.fade, 1); near(mat.opacity, 0.8); assert.equal(mat.transparent, true); assert.ok(lod.has(big));
  const m2 = { opacity: 1, userData: {} }, star = { material: m2, position: { x: 0, y: 0, z: -100 }, userData: {} }, lod2 = createLod();
  lod2.add(star, 'marker');
  lod2.update(cam, { x: 0, y: 0, z: -100 }, 915, 50, null); assert.equal(m2.opacity, 1, 'the anchor itself is not merged away');
  lod2.update(cam, { x: 0.01, y: 0, z: -100 }, 915, 50, null); assert.equal(m2.opacity, 0, 'a dot on top of the anchor merges into it');
  lod2.update(cam, { x: 50, y: 0, z: -100 }, 915, 50, null); assert.equal(m2.opacity, 1, 'a dot well away from the anchor is drawn');
  const m3 = { opacity: 0.5, userData: {} }, sky = { material: m3, position: cam, userData: {} }, lod3 = createLod(); lod3.add(sky, 'proxy');
  lod3.update(cam, cam, 915, 50, { role: 'inner', t: 0.6 }); assert.equal(m3.opacity, 0); lod3.update(cam, cam, 915, 50, { role: 'inner', t: 0.4 }); assert.equal(m3.opacity, 0.5, 'base opacity is kept');
});
