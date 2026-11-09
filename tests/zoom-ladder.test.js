import test from 'node:test'; import assert from 'node:assert/strict';
import { LEVELS, PAIRS, pairFor, levelIndex, UNIT_LY, SEAM_LY, SEAM_Z, SEAMS, SCENE_RANGE, layoutAt, zOf, dOf, AU_LY, auToUnits, solarUnits, solarZ, viewRate, metricBlend, STAR_NEAR, STAR_FAR, GALAXY_NEAR, GALAXY_FAR, LOCAL_NEAR, LOCAL_FAR, LOCAL_UNIT, SUPER_NEAR, SUPER_FAR, UNIVERSE_NEAR } from '../zoom-ladder.js';
import { DIST_K, DIST_P, UNITS_PER_AU } from '../data.js';
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e * Math.max(1, Math.abs(b)), `${a} vs ${b}`);
const ORDER = Object.keys(SEAM_Z);

test('six scales in order; each seam joins neighbours; pairFor walks both ways', () => {
  assert.deepEqual(LEVELS, ['solar', 'stars', 'galaxy', 'local', 'super', 'universe']);
  assert.deepEqual(ORDER, Object.keys(PAIRS));
  for (const [pair, [i, o]] of Object.entries(PAIRS)) { assert.equal(levelIndex(o), levelIndex(i) + 1); assert.equal(pairFor(i, 1), pair); assert.equal(pairFor(o, -1), pair); }
  assert.equal(pairFor('solar', -1), null); assert.equal(pairFor('universe', 1), null);
});

test('every seam spans exactly one decade (ΔZ = ln 10) and the seams are ordered with a scene between each pair', () => {
  for (const p of ORDER) { const [a, b] = SEAM_Z[p]; near(b - a, Math.log(10), 1e-12); near(SEAM_LY[p][1] / SEAM_LY[p][0], 10, 1e-12); }
  for (let i = 1; i < ORDER.length; i++) assert.ok(SEAM_Z[ORDER[i]][0] > SEAM_Z[ORDER[i - 1]][1], `${ORDER[i - 1]} ends before ${ORDER[i]}`);
});

test('metric seams are exact: outer distance = inner distance ÷ k at every Z, and k is the unit ratio', () => {
  for (const [pair, m] of Object.entries(SEAMS)) {
    const [i, o] = PAIRS[pair], [a, b] = SEAM_Z[pair];
    near(m.k, UNIT_LY[o] / UNIT_LY[i], 1e-15);
    for (let s = 0; s <= 1.0001; s += 0.05) { const Z = a + (b - a) * s; near(dOf(i, Z) / m.k, dOf(o, Z), 1e-12); }
    near(m.far, dOf(i, a), 1e-12); near(m.near, dOf(o, b), 1e-12);
  }
  near(LOCAL_UNIT, 10, 1e-15);
});

test('layoutAt: t comes from Z, 0 at the inner end and 1 at the outer end; exact ends belong to the scenes', () => {
  near(layoutAt(-50).t, 0); assert.equal(layoutAt(-50).level, 'solar'); assert.equal(layoutAt(50).level, 'universe');
  for (const p of ORDER) {
    const [a, b] = SEAM_Z[p], [i, o] = PAIRS[p];
    assert.equal(layoutAt(a).level, i, `${p} inner end is the inner scene`); assert.equal(layoutAt(b).level, o, `${p} outer end is the outer scene`);
    const mid = layoutAt((a + b) / 2); assert.equal(mid.pair, p); near(mid.t, 0.5, 1e-12);
    let prev = -1; for (let s = 0.01; s < 1; s += 0.01) { const L = layoutAt(a + (b - a) * s); assert.equal(L.pair, p); assert.ok(L.t > prev); near(L.t, s, 1e-9); prev = L.t; }
  }
});

test('each scene’s exclusive range sits between its seams, and its controls range covers both seams', () => {
  near(STAR_NEAR, 0.8); near(STAR_FAR, 300); near(GALAXY_NEAR, 3); near(GALAXY_FAR, 250); near(LOCAL_NEAR, 250); near(LOCAL_FAR, 1000); near(SUPER_NEAR, 100); near(SUPER_FAR, 800); near(UNIVERSE_NEAR, 80);
  for (const l of LEVELS.slice(1)) {
    const [lo, hi] = SCENE_RANGE[l], pin = pairFor(l, -1), pout = pairFor(l, 1);
    near(lo, Math.exp(SEAM_Z[pin][0]) / UNIT_LY[l], 1e-9);
    if (pout) near(hi, Math.exp(SEAM_Z[pout][1]) / UNIT_LY[l], 1e-9); else assert.equal(hi, Infinity);
  }
  for (const l of LEVELS.slice(1)) for (const d of [1, 37.5, 1e5]) near(dOf(l, zOf(l, d)), d, 1e-12);
});

test('Solar System: Z is the distance the compressed model represents; the inverse is exact and monotonic', () => {
  // Planet rule as drawn by app.js: DIST_K × AU^DIST_P scene units.
  for (const au of [0.39, 1, 5.2, 30.07, 100]) near(auToUnits(au, 0), DIST_K * au ** DIST_P, 1e-12);
  for (const au of [0.39, 1, 30.07]) near(auToUnits(au, 1), au * UNITS_PER_AU, 1e-12); // metric end: true scale
  for (const au of [1, 50, 5000]) { const D = au * AU_LY; near(solarUnits(D), DIST_K * au ** DIST_P, 1e-9); near(Math.exp(solarZ(solarUnits(D))), D, 1e-8); }
  let prev = -Infinity; for (let lu = -2; lu < 9; lu += 0.25) { const z = solarZ(Math.exp(lu)); assert.ok(z > prev); prev = z; }
  for (const d of [1, 100, 1e6]) near(Math.exp(solarZ(d, true)), d / UNITS_PER_AU * AU_LY, 1e-12); // real-scale mode is linear
  assert.equal(metricBlend(0), 0); // until the metric hand-over lands, the compressed rule holds everywhere
});

test('viewRate: the compressed region feels as fast as metric space, and the rate eases (no step) across the solar seam', () => {
  const [a, b] = SEAM_Z['solar>stars'];
  near(viewRate(a - 5), DIST_P + (1 - DIST_P) * metricBlend(a - 5)); near(viewRate(b + 0.1), 1); near(viewRate(3, true), 1);
  let prev = viewRate(a - 0.01); for (let z = a - 0.01; z <= b + 0.01; z += 0.005) { const v = viewRate(z); assert.ok(Math.abs(v - prev) < 0.01, `rate steps at ${z}`); prev = v; }
});
