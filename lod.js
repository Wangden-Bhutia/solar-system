// Per-object level of detail for the continuous zoom (replaces the black veil and the whole-scene fades).
// Every drawn object fades by its OWN rule, from its own apparent size or position on screen, never by a
// global scene opacity:
//   'size'   an extended object (a cloud, a disc, a ring, a layer of points) fades out as it shrinks below a few
//            pixels across: apparent px = L / D × (vh / 2) / tan(fov / 2), smoothstep in log px (1.5 → 6 px).
//   'marker' a point-like object drawn at a fixed pixel size (a star, a galaxy dot) fades out as it merges into
//            the "you are here" anchor: its offset from the anchor on screen, smoothstep in log px (4 → 16 px).
//   'proxy'  an object drawn identically by both scales of a seam (the shared sky, the Sun's glow): only one copy
//            is drawn, swapped at the middle of the seam (t = 0.5), so there is never a double or a dip.
//   'model'  the same thing drawn by two different models (the Milky Way's particle disc in the Galaxy, its
//            picture in the Local Group): cross-faded by t across the seam.
//   'fixed'  furniture that belongs to one scale only (rings, orbits): drawn fully, except at the seam ends.
// Seam safety window: inside a seam, 'size', 'marker' and 'fixed' objects are also multiplied by a narrow window
// (the outer scale's fade in over the first quarter of the seam, the inner scale's fade out over the last
// quarter), so each scene is exactly invisible at the end where it stops being drawn. This is the only
// opacity that depends on the seam position rather than on the object, and it is documented as such.
// Pure apart from writing material.opacity and object.userData.fade; no THREE import.
import { smooth } from './zoom-ladder.js';
export const PX = { tinyLo: 1.5, tinyHi: 6, mergeLo: 4, mergeHi: 16 };
export const WINDOW = 0.25;
export const apparentPx = (L, D, vh, fovDeg) => D > 0 ? L / D * (vh / 2) / Math.tan(fovDeg * Math.PI / 360) : Infinity;
const logStep = (x, a, b) => !(x > a) ? 0 : x >= b ? 1 : smooth(Math.log(x / a) / Math.log(b / a));
export const sizeFade = px => logStep(px, PX.tinyLo, PX.tinyHi);
export const mergeFade = px => logStep(px, PX.mergeLo, PX.mergeHi);
export const DENSITY = [0.05, 0.5]; // points per px²
// FLUX_PX: inverse-square dimming of a cloud of fixed-pixel-size additive points. Such a cloud draws the same total
// light at any distance (N points × size² × opacity), so as it shrinks on screen its pixels pile up and saturate:
// the white Milky Way blob, the lilac halo pile in the Local Group, the Local Sheet streak in Laniakea. A real
// object's flux falls as 1/D² (its surface brightness stays the same): once its radius is below FLUX_PX pixels its
// opacity is scaled by (px / FLUX_PX)². px is scale-free, so a copy at k× the size seen from k× the distance gets
// exactly the same factor as its source.
export const FLUX_PX = 300;
export const fluxFade = px => px >= FLUX_PX ? 1 : (px / FLUX_PX) ** 2;
// Thinning (density LOD): a dense fixed-pixel cloud needs no more than THIN_RHO points per px² of its disc. Its
// geometry gets, once, a fixed pseudorandom draw order (an index over the SAME attributes, shared by the source
// and every proxy copy), and only the first n are drawn: n = THIN_RHO · π · px², never below THIN_MIN, never
// above N, and never so few that the opacity compensation N/n would push opacity past 1. The opacity is scaled
// by N/n, so the cloud's total drawn light (vertices × size² × opacity) is unchanged by thinning. n depends only
// on the projected size, so a copy and its source draw the same n points with the same opacity at the same Z.
export const THIN_RHO = 2, THIN_MIN = 256;
export function thinOrder(geometry) {
  if (geometry.index) return geometry.index; // already ordered (or indexed by its owner): shared as is
  const N = geometry.attributes.position.count, idx = new Array(N);
  for (let i = 0; i < N; i++) idx[i] = i;
  let r = (N * 2654435761) >>> 0; // deterministic: the same cloud always gets the same order
  for (let i = N - 1; i > 0; i--) { r = (r + 0x6D2B79F5) >>> 0; let t = Math.imul(r ^ r >>> 15, r | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); const j = ((t ^ t >>> 14) >>> 0) % (i + 1); const x = idx[i]; idx[i] = idx[j]; idx[j] = x; }
  geometry.setIndex(idx); geometry.userData.thinOrder = true; // built once, at load, not per frame
  return geometry.index;
}
export const thinCount = (N, px, opacityNeeded) => Math.min(N, Math.max(THIN_MIN, Math.ceil(THIN_RHO * Math.PI * px * px), Math.ceil(N * opacityNeeded)));
// Every fixed-pixel point cloud whose light adds up on screen: additive blending, or a star layer drawn with the
// max-blend safety net (starLayer below; its light still adds wherever two layers overlap). A point count (N, the
// density rule) does NOT exempt a cloud from this: the NGC/IC catalogue used to skip it (A2 white pile).
export const FLUX_AUTO = o => !!(o.isPoints && o.material && o.material.sizeAttenuation === false && (o.material.blending === 2 || o.material.userData?.starLayer)); // 2 = THREE.AdditiveBlending
// Fixed-pixel additive glows (sprites drawn at a constant size on screen: stars, galaxies, groups). They are point
// symbols, not surfaces: their light is accounted for by merging (mergeGroups below) rather than by 1/D².
export const GLOW_AUTO = o => !!(o.isSprite && o.material && o.material.sizeAttenuation === false && o.material.blending === 2);
// Footprint and concentration of a point cloud, computed once per geometry (shared by a source and its copies, which
// share the geometry, so both get the same numbers; positions are in geometry units, so they scale with the object).
// About the cloud's median point (not the bounding-sphere centre, which far outliers drag off the dense part).
// R90: 3D radius holding 90% of the points (a few far outliers, like the NGC galaxies beyond 2 billion ly, no longer
// set the footprint: the bounding sphere was 4.2× the 90% radius there).
// C: peak projected concentration. Seen along each axis, the fraction q of points within projected radius Rq of the
// median gives a central surface density q N / (π Rq²); per axis, the max over q (FLUX_Q) of q (R90 / Rq)²; C is the
// smallest of the three axes (below),
// so the densest projected part holds C N / (π R90²) points per unit area. Projected, because what piles up on a
// screen is the column along the line of sight (the NGC catalogue is centred on us, so its column is long).
export const FLUX_Q = [0.005, 0.01, 0.02, 0.05, 0.1, 0.25];
export function cloudStats(geometry) {
  const ud = geometry.userData || (geometry.userData = {}); if (ud.fluxStats) return ud.fluxStats;
  // fluxKeep (optional, geometry.userData): the points still drawn when the cloud is small on screen (the HYG field's
  // volume-complete subset, transition.js); the statistics are of those points only.
  const P0 = geometry.attributes.position, keep = ud.fluxKeep, idx = []; for (let i = 0; i < P0.count; i++) if (!keep || keep[i]) idx.push(i);
  const pos = { getX: i => P0.getX(idx[i]), getY: i => P0.getY(idx[i]), getZ: i => P0.getZ(idx[i]) }, n = idx.length, r = new Float64Array(n), med = get => { for (let i = 0; i < n; i++) r[i] = get(i); r.sort(); return r[n >> 1]; };
  const c = n ? { x: med(i => pos.getX(i)), y: med(i => pos.getY(i)), z: med(i => pos.getZ(i)) } : { x: 0, y: 0, z: 0 };
  const q = f => r[Math.min(n - 1, Math.max(0, Math.floor(f * (n - 1))))];
  for (let i = 0; i < n; i++) r[i] = Math.hypot(pos.getX(i) - c.x, pos.getY(i) - c.y, pos.getZ(i) - c.z);
  r.sort(); const R90 = n ? q(0.9) : 0, Cax = [1, 1, 1];
  for (let ax = 0; ax < 3 && n; ax++) {
    for (let i = 0; i < n; i++) { const dx = pos.getX(i) - c.x, dy = pos.getY(i) - c.y, dz = pos.getZ(i) - c.z; r[i] = ax === 0 ? Math.hypot(dy, dz) : ax === 1 ? Math.hypot(dx, dz) : Math.hypot(dx, dy); }
    r.sort(); for (const f of FLUX_Q) { const Rq = q(f); if (Rq > 0 && R90 > 0) Cax[ax] = Math.max(Cax[ax], f * (R90 / Rq) ** 2); }
  }
  // The least concentrated of the three views: a flat disc is not given its edge-on column (that would dim the Milky
  // Way in its own face-on view); a round cloud (the NGC catalogue, centred on us) gets its full column either way.
  const C = Math.min(...Cax);
  return (ud.fluxStats = { R90, C, Cax, n, centre: c });
}
// Saturation onset. Inside FLUX_PX a fixed-pixel cloud keeps a constant surface brightness (total light ∝ px²): at
// its densest part, C N size² opacity / (π P²) of point area × opacity per px² once dimming starts at footprint P.
// Points overlap at random there, so a pixel goes white long before that mean reaches 1 (two points of opacity 0.75
// already clip): the dimming starts early enough that the mean stays at SAT or below:
// P = max(FLUX_PX, √(C N size² opacity / (π SAT))). Scale-free, so a copy and its source get the same P.
// SAT is set from the CPU model of the sweep (probe in docs/shots/powers-of-ten/EVIDENCE.md), not derived: it is the
// one tuned constant here and the browser sweep (tools/sweep.mjs) is what accepts or rejects it.
export const SAT = 0.2;
export const fluxOnset = (C, N, size, opacity) => Math.max(FLUX_PX, Math.sqrt(C * N * size * size * opacity / (Math.PI * SAT)));
export const fluxFadeAt = (px, P) => px >= P ? 1 : (px / P) ** 2;
// Markers merging into each other: brightest first; each marker fades by mergeFade of its screen distance to every
// brighter marker still drawn (1 − (1 − f) × presence of that marker). Nobody is ever brightened: the group's drawn
// light falls smoothly from the sum of its members (apart) to its brightest member (on top of each other), so a pile
// of fixed-pixel glows can never add up to more than its brightest one. Pure, allocation-free with caller arrays.
export function mergeGroups(n, sx, sy, light, order, keep) {
  for (let i = 0; i < n; i++) order[i] = i;
  for (let i = 1; i < n; i++) { const k = order[i]; let j = i - 1; while (j >= 0 && light[order[j]] < light[k]) { order[j + 1] = order[j]; j--; } order[j + 1] = k; }
  for (let a = 0; a < n; a++) { const i = order[a]; let m = 1;
    for (let b = 0; b < a; b++) { const j = order[b]; if (keep[j] <= 0) continue; const f = mergeFade(Math.hypot(sx[i] - sx[j], sy[i] - sy[j])); const v = 1 - (1 - f) * keep[j]; if (v < m) m = v; }
    keep[i] = m; }
}
// The safety net (applied after the causes above): point layers meant to read as separate stars may be drawn with
// max blending (THREE.CustomBlending + MaxEquation, premultiplied so opacity still applies): overlapping stars of one
// layer show the brightest, never a sum, so they cannot clip to white. Cheap: no extra pass. Toggle with setStarBlend.
export const STAR_BLEND = { mode: 'max' };
const starMats = new Set();
function applyStarBlend(m) { const max = STAR_BLEND.mode === 'max'; const was = m.blending;
  m.blending = max ? 5 : 2; m.blendEquation = 100; m.blendEquationAlpha = null; if (max) { m.blendEquation = 104; m.blendEquationAlpha = 104; } // 5 CustomBlending, 2 Additive; 100 Add, 104 Max
  if (m.premultipliedAlpha !== max || was !== m.blending) { m.premultipliedAlpha = max; m.needsUpdate = true; } }
