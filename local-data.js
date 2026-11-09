// The Local Group: the Milky Way's neighbourhood of galaxies. Pure data and maths; see docs/sources.md.
// Scene units: 1 unit = 10,000 light-years (10 kly), so this scene is the Galaxy scene shrunk by 10.
// Frame: the Galaxy scene's (galactocentric, Sun at (−R0, 0, 0), +y = North Galactic Pole).
import { R0, toGalactic, galacticPosition } from './galaxy-data.js';

export const LOCAL_UNIT = 10; // kly per scene unit
const hms = (h, m, s) => 15 * (h + m / 60 + s / 3600), dms = (sg, d, m, s) => sg * (d + m / 60 + s / 3600);

// Distances (million light-years, from the Sun) from Wikipedia's "List of nearest galaxies" (read 9 Nov 2026).
// J2000 positions as catalogued (NED / Wikipedia; checked against HYG's deep-sky list where it has them).
// size: diameter in kly where it matters for drawing; i/pa: disc inclination and position angle (degrees).
export const GALAXIES = [
  { name: 'Andromeda Galaxy', short: 'Andromeda', alt: 'M31', kind: 'Spiral galaxy', type: 'SA(s)b', mly: 2.538, ra: hms(0, 42, 44.3), dec: dms(1, 41, 16, 9), size: 152, i: 77, pa: 35, rank: 1,
    stars: 'about 1 trillion', fact: 'The biggest galaxy in the Local Group, with about a trillion stars. On a dark night it is the farthest thing most people can see with their own eyes.' },
  { name: 'Triangulum Galaxy', short: 'Triangulum', alt: 'M33', kind: 'Spiral galaxy', type: 'SA(s)cd', mly: 2.73, ra: hms(1, 33, 50.9), dec: dms(1, 30, 39, 37), size: 61, i: 54, pa: 23, rank: 2,
    stars: 'about 40 billion', fact: 'The third-largest galaxy in the Local Group, with about 40 billion stars. It is probably a companion of Andromeda.' },
  { name: 'Large Magellanic Cloud', short: 'LMC', kind: 'Dwarf irregular galaxy', type: 'SB(s)m', mly: 0.163, ra: hms(5, 23, 34.5), dec: dms(-1, 69, 45, 22), size: 32, blob: true, rank: 3,
    stars: 'about 20 billion', fact: 'The biggest of the Milky Way’s companions, easy to see from the southern hemisphere. It is predicted to merge with the Milky Way in about 2.4 billion years.' },
  { name: 'Small Magellanic Cloud', short: 'SMC', kind: 'Dwarf irregular galaxy', type: 'SB(s)m pec', mly: 0.205, ra: hms(0, 52, 44.8), dec: dms(-1, 72, 49, 43), size: 19, blob: true, rank: 4,
    stars: 'a few billion', fact: 'The Large Cloud’s smaller partner, also visible to the naked eye from the south, slowly being pulled apart by its two bigger neighbours.' },
  { name: 'Sagittarius Dwarf', kind: 'Dwarf spheroidal galaxy', type: 'dSph/E7', mly: 0.078, ra: hms(18, 55, 19.5), dec: dms(-1, 30, 32, 43), rank: 5,
    fact: 'The closest known galaxy, on the far side of the Milky Way’s centre. The Milky Way is tearing it apart: its stars stretch in a stream all the way around our Galaxy.' },
  { name: 'M32', kind: 'Dwarf elliptical galaxy', type: 'E2', mly: 2.489, ra: hms(0, 42, 41.8), dec: dms(1, 40, 51, 55), rank: 9, fact: 'A small, dense galaxy right next to Andromeda, probably stripped by it.' },
  { name: 'M110', kind: 'Dwarf elliptical galaxy', type: 'E6p', mly: 2.67, ra: hms(0, 40, 22.1), dec: dms(1, 41, 41, 7), rank: 9, fact: 'One of Andromeda’s brighter companions.' },
  { name: 'NGC 147', kind: 'Dwarf spheroidal galaxy', type: 'dE5 pec', mly: 2.53, ra: hms(0, 33, 12.1), dec: dms(1, 48, 30, 32), rank: 10 },
  { name: 'NGC 185', kind: 'Dwarf spheroidal galaxy', type: 'dE3 pec', mly: 2.05, ra: hms(0, 38, 58.0), dec: dms(1, 48, 20, 15), rank: 10 },
  { name: 'IC 10', kind: 'Dwarf irregular galaxy', type: 'dIrr IV/BCD', mly: 2.446, ra: hms(0, 20, 17.3), dec: dms(1, 59, 18, 14), rank: 10, fact: 'A small galaxy bursting with new stars, hidden behind the Milky Way’s dust.' },
  { name: 'Barnard’s Galaxy', alt: 'NGC 6822', kind: 'Dwarf irregular galaxy', type: 'IB(s)m', mly: 1.859, ra: hms(19, 44, 56.6), dec: dms(-1, 14, 47, 21), rank: 7 },
  { name: 'IC 1613', kind: 'Dwarf irregular galaxy', type: 'IAB(s)m', mly: 2.24, ra: hms(1, 4, 47.8), dec: dms(1, 2, 7, 4), rank: 10 },
  { name: 'WLM', kind: 'Dwarf irregular galaxy', type: 'IB(s)m', mly: 3.043, ra: hms(0, 1, 58.1), dec: dms(-1, 15, 27, 39), rank: 10, fact: 'A lonely dwarf galaxy at the edge of the Local Group.' },
  { name: 'Leo I', kind: 'Dwarf spheroidal galaxy', type: 'dE3', mly: 0.82, ra: hms(10, 8, 27.4), dec: dms(1, 12, 18, 27), rank: 8, fact: 'One of the most distant of the Milky Way’s companions, moving so fast it may only be passing through.' },
  { name: 'Leo II', kind: 'Dwarf spheroidal galaxy', type: 'dE0 pec', mly: 0.701, ra: hms(11, 13, 28.8), dec: dms(1, 22, 9, 6), rank: 11 },
  { name: 'Leo A', kind: 'Dwarf irregular galaxy', type: 'IBm', mly: 2.34, ra: hms(9, 59, 26.5), dec: dms(1, 30, 44, 47), rank: 11 },
  { name: 'Fornax Dwarf', kind: 'Dwarf spheroidal galaxy', type: 'dSph/E2', mly: 0.466, ra: hms(2, 39, 59.3), dec: dms(-1, 34, 26, 57), rank: 6, fact: 'A dwarf galaxy with its own six globular star clusters.' },
  { name: 'Sculptor Dwarf', kind: 'Dwarf spheroidal galaxy', type: 'dE3', mly: 0.287, ra: hms(1, 0, 9.4), dec: dms(-1, 33, 42, 33), rank: 8 },
  { name: 'Sextans Dwarf', kind: 'Dwarf spheroidal galaxy', type: 'dSph', mly: 0.28, ra: hms(10, 13, 3.0), dec: dms(-1, 1, 36, 53), rank: 11 },
  { name: 'Carina Dwarf', kind: 'Dwarf spheroidal galaxy', type: 'dE3', mly: 0.33, ra: hms(6, 41, 36.7), dec: dms(-1, 50, 57, 58), rank: 11 },
  { name: 'Draco Dwarf', kind: 'Dwarf spheroidal galaxy', type: 'dE0 pec', mly: 0.258, ra: hms(17, 20, 12.4), dec: dms(1, 57, 54, 55), rank: 9, fact: 'A faint dwarf galaxy thought to be made mostly of dark matter.' },
  { name: 'Ursa Minor Dwarf', kind: 'Dwarf spheroidal galaxy', type: 'dE4', mly: 0.205, ra: hms(15, 9, 8.5), dec: dms(1, 67, 13, 21), rank: 11 },
  { name: 'Phoenix Dwarf', kind: 'Dwarf irregular galaxy', type: 'IAm', mly: 1.44, ra: hms(1, 51, 6.3), dec: dms(-1, 44, 26, 41), rank: 11 },
  { name: 'Pegasus Dwarf', kind: 'Dwarf irregular galaxy', type: 'dIrr/dSph', mly: 2.929, ra: hms(23, 28, 36.2), dec: dms(1, 14, 44, 35), rank: 11 },
  { name: 'Tucana Dwarf', kind: 'Dwarf spheroidal galaxy', type: 'dE5', mly: 2.87, ra: hms(22, 41, 49.6), dec: dms(-1, 64, 25, 10), rank: 11 },
  { name: 'Cetus Dwarf', kind: 'Dwarf spheroidal galaxy', type: 'dSph/E4', mly: 2.46, ra: hms(0, 26, 11.0), dec: dms(-1, 11, 2, 40), rank: 11 },
].map(g => { const [l, b] = toGalactic(g.ra, g.dec); return { ...g, l, b, pos: galacticPosition(l, b, g.mly * 1000).map(v => v / LOCAL_UNIT) }; });

