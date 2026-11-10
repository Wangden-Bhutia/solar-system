// The structures that carry one scale into the next (Phase 3 of the continuous zoom). Catalogue layers come from
// transition-data.js (tools/build_transition.py: HYG v4.1 stars, Harris globular clusters, OpenNGC positions);
// everything else here is an ILLUSTRATION of a measured size or shape, drawn as points or wire shells, and is
// labelled as an illustration wherever it is named. No catalogue records are invented: the illustrative point
// clouds are random samples of a published density law, not objects. Sources: docs/sources.md.
import * as THREE from './vendor/three.module.min.js';
import { HYG_COUNT, HYG_PACKED, GC_COUNT, GC_PACKED, GIANTS } from './transition-data.js';
import { starPosition, starColor } from './stars-data.js';
import { toGalactic, galacticPosition, R0, KPC } from './galaxy-data.js';
import { base64Bytes, CLUSTERS } from './cosmos-data.js';
import { GALAXIES, LOCAL_UNIT } from './local-data.js';

// ---- Measured sizes (sources in docs/sources.md) ----
export const KUIPER_AU = [30, 50];                  // the classical Kuiper belt, about 30–50 AU
export const HELIO = {
  terminationShockAU: 94,                           // Voyager 1 crossed the termination shock at 94 AU (Dec 2004)
  heliopauseAU: 121.6,                              // Voyager 1 crossed the heliopause at 121.6 AU (25 Aug 2012)
  heliopauseV2AU: 119,                              // Voyager 2: 119 AU (5 Nov 2018)
};
export const OORT_AU = [2000, 100000];              // Oort cloud: inner (Hills) cloud from ~2,000 AU, outer edge ~100,000 AU
export const LOCAL_BUBBLE_LY = 1000;                // the Local Bubble is about 1,000 ly across (Zucker et al. 2022)
export const HALO = { n: 2.77, q: 0.64 };           // stellar halo density ∝ r^−n with flattening q (Jurić et al. 2008)
export const SGR_POLE = [273.8, -13.46];            // Sagittarius stream orbital pole (l, b) (Majewski et al. 2003; Law & Majewski 2010)
export const LOCAL_SHEET = { diameterMly: 34, thicknessMly: 1.52 }; // McCall 2014 (Wikipedia, "Local Sheet")
export const LOCAL_VOID = { ra: 279.5, dec: 18.0, centreMly: 75, radiusMly: 75 }; // SIMBAD centre 18h38m +18°; centre ≥ 23 Mpc ≈ 75 Mly
export const SUPERGALACTIC_POLE = [47.37, 6.32];    // (l, b) of the supergalactic north pole (de Vaucouleurs)

function rng(seed) { let x = seed >>> 0; return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296); }
const gauss = r => Math.sqrt(-2 * Math.log(1 - r() * 0.999999)) * Math.cos(2 * Math.PI * r());
// Galactic direction (l, b) as a unit vector in the galactic scene frame.
export function galDir(l, b) { const p = galacticPosition(l, b, 1); return [p[0] + R0, p[1], p[2]]; }