export function starLayer(m) { m.userData.starLayer = true; starMats.add(m); applyStarBlend(m); return m; }
export function setStarBlend(mode) { STAR_BLEND.mode = mode === 'add' ? 'add' : 'max'; for (const m of starMats) applyStarBlend(m); return STAR_BLEND.mode; }
export const densityFade = (N, px) => 1 - logStep(N / (Math.PI * px * px), DENSITY[0], DENSITY[1]);
export { logStep };
// seam: null (not in a seam) or { role: 'inner' | 'outer', t } with t from 0 (inner end) to 1 (outer end).
export const seamWindow = seam => !seam ? 1 : seam.role === 'inner' ? 1 - smooth((seam.t - (1 - WINDOW)) / WINDOW) : smooth(seam.t / WINDOW);
export const swapFade = seam => !seam ? 1 : ((seam.role === 'inner') === (seam.t < 0.5) ? 1 : 0);
export const crossFade = seam => !seam ? 1 : seam.role === 'inner' ? 1 - smooth(seam.t) : smooth(seam.t);
// A rule is a kind, or { inner, outer, alone } picking a kind by the scene's role in the current seam.
export const kindOf = (rule, seam) => typeof rule === 'string' ? rule : (seam ? rule[seam.role] : rule.alone) ?? rule.alone ?? 'size';
export function ruleFade(kind, { px = Infinity, mergePx = Infinity, seam = null } = {}) {
  switch (kind) {
    case 'proxy': return swapFade(seam);
    case 'model': return crossFade(seam);
    case 'fixed': return seamWindow(seam);
    case 'hidden': return 0;
    case 'marker': return mergeFade(mergePx) * seamWindow(seam);
    default: return sizeFade(px) * seamWindow(seam);
  }
}
// One LOD set per scene. add(object, rule, { L, centre, at }) registers a drawn object (by default its geometry's
// bounding sphere gives L and the centre; `at` is a live world position for a marker drawn by a line, e.g. a
// star's stem); objects sharing a material share the brightest fade among them.
export function createLod() {
  const entries = [], byMat = new Map();
  const c = { x: 0, y: 0, z: 0 };
  function add(o, rule = 'size', { L = null, centre = null, at = null, appear = null, N = 0, flux = null } = {}) {
    const mat = o.material; if (!mat) return;
    let e = byMat.get(mat);
    if (!e) { e = { mat, base: mat.userData.base ?? mat.opacity, rule, objs: [], fade: 1 }; mat.userData.base = e.base; mat.transparent = true; byMat.set(mat, e); entries.push(e); }
    let len = L, cen = centre;
    if (len == null || cen == null) { const g = o.geometry; if (g && !g.boundingSphere && g.computeBoundingSphere) g.computeBoundingSphere(); const bs = g?.boundingSphere; if (len == null) len = bs ? bs.radius : 0; if (cen == null) cen = bs ? bs.center : null; }
    if (mat.userData.starLayer) starMats.add(mat);
    const fx = flux ?? FLUX_AUTO(o), Np = o.isPoints ? o.geometry.attributes.position.count : 0, thin = fx && Np > THIN_MIN && o.geometry.setIndex;
    if (thin) thinOrder(o.geometry);
    let Lf = len, P = FLUX_PX, fc = cen; if (fx && o.isPoints) { const st = cloudStats(o.geometry); Lf = st.R90; fc = st.centre; P = fluxOnset(st.C, st.n, mat.size ?? 1, e.base); }
    const it = { o, L: len, cen, fc, at, appear, N, flux: fx, thin, Np, Lf, P, g: 0, glow: GLOW_AUTO(o) && !at };
    e.rule = rule; e.objs.push(it); if (it.glow) { glows.push(it); grow(); }
  }
  // Scratch for merging glows, grown at add time only (never per frame).
  const glows = []; let gx = new Float64Array(0), gy = gx, gl = gx, gk = gx, go = new Int32Array(0), gi = go;
  function grow() { const n = glows.length; if (gx.length >= n) return; const m = Math.max(16, n * 2); gx = new Float64Array(m); gy = new Float64Array(m); gl = new Float64Array(m); gk = new Float64Array(m); go = new Int32Array(m); gi = new Int32Array(m); }
  const clip = { x: 0, y: 0, w: 1 };
  function toScreen(p, camera, vh) { const e = camera.matrixWorldInverse.elements, P = camera.projectionMatrix.elements;
    const x = e[0] * p.x + e[4] * p.y + e[8] * p.z + e[12], y = e[1] * p.x + e[5] * p.y + e[9] * p.z + e[13], z = e[2] * p.x + e[6] * p.y + e[10] * p.z + e[14], w = e[3] * p.x + e[7] * p.y + e[11] * p.z + e[15];
    const cx = P[0] * x + P[4] * y + P[8] * z + P[12] * w, cy = P[1] * x + P[5] * y + P[9] * z + P[13] * w, cw = P[3] * x + P[7] * y + P[11] * z + P[15] * w;
    if (!(cw > 0)) return false; clip.x = cx / cw * vh * (camera.aspect || 1) / 2; clip.y = cy / cw * vh / 2; return true; }
  const has = o => byMat.has(o.material);
  // cam: camera position; anchor: the anchor's world position; vh: visible height (px); fov: degrees.
  // camera (optional): the scene's camera, for merging fixed-pixel glows into each other on screen.
  function update(cam, anchor, vh, fov, seam, camera = null) {
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i], kind = kindOf(e.rule, seam); e.kind = kind;
      for (let j = 0; j < e.objs.length; j++) {
        const it = e.objs[j], o = it.o, p = it.at || o.position, k = it.at ? 1 : (o.scale?.x ?? 1); // the centre is in geometry units: scaled with the object
        let g;
        if (kind === 'size') {
          c.x = p.x + (it.cen ? it.cen.x * k : 0); c.y = p.y + (it.cen ? it.cen.y * k : 0); c.z = p.z + (it.cen ? it.cen.z * k : 0);
          const D = Math.hypot(c.x - cam.x, c.y - cam.y, c.z - cam.z);
          g = ruleFade(kind, { px: apparentPx(it.L * (o.scale?.x ?? 1), D, vh, fov), seam });
        } else if (kind === 'marker') {
          const D = Math.hypot(p.x - cam.x, p.y - cam.y, p.z - cam.z), off = Math.hypot(p.x - anchor.x, p.y - anchor.y, p.z - anchor.z);
          g = off === 0 ? seamWindow(seam) : ruleFade(kind, { mergePx: apparentPx(off, D, vh, fov), seam });
        } else g = ruleFade(kind, { seam });
        // appear: [a, b]: drawn only once the camera is out past the object (camera–anchor distance a → b, log).
        if (it.appear) g *= logStep(Math.hypot(cam.x - anchor.x, cam.y - anchor.y, cam.z - anchor.z), it.appear[0], it.appear[1]);
        // N: a catalogue of N points gives way as it crowds on screen (mean spacing below a few px): its apparent
        // density, N over the area of its bounding disc, fades it from 0.05 to 0.5 points per px².
        if (it.N) { const c2x = p.x + (it.cen ? it.cen.x * k : 0), c2y = p.y + (it.cen ? it.cen.y * k : 0), c2z = p.z + (it.cen ? it.cen.z * k : 0), px = apparentPx(it.L * (o.scale?.x ?? 1), Math.hypot(c2x - cam.x, c2y - cam.y, c2z - cam.z), vh, fov); g *= densityFade(it.N, px); }
        // Flux: the footprint is R90 about the cloud's median point, seen from the camera.
        if (it.flux && g > 0) { const c3x = p.x + (it.fc ? it.fc.x * k : 0), c3y = p.y + (it.fc ? it.fc.y * k : 0), c3z = p.z + (it.fc ? it.fc.z * k : 0); const px3 = apparentPx(it.Lf * (o.scale?.x ?? 1), Math.hypot(c3x - cam.x, c3y - cam.y, c3z - cam.z), vh, fov); g *= fluxFadeAt(px3, it.P);
          if (it.thin) { const n = thinCount(it.Np, px3, g * e.base); o.geometry.setDrawRange(0, n); g *= it.Np / n; } }
        else if (it.thin) o.geometry.setDrawRange(0, it.Np);
        it.g = g;
      }
    }
    // Fixed-pixel glows drawn as markers merge into each other (brightest kept, the rest fade; never brightened).
    if (camera && glows.length) {
      camera.updateMatrixWorld?.(); let n = 0;
      for (let a = 0; a < glows.length; a++) { const it = glows[a], e = byMat.get(it.o.material); if (e.kind !== 'marker' || !(it.g > 0) || it.o.visible === false || !toScreen(it.o.position, camera, vh)) continue;
        const px = it.o.userData.px || 1, c = it.o.material.color; gx[n] = clip.x; gy[n] = clip.y; gl[n] = it.g * e.base * px * px * (c ? 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b : 1); gi[n] = a; n++; }
      mergeGroups(n, gx, gy, gl, go, gk);
      for (let a = 0; a < n; a++) glows[gi[a]].g *= gk[a];
    }
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i]; let f = 0;
      for (let j = 0; j < e.objs.length; j++) { const it = e.objs[j]; it.o.userData.fade = it.g; if (it.g > f) f = it.g; }
      // A material faded to nothing is not drawn at all (no vertex or fragment work for a hidden layer).
      e.fade = f; e.mat.opacity = e.base * f; e.mat.visible = f > 1e-5;
    }
  }
  return { add, has, update, entries, glows };
}
