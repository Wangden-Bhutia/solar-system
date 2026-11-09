// The two coordinate frames of the zoom, and the rotation between them (pure; no THREE).
//  - Ecliptic scene frame (Solar System, nearby stars): x toward the March equinox, y toward the ecliptic
//    north pole, z = −(ecliptic y): stars-data.js starPosition.
//  - Galactic scene frame (Milky Way, Local Group, Laniakea, universe): x toward the Galactic Centre, y toward
//    the north Galactic pole, z = −(toward l = 90°): galaxy-data.js galacticPosition (Sun at (−R0, 0, 0) kly).
// GAL_FROM_ECL rotates an ecliptic-frame direction into the galactic frame. It is derived here from the same two
// functions the scenes use (so it agrees with them exactly), from three sky directions, then orthonormalised.
import { starPosition } from './stars-data.js';
import { toGalactic, galacticPosition, R0 } from './galaxy-data.js';
const dirEcl = (ra, dec) => starPosition(ra, dec, 1);
const dirGal = (ra, dec) => { const [l, b] = toGalactic(ra, dec), p = galacticPosition(l, b, 1); return [p[0] + R0, p[1], p[2]]; };
const det3 = m => m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
function inv3(m) { const d = det3(m), r = [
  m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
  m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
  m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3]]; return r.map(v => v / d); }
const mul3 = (a, b) => { const r = new Array(9).fill(0); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) r[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j]; return r; };
function orthonormal(m) { // Gram–Schmidt on the columns
  const col = j => [m[j], m[3 + j], m[6 + j]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], nrm = a => { const l = Math.hypot(...a); return a.map(v => v / l); };
  const c0 = nrm(col(0)); let c1 = col(1); const d = dot(c1, c0); c1 = nrm(c1.map((v, i) => v - d * c0[i]));
  const c2 = [c0[1] * c1[2] - c0[2] * c1[1], c0[2] * c1[0] - c0[0] * c1[2], c0[0] * c1[1] - c0[1] * c1[0]];
  return [c0[0], c1[0], c2[0], c0[1], c1[1], c2[1], c0[2], c1[2], c2[2]];
}
const SAMPLES = [[0, 0], [90, 0], [0, 90]];
const S = [], G = [];
{ const s = SAMPLES.map(([a, d]) => dirEcl(a, d)), g = SAMPLES.map(([a, d]) => dirGal(a, d));
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { S[i * 3 + j] = s[j][i]; G[i * 3 + j] = g[j][i]; } }
// Row-major 3×3: v_gal = GAL_FROM_ECL · v_ecl.
export const GAL_FROM_ECL = Object.freeze(orthonormal(mul3(G, inv3(S))));
export function eclToGal(v, out = { x: 0, y: 0, z: 0 }) { const m = GAL_FROM_ECL, x = v.x, y = v.y, z = v.z; out.x = m[0] * x + m[1] * y + m[2] * z; out.y = m[3] * x + m[4] * y + m[5] * z; out.z = m[6] * x + m[7] * y + m[8] * z; return out; }
export function galToEcl(v, out = { x: 0, y: 0, z: 0 }) { const m = GAL_FROM_ECL, x = v.x, y = v.y, z = v.z; out.x = m[0] * x + m[3] * y + m[6] * z; out.y = m[1] * x + m[4] * y + m[7] * z; out.z = m[2] * x + m[5] * y + m[8] * z; return out; }
// The frame a level's scene is drawn in.
export const frameOf = level => level === 'solar' || level === 'stars' ? 'ecl' : 'gal';
// Camera "up" across the stars ⇄ Milky Way seam, as a galactic-frame vector: the ecliptic pole at t = 0 (so the
// star map keeps its own up), the Galactic pole at t = 1 (so the Galaxy keeps its own), turning smoothly between.
// Both cameras use this same up (each in its own frame), so the two pictures stay aligned on screen.
const ECL_UP_IN_GAL = eclToGal({ x: 0, y: 1, z: 0 });
export function seamUp(t, out = { x: 0, y: 0, z: 0 }) {
  const k = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  out.x = ECL_UP_IN_GAL.x * (1 - k); out.y = ECL_UP_IN_GAL.y * (1 - k) + k; out.z = ECL_UP_IN_GAL.z * (1 - k);
  const l = Math.hypot(out.x, out.y, out.z); out.x /= l; out.y /= l; out.z /= l; return out;
}
