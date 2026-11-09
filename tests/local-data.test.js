import test from 'node:test';
import assert from 'node:assert/strict';
import { GALAXIES, LOCAL_UNIT, discAxes, distanceBetween, spiralParticles } from '../local-data.js';
import { R0 } from '../galaxy-data.js';

const g = n => GALAXIES.find(x => x.short === n || x.name === n);
const SUN = { pos: [-R0 / LOCAL_UNIT, 0, 0] }, CENTRE = { pos: [0, 0, 0] };
test('each galaxy sits at its catalogued distance from the Sun (scene units are 10 kly)', () => {
  for (const x of GALAXIES) assert.ok(Math.abs(distanceBetween(x, SUN) / (x.mly * 1000) - 1) < 1e-9, x.name);
});
test('known separations come out right: LMC ~160 kly from the Galaxy’s centre, Andromeda–Triangulum ~0.7–0.75 Mly, Sagittarius Dwarf on the far side of the centre', () => {
  const lmc = distanceBetween(g('LMC'), CENTRE); assert.ok(lmc > 150 && lmc < 170, String(lmc));
  const m3133 = distanceBetween(g('Andromeda'), g('Triangulum')); assert.ok(m3133 > 650 && m3133 < 800, String(m3133));
  const sgr = g('Sagittarius Dwarf'); assert.ok(sgr.pos[0] > 0, 'beyond the centre, as seen from the Sun');
  const m32 = distanceBetween(g('M32'), g('Andromeda')); assert.ok(m32 < 60, 'M32 hugs Andromeda');
});
test('disc orientation: Andromeda is tilted 77° to our line of sight, Triangulum 54°; axes are perpendicular unit vectors', () => {
  for (const [n, inc] of [['Andromeda', 77], ['Triangulum', 54]]) {
    const x = g(n), { major, normal } = discAxes(x), los = x.pos.map((v, i) => v - SUN.pos[i]), L = Math.hypot(...los);
    assert.ok(Math.abs(Math.hypot(...major) - 1) < 1e-9 && Math.abs(Math.hypot(...normal) - 1) < 1e-9);
    assert.ok(Math.abs(major.reduce((s, v, i) => s + v * normal[i], 0)) < 1e-9);
    const ang = Math.acos(Math.abs(normal.reduce((s, v, i) => s + v * los[i], 0)) / L) * 180 / Math.PI; assert.ok(Math.abs(ang - inc) < 0.01, `${n}: ${ang}`);
  }
});
test('spiral particles: reproducible and within the disc radius', () => {
  const a = spiralParticles(7.6, 500, 3), b = spiralParticles(7.6, 500, 3); assert.deepEqual(a.positions, b.positions);
  for (let i = 0; i < a.positions.length; i += 3) assert.ok(Math.hypot(a.positions[i], a.positions[i + 1]) < 7.6 * 1.8);
});
