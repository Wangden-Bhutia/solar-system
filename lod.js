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
  function add(o, rule = 'size', { L = null, centre = null, at = null } = {}) {
    const mat = o.material; if (!mat) return;
    let e = byMat.get(mat);
    if (!e) { e = { mat, base: mat.userData.base ?? mat.opacity, rule, objs: [], fade: 1 }; mat.userData.base = e.base; mat.transparent = true; byMat.set(mat, e); entries.push(e); }
    let len = L, cen = centre;
    if (len == null || cen == null) { const g = o.geometry; if (g && !g.boundingSphere && g.computeBoundingSphere) g.computeBoundingSphere(); const bs = g?.boundingSphere; if (len == null) len = bs ? bs.radius : 0; if (cen == null) cen = bs ? bs.center : null; }
    e.rule = rule; e.objs.push({ o, L: len, cen, at });
  }
  const has = o => byMat.has(o.material);
  // cam: camera position; anchor: the anchor's world position; vh: visible height (px); fov: degrees.
  function update(cam, anchor, vh, fov, seam) {
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i], kind = kindOf(e.rule, seam); let f = 0;
      for (let j = 0; j < e.objs.length; j++) {
        const it = e.objs[j], o = it.o, p = it.at || o.position;
        let g;
        if (kind === 'size') {
          c.x = p.x + (it.cen ? it.cen.x : 0); c.y = p.y + (it.cen ? it.cen.y : 0); c.z = p.z + (it.cen ? it.cen.z : 0);
          const D = Math.hypot(c.x - cam.x, c.y - cam.y, c.z - cam.z);
          g = ruleFade(kind, { px: apparentPx(it.L * (o.scale?.x ?? 1), D, vh, fov), seam });
        } else if (kind === 'marker') {
          const D = Math.hypot(p.x - cam.x, p.y - cam.y, p.z - cam.z), off = Math.hypot(p.x - anchor.x, p.y - anchor.y, p.z - anchor.z);
          g = off === 0 ? seamWindow(seam) : ruleFade(kind, { mergePx: apparentPx(off, D, vh, fov), seam });
        } else g = ruleFade(kind, { seam });
        o.userData.fade = g; if (g > f) f = g;
      }
      e.fade = f; e.mat.opacity = e.base * f;
    }
  }
  return { add, has, update, entries };
}
