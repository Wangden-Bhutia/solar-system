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
// Show or hide one label; translate it so it sits `off` px above (x, y). Writes only what changed.
export function showLabel(item, on, x = 0, y = 0, off = 0, opacity = 1) {
  const el = item.el, c = item.c || (item.c = { on: null, x: NaN, y: NaN, off: NaN, op: NaN });
  if (c.on !== on) { el.hidden = !on; el.style.visibility = on ? 'visible' : 'hidden'; c.on = on; }
  if (!on) return;
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
    if (y0 < SAFE.top || !placer.free(x0, y0, x1, y1)) { showLabel(it, false); continue; }
    placer.add(x0, y0, x1, y1); showLabel(it, true, x, y, off, opacity ? opacity(it) : 1);
  }
}
