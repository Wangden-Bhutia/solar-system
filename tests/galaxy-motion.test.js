import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../galaxy-motion.js';
import { R0, discPosition } from '../galaxy-data.js';

test('the Sun goes round in about 222 million years at 229 km/s, within published 212–240', () => {
  assert.ok(Math.abs(M.circularSpeed(R0) - 229) < 0.1);
  assert.ok(M.SUN_PERIOD > 212 && M.SUN_PERIOD < 240, String(M.SUN_PERIOD));
});
test('flat rotation curve: similar speed at every radius, so inner stars lap outer ones (the disc shears)', () => {
  for (const R of [15, 27, 40]) assert.ok(Math.abs(M.circularSpeed(R) - 229) < 12, `speed at ${R}`);
  assert.ok(M.omega(15) > 1.6 * M.omega(27) && M.omega(27) > 1.3 * M.omega(40));
});
test('pattern speeds: bar fastest, arms turn as one shape close to the Sun’s rate (near corotation)', () => {
  assert.ok(M.BAR_OMEGA > M.ARMS_OMEGA);
  assert.ok(Math.abs(M.ARMS_OMEGA / M.SUN_OMEGA - 1) < 0.05);
  assert.ok(M.omega(15) > M.ARMS_OMEGA && M.omega(45) < M.ARMS_OMEGA, 'inner stars overtake the arms, outer stars fall behind');
});
test('turn() moves a point along increasing azimuth, keeping its radius (matches the vertex shader)', () => {
  const p = M.turn(discPosition(20, 10, 0.3), 30 * Math.PI / 180), q = discPosition(20, 40, 0.3);
  p.forEach((v, i) => assert.ok(Math.abs(v - q[i]) < 1e-9));
});
test('the Sun: exactly at today’s place at t = 0 (exact seam), back after one lap, bobbing within ~0.3 kly', () => {
  assert.deepEqual(M.sunPosition(0).map(v => +v.toFixed(9)), [-R0, 0, 0]);
  const lap = M.sunPosition(M.SUN_PERIOD); assert.ok(Math.abs(lap[0] + R0) < 1e-6 && Math.abs(lap[2]) < 1e-6);
  for (let t = -250; t <= 250; t += 5) assert.ok(Math.abs(M.sunPosition(t)[1]) < 0.5);
  assert.ok(M.sunHeight(1) > M.sunHeight(0), 'rising now');
});
test('labels: today, past and future; milestones and laps', () => {
  assert.equal(M.timeLabel(0), 'Today'); assert.equal(M.timeLabel(-66), '66 million years ago'); assert.equal(M.timeLabel(48.4), '48 million years from now');
  assert.equal(M.milestone(-63), 'The dinosaurs die out'); assert.match(M.milestone(-M.SUN_PERIOD), /One lap ago/); assert.equal(M.milestone(-150), null);
  assert.equal(M.lapsLabel(M.SUN_PERIOD), 'The Sun has gone one full lap'); assert.match(M.lapsLabel(-M.SUN_PERIOD / 2), /0\.50 of a lap back/);
});
test('tracer stars: reproducible, inside the disc, each with its own orbital speed', () => {
  const a = M.tracerStars(300), b = M.tracerStars(300);
  assert.deepEqual(a.positions, b.positions);
  for (let i = 0; i < 300; i++) { const R = Math.hypot(a.positions[i * 3], a.positions[i * 3 + 2]); assert.ok(R > 4 && R < 60); assert.ok(Math.abs(a.omegas[i] - M.omega(R)) < 1e-3); }
});