// Unit vector in the scene frame for a direction given in equatorial coordinates (x, y, z).
function eqToScene(v) {
  const n = Math.hypot(...v), ra = Math.atan2(v[1], v[0]) * 180 / Math.PI, dec = Math.asin(v[2] / n) * 180 / Math.PI;
  const [l, b] = toGalactic((ra + 360) % 360, dec), p = galacticPosition(l, b, 1);
  return [p[0] + R0, p[1], p[2]];
}
// A disc's orientation: its major axis and its normal, from position angle (north through east) and
// inclination (0 = face on). Returned as scene-frame unit vectors.
export function discAxes(g) {
  const a = g.ra * Math.PI / 180, d = g.dec * Math.PI / 180, pa = g.pa * Math.PI / 180, inc = g.i * Math.PI / 180;
  const r = [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)], east = [-Math.sin(a), Math.cos(a), 0], north = [-Math.sin(d) * Math.cos(a), -Math.sin(d) * Math.sin(a), Math.cos(d)];
  const major = [0, 1, 2].map(k => Math.cos(pa) * north[k] + Math.sin(pa) * east[k]);
  const minorSky = [0, 1, 2].map(k => -Math.sin(pa) * north[k] + Math.cos(pa) * east[k]);
  const normal = [0, 1, 2].map(k => Math.cos(inc) * r[k] + Math.sin(inc) * minorSky[k]);
  return { major: eqToScene(major), normal: eqToScene(normal) };
}
export const distanceBetween = (a, b) => Math.hypot(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1], a.pos[2] - b.pos[2]) * LOCAL_UNIT; // kly

