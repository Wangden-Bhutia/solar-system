// "My sky": where the Sun, Moon, planets and bright stars are in the sky of a given place and time.
// Pure maths, no DOM; see docs/sources.md ("My sky"). Accuracy: planets and the Sun to about 0.1–0.5°, the Moon to
// about 0.3° (about a Moon width): right for finding things by eye, not for pointing a telescope.
//  - Planets: JPL "Keplerian elements for approximate positions of the major planets", Table 1 (valid 1800–2050).
//  - Moon: low-precision series from the Astronomical Almanac (as given in its "Moon" section).
//  - Stars: the HYG v4.1 positions the app already carries (J2000), precessed to the date.
import { eccentricAnomaly } from './star-pairs.js';
import { hygStars } from './transition.js';

const RAD = Math.PI / 180, norm360 = d => ((d % 360) + 360) % 360;
export const julianDate = date => date.getTime() / 86400000 + 2440587.5;
export const centuries = jd => (jd - 2451545) / 36525;
export const obliquity = T => 23.43929111 - 0.0130042 * T;
// Local sidereal time (degrees) at longitude lon (east positive).
export const siderealTime = (jd, lon) => norm360(280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * centuries(jd) ** 2 + lon);

// Equatorial (RA, Dec; degrees) → altitude and azimuth (degrees, azimuth from north through east).
export function horizontal(ra, dec, lat, lst) {
  const H = (lst - ra) * RAD, d = dec * RAD, p = lat * RAD;
  const east = -Math.cos(d) * Math.sin(H), north = Math.sin(d) * Math.cos(p) - Math.cos(d) * Math.cos(H) * Math.sin(p), up = Math.sin(d) * Math.sin(p) + Math.cos(d) * Math.cos(H) * Math.cos(p);
  return { alt: Math.asin(Math.max(-1, Math.min(1, up))) / RAD, az: norm360(Math.atan2(east, north) / RAD) };
}
// J2000 position → the equator of the date (first-order precession: 0.34° after 27 years).
export function precess(ra, dec, T) {
  const yrs = T * 100, m = 0.012806 * yrs, n = 0.005567 * yrs, r = ra * RAD, d = dec * RAD;
  return { ra: norm360(ra + m + n * Math.sin(r) * Math.tan(d)), dec: dec + n * Math.cos(r) };
}
const eclToEq = (x, y, z, eps) => { const c = Math.cos(eps * RAD), s = Math.sin(eps * RAD), X = x, Y = y * c - z * s, Z = y * s + z * c; return { ra: norm360(Math.atan2(Y, X) / RAD), dec: Math.atan2(Z, Math.hypot(X, Y)) / RAD, dist: Math.hypot(X, Y, Z) }; };

// JPL Table 1: a (AU), e, I, L, long.peri, long.node, each as [value at J2000, change per century] (degrees).
export const ELEMENTS = {
  Mercury: [[0.38709927, 0.00000037], [0.20563593, 0.00001906], [7.00497902, -0.00594749], [252.25032350, 149472.67411175], [77.45779628, 0.16047689], [48.33076593, -0.12534081]],
  Venus: [[0.72333566, 0.00000390], [0.00677672, -0.00004107], [3.39467605, -0.00078890], [181.97909950, 58517.81538729], [131.60246718, 0.00268329], [76.67984255, -0.27769418]],
  Earth: [[1.00000261, 0.00000562], [0.01671123, -0.00004392], [-0.00001531, -0.01294668], [100.46457166, 35999.37244981], [102.93768193, 0.32327364], [0, 0]],
  Mars: [[1.52371034, 0.00001847], [0.09339410, 0.00007882], [1.84969142, -0.00813131], [-4.55343205, 19140.30268499], [-23.94362959, 0.44441088], [49.55953891, -0.29257343]],
  Jupiter: [[5.20288700, -0.00011607], [0.04838624, -0.00013253], [1.30439695, -0.00183714], [34.39644051, 3034.74612775], [14.72847983, 0.21252668], [100.47390909, 0.20469106]],
  Saturn: [[9.53667594, -0.00125060], [0.05386179, -0.00050991], [2.48599187, 0.00193609], [49.95424423, 1222.49362201], [92.59887831, -0.41897216], [113.66242448, -0.28867794]],
};
// Sun-centred position (AU) in the J2000 ecliptic frame.
export function heliocentric(name, T) {
  const [a, e, I, L, wp, Om] = ELEMENTS[name].map(([v, r]) => v + r * T);
  const M = norm360(L - wp) * RAD, E = eccentricAnomaly(M, e), w = (wp - Om) * RAD, O = Om * RAD, i = I * RAD;
  const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O), ci = Math.cos(i), si = Math.sin(i);
  return [(cw * cO - sw * sO * ci) * xp + (-sw * cO - cw * sO * ci) * yp, (cw * sO + sw * cO * ci) * xp + (-sw * sO + cw * cO * ci) * yp, sw * si * xp + cw * si * yp];
}
// Geocentric RA/Dec (of the date) and distance (AU) of a planet or the Sun.
export function planetEquatorial(name, T) {
  const e = heliocentric('Earth', T), p = name === 'Sun' ? [0, 0, 0] : heliocentric(name, T);
  const q = eclToEq(p[0] - e[0], p[1] - e[1], p[2] - e[2], obliquity(0)), d = precess(q.ra, q.dec, T);
  return { ra: d.ra, dec: d.dec, dist: q.dist };
}
// The Moon (Astronomical Almanac low-precision series): RA/Dec of the date, distance (km), parallax (degrees).
export function moonEquatorial(T) {
  const s = (a, b) => Math.sin((a + b * T) * RAD), c = (a, b) => Math.cos((a + b * T) * RAD);
  const lon = 218.32 + 481267.881 * T + 6.29 * s(135.0, 477198.87) - 1.27 * s(259.3, -413335.36) + 0.66 * s(235.7, 890534.22) + 0.21 * s(269.9, 954397.70) - 0.19 * s(357.5, 35999.05) - 0.11 * s(186.5, 966404.05);
  const lat = 5.13 * s(93.3, 483202.02) + 0.28 * s(228.2, 960400.89) - 0.28 * s(318.3, 6003.15) - 0.17 * s(217.6, -407332.21);
  const par = 0.9508 + 0.0518 * c(135.0, 477198.87) + 0.0095 * c(259.3, -413335.36) + 0.0078 * c(235.7, 890534.22) + 0.0028 * c(269.9, 954397.70);
  const cl = Math.cos(lat * RAD), q = eclToEq(cl * Math.cos(lon * RAD), cl * Math.sin(lon * RAD), Math.sin(lat * RAD), obliquity(T));
  return { ra: q.ra, dec: q.dec, parallax: par, distKm: 6378.14 / Math.sin(par * RAD) };
}
export const angularSeparation = (a, b) => { const r = Math.acos(Math.max(-1, Math.min(1, Math.sin(a.dec * RAD) * Math.sin(b.dec * RAD) + Math.cos(a.dec * RAD) * Math.cos(b.dec * RAD) * Math.cos((a.ra - b.ra) * RAD)))); return r / RAD; };
// How much of the Moon's face is lit, from its angle from the Sun (0 new, 1 full).
export const moonLit = (moon, sun) => (1 - Math.cos(angularSeparation(moon, sun) * RAD)) / 2;

