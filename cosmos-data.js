// The two largest scales: our supercluster (Laniakea) and the observable universe. Pure data and maths;
// see docs/sources.md ("Laniakea" and "The observable universe"). Positions use the Galaxy scene's frame
// (galactocentric, +y = North Galactic Pole), converted from RA/Dec and distance.
import { toGalactic, galacticPosition } from './galaxy-data.js';
import { NGC_COUNT, NGC_PACKED } from './laniakea-data.js';

const hms = (h, m, s) => 15 * (h + m / 60 + s / 3600), dms = (sg, d, m, s) => sg * (d + m / 60 + s / 3600);
// RA/Dec (degrees) and distance (million light-years) → scene position in units of `unitMly`.
export function skyPosition(ra, dec, mly, unitMly) { const [l, b] = toGalactic(ra, dec); return galacticPosition(l, b, mly * 1000).map(v => v / (unitMly * 1000)); }

// Base64 → bytes without depending on atob or Buffer (works in browsers, Node and the test sandboxes).
export function base64Bytes(b64) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', map = new Uint8Array(128); for (let i = 0; i < 64; i++) map[A.charCodeAt(i)] = i;
  const n = b64.replace(/=+$/, '').length, out = new Uint8Array(Math.floor(n * 3 / 4));
  for (let i = 0, o = 0; i < n; i += 4) { const v = map[b64.charCodeAt(i)] << 18 | map[b64.charCodeAt(i + 1)] << 12 | map[b64.charCodeAt(i + 2)] << 6 | map[b64.charCodeAt(i + 3)];
    out[o++] = v >> 16 & 255; if (o < out.length) out[o++] = v >> 8 & 255; if (o < out.length) out[o++] = v & 255; }
  return out;
}
// 9,696 NGC/IC galaxies with measured redshifts (OpenNGC, CC BY-SA 4.0), distances from the Hubble law.
// Returns positions in units of unitMly and a kind per galaxy (0 elliptical/S0, 1 spiral, 2 other).
export function ngcGalaxies(unitMly = 1) {
  const bytes = base64Bytes(NGC_PACKED);
  const dv = new DataView(bytes.buffer), pos = new Float32Array(NGC_COUNT * 3), kind = new Uint8Array(NGC_COUNT), dist = new Float32Array(NGC_COUNT);
  for (let i = 0; i < NGC_COUNT; i++) {
    const o = i * 7, ra = dv.getUint16(o, true) / 65535 * 360, dec = dv.getInt16(o + 2, true) / 32767 * 90, mly = dv.getUint16(o + 4, true) / 10;
    pos.set(skyPosition(ra, dec, mly, unitMly), i * 3); kind[i] = dv.getUint8(o + 6); dist[i] = mly;
  }
  return { pos, kind, dist, count: NGC_COUNT };
}

// Named places at the Laniakea scale. Distances and centres from each Wikipedia article (read 9 Nov 2026);
// nearby groups use their brightest galaxy's measured distance (the Hubble law fails this close).
export const CLUSTERS = [
  { name: 'Virgo Cluster', kind: 'Galaxy cluster', ra: hms(12, 27, 0), dec: dms(1, 12, 43, 0), mly: 53.8, rank: 1, galaxies: 'about 1,300–2,000',
    fact: 'The nearest big cluster of galaxies, at the heart of our local supercluster. Its giant galaxy M87 holds the first black hole ever imaged.' },
  { name: 'Fornax Cluster', kind: 'Galaxy cluster', ra: hms(3, 38, 0), dec: dms(-1, 35, 27, 0), mly: 62, rank: 3, galaxies: 'about 60', fact: 'The second-richest cluster within 100 million light-years, in the southern sky.' },
  { name: 'Perseus Cluster', kind: 'Galaxy cluster', ra: hms(3, 19, 47.6), dec: dms(1, 41, 30, 37), mly: 240, rank: 2, galaxies: 'more than 1,000', fact: 'One of the most massive things in the nearby universe, wrapped in hot gas that glows in X-rays.' },
  { name: 'Coma Cluster', kind: 'Galaxy cluster', ra: hms(12, 59, 48.7), dec: dms(1, 27, 58, 50), mly: 321, rank: 2, galaxies: 'more than 1,000', fact: 'Where dark matter was first suspected, in 1933: its galaxies move too fast for the visible matter to hold them together.' },
  { name: 'Norma Cluster', kind: 'Galaxy cluster', ra: hms(16, 14, 22), dec: dms(-1, 60, 52, 20), mly: 221, rank: 2, attractor: true, fact: 'Near the centre of the Great Attractor, the region all the galaxies of Laniakea, including ours, are flowing towards. It sits behind the Milky Way’s dust, so it is hard to see.' },
  { name: 'Shapley Supercluster', kind: 'Supercluster', ra: hms(13, 25, 0), dec: dms(-1, 30, 0, 0), mly: 652, rank: 2, fact: 'One of the biggest concentrations of galaxies in the universe, just beyond Laniakea; it pulls on us too.' },
  { name: 'M81 Group', kind: 'Galaxy group', ra: hms(9, 55, 33.2), dec: dms(1, 69, 3, 55), mly: 11.8, rank: 4, fact: 'One of the nearest groups of galaxies beyond our own, including the bright spiral M81 and the starburst galaxy M82.' },
  { name: 'Sculptor Group', kind: 'Galaxy group', ra: hms(0, 47, 33.1), dec: dms(-1, 25, 17, 18), mly: 11.4, rank: 4, fact: 'The nearest group of galaxies to the Local Group, led by the dusty spiral NGC 253.' },
  { name: 'Centaurus A', kind: 'Galaxy group', ra: hms(13, 25, 27.6), dec: dms(-1, 43, 1, 9), mly: 12, rank: 4, fact: 'A giant galaxy with a supermassive black hole firing jets a million light-years long.' },
  { name: 'Sombrero Galaxy', kind: 'Spiral galaxy', ra: hms(12, 39, 59.4), dec: dms(-1, 11, 37, 23), mly: 31.1, rank: 5, fact: 'A spiral seen almost edge on, with a dark lane of dust like the brim of a hat.' },
];

