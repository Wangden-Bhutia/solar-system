import test from 'node:test'; import assert from 'node:assert/strict';
import * as S from '../stars-data.js';
const near = (a, b, e) => assert.ok(Math.abs(a - b) < e, `${a} vs ${b}`);
test('positions: distances preserved, Alpha Centauri far south of the ecliptic, Polaris-side stars up', () => {
  for (const e of S.NEIGHBOURS) near(Math.hypot(...e.pos), e.ly, 1e-9);
  const ac = S.NEIGHBOURS.find(e => e.name === 'Alpha Centauri'), g34 = S.NEIGHBOURS.find(e => e.name === 'Struve 2398');
  assert.ok(ac.pos[1] < -0.6 * ac.ly, 'Alpha Centauri is well south of the ecliptic'); assert.ok(g34.pos[1] > 0.6 * g34.ly, 'Struve 2398 (Dec +59°) is well north');
  // The ecliptic pole (RA 18h, Dec +66.56°) maps straight up.
  const pole = S.starPosition(270, 66.5607, 1); near(pole[1], 1, 1e-4);
  assert.equal(S.NEIGHBOURS.length, 51); assert.equal(S.NEIGHBOURS.filter(e => e.ly <= 16).length, 50);
});
test('kinds, temperatures, colours and brightness', () => {
  assert.equal(S.starKind('M5.5Ve').kind, 'Red dwarf'); assert.equal(S.starKind('DA2').kind, 'White dwarf'); assert.equal(S.starKind('T6').kind, 'Brown dwarf'); assert.equal(S.starKind('G2V').temp, 5800);
  near(S.starKind('M5.5Ve').temp, 3000, 1); near(S.starKind('F5IV–V').temp, 6500, 50);
  const red = S.starColor(3000), white = S.starColor(9400); assert.ok(red[0] > red[2] && white[2] >= white[0]);
  near(S.visualLuminosity(-1.46, 8.7094), 23.4, 0.3); assert.ok(S.starPixels(S.NEIGHBOURS.find(e => e.name === 'Sirius')) > S.starPixels(S.SUN_ENTRY));
  assert.ok(S.starPixels(S.NEIGHBOURS.find(e => e.name === 'Wolf 359')) < 6);
});
test('habitable zone (Kopparapu 2014): Sun 0.95–1.68 AU; TRAPPIST-1 e, f, g; Proxima b', () => {
  const [i, o] = S.habitableZone(0, 5780); near(i, 0.950, 0.002); near(o, 1.676, 0.002);
  const t = S.systemSummary(S.NEIGHBOURS.find(e => e.name === 'TRAPPIST-1'));
  assert.deepEqual(t.planets.filter(p => p.inHZ).map(p => p.name), ['TRAPPIST-1 e', 'TRAPPIST-1 f', 'TRAPPIST-1 g']); assert.ok(t.planets.every(p => p.measured));
  const p = S.systemSummary(S.NEIGHBOURS.find(e => e.name === 'Alpha Centauri')); assert.deepEqual(p.planets.filter(x => x.inHZ).map(x => x.name), ['Proxima b']);
  assert.ok(p.planets.every(x => !x.measured)); assert.equal(p.compare.length, 0, 'Mercury’s orbit would be off this tiny view');
  const eps = S.systemSummary(S.NEIGHBOURS.find(e => e.name === 'Epsilon Eridani')); assert.equal(eps.hz, null); assert.deepEqual(eps.compare.map(c => c.label), ['Mercury’s orbit', 'Earth’s orbit']);
});
test('size from mass: rocky, Neptune-like, Jupiter-sized; light left year', () => {
  near(S.sizeFromMass(1), 1, 1e-9); near(S.sizeFromMass(17.2), 4.5, 0.3); near(S.sizeFromMass(318), 11.2, 1e-9);
  assert.equal(S.lightLeftYear(4.2465), 2022); assert.equal(S.lightLeftYear(40.66), 1985);
  for (const [k, v] of Object.entries(S.PLANET_SYSTEMS)) assert.ok(S.NEIGHBOURS.find(e => e.name === k), k);
});