// Bright stars worth naming (the catalogue stops at 1,000 light-years, so distant giants like Deneb are not in it): J2000 positions (SIMBAD/Wikipedia) and V magnitudes; each is matched to its HYG entry.
export const NAMED_STARS = [
  ['Sirius', 101.287, -16.716, -1.46], ['Canopus', 95.988, -52.696, -0.74], ['Arcturus', 213.915, 19.182, -0.05], ['Vega', 279.235, 38.784, 0.03],
  ['Capella', 79.172, 45.998, 0.08], ['Rigel', 78.634, -8.202, 0.13], ['Procyon', 114.825, 5.225, 0.34], ['Betelgeuse', 88.793, 7.407, 0.5],
  ['Achernar', 24.429, -57.237, 0.46], ['Altair', 297.696, 8.868, 0.77], ['Aldebaran', 68.980, 16.509, 0.85], ['Antares', 247.352, -26.432, 1.0],
  ['Spica', 201.298, -11.161, 0.97], ['Pollux', 116.329, 28.026, 1.14], ['Fomalhaut', 344.413, -29.622, 1.16],
  ['Regulus', 152.093, 11.967, 1.35], ['Polaris', 37.955, 89.264, 1.98], ['Dubhe', 165.932, 61.751, 1.79],
];
let namedCache = null;
export function namedIndex() {
  if (namedCache) return namedCache;
  const s = hygStars(), out = new Map();
  for (const [name, ra, dec, v] of NAMED_STARS) {
    let best = -1, bd = 1e9;
    for (let i = 0; i < s.count; i++) { if (Math.abs(s.dec[i] - dec) > 1) continue; const d = angularSeparation({ ra, dec }, { ra: s.ra[i], dec: s.dec[i] }) + Math.abs(s.mag[i] - v) * 0.3; if (d < bd) { bd = d; best = i; } }
    if (best >= 0) out.set(best, name);
  }
  return (namedCache = out);
}
export const PLANET_NAMES = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
// Nominal brightness for drawing the dots (planets vary with the season; these are typical).
export const PLANET_MAG = { Mercury: 0, Venus: -4, Mars: 0.5, Jupiter: -2.2, Saturn: 0.6 };

// Everything in the sky for a place (lat, lon degrees; lon east) and a time (Date).
export function skyAt(date, lat, lon) {
  const jd = julianDate(date), T = centuries(jd), lst = siderealTime(jd, lon);
  const place = (q, extra = {}) => ({ ...q, ...horizontal(q.ra, q.dec, lat, lst), ...extra });
  const sunEq = planetEquatorial('Sun', T), sun = place(sunEq, { name: 'Sun', kind: 'Star', distAU: sunEq.dist });
  const mq = moonEquatorial(T), moonH = horizontal(mq.ra, mq.dec, lat, lst);
  // Parallax: the Moon is near enough that it shifts by up to about a degree depending on where you stand.
  const moon = { ...mq, ...moonH, alt: moonH.alt - mq.parallax * Math.cos(moonH.alt * RAD), name: 'Moon', kind: 'Moon', lit: moonLit(mq, sunEq) };
  const planets = PLANET_NAMES.map(n => { const q = planetEquatorial(n, T); return place(q, { name: n, kind: 'Planet', distAU: q.dist, mag: PLANET_MAG[n] }); });
  const s = hygStars(), names = namedIndex(), stars = [];
  for (let i = 0; i < s.count; i++) { const q = precess(s.ra[i], s.dec[i], T), h = horizontal(q.ra, q.dec, lat, lst); stars.push({ i, ...q, ...h, mag: s.mag[i], bv: s.bv[i], ly: s.ly[i], name: names.get(i) || null }); }
  return { jd, T, lst, lat, lon, sun, moon, planets, stars };
}
// A phrase for a direction.
export const compass = az => ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(norm360(az) / 45) % 8];
export function lookText(alt, az) { const a = Math.round(Math.abs(alt)); return alt >= 0 ? `${a}° above the ${compass(az)} horizon` : `${a}° below the ${compass(az)} horizon`; }