// ---- The observable universe: flat ΛCDM with Planck 2018 parameters ----
export const COSMO = { H0: 67.66, Om: 0.3111, Or: 9.0e-5 }; // km/s/Mpc; matter and radiation fractions (Λ makes up the rest)
const HUBBLE_GLY = 299792.458 / COSMO.H0 * 3.26156 / 1000;       // c/H0 in billions of light-years
const HUBBLE_GYR = 977.792 / COSMO.H0;                             // 1/H0 in billions of years
const E = z => Math.sqrt(COSMO.Or * (1 + z) ** 4 + COSMO.Om * (1 + z) ** 3 + (1 - COSMO.Om - COSMO.Or));
// Integrals in ln(1+z) so that very high redshifts (the CMB) converge smoothly.
function integrate(z, f, n = 600) { const L = Math.log(1 + z); let s = 0; for (let i = 0; i < n; i++) { const x = (i + 0.5) / n * L, zz = Math.exp(x) - 1; s += f(zz) * (1 + zz); } return s * L / n; }
// Distance now ("comoving", billions of light-years) to light emitted at redshift z, and how long ago it left (billions of years).
export const distanceNow = z => HUBBLE_GLY * integrate(z, zz => 1 / E(zz));
export const lookback = z => HUBBLE_GYR * integrate(z, zz => 1 / ((1 + zz) * E(zz)));
export const AGE = lookback(1e8); // age of the universe, Gyr
export function redshiftForLookback(gyr) { let lo = 0, hi = 1e4; for (let i = 0; i < 48; i++) { const m = Math.sqrt(lo * hi) || hi / 2; if (lookback(m) < gyr) lo = m; else hi = m; } return (lo + hi) / 2; }
export const CMB_Z = 1091.64, CMB_GLY = distanceNow(CMB_Z), EDGE_GLY = 46.5;
// Shells of equal look-back time: light from this far left this long ago.
export const SHELLS = [
  { gyr: 4.6, label: 'Light from here left 4.6 billion years ago, as the Sun formed' },
  { gyr: 10, label: '10 billion years ago' },
  { gyr: 13, label: '13 billion years ago: the first galaxies' },
].map(s => ({ ...s, gly: distanceNow(redshiftForLookback(s.gyr)) }));
export const FAR_GALAXY = { name: 'MoM-z14', kind: 'Most distant galaxy known', ra: hms(10, 0, 22.4), dec: dms(1, 2, 16, 23.19), z: 14.44, gly: 33.8, lookback: 13.53, announced: 'May 2025',
  fact: 'The most distant galaxy confirmed so far, found by the James Webb Space Telescope. We see it as it was 13.5 billion years ago, only about 280 million years after the Big Bang.' };
export const COSMOS_FACTS = { laniakeaWidth: 'about 400–500 million', laniakeaGalaxies: 'about 100,000', laniakeaMass: 'about 10¹⁷ Suns', age: '13.8 billion years', edge: '46.5 billion', galaxies: 'as many as 2 trillion (estimate)' };
