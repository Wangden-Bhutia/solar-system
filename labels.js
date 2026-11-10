// Name labels over the 3D scenes, placed without per-frame garbage: callers keep one item object per label
// ({ el, pos, px, ... }) and one placer; screen boxes go into a preallocated typed array, and the DOM is
// written only when a label's visibility, position (to 0.1 px), offset or opacity actually changes.
// Pure apart from the element writes; no THREE import (callers project their own positions).
export function createPlacer(capacity = 512) {
  const box = new Float64Array(capacity * 4); let n = 0;
  return {
    reset() { n = 0; },
    get count() { return n; },
    // Does a box overlap one already placed?
    free(x0, y0, x1, y1) { for (let i = 0, m = n * 4; i < m; i += 4) if (x0 < box[i + 2] && x1 > box[i] && y0 < box[i + 3] && y1 > box[i + 1]) return false; return true; },
    add(x0, y0, x1, y1) { if (n >= capacity) return; const i = n * 4; box[i] = x0; box[i + 1] = y0; box[i + 2] = x1; box[i + 3] = y1; n++; },
  };
}
// Width of a label tag (matches .lbl: 8 px text, 5 px side padding), cached per text.
// 5.4 px per character (bold 8 px text, measured wider than the old 4.9 estimate: QA saw faint Universe labels touch)
// plus 2 px clearance, so boxes that test free do not overlap on screen.
export function labelWidth(item) { const t = item.el.textContent; if (item.wText !== t) { item.wText = t; item.w = t.length * 5.4 + 12; } return item.w; }
// Screen band kept clear of labels: the top controls (Journeys, menu, scale ladder). Set by lab.js on layout.
export const SAFE = { top: 0 };

