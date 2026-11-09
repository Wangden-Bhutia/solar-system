// The Milky Way (units: 1,000 light-years = 1 kly). Pure data and maths; see docs/sources.md.
// Frame: galactocentric, origin at the black hole Sgr A*; the Sun lies at (−R0, 0, 0); +y in scene
// coordinates points to the North Galactic Pole; the Galaxy turns clockwise seen from there.
export const R0 = 26.996;            // Sun–Sgr A* distance, kly (GRAVITY Collaboration, via Wikipedia: 26,996 ± 33 ly)
export const KPC = 3.26156;          // kly per kiloparsec
const rad = d => d * Math.PI / 180;

// RA/Dec (J2000, degrees) → galactic longitude and latitude (degrees), standard IAU 1958 frame (J2000 constants).
const NGP_RA = rad(192.85948), NGP_DEC = rad(27.12825), L_NCP = rad(122.93192);
export function toGalactic(raDeg, decDeg) {
  const a = rad(raDeg), d = rad(decDeg);
  const sb = Math.sin(d) * Math.sin(NGP_DEC) + Math.cos(d) * Math.cos(NGP_DEC) * Math.cos(a - NGP_RA);
  const b = Math.asin(sb);
  const y = Math.cos(d) * Math.sin(a - NGP_RA), x = Math.sin(d) * Math.cos(NGP_DEC) - Math.cos(d) * Math.sin(NGP_DEC) * Math.cos(a - NGP_RA);
  const l = (L_NCP - Math.atan2(y, x) + 4 * Math.PI) % (2 * Math.PI);
  return [l * 180 / Math.PI, b * 180 / Math.PI];
}
// Galactic (l, b, distance in kly from the Sun) → scene position (kly) about the galactic centre.
export function galacticPosition(lDeg, bDeg, kly) {
  const l = rad(lDeg), b = rad(bDeg);
  const X = kly * Math.cos(b) * Math.cos(l), Y = kly * Math.cos(b) * Math.sin(l), Z = kly * Math.sin(b); // X toward the centre, Y toward l = 90°
  return [X - R0, Z, -Y];
}
// Polar position in the disc: R (kly) and galactocentric azimuth β (degrees; 0 toward the Sun, increasing
// in the direction the Galaxy turns) → scene position.
export const discPosition = (R, betaDeg, h = 0) => { const b = rad(betaDeg); return [-R * Math.cos(b), h, -R * Math.sin(b)]; };

// Spiral arms as log spirals with a "kink" (Reid et al. 2019, ApJ 885, 131, table 2): ln(R/Rk) = −(β − βk)·tan ψ,
// with ψ< used before the kink and ψ> after it. R in kpc as published, rescaled so their R0 = 8.15 kpc
// matches the R0 used here. Approximate: arms are traced from radio parallaxes on our side of the
// Galaxy only; the far side is extrapolated.
export const ARMS = [
  { name: 'Norma–Outer', Rk: 4.46, bk: 18, pIn: -1.0, pOut: 19.5, from: -20, to: 270, color: [0.62, 0.74, 1] },
  { name: 'Scutum–Centaurus', Rk: 4.91, bk: 23, pIn: 14.1, pOut: 12.1, from: 0, to: 270, color: [0.7, 0.8, 1] },
  { name: 'Sagittarius–Carina', Rk: 6.04, bk: 24, pIn: 17.1, pOut: 1.0, from: -30, to: 210, color: [0.75, 0.82, 1] },
  { name: 'Perseus', Rk: 8.87, bk: 40, pIn: 10.3, pOut: 8.7, from: -25, to: 260, color: [0.66, 0.78, 1] },
  { name: 'Orion Spur', Rk: 8.26, bk: 9, pIn: 11.4, pOut: 11.4, from: -18, to: 32, color: [0.82, 0.86, 1], spur: true },
];
const SCALE = (R0 / KPC) / 8.15;
export function armRadius(arm, betaDeg) {
  const psi = rad(betaDeg < arm.bk ? arm.pIn : arm.pOut);
  return arm.Rk * SCALE * Math.exp(-rad(betaDeg - arm.bk) * Math.tan(psi)) * KPC; // kly
}
export function armPoints(arm, step = 1) {
  const out = [];
  for (let b = arm.from; b <= arm.to; b += step) { const R = armRadius(arm, b); if (R > 9 && R < 55) out.push([R, b]); }
  return out;
}