// ---- HYG v4.1: naked-eye stars within 1,000 light-years ----
let hygCache = null;
export function hygStars() {
  if (hygCache) return hygCache;
  const bytes = base64Bytes(HYG_PACKED), dv = new DataView(bytes.buffer), n = HYG_COUNT;
  const ra = new Float32Array(n), dec = new Float32Array(n), ly = new Float32Array(n), bv = new Float32Array(n), mag = new Float32Array(n);
  for (let i = 0; i < n; i++) { const o = i * 8; ra[i] = dv.getUint16(o, true) / 65535 * 360; dec[i] = dv.getInt16(o + 2, true) / 32767 * 90; ly[i] = dv.getUint16(o + 4, true) / 60; bv[i] = dv.getInt8(o + 6) / 50; mag[i] = dv.getUint8(o + 7) / 20 - 2; }
  return (hygCache = { ra, dec, ly, bv, mag, count: n });
}
// B − V colour index → effective temperature (Ballesteros 2012).
export const bvTemp = bv => 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
// Brightness of a dot by apparent magnitude (as seen from the Sun): bright stars brighter, faint ones faint.
export const magGain = m => Math.max(0.18, Math.min(1, 0.25 + 0.75 * (6.5 - m) / 6));
// Positions: frame 'ecl' (star map: ly / unitLy about the Sun) or 'gal' (Milky Way: kly about the centre).
export function hygPositions(frame = 'ecl', unitLy = 1) {
  const s = hygStars(), pos = new Float32Array(s.count * 3);
  for (let i = 0; i < s.count; i++) {
    let p;
    if (frame === 'ecl') p = starPosition(s.ra[i], s.dec[i], s.ly[i]).map(v => v / unitLy);
    else { const [l, b] = toGalactic(s.ra[i], s.dec[i]); p = galacticPosition(l, b, s.ly[i] / 1000).map(v => v * 1000 / unitLy); }
    pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2];
  }
  return pos;
}
// The same field drawn identically by the star map and the Milky Way (a proxy pair across their seam):
// fixed-size round points, one colour per star from its B − V, brightness from its magnitude.
export const HYG_PX = 2;
export function hygPoints(frame, unitLy) {
  const s = hygStars(), col = new Float32Array(s.count * 3);
  for (let i = 0; i < s.count; i++) { const c = starColor(bvTemp(s.bv[i])), k = magGain(s.mag[i]); col[i * 3] = c[0] * k; col[i * 3 + 1] = c[1] * k; col[i * 3 + 2] = c[2] * k; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(hygPositions(frame, unitLy), 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: HYG_PX, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  p.userData.layer = 'hyg'; return p;
}

// ---- Harris 1996 (2010 edition): the Milky Way's 157 globular clusters ----
export function globularPositions(unitKly = 1) {
  const bytes = base64Bytes(GC_PACKED), dv = new DataView(bytes.buffer), pos = new Float32Array(GC_COUNT * 3);
  for (let i = 0; i < GC_COUNT; i++) { const o = i * 6, l = dv.getUint16(o, true) / 65535 * 360, b = dv.getInt16(o + 2, true) / 32767 * 90, kpc = dv.getUint16(o + 4, true) / 10;
    galacticPosition(l, b, kpc * KPC).forEach((v, k) => { pos[i * 3 + k] = v / unitKly; }); }
  return pos;
}

// ---- Illustrations (random samples of the published shape; not objects) ----
// Oort cloud: isotropic, radii log-uniform over 2,000–100,000 AU. Returned in AU about the Sun.
export function oortPositions(n = 1800, seed = 7) {
  const r = rng(seed), pos = new Float32Array(n * 3), [a, b] = OORT_AU;
  for (let i = 0; i < n; i++) { const z = r() * 2 - 1, t = r() * Math.PI * 2, s = Math.sqrt(1 - z * z), R = a * (b / a) ** r();
    pos[i * 3] = R * s * Math.cos(t); pos[i * 3 + 1] = R * z; pos[i * 3 + 2] = R * s * Math.sin(t); }
  return pos;
}
// Stellar halo: ρ ∝ r^−n, flattened by q along the Galaxy's axis, 15–300 kly from the centre (kly).
export function haloPositions(n = 900, seed = 21) {
  const r = rng(seed), pos = new Float32Array(n * 3), e = 3 - HALO.n, lo = 15 ** e, hi = 300 ** e;
  for (let i = 0; i < n; i++) { const R = (lo + r() * (hi - lo)) ** (1 / e), z = r() * 2 - 1, t = r() * Math.PI * 2, s = Math.sqrt(1 - z * z);
    pos[i * 3] = R * s * Math.cos(t); pos[i * 3 + 1] = R * z * HALO.q; pos[i * 3 + 2] = R * s * Math.sin(t); }
  return pos;
}
// Sagittarius stream: a band in the plane with the measured orbital pole, 15–60 kpc from the centre, a few kpc thick.
export function sgrPositions(n = 1200, seed = 33) {
  const r = rng(seed), pos = new Float32Array(n * 3), nrm = galDir(...SGR_POLE);
  const u = new THREE.Vector3(1, 0, 0).projectOnPlane(new THREE.Vector3(...nrm)).normalize(), w = new THREE.Vector3().crossVectors(new THREE.Vector3(...nrm), u);
  for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, R = (15 + 45 * r()) * KPC, h = gauss(r) * 1.5 * KPC;
    for (let k = 0; k < 3; k++) pos[i * 3 + k] = R * (Math.cos(a) * u.getComponent(k) + Math.sin(a) * w.getComponent(k)) + h * nrm[k]; }
  return pos;
}
// Local Sheet: a thin disc 34 Mly across and 1.5 Mly thick, drawn in the supergalactic plane (it lies within
// about 8° of it), centred on the Local Group. Mly about the Milky Way.
export function sheetPositions(n = 1400, seed = 45) {
  const r = rng(seed), pos = new Float32Array(n * 3), nrm = new THREE.Vector3(...galDir(...SUPERGALACTIC_POLE));
  const u = new THREE.Vector3(0, 1, 0).projectOnPlane(nrm).normalize(), w = new THREE.Vector3().crossVectors(nrm, u), R0m = LOCAL_SHEET.diameterMly / 2;
  for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, R = R0m * Math.sqrt(r()), h = gauss(r) * LOCAL_SHEET.thicknessMly / 4;
    for (let k = 0; k < 3; k++) pos[i * 3 + k] = R * (Math.cos(a) * u.getComponent(k) + Math.sin(a) * w.getComponent(k)) + h * nrm.getComponent(k); }
  return pos;
}
// The Local Void's centre (Mly, from the Milky Way) in the galactic scene frame.
export function voidCentre() { const [l, b] = toGalactic(LOCAL_VOID.ra, LOCAL_VOID.dec); return galDir(l, b).map(v => v * LOCAL_VOID.centreMly); }
// Council of Giants (McCall 2014) positions in Mly about the Milky Way's centre.
// One distance per galaxy across scales: where Laniakea's group marker (cosmos-data.js) is placed on the same galaxy
// (same RA/Dec), its measured distance is used, so the two scales agree exactly; McCall's table, as tabulated, is
// rounded to whole Mly (M81 12, NGC 253 11, Centaurus A 11), within those galaxies' distance uncertainties.
export const SAME_AS_GROUP = { NGC3031: 'M81 Group', NGC0253: 'Sculptor Group', NGC5128: 'Centaurus A' };
export const giants = () => GIANTS.map(g => { const grp = CLUSTERS.find(c => c.name === SAME_AS_GROUP[g.id]), mly = grp ? grp.mly : g.mly, src = grp ? 'cosmos-data' : 'McCall 2014 (rounded)';
  const [l, b] = toGalactic(g.ra, g.dec); return { ...g, mly, distanceSource: src, pos: galacticPosition(l, b, mly * 1000).map(v => v / 1000) }; });

