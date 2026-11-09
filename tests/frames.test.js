// The ecliptic ⇄ galactic scene-frame rotation (frames.js) agrees with the scenes' own position functions.
import test from 'node:test';import assert from 'node:assert/strict';
import { GAL_FROM_ECL, eclToGal, galToEcl, frameOf, seamUp } from '../frames.js';
import { starPosition } from '../stars-data.js';
import { toGalactic, galacticPosition, R0 } from '../galaxy-data.js';
const near = (a, b, e) => assert.ok(Math.abs(a - b) <= e, `${a} ≈ ${b}`);
test('GAL_FROM_ECL is a proper rotation (orthonormal, det +1)', () => {
  const m = GAL_FROM_ECL;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let d = 0; for (let k = 0; k < 3; k++) d += m[i * 3 + k] * m[j * 3 + k]; near(d, i === j ? 1 : 0, 1e-12); }
  const det = m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]); near(det, 1, 1e-12);
});
test('Sirius: the star map position rotated into the galactic frame is the Milky Way position minus the Sun (l 227.23°, b −8.89°)', () => {
  const [ra, dec, ly] = [101.2872, -16.7161, 8.6], [l, b] = toGalactic(ra, dec);
  near(l, 227.23, 0.02); near(b, -8.89, 0.02);
  const p = starPosition(ra, dec, ly), g = eclToGal({ x: p[0], y: p[1], z: p[2] }), q = galacticPosition(l, b, ly / 1000);
  near(g.x, (q[0] + R0) * 1000, 1e-6); near(g.y, q[1] * 1000, 1e-6); near(g.z, q[2] * 1000, 1e-6);
  const back = galToEcl(g); near(back.x, p[0], 1e-9); near(back.y, p[1], 1e-9); near(back.z, p[2], 1e-9);
  const v = { x: p[0], y: p[1], z: p[2] }; eclToGal(v, v); near(v.x, g.x, 1e-12); // safe in place
});
test('frames per level and the shared camera up across the stars ⇄ Milky Way seam', () => {
  assert.deepEqual(['solar', 'stars', 'galaxy', 'local', 'super', 'universe'].map(frameOf), ['ecl', 'ecl', 'gal', 'gal', 'gal', 'gal']);
  const u0 = galToEcl(seamUp(0)); near(u0.x, 0, 1e-12); near(u0.y, 1, 1e-12); near(u0.z, 0, 1e-12);
  const u1 = seamUp(1); near(u1.x, 0, 1e-12); near(u1.y, 1, 1e-12); near(u1.z, 0, 1e-12);
  let prev = seamUp(0); for (let t = 0.05; t <= 1.0001; t += 0.05) { const u = seamUp(t); near(Math.hypot(u.x, u.y, u.z), 1, 1e-12); assert.ok(Math.acos(Math.min(1, u.x * prev.x + u.y * prev.y + u.z * prev.z)) < 0.2, 'turns smoothly'); prev = u; }
});
