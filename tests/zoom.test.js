import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { ZOOM_SPEED, WHEEL_GAIN, PINCH_GAIN, wheelPixels, wheelZ, pinchZ, createZoomController } from '../zoom.js';
import { SEAM_Z } from '../zoom-ladder.js';
const near = (a, b, e = 1e-12) => assert.ok(Math.abs(a - b) <= e * Math.max(1, Math.abs(b)), `${a} vs ${b}`);
// The scenes' OrbitControls (vendor/OrbitControls.js r170) as it zoomed before: radius × 0.95^(zoomSpeed × |Δ| × 0.01) per wheel
// event (in for Δ < 0), Δ ×16 for lines, ×100 for pages, ×10 when ctrl is held (trackpad pinch); touch: × (start/end)^zoomSpeed.
const orbitWheel = (r, dy, mode = 0, ctrl = false) => { let d = dy * (mode === 1 ? 16 : mode === 2 ? 100 : 1); if (ctrl) d *= 10; const s = 0.95 ** (ZOOM_SPEED * Math.abs(d * 0.01)); return d < 0 ? r * s : d > 0 ? r / s : r; };
const orbitPinch = (r, start, end) => r / (end / start) ** ZOOM_SPEED;

test('the vendored OrbitControls still uses the formulas this gain was derived from', () => {
  const src = fs.readFileSync('vendor/OrbitControls.js', 'utf8');
  assert.match(src, /Math\.abs\( delta \* 0\.01 \)/); assert.match(src, /Math\.pow\( 0\.95, this\.zoomSpeed \* normalizedDelta \)/);
  assert.match(src, /newEvent\.deltaY \*= 16/); assert.match(src, /newEvent\.deltaY \*= 100/); assert.match(src, /newEvent\.deltaY \*= 10/);
  assert.match(src, /Math\.pow\( this\._dollyEnd\.y \/ this\._dollyStart\.y, this\.zoomSpeed \)/);
  for (const f of ['stars.js', 'galaxy.js', 'local.js', 'cosmos.js', 'app.js']) assert.match(fs.readFileSync(f, 'utf8'), /enableZoom\s*=\s*false/, `${f}: OrbitControls keeps rotation only`);
});

test('wheel gain equals the old in-scene OrbitControls gain exactly, for every delta mode and trackpad pinch', () => {
  near(WHEEL_GAIN, 1.8 * 0.01 * Math.log(1 / 0.95));
  for (const [dy, mode, ctrl] of [[120, 0, false], [-120, 0, false], [3, 1, false], [-1, 2, false], [-4.5, 0, true], [53, 0, false]]) {
    const r0 = 1000, r1 = orbitWheel(r0, dy, mode, ctrl);
    near(wheelZ(dy, mode, ctrl), Math.log(r1 / r0), 1e-12);
  }
  near(wheelPixels(3, 1), 48); near(wheelPixels(1, 2), 100); near(wheelPixels(-2, 0, true), -20);
});

test('pinch uses the same log basis as OrbitControls touch dolly (spreading the fingers zooms in)', () => {
  near(PINCH_GAIN, ZOOM_SPEED);
  for (const [s, e] of [[100, 200], [300, 150], [120, 121]]) near(pinchZ(e / s), Math.log(orbitPinch(1, s, e)), 1e-12);
  assert.ok(pinchZ(2) < 0); assert.equal(pinchZ(0), 0); assert.equal(pinchZ(NaN), 0);
  // A pinch split into many moves sums to the same zoom as one move (log basis).
  let z = 0; for (let i = 0; i < 20; i++) z += pinchZ((100 + 5 * (i + 1)) / (100 + 5 * i)); near(z, pinchZ(2), 1e-12);
});

test('gesture length per seam: one decade of zoom takes the same wheel travel and the same finger spread everywhere', () => {
  for (const [a, b] of Object.values(SEAM_Z)) { near((b - a) / WHEEL_GAIN, Math.log(10) / WHEEL_GAIN, 1e-12); near(Math.exp((b - a) / PINCH_GAIN), 10 ** (1 / 1.8), 1e-12); }
  assert.ok(Math.abs(Math.log(10) / WHEEL_GAIN - 2494) < 1, 'about 2,494 px of wheel (≈ 21 notches of 120 px) per seam');
});

test('wheel nudges ease in and always arrive in full; the frame step is capped', () => {
  const c = createZoomController(); c.set(1); c.nudge(0.5);
  const r = c.step(1 / 60); assert.ok(r.dz > 0 && r.dz < 0.5, 'eased, not instant'); assert.ok(c.moving);
  for (let i = 0; i < 200 && c.moving; i++) c.step(1 / 60); near(c.z, 1.5, 1e-9); assert.equal(c.moving, false);
  const d = createZoomController({ maxStep: 0.6 }); d.nudge(5); const s = d.step(1 / 60, { instant: true }); near(s.dz, 0.6); near(d.pending, 4.4, 1e-12);
});

test('pinch is direct while held, then carries on with momentum that decays; a stopped finger leaves no momentum', () => {
  const c = createZoomController(); c.set(0);
  let t = 0; for (let i = 0; i < 10; i++) { t += 16; c.drag(-0.05, t); const r = c.step(0.016); near(r.dz, -0.05, 1e-12); }
  c.release(t + 10); assert.ok(c.velocity < 0, 'momentum after release'); const v0 = c.velocity;
  c.step(0.016); assert.ok(Math.abs(c.velocity) < Math.abs(v0)); for (let i = 0; i < 400 && c.moving; i++) c.step(0.016);
  assert.equal(c.moving, false, 'momentum dies out'); assert.ok(c.z < -0.5);
  const d = createZoomController(); d.drag(-0.05, 0); d.step(0.016); d.release(500); assert.equal(d.velocity, 0, 'fingers had stopped');
});

test('prefers-reduced-motion: no momentum and instant settles', () => {
  const c = createZoomController({ reduced: () => true }); c.set(0); c.nudge(0.3); const r = c.step(1 / 60); near(r.dz, 0.3); assert.equal(c.moving, false);
  let t = 0; for (let i = 0; i < 5; i++) { t += 16; c.drag(0.05, t); c.step(0.016); } c.release(t + 5); assert.equal(c.velocity, 0); assert.equal(c.moving, false);
});

test('bounds stop the zoom and drop momentum into them; outside a bound it may only move back', () => {
  const c = createZoomController(); c.set(0); c.nudge(1);
  const r = c.step(1, { max: 0.2 }); assert.equal(r.hitMax, true); near(c.z, 0.2); assert.equal(c.pending, 0);
  c.set(2); c.nudge(0.5); const s = c.step(1 / 60, { max: 1 }); assert.equal(s.hitMax, true); near(c.z, 2, 1e-12);
  c.nudge(-0.5); const u = c.step(1 / 60, { max: 1, instant: true }); assert.ok(u.dz < 0); near(c.z, 1.5, 1e-12);
  c.set(0); c.nudge(-1); const w = c.step(1 / 60, { min: -0.01, instant: true }); assert.equal(w.hitMin, true); near(c.z, -0.01);
});
