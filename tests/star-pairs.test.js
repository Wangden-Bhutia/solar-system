import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../star-pairs.js';
import { NEIGHBOURS } from '../stars-data.js';

test('every pair belongs to a system on the map and names two of its stars', () => {
  for (const [name, p] of Object.entries(P.PAIRS)) { const e = NEIGHBOURS.find(x => x.name === name); assert.ok(e, name); for (const s of [p.A, p.B]) assert.ok(e.stars.some(x => x.name === s), `${name}: ${s}`); }
});
test('published elements are self-consistent: Kepler’s third law gives the measured total mass (within 1%)', () => {
  for (const [name, p] of Object.entries(P.PAIRS)) assert.ok(Math.abs(P.keplerMass(p) / (p.mA + p.mB) - 1) < 0.01, name);
});
test('Kepler’s equation and the orbit: closest at periastron, farthest half a lap later, centre of mass fixed', () => {
  const p = P.PAIRS.Sirius;
  assert.ok(Math.abs(P.pairState(p, p.T0).sep - P.periastron(p)) < 1e-9);
  assert.ok(Math.abs(P.pairState(p, p.T0 + p.P / 2).sep - P.apastron(p)) < 1e-9);
  for (let y = 2000; y < 2060; y += 3.7) { const s = P.pairState(p, y); assert.ok(Math.abs(s.A[0] * p.mA + s.B[0] * p.mB) < 1e-9 && Math.abs(s.A[1] * p.mA + s.B[1] * p.mB) < 1e-9); assert.ok(Math.abs(Math.hypot(s.B[0] - s.A[0], s.B[1] - s.A[1]) - s.sep) < 1e-9); }
  for (const M of [0.1, 1, 3, 6]) for (const e of [0, 0.5, 0.95]) { const E = P.eccentricAnomaly(M, e); assert.ok(Math.abs(E - e * Math.sin(E) - M) < 1e-9); }
});
test('real dates: Alpha Centauri A and B are next closest in 2035, Sirius in 2044; the separations match the published ranges', () => {
  assert.equal(Math.floor(P.nextPeriastron(P.PAIRS['Alpha Centauri'], 2026.9)), 2035);
  assert.equal(Math.floor(P.nextPeriastron(P.PAIRS.Sirius, 2026.9)), 2044);
  assert.ok(Math.abs(P.periastron(P.PAIRS.Sirius) - 8.2) < 0.15 && Math.abs(P.apastron(P.PAIRS.Sirius) - 31.5) < 0.1, 'Sirius: 8.2 to 31.5 AU');
  assert.equal(P.nextPeriastron(P.PAIRS['Epsilon Indi'], 2026), null, 'unknown periastron date stays unknown');
});
test('comparison orbits are of similar size to the pair', () => {
  assert.deepEqual(P.compareOrbits(P.PAIRS['Alpha Centauri']).map(x => x[0]), ['Uranus’s orbit', 'Neptune’s orbit']);
  assert.deepEqual(P.compareOrbits(P.PAIRS['Luhman 16']).map(x => x[0]), ['Mars’s orbit', 'Jupiter’s orbit']);
});
