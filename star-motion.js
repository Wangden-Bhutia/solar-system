// How the nearby stars move. Pure data and maths; see docs/sources.md ("Nearby stars in motion").
//
// Each star has a proper motion (its drift across our sky, mas/yr; RA component already × cos Dec) and a
// radial velocity (km/s, + = moving away). Together with its distance they give a 3D velocity relative to
// the Sun. Over the ±100,000 years shown, the paths are close to straight lines, so positions are
// p(t) = p₀ + v·t. Published close approaches (Bailer-Jones et al., via Wikipedia's "List of nearest
// stars") are reproduced to within a few per cent in tests.
//
// Sources per star: W = the star's Wikipedia infobox (Gaia DR3 / SIMBAD values), read 9 Nov 2026;
// H = HYG database v4.1 (Hipparcos proper motions, Gliese-catalogue radial velocities; CC BY-SA 4.0).
// rv null = never measured (mostly cold brown dwarfs): drawn with sideways drift only, and marked as such.
import { starPosition } from './stars-data.js';

export const MOTION = {
  'Alpha Centauri': [-3781.741, 769.465, -22.204, 'W'],   // Proxima Centauri, the system's nearest member
  "Barnard's Star": [-801.551, 10362.394, -110.47, 'W'],
  'Luhman 16': [-2768.511, 358.472, 23.1, 'W'],
  'WISE 0855−0714': [-8123.7, 673.2, null, 'W'],
  'Wolf 359': [-3866.338, -2699.215, 19, 'W'],
  'Lalande 21185': [-580.057, -4776.589, -85.11, 'W'],
  'Sirius': [-546.01, -1223.07, -5.5, 'W'],
  'Gliese 65': [3385.316, 544.386, 29.0, 'W'],            // RV from HYG (not in the infobox)
  'Ross 154': [639.368, -193.958, -11.12, 'W'],
  'Ross 248': [112.527, -1591.65, -77.29, 'W'],
  'Epsilon Eridani': [-975.17, 19.49, 16.376, 'W'],
  'Lacaille 9352': [6767.26, 1326.66, 9.5, 'H'],
  'Ross 128': [605.62, -1219.23, -31.1, 'H'],
  'EZ Aquarii': [2361.37, 2233.03, -60.0, 'H'],
  '61 Cygni': [4155.1, 3258.9, -64.8, 'H'],
  'Procyon': [-716.57, -1034.58, -4.0, 'H'],
  'Struve 2398': [-1326.88, 1802.12, -0.8, 'H'],
  'Groombridge 34': [2888.92, 410.58, 12.0, 'H'],
  'DX Cancri': [-1141.11, -601.64, -5.0, 'H'],
  'Epsilon Indi': [3959.97, -2538.84, -40.4, 'H'],
  'Tau Ceti': [-1721.82, 854.07, -17.0, 'H'],
  'GJ 1061': [745.654, -373.323, 1.49, 'W'],
  'YZ Ceti': [1210.09, 646.95, 28.0, 'H'],
  "Luyten's Star": [571.27, -3694.25, 18.2, 'H'],
  "Teegarden's Star": [3429.083, -3805.541, 68.3, 'W'],
  "Kapteyn's Star": [6491.223, -5708.614, 245.05, 'W'],
  'Lacaille 8760': [-3259.0, -1146.99, 28.2, 'H'],
  'SCR 1845−6357': [2583.19, 588.504, null, 'W'],
  'Kruger 60': [-870.23, -471.1, -33.3, 'H'],
  'DENIS J1048−3956': [-1179.311, -988.121, -11, 'W'],
  'Ross 614': [694.73, -618.62, 16.7, 'H'],
  'UGPS J0722−0540': [-904.14, 352.025, 46.9, 'W'],
  'Wolf 1061': [-93.61, -1184.9, -13.0, 'H'],
  "Van Maanen's Star": [1233.05, -2710.56, 54.0, 'H'],
  'Gliese 1': [5634.07, -2337.94, 22.9, 'H'],
  'TZ Arietis': [1113.71, -1768.54, -31.0, 'H'],
  'Wolf 424': [-1795.661, 217.789, -2, 'W'],
  'Gliese 687': [-320.47, -1269.55, -23.2, 'H'],
  'Gliese 674': [573.32, -879.84, -10.2, 'H'],
  'LHS 292': [601.06, -1525.88, -7.0, 'H'],
  'Gliese 440': [2661.64, -344.933, null, 'W'],
  'GJ 1245': [349.363, -480.322, 3.93, 'W'],
  'WISE 1741+2553': [-512.2, -1478.8, null, 'W'],
  'Gliese 876': [960.33, -675.64, -1.5, 'H'],
  'WISE 1639−6847': [576.94, -3108.48, null, 'W'],
  'LHS 288': [-346.208, 1611.1, null, 'W'],              // SIMBAD lists 155.6 km/s with no cited source; no published encounter uses it, so treated as unmeasured
  'GJ 1002': [-816.71, -1869.38, -42.0, 'H'],
  'DENIS 0255−4700': [1012.445, -554.031, null, 'W'],
  'Groombridge 1618': [-1361.55, -505.0, -25.4, 'H'],
  'Gliese 412': [-4410.79, 943.32, 68.8, 'H'],
  'TRAPPIST-1': [930.788, -479.038, -52.97, 'W'],
  // Passing stars, beyond 16 light-years today but famous for close encounters (all W):
  'Gliese 445': [748.418, 480.804, -111.5, 'W'],
  "Scholz's Star": [-40.3, -114.8, 82.4, 'W'],
  'Gliese 710': [-0.414, -0.108, -13.905, 'W'],
};

