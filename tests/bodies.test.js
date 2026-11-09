import test from 'node:test'; import assert from 'node:assert/strict';
import { DWARFS, MOONS, PLANETS, keplerPosition, beltElements, KIRKWOOD } from '../data.js';
const near = (a, b, e) => assert.ok(Math.abs(a - b) < e, `${a} vs ${b}`);
const r = v => Math.hypot(...v);

test('Kepler orbits: perihelion a(1−e), aphelion a(1+e), tilt shows as height; Pluto dips inside Neptune', () => {
  for (const d of DWARFS) {
    let lo = 1e9, hi = 0, h = 0;
    for (let k = 0; k < 2000; k++) { const v = keplerPosition(d, k / 2000 * 2 * Math.PI); lo = Math.min(lo, r(v)); hi = Math.max(hi, r(v)); h = Math.max(h, Math.abs(v[1])); }
    near(lo, d.a * (1 - d.e), 1e-3 * d.a); near(hi, d.a * (1 + d.e), 1e-3 * d.a);
    assert.ok(h <= d.a * (1 + d.e) * Math.sin(d.i * Math.PI / 180) + 1e-6 && h > 0.5 * d.a * (1 - d.e) * Math.sin(d.i * Math.PI / 180), d.name);
  }
  const pluto = DWARFS.find(d => d.name === 'Pluto'), neptune = PLANETS.find(p => p.name === 'Neptune');
  assert.ok(pluto.a * (1 - pluto.e) < neptune.au, 'Pluto’s perihelion is inside Neptune’s orbit');
  // Ecliptic orientation: an orbit with no tilt stays flat; prograde orbits go the same way round as the planets.
  const flat = { a: 1, e: 0, i: 0, om: 0, w: 0 }; for (let k = 0; k < 8; k++) near(keplerPosition(flat, k)[1], 0, 1e-12);
  const p0 = keplerPosition(flat, 0), p1 = keplerPosition(flat, 0.1); assert.ok(p0[0] * p1[2] - p0[2] * p1[0] < 0, 'counter-clockwise from above, like the planets (scene uses −z)');
});

test('dwarf planets and asteroids: sizes, kinds, facts; Charon orbits Pluto; Haumea is elongated', () => {
  assert.deepEqual(DWARFS.map(d => d.name), ['Ceres', 'Vesta', 'Pallas', 'Pluto', 'Haumea', 'Makemake', 'Eris']);
  for (const d of DWARFS) { assert.ok(d.size > 0 && d.facts.length === 5 && d.fact, d.name); assert.ok(['Dwarf planet', 'Asteroid'].includes(d.kind)); }
  assert.ok(DWARFS.find(d => d.name === 'Eris').i > 40); assert.ok(DWARFS.find(d => d.name === 'Haumea').shape[2] < 0.6);
  const charon = MOONS.find(m => m.name === 'Charon'); assert.equal(charon.parent, 'Pluto'); near(charon.km / DWARFS.find(d => d.name === 'Pluto').km, 0.51, 0.01);
});

test('asteroid belt: between the 4:1 and 2:1 resonances, Kirkwood gaps empty, typical tilts; Kuiper belt and plutinos', () => {
  const ast = beltElements('asteroid', 4000), kb = beltElements('kuiper', 1600);
  assert.equal(ast.length, 4000); assert.ok(ast.every(o => o.a >= 2.06 && o.a <= 3.28));
  for (const [g, h] of KIRKWOOD) assert.equal(ast.filter(o => Math.abs(o.a - g) < h).length, 0, `gap at ${g} AU`);
  const flank = ast.filter(o => Math.abs(o.a - 2.6) < 0.03).length; assert.ok(flank > 50, 'beside the gaps the belt is populated');
  const meanI = ast.reduce((s, o) => s + o.i, 0) / ast.length; assert.ok(meanI > 6 && meanI < 11, `mean tilt ${meanI.toFixed(1)}°`);
  assert.ok(kb.every(o => o.a >= 39 && o.a <= 47.5)); const plutinos = kb.filter(o => Math.abs(o.a - 39.4) < 0.3).length; assert.ok(plutinos > 250 && plutinos < 550, `${plutinos}`);
  assert.deepEqual(beltElements('asteroid', 3)[1], beltElements('asteroid', 3)[1], 'reproducible');
});
