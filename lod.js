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
const FLUX_AUTO = o => o.isPoints && o.material && o.material.sizeAttenuation === false && o.material.blending === 2; // THREE.AdditiveBlending
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
    const fx = flux ?? (!N && FLUX_AUTO(o)), Np = o.isPoints ? o.geometry.attributes.position.count : 0, thin = fx && Np > THIN_MIN && o.geometry.setIndex;
    if (thin) thinOrder(o.geometry);
    e.rule = rule; e.objs.push({ o, L: len, cen, at, appear, N, flux: fx, thin, Np });
  }
  const has = o => byMat.has(o.material);
  // cam: camera position; anchor: the anchor's world position; vh: visible height (px); fov: degrees.
  function update(cam, anchor, vh, fov, seam) {
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i], kind = kindOf(e.rule, seam); let f = 0;
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
        if (it.flux && g > 0) { const c3x = p.x + (it.cen ? it.cen.x * k : 0), c3y = p.y + (it.cen ? it.cen.y * k : 0), c3z = p.z + (it.cen ? it.cen.z * k : 0); const px3 = apparentPx(it.L * (o.scale?.x ?? 1), Math.hypot(c3x - cam.x, c3y - cam.y, c3z - cam.z), vh, fov); g *= fluxFade(px3);
          if (it.thin) { const n = thinCount(it.Np, px3, g * e.base); o.geometry.setDrawRange(0, n); g *= it.Np / n; } }
        else if (it.thin) o.geometry.setDrawRange(0, it.Np);
        o.userData.fade = g; if (g > f) f = g;
      }
      // A material faded to nothing is not drawn at all (no vertex or fragment work for a hidden layer).
      e.fade = f; e.mat.opacity = e.base * f; e.mat.visible = f > 1e-5;
    }
  }
  return { add, has, update, entries };
}