// Reproducible particles for a spiral seen from above, in its own plane (x along the major axis, y in-plane, z out).
function rng(seed) { let x = seed >>> 0; return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296); }
const gauss = r => Math.sqrt(-2 * Math.log(1 - r() * 0.999999)) * Math.cos(2 * Math.PI * r());
export function spiralParticles(radius, n, seed, { arms = 2, pitch = 13, bulge = 0.18 } = {}) {
  const r = rng(seed), out = [], col = [], k = 1 / Math.tan(pitch * Math.PI / 180);
  for (let i = 0; i < n; i++) {
    let x, y, z, c;
    if (r() < bulge) { x = gauss(r) * radius * 0.12; y = gauss(r) * radius * 0.12; z = gauss(r) * radius * 0.06; const v = 0.6 + r() * 0.3; c = [v, v * 0.85, v * 0.62]; }
    else {
      const R = radius * Math.min(1, 0.12 + -0.32 * Math.log(1 - r() * 0.95)), onArm = r() < 0.7;
      const theta = onArm ? Math.log(R / (radius * 0.12)) * k + (Math.floor(r() * arms) * 2 * Math.PI / arms) + gauss(r) * 0.22 : r() * Math.PI * 2;
      x = R * Math.cos(theta); y = R * Math.sin(theta); z = gauss(r) * radius * 0.015; const v = 0.55 + r() * 0.4; c = onArm ? [0.72 * v, 0.8 * v, v] : [v, 0.9 * v, 0.75 * v];
    }
    out.push(x, y, z); col.push(...c);
  }
  return { positions: out, colors: col };
}
export const LOCAL_FACTS = { width: 'roughly 10–17 million (it depends where the edge is drawn)', members: 'more than 100 known', mass: 'about 2 trillion Suns' };
