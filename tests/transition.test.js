// Phase 3 transition layers (transition.js): decoded catalogues and illustrative samples, pure maths only.
import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../transition.js';
import { densityFade, DENSITY } from '../lod.js';
import { R0, KPC } from '../galaxy-data.js';
test('HYG v4.1 layer: 7,696 naked-eye stars within 1,000 ly, Sirius where the catalogue puts it', () => {
  const s = T.hygStars(); assert.equal(s.count, 7696);
  for (let i = 0; i < s.count; i++) { assert.ok(s.ly[i] > 0 && s.ly[i] <= 1000.01); assert.ok(s.mag[i] <= 6.5 + 1e-6); }
  let k = 0; for (let i = 1; i < s.count; i++) if (s.mag[i] < s.mag[k]) k = i; // brightest after the Sun: Sirius
  assert.ok(Math.abs(s.mag[k] + 1.44) < 0.06 && Math.abs(s.ly[k] - 8.6) < 0.1 && Math.abs(s.ra[k] - 101.29) < 0.05, `${s.mag[k]} ${s.ly[k]} ${s.ra[k]}`);
  near5(T.bvTemp(0.65), 5800, 250);
});
function near5(a, b, e) { assert.ok(Math.abs(a - b) <= e, `${a} ≈ ${b}`); }
test('Harris globular clusters: 157, 47 Tuc 4.5 kpc from the Sun at (l 305.89, b −44.89)', () => {
  const p = T.globularPositions(1); assert.equal(p.length, 157 * 3);
  near5(Math.hypot(p[0] + R0, p[1], p[2]), 4.5 * KPC, 0.02); near5(p[1], 4.5 * KPC * Math.sin(-44.89 * Math.PI / 180), 0.02);
});
test('illustrations follow their published sizes', () => {
  const o = T.oortPositions(); for (let i = 0; i < o.length; i += 3) { const r = Math.hypot(o[i], o[i + 1], o[i + 2]); assert.ok(r >= 2000 - 1e-6 && r <= 100000 + 1e-3); }
  const h = T.haloPositions(); for (let i = 0; i < h.length; i += 3) assert.ok(Math.hypot(h[i], h[i + 1] / T.HALO.q, h[i + 2]) <= 300.01);
  const n = T.galDir(...T.SGR_POLE), sg = T.sgrPositions(); let off = 0; for (let i = 0; i < sg.length; i += 3) off += Math.abs(sg[i] * n[0] + sg[i + 1] * n[1] + sg[i + 2] * n[2]); assert.ok(off / (sg.length / 3) < 2 * KPC, 'the stream lies in its orbital plane');
  const sh = T.sheetPositions(); for (let i = 0; i < sh.length; i += 3) assert.ok(Math.hypot(sh[i], sh[i + 1], sh[i + 2]) <= 17 + 3);
  assert.equal(T.HELIO.heliopauseAU, 121.6); near5(Math.hypot(...T.voidCentre()), 75, 1e-9);
  const g = T.giants(); assert.equal(g.length, 9); for (const x of g) near5(Math.hypot(...x.pos.map((v, k) => v + (k === 0 ? R0 / 1000 : 0))), x.mly, 1e-6);
});
test('density rule: a catalogue gives way as it crowds on screen', () => {
  const N = 9696, px = d => Math.sqrt(N / (Math.PI * d));
  assert.equal(densityFade(N, px(DENSITY[0] * 0.9)), 1); assert.equal(densityFade(N, px(DENSITY[1] * 1.1)), 0);
  let last = 1; for (let d = 0.01; d < 1; d *= 1.2) { const f = densityFade(N, px(d)); assert.ok(f <= last + 1e-12); last = f; }
});