// ---- One placement per frame, shared by every scene and the seam's "you are here" anchor ----
// Every label drawn in a frame (the Solar System's names, a scale's names, the anchor) claims its screen box in one
// frame-wide list, so labels from different placers can never overlap. Deterministic: each placer goes through its
// items in its own priority order (importance, then brightness / rank), and the anchor, which matters most, evicts
// whatever lies under it. Exclusion rects (the open sheet, the time bar, the scale readout; set by lab.js from their
// real getBoundingClientRect each frame) and the top band (SAFE.top) are never covered.
// Hysteresis, so names do not flicker in a continuous zoom: a label already on screen keeps its place while its box
// is clear; a label not on screen comes back only once its box is clear by HYST_PX on every side and, if it was
// hidden by a collision, at least HOLD_FRAMES frames after that. Typed arrays allocated once; no per-frame allocation.
export const HYST_PX = 4, HOLD_FRAMES = 8, FRAME_CAP = 1024;
const FB = new Float64Array(FRAME_CAP * 4), FI = new Array(FRAME_CAP); let fn = 0, frameNo = 1;
export const EXCL = { n: 0, r: new Float64Array(16 * 4), w: Infinity, h: Infinity };
export function beginLabelFrame() { fn = 0; frameNo++; }
export const labelFrame = () => frameNo;
// Exclusions for this frame: rects as [x0, y0, x1, y1] (a hidden element passes null). w, h: the viewport.
export function setExclusions(rects, w = Infinity, h = Infinity) {
  EXCL.n = 0; EXCL.w = w; EXCL.h = h;
  for (const r of rects) { if (!r || !(r[2] > r[0]) || !(r[3] > r[1]) || EXCL.n >= 16) continue; const i = EXCL.n * 4; EXCL.r[i] = r[0]; EXCL.r[i + 1] = r[1]; EXCL.r[i + 2] = r[2]; EXCL.r[i + 3] = r[3]; EXCL.n++; }
}
// Is a box clear of the frame's placed labels (except `self`), the exclusions and the top band, by `m` px?
export function frameFree(x0, y0, x1, y1, m = 0, self = null) {
  x0 -= m; y0 -= m; x1 += m; y1 += m;
  if (y0 < SAFE.top) return false;
  for (let i = 0, k = EXCL.n * 4; i < k; i += 4) if (x0 < EXCL.r[i + 2] && x1 > EXCL.r[i] && y0 < EXCL.r[i + 3] && y1 > EXCL.r[i + 1]) return false;
  for (let i = 0; i < fn; i++) { if (FI[i] === self || FI[i] === null) continue; const j = i * 4; if (x0 < FB[j + 2] && x1 > FB[j] && y0 < FB[j + 3] && y1 > FB[j + 1]) return false; }
  return true;
}
// Record a placed box for this frame (a second claim by the same item this frame replaces its first).
export function frameClaim(item, x0, y0, x1, y1) {
  let i = item._ff === frameNo ? item._fi : -1;
  if (i < 0) { if (fn >= FRAME_CAP) return false; i = fn++; item._ff = frameNo; item._fi = i; FI[i] = item; }
  const j = i * 4; FB[j] = x0; FB[j + 1] = y0; FB[j + 2] = x1; FB[j + 3] = y1; return true;
}
// Free an item's claim this frame (it is being hidden).
function frameRelease(item) { if (item._ff === frameNo) { FI[item._fi] = null; item._ff = 0; } }
// The hysteresis test for one candidate box: is it on screen now, and may it be (re)shown?
export function mayShow(item, x0, y0, x1, y1) {
  const was = !!(item.c && item.c.on);
  if (was) return frameFree(x0, y0, x1, y1, 0, item);
  if (item._hid && frameNo - item._hid < HOLD_FRAMES) return false;
  return frameFree(x0, y0, x1, y1, HYST_PX, item);
}
// A label that must show (the anchor): it claims its box and hides every label already placed under it.
export function frameEvict(self, x0, y0, x1, y1) {
  for (let i = 0; i < fn; i++) { const it = FI[i]; if (!it || it === self) continue; const j = i * 4;
    if (x0 < FB[j + 2] && x1 > FB[j] && y0 < FB[j + 3] && y1 > FB[j + 1]) { FI[i] = null; it._ff = 0; it._hid = frameNo; (it.hideNow || hideItem)(it); } }
  frameClaim(self, x0, y0, x1, y1);
}
const hideItem = it => showLabel(it, false);
// Boxes placed this frame (tests and diagnostics): [[x0, y0, x1, y1, text], ...]. Allocates: not for the frame loop.
export function frameBoxes() { const out = []; for (let i = 0; i < fn; i++) if (FI[i]) { const j = i * 4; out.push([FB[j], FB[j + 1], FB[j + 2], FB[j + 3], FI[i].el?.textContent ?? '']); } return out; }
// Show or hide one label; translate it so it sits `off` px above (x, y). Writes only what changed.
export function showLabel(item, on, x = 0, y = 0, off = 0, opacity = 1) {
  const el = item.el, c = item.c || (item.c = { on: null, x: NaN, y: NaN, off: NaN, op: NaN });
  if (c.on !== on) { el.hidden = !on; el.style.visibility = on ? 'visible' : 'hidden'; c.on = on; }
  if (!on) { frameRelease(item); return; }
  if (Math.abs(c.x - x) > 0.05 || Math.abs(c.y - y) > 0.05 || c.off !== off) { el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,calc(-100% - ${off}px))`; c.x = x; c.y = y; c.off = off; }
  const q = Math.round(Math.max(0, Math.min(1, opacity)) * 100) / 100;
  if (c.op !== q) { el.style.opacity = String(q); c.op = q; }
}
// After code elsewhere set el.hidden directly, forget the cached state so the next placement writes again.
export const forgetLabel = item => { if (item.c) item.c.on = null; };
// The usual placement loop for a scene: items in priority order, each projected with `project(item, out)`
// (fills out.x, out.y in NDC and out.z; returns false to skip), hidden when off screen or overlapping a
// higher-priority label. visible(item) may veto; opacity(item) sets each label's opacity.
const ndc = { x: 0, y: 0, z: 0 };
export function placeAll(items, count, placer, bounds, project, { enabled = true, visible = null, opacity = null } = {}) {
  placer.reset();
  for (let i = 0; i < count; i++) {
    const it = items[i];
    if (!enabled || (visible && !visible(it)) || !project(it, ndc) || ndc.z >= 1 || Math.abs(ndc.x) >= 1.02 || Math.abs(ndc.y) >= 1.02) { showLabel(it, false); continue; }
    const x = bounds.left + (ndc.x + 1) / 2 * bounds.width, y = bounds.top + (1 - ndc.y) / 2 * bounds.height;
    const w = labelWidth(it), off = (it.px || 0) / 2 + 4, x0 = x - w / 2, y0 = y - off - 13, x1 = x + w / 2, y1 = y - off;
    if (!placer.free(x0, y0, x1, y1) || !mayShow(it, x0, y0, x1, y1)) { if (it.c?.on) it._hid = frameNo; showLabel(it, false); continue; }
    placer.add(x0, y0, x1, y1); frameClaim(it, x0, y0, x1, y1); showLabel(it, true, x, y, off, opacity ? opacity(it) : 1);
  }
}