// Passing stars, in the same shape as SYSTEMS in stars-data.js (positions from each Wikipedia infobox, J2000).
const hms = (h, m, s) => 15 * (h + m / 60 + s / 3600), dms = (sg, d, m, s) => sg * (d + m / 60 + s / 3600);
export const VISITORS = [
  { name: 'Gliese 445', stars: [{ name: 'Gliese 445', type: 'M4.0Ve', mag: 10.8 }], ly: 17.137, ra: hms(11, 47, 41.3869), dec: dms(1, 78, 41, 28.176), visitor: true,
    fact: 'A small red dwarf heading our way at 111 km/s. In about 46,000 years it will be one of the closest stars to the Sun.' },
  { name: "Scholz's Star", stars: [{ name: "Scholz's Star", type: 'M9.5', mag: 18.3 }, { name: "Scholz's Star B", type: 'T5.5', mag: null }], ly: 22.2, ra: hms(7, 20, 3.254), dec: dms(-1, 8, 46, 49.9), visitor: true,
    fact: 'A dim red dwarf and brown dwarf that brushed past the Solar System about 80,000 years ago, closer than any star today.' },
  { name: 'Gliese 710', stars: [{ name: 'Gliese 710', type: 'K7V', mag: 9.67 }], ly: 62.25, ra: hms(18, 19, 50.8412), dec: dms(-1, 1, 56, 19.005), visitor: true,
    fact: 'Heading almost straight at us. In about 1.3 million years it will pass through the Oort Cloud, the Sun’s outermost comets.' },
];

