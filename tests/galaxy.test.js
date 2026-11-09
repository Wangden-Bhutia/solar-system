import test from 'node:test'; import assert from 'node:assert/strict';
import * as G from '../galaxy-data.js';
const near = (a, b, e) => assert.ok(Math.abs(a - b) < e, `${a} vs ${b}`);
test('galactic coordinates: known objects land where catalogues put them; Sgr A* at the centre', () => {
  const by = n => G.LANDMARKS.find(m => m.name === n);
  for (const [n, l, b] of [['Orion Nebula', 209.0, -19.4], ['Pleiades', 166.6, -23.5], ['Crab Nebula', 184.6, -5.8], ['Eagle Nebula', 17.0, 0.8], ['Carina Nebula', 287.6, -0.6], ['Omega Centauri', 309.1, 15.0]]) { near(by(n).l, l, 0.25); near(by(n).b, b, 0.25); }
  assert.ok(Math.hypot(...by('Sagittarius A*').pos) < 0.05, 'the black hole sits at the galactic centre');
  assert.deepEqual(by('Sun').pos, [-G.R0, 0, 0]); near(G.R0, 27.0, 0.01);
  near(Math.hypot(...by('Carina Nebula').pos.map((v, i) => v - by('Sun').pos[i])), 8.5, 1e-9);
});
test('spiral arms: Sagittarius–Carina inside the Sun’s orbit, Perseus outside, the Orion Spur passes by the Sun', () => {
  const at0 = n => G.armRadius(G.ARMS.find(a => a.name === n), 0);
  assert.ok(at0('Sagittarius–Carina') < G.R0 - 2 && at0('Sagittarius–Carina') > G.R0 - 7);
  assert.ok(at0('Perseus') > G.R0 + 3 && at0('Perseus') < G.R0 + 10);
  near(at0('Orion Spur'), G.R0, 2);
  for (const a of G.ARMS) assert.ok(G.armPoints(a).length > 20, a.name);
});
test('particles: reproducible, centred, a thin disc', () => {
  const p = G.galaxyParticles({ bulge: 2000, disc: 3000, arm: 5000 }), n = p.positions.length / 3;
  assert.ok(n > 9000); assert.deepEqual(Array.from(G.galaxyParticles({ bulge: 2000, disc: 3000, arm: 5000 }).positions.slice(0, 9)), Array.from(p.positions.slice(0, 9)));
  let maxR = 0, sumH = 0; for (let i = 0; i < n; i++) { maxR = Math.max(maxR, Math.hypot(p.positions[i * 3], p.positions[i * 3 + 2])); sumH += Math.abs(p.positions[i * 3 + 1]); }
  assert.ok(maxR < 62, `radius ${maxR}`); assert.ok(sumH / n < 1.5, 'thin');
});