// Reproducible particle cloud: bulge and bar (old, yellow), a smooth old disc, and the arms (young, blue-white,
// with pink star-forming knots). Counts tuned for phones.
function rng(seed) { let x = seed >>> 0; return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296); }
const gauss = r => Math.sqrt(-2 * Math.log(1 - r() * 0.999999)) * Math.cos(2 * Math.PI * r());
export const BAR = { halfLength: 16, angle: 27, axisRatio: 0.38 }; // kly; angle between the bar's near end and the Sun–centre line (estimates 10–50°)
export function galaxyParticles({ bulge = 9000, disc = 16000, arm = 30000, seed = 11 } = {}) {
  const r = rng(seed), pos = [], col = [], kind = [];
  // kind: 0 bar/bulge (turns with the bar), 1 old disc (each star at its own orbital speed), 2 arm (the arm pattern)
  let k0 = 0; const push = (p, c) => { pos.push(p[0], p[1], p[2]); col.push(c[0], c[1], c[2]); kind.push(k0); };
  const ba = rad(BAR.angle);
  k0 = 0;
  for (let i = 0; i < bulge; i++) { // a boxy, tilted bar plus a round bulge
    const bar = r() < 0.6, u = gauss(r) * (bar ? BAR.halfLength / 2.2 : 4.5), v = gauss(r) * (bar ? BAR.halfLength / 2.2 * BAR.axisRatio : 4.5), h = gauss(r) * (bar ? 1.6 : 3);
    const x = u * Math.cos(ba) - v * Math.sin(ba), y = u * Math.sin(ba) + v * Math.cos(ba);
    const k = 0.55 + r() * 0.3; push([-x, h, -y], [1 * k, 0.84 * k, 0.58 * k]);
  }
  k0 = 1;
  for (let i = 0; i < disc; i++) { // exponential disc, scale length ≈ 8.5 kly
    const R = -8.5 * Math.log(1 - r() * 0.985) + 2, b = r() * 360, h = gauss(r) * 0.5, k = 0.35 + r() * 0.3;
    if (R > 52) continue; push(discPosition(R, b, h), [1 * k, 0.9 * k, 0.75 * k]);
  }
  k0 = 2;
  const arms = ARMS.map(a => ({ a, pts: armPoints(a, 0.5) })), total = arms.reduce((s, x) => s + x.pts.length * (x.a.spur ? 0.6 : 1), 0);
  for (const { a, pts } of arms) {
    const n = Math.round(arm * pts.length * (a.spur ? 0.6 : 1) / total);
    for (let i = 0; i < n; i++) {
      const [R, b] = pts[Math.floor(r() * pts.length)], w = a.spur ? 0.9 : 1.6;
      const p = discPosition(R + gauss(r) * w, b + gauss(r) * (w / R) * 57.3, gauss(r) * 0.35);
      const knot = r() < 0.035, k = 0.55 + r() * 0.45;
      push(p, knot ? [1, 0.45, 0.65] : a.color.map(c => c * k));
    }
  }
  return { positions: new Float32Array(pos), colors: new Float32Array(col), kinds: new Uint8Array(kind) };
}

// Landmarks: distances (kly from the Sun) and J2000 positions from each object's catalogue entry as
// summarised on Wikipedia (read 9 Nov 2026); galactic coordinates are computed from RA/Dec.
const hms = (h, m, s) => 15 * (h + m / 60 + s / 3600), dms = (sg, d, m, s) => sg * (d + m / 60 + s / 3600);
export const LANDMARKS = [
  { name: 'Sun', kind: 'Our star', kly: 0, ra: 0, dec: 0, fact: 'You are here: one star among 100–400 billion, about 27,000 light-years from the centre.' },
  { name: 'Sagittarius A*', constellation: 'Sagittarius', kind: 'Supermassive black hole', kly: 26.996, ra: hms(17, 45, 40.04), dec: dms(-1, 29, 0, 28.1), fact: 'A black hole of about 4.3 million Suns at the centre of the Galaxy, first imaged in 2022.' },
  { name: 'Orion Nebula', constellation: 'Orion', kind: 'Star nursery', kly: 1.267, ra: hms(5, 35, 16.8), dec: dms(-1, 5, 23, 15), fact: 'The closest region where big stars are being born. You can see it with your eyes, in Orion’s sword.' },
  { name: 'Pleiades', constellation: 'Taurus', kind: 'Young star cluster', kly: 0.444, ra: hms(3, 46, 38.0), dec: dms(1, 24, 10, 41), fact: 'The Seven Sisters: hot young stars about 125 million years old, born together.' },
  { name: 'Betelgeuse', constellation: 'Orion', kind: 'Red supergiant', kly: 0.548, ra: hms(5, 55, 10.31), dec: dms(1, 7, 24, 25.4), fact: 'So big that, in place of the Sun, it would swallow Mercury, Venus, Earth and Mars.' },
  { name: 'Crab Nebula', constellation: 'Taurus', kind: 'Supernova remnant', kly: 6.5, ra: hms(5, 34, 31.8), dec: dms(1, 22, 1, 3), fact: 'The wreck of a star whose explosion was recorded by Chinese astronomers in the year 1054.' },
  { name: 'Eagle Nebula', constellation: 'Serpens', kind: 'Star nursery', kly: 5.7, ra: hms(18, 18, 45.1), dec: dms(-1, 13, 47, 13), fact: 'Home of the Pillars of Creation: towers of gas and dust where new stars are forming.' },
  { name: 'Carina Nebula', constellation: 'Carina', kind: 'Star nursery', kly: 8.5, ra: hms(10, 45, 8.5), dec: dms(-1, 59, 52, 4), fact: 'Contains Eta Carinae, a star of 100–150 Suns that blazes with about four million times the Sun’s light.' },
  { name: 'Omega Centauri', constellation: 'Centaurus', kind: 'Globular cluster', kly: 17.09, ra: hms(13, 26, 47.28), dec: dms(-1, 47, 28, 46.1), fact: 'The largest globular cluster in the Milky Way: about 10 million old stars in a ball 150 light-years wide.' },
].map(m => { const [l, b] = m.kly ? toGalactic(m.ra, m.dec) : [0, 0]; return { ...m, l, b, pos: m.kly ? galacticPosition(l, b, m.kly) : [-R0, 0, 0] }; });
export const GALAXY_FACTS = { stars: '100–400 billion', diameter: 'about 100,000', orbitMyr: 'about 230 million', thickness: 'about 1,000' };