// Velocity in the scene frame (light-years per year), from proper motion, radial velocity and distance.
const KMS = 1 / 977792.2 * 3.26156; // 1 km/s in ly per year (1 km/s = 1.0227 pc per Myr)
const rad = d => d * Math.PI / 180;
export function starVelocity(raDeg, decDeg, ly, pmRa, pmDec, rv) {
  const a = rad(raDeg), d = rad(decDeg), pc = ly / 3.26156;
  const va = 4.74047 * pmRa / 1000 * pc, vd = 4.74047 * pmDec / 1000 * pc, vr = rv ?? 0; // km/s
  // Equatorial unit vectors: towards the star, towards increasing RA, towards increasing Dec.
  const r = [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)], ea = [-Math.sin(a), Math.cos(a), 0], ed = [-Math.sin(d) * Math.cos(a), -Math.sin(d) * Math.sin(a), Math.cos(d)];
  const v = [0, 1, 2].map(i => (vr * r[i] + va * ea[i] + vd * ed[i]) * KMS);
  // Same rotation as starPosition: re-use it on the direction of v (distance 1 ly).
  const len = Math.hypot(...v); if (!len) return [0, 0, 0];
  const dec2 = Math.asin(v[2] / len) * 180 / Math.PI, ra2 = Math.atan2(v[1], v[0]) * 180 / Math.PI;
  return starPosition(ra2, dec2, len);
}
export const speedKms = (pmRa, pmDec, rv, ly) => Math.hypot(4.74047 * Math.hypot(pmRa, pmDec) / 1000 * ly / 3.26156, rv ?? 0);

// Attach motion to an entry from stars-data.js: velocity, and its closest approach to the Sun.
export function withMotion(entry) {
  const m = MOTION[entry.name]; if (!m) return { ...entry, vel: [0, 0, 0], motion: null };
  const [pmRa, pmDec, rv, src] = m, vel = starVelocity(entry.ra, entry.dec, entry.ly, pmRa, pmDec, rv);
  const v2 = vel[0] ** 2 + vel[1] ** 2 + vel[2] ** 2, p = entry.pos, tMin = v2 ? -(p[0] * vel[0] + p[1] * vel[1] + p[2] * vel[2]) / v2 : 0;
  const close = { years: tMin, ly: Math.hypot(...positionAt({ pos: p, vel }, tMin)) };
  return { ...entry, vel, motion: { pmRa, pmDec, rv, src, kms: speedKms(pmRa, pmDec, rv, entry.ly), close, rvKnown: rv != null } };
}
export const positionAt = (e, years) => [e.pos[0] + e.vel[0] * years, e.pos[1] + e.vel[1] * years, e.pos[2] + e.vel[2] * years];
export const distanceAt = (e, years) => Math.hypot(...positionAt(e, years));
// The nearest star (system) to the Sun at a given time.
export function nearestAt(entries, years) {
  let best = null, bd = Infinity;
  for (const e of entries) { const d = distanceAt(e, years); if (d < bd) { bd = d; best = e; } }
  return { entry: best, ly: bd };
}
// Who is nearest, era by era, between two times: [{ name, from, to }]. Sampled every `step` years.
export function nearestTimeline(entries, from, to, step = 100) {
  const out = [];
  for (let t = from; t <= to; t += step) { const n = nearestAt(entries, t).entry.name; if (!out.length || out.at(-1).name !== n) out.push({ name: n, from: t, to: t }); else out.at(-1).to = t; }
  return out;
}

// The clock for the star map, in years from today.
export const STAR_TIME = [-100000, 100000];
export const YEARS_PER_SEC = 2000;          // ±100,000 years in 50 seconds each way
const fmt = n => Math.round(n).toLocaleString('en-IN');
export function yearsLabel(t) {
  if (Math.abs(t) < 50) return 'Today';
  const a = Math.abs(t), s = a >= 1e6 ? `${(a / 1e6).toFixed(2).replace(/\.?0+$/, '')} million years` : `${fmt(Math.round(a / 100) * 100)} years`;
  return t < 0 ? `${s} ago` : `${s} from now`;
}
// Name a star's closest approach in words, e.g. "in about 36,500 years, 3.0 light-years away".
export function approachLabel(close) {
  const a = Math.abs(close.years), when = a < 500 ? 'about now' : a >= 1e6 ? `${(a / 1e6).toFixed(1)} million years` : `${fmt(Math.round(a / 100) * 100)} years`;
  const at = `${close.ly < 1 ? close.ly.toFixed(2) : close.ly.toFixed(1)} light-years away`;
  return a < 500 ? `About now, ${at}` : close.years < 0 ? `${when} ago, ${at}` : `In ${when}, ${at}`;
}