// The Magellanic Clouds as soft clouds of points at their measured positions and sizes (local-data.js), in kly
// about the Milky Way's centre: the Galaxy shows them before the Local Group takes over (cross-faded there).
export function magellanicPositions(seed = 51) {
  const r = rng(seed), out = [];
  for (const g of GALAXIES.filter(g => g.short === 'LMC' || g.short === 'SMC')) {
    const n = g.short === 'LMC' ? 1200 : 700, s = g.size / 2;
    for (let i = 0; i < n; i++) { const u = Math.abs(gauss(r)) * 0.45 * s, z = r() * 2 - 1, t = r() * Math.PI * 2, q = Math.sqrt(1 - z * z);
      out.push(g.pos[0] * LOCAL_UNIT + u * q * Math.cos(t), g.pos[1] * LOCAL_UNIT + u * z * 0.55, g.pos[2] * LOCAL_UNIT + u * q * Math.sin(t)); }
  }
  return new Float32Array(out);
}

// ---- Drawing helpers ----
export function pointCloud(pos, { color = 0xffffff, size = 1.5, opacity = 0.5, layer = '' } = {}) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color, size, sizeAttenuation: false, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  p.userData.layer = layer; p.userData.illustration = layer !== 'hyg' && layer !== 'globulars'; return p;
}
// A shell of radius 1 for boundaries that have no surface (the heliopause, the Local Bubble, a void); scale it to
// size; material.opacity is what the level-of-detail code fades. Two looks, both illustrations:
// - 'soft' (default): a faint glow brightest at its edge, where the line of sight grazes the most of it, like a
//   soap bubble seen against the dark. It only reads from OUTSIDE: seen from inside, every line of sight meets the
//   shell nearly face-on, so the rim term is close to 0 (shellPeak below).
// - 'wire': three great circles and two latitude rings, for a shell the camera stays inside (the Local Bubble in
//   the star map, whose 500-ly radius is beyond the star map's 300-ly settled range).
export const SHELL_RIM_POW = 3;
// The soft shell's shader hook (shared, so copies of the material keep it: Material.clone() drops onBeforeCompile).
export function softShellHook(sh) {
  sh.vertexShader = 'varying float vRim;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vRim = 1.0 - abs(dot(normalize(normalMatrix * normal), normalize(-mvPosition.xyz)));');
  sh.fragmentShader = 'varying float vRim;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.a *= pow(vRim, ' + SHELL_RIM_POW.toFixed(1) + ');');
}
// The brightest the shell's look gets (0–1 factor on opacity) seen from distance d of the centre of a shell of
// radius R. Soft: outside, some line of sight grazes it (1); inside, the most oblique view is at asin(d/R) from the
// normal, so the peak is (1 − cos)^SHELL_RIM_POW. Wire lines do not depend on the viewing angle (1).
export function shellPeak(style, d, R) {
  if (style === 'wire' || d >= R) return 1;
  const s = d / R; return (1 - Math.sqrt(1 - s * s)) ** SHELL_RIM_POW;
}
export function wireShell({ color = 0x6f86b8, opacity = 0.35, layer = '', style = 'soft' } = {}) {
  let l;
  if (style === 'wire') {
    const pts = [], N = 96, ring = (f) => { for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, b = (i + 1) / N * Math.PI * 2; pts.push(...f(a), ...f(b)); } };
    ring(a => [Math.cos(a), 0, Math.sin(a)]); ring(a => [Math.cos(a), Math.sin(a), 0]); ring(a => [0, Math.cos(a), Math.sin(a)]);
    for (const y of [-0.5, 0.5]) { const s = Math.sqrt(1 - y * y); ring(a => [s * Math.cos(a), y, s * Math.sin(a)]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  } else {
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    m.onBeforeCompile = softShellHook;
    l = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), m);
  }
  l.userData.layer = layer; l.userData.illustration = true; l.userData.shell = style; return l;
}
