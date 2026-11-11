// The scale readout (hud.js) and prefers-reduced-motion in the real app (linkedom).
import test from 'node:test';import assert from 'node:assert/strict';
import { viewWidth, formatLy, formatLight, hudText, OBSERVABLE_LY } from '../hud.js';
import { AU_LY } from '../zoom-ladder.js';
import { bootApp } from './integration-harness.js';
test('view width is 2·D·tan(fov/2)·aspect', () => {
  assert.ok(Math.abs(viewWidth(1, 90, 1) - 2) < 1e-12); assert.ok(Math.abs(viewWidth(10, 50, 412 / 915) - 20 * Math.tan(25 * Math.PI / 180) * 412 / 915) < 1e-12);
});
test('units roll over: km → AU → light-years → thousand → million → billion ly; light time s → … → billion years', () => {
  assert.match(formatLy(1e-9), / km$/); assert.equal(formatLy(1 * AU_LY), '1 AU'); assert.equal(formatLy(121.6 * AU_LY), '122 AU');
  assert.equal(formatLy(4.2), '4.2 light-years'); assert.equal(formatLy(26000), '26 thousand light-years'); assert.equal(formatLy(2.5e6), '2.5 million light-years'); assert.equal(formatLy(9.3e10), '93 billion light-years');
  assert.match(formatLight(1 * AU_LY), /^8.3 minutes$/); assert.match(formatLight(30 / 365.25), /^30 days$/); assert.equal(formatLight(1e5), '100 thousand years'); assert.equal(formatLight(1e10), '10 billion years');
  let prev = 0; for (let ly = 1e-8; ly < 1e11; ly *= 1.37) { const n = parseFloat(formatLy(ly).replace(/,/g, '')); assert.ok(n > 0); prev = n; }
});
test('caveats: compressed Solar model, off-Sun centre, viewpoint beyond the observable universe', () => {
  assert.match(hudText({ widthLy: 1e-4, sunLy: 1e-4, model: true }).note, /compressed/); assert.match(hudText({ widthLy: 1e-4, sunLy: 1e-4, model: true }).lines[0], /^View ≈ /);
  assert.match(hudText({ widthLy: 1e5, sunLy: 3e4, offSun: true }).note, /away from the Sun/);
  assert.match(hudText({ widthLy: 1e11, sunLy: OBSERVABLE_LY * 1.5 }).note, /outside the observable universe/); assert.equal(hudText({ widthLy: 10, sunLy: 5 }).note, '');
});
test('the readout follows the zoom continuously in the real app, and only rewrites text that changed', async () => {
  const a = await bootApp({ fakeClock: true }); a.step(40); const hud = a.document.getElementById('hud');
  assert.ok(hud && !hud.hidden); assert.equal(hud.getAttribute('aria-hidden'), 'true'); assert.match(hud.textContent, /AU across/);
  const wheel = dy => { const e = new a.window.Event('wheel', { cancelable: true }); Object.assign(e, { deltaY: dy, deltaMode: 0 }); a.canvas.dispatchEvent(e); };
  const seen = new Set(); for (let i = 0; i < 900 && a.lab.state.value.view !== 'galaxy'; i++) { wheel(120); a.step(1); seen.add(hud.querySelector('.hud-view').textContent.replace(/[\d.,≈ ]+/g, '#')); }
  for (let i = 0; i < 30; i++) a.step(1);
  assert.equal(a.lab.state.value.view, 'galaxy'); assert.match(hud.textContent, /thousand light-years across/); assert.match(hud.textContent, /years/);
  for (const u of ['AU', 'light-years']) assert.ok([...seen].some(s => s.includes(u)), `rolled through ${u}: ${[...seen].join(' | ')}`);
  assert.equal(a.errors.length, 0);
});
test('prefers-reduced-motion: a wheel step lands at once (no easing, no momentum) and the ladder settles instantly', async () => {
  const a = await bootApp({ fakeClock: true, reducedMotion: true }); a.step(40);
  const z0 = a.lab.Zcam, e = new a.window.Event('wheel', { cancelable: true }); Object.assign(e, { deltaY: 120, deltaMode: 0 }); a.canvas.dispatchEvent(e); a.step(1);
  const z1 = a.lab.Z; a.step(5); assert.ok(z1 > z0); assert.equal(a.lab.Z, z1, 'nothing keeps moving after the step'); assert.equal(a.lab.zoom.moving, false);
  a.document.querySelector('#ladder [data-level="galaxy"]').onclick(); a.step(2);
  assert.equal(a.lab.state.value.view, 'galaxy', 'arrived without an animated glide'); assert.equal(a.lab.animating, false);
  assert.equal(a.errors.length, 0);
});
