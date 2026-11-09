import test from 'node:test'; import assert from 'node:assert/strict';
import { createPlacer, showLabel, placeAll, labelWidth, forgetLabel } from '../labels.js';
const el = text => { const writes = { transform: 0, opacity: 0, visibility: 0 }; const style = {}; return { textContent: text, hidden: false, writes, style: new Proxy(style, { set(o, k, v) { writes[k] = (writes[k] || 0) + 1; o[k] = v; return true; } }) }; };
test('labels write the DOM only when something visible changes', () => {
  const it = { el: el('Sirius') };
  showLabel(it, true, 10, 20, 4, 1); assert.equal(it.el.writes.transform, 1); assert.equal(it.el.writes.opacity, 1);
  for (let i = 0; i < 50; i++) showLabel(it, true, 10.01, 20.02, 4, 0.999); assert.equal(it.el.writes.transform, 1, 'sub-0.05 px moves are not written'); assert.equal(it.el.writes.opacity, 1);
  showLabel(it, true, 12, 20, 4, 0.5); assert.equal(it.el.writes.transform, 2); assert.equal(it.el.writes.opacity, 2);
  showLabel(it, false); showLabel(it, false); assert.equal(it.el.hidden, true); assert.equal(it.el.writes.visibility, 2);
  it.el.hidden = false; forgetLabel(it); showLabel(it, false); assert.equal(it.el.hidden, true, 'forget makes the next placement write again');
});
test('placer: overlapping lower-priority labels are hidden; off-screen labels are hidden; no allocation per item', () => {
  const p = createPlacer(8), a = { el: el('Sun'), x: 0, y: 0 }, b = { el: el('Moon'), x: 0.001, y: 0 }, c = { el: el('Far'), x: 5, y: 0 }, d = { el: el('Mars'), x: 0.5, y: 0.5 };
  const items = [a, b, c, d], bounds = { left: 0, top: 0, width: 400, height: 800 };
  placeAll(items, 4, p, bounds, (it, o) => { o.x = it.x; o.y = it.y; o.z = 0; return true; });
  assert.equal(a.el.hidden, false); assert.equal(b.el.hidden, true); assert.equal(c.el.hidden, true); assert.equal(d.el.hidden, false); assert.equal(p.count, 2);
  assert.equal(labelWidth(a), 'Sun'.length * 5.4 + 12);
  placeAll(items, 4, p, bounds, () => true, { enabled: false }); assert.ok(items.every(i => i.el.hidden));
});
