import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../star-motion.js';
import { NEIGHBOURS, neighbourEntry, SUN_ENTRY } from '../stars-data.js';

const all = [...NEIGHBOURS, ...M.VISITORS.map(neighbourEntry)].map(M.withMotion);
const byName = n => all.find(e => e.name === n);

test('every system on the map has motion data (proper motion; radial speed or an explicit null)', () => {
  for (const e of all) { assert.ok(e.motion, e.name); assert.ok(Number.isFinite(e.motion.pmRa) && Number.isFinite(e.motion.pmDec)); assert.ok(e.motion.rv === null || Number.isFinite(e.motion.rv)); }
  assert.deepEqual(M.withMotion(SUN_ENTRY).vel, [0, 0, 0]);
});
test('velocity: radial speed points along the line of sight; proper motion is sideways; speeds are right', () => {
  const v = M.starVelocity(0, 0, 10, 0, 0, 100), dir = [1, 0, 0];
  const p = byName('Sirius'); // any star: a pure radial velocity is parallel to its position vector
  const vr = M.starVelocity(p.ra, p.dec, p.ly, 0, 0, -50), dot = (vr[0] * p.pos[0] + vr[1] * p.pos[1] + vr[2] * p.pos[2]) / (Math.hypot(...vr) * Math.hypot(...p.pos));
  assert.ok(Math.abs(dot + 1) < 1e-9, 'approaching = straight towards us');
  const vt = M.starVelocity(p.ra, p.dec, p.ly, 1000, 0, 0); assert.ok(Math.abs(vt[0] * p.pos[0] + vt[1] * p.pos[1] + vt[2] * p.pos[2]) < 1e-12, 'proper motion is perpendicular');
  assert.ok(Math.abs(Math.hypot(...v) - 100 * 3.33564e-6) < 1e-9, '100 km/s ≈ 0.000334 ly per year'); void dir;
  assert.ok(Math.abs(byName("Barnard's Star").motion.kms - 142.6) < 2, 'Barnard’s Star: about 143 km/s');
});
// Published encounters (Wikipedia "List of nearest stars", compiled from Bailer-Jones et al. and others).
// That table counts from about the year 2000 CE, so its times are ~2,000 years later than "from today" here.
const PUBLISHED = { 'Alpha Centauri': [28650, 3.123], 'Ross 248': [38500, 3.0446], 'Gliese 445': [46341, 3.34], "Barnard's Star": [11735, 3.768], 'Lalande 21185': [21973, 4.681], 'Gliese 710': [1296000, 0.167] };
test('closest approaches reproduce the published encounters (time within 6%, distance within 5%)', () => {
  for (const [name, [t, d]] of Object.entries(PUBLISHED)) {
    const c = byName(name).motion.close;
    assert.ok(Math.abs((c.years + 2000) / t - 1) < 0.06, `${name}: ${c.years} vs ${t}`);
    assert.ok(Math.abs(c.ly / d - 1) < 0.05, `${name}: ${c.ly} vs ${d}`);
  }
  const s = byName("Scholz's Star").motion.close; // 70,000–81,000 years ago; 0.8–1.08 ly depending on the study
  assert.ok(s.years < -68000 && s.years > -82000 && s.ly > 0.75 && s.ly < 1.1);
  const e = byName('Epsilon Eridani').motion.close; assert.ok(Math.abs(e.years + 105000) < 4000 && Math.abs(e.ly - 7) < 0.3, 'Epsilon Eridani: 105,000 years ago, 7 ly');
});
test('the nearest star changes: Alpha Centauri now, Ross 248 then Gliese 445 later; Scholz’s Star in the past', () => {
  assert.equal(M.nearestAt(all, 0).entry.name, 'Alpha Centauri');
  assert.ok(Math.abs(M.nearestAt(all, 0).ly - 4.2465) < 1e-6);
  assert.equal(M.nearestAt(all, 38000).entry.name, 'Ross 248');
  assert.equal(M.nearestAt(all, 46000).entry.name, 'Gliese 445');
  assert.equal(M.nearestAt(all, -80000).entry.name, "Scholz's Star");
  const line = M.nearestTimeline(all, 0, 60000, 100).map(x => x.name);
  assert.deepEqual(line.slice(0, 3), ['Alpha Centauri', 'Ross 248', 'Gliese 445']);
});
test('stars without a measured radial speed only drift sideways, so they are never wrongly “approaching”', () => {
  for (const e of all.filter(x => !x.motion.rvKnown)) assert.ok(Math.abs(e.motion.close.years) < 1, e.name);
});
test('labels read naturally', () => {
  assert.equal(M.yearsLabel(0), 'Today'); assert.equal(M.yearsLabel(38000), '38,000 years from now'); assert.equal(M.yearsLabel(-80040), '80,000 years ago'); assert.equal(M.yearsLabel(1342104), '1.34 million years from now');
  assert.equal(M.approachLabel({ years: 36485, ly: 3.045 }), 'In 36,500 years, 3.0 light-years away');
  assert.equal(M.approachLabel({ years: -80586, ly: 1.056 }), '80,600 years ago, 1.1 light-years away');
  assert.equal(M.approachLabel({ years: 1342104, ly: 0.173 }), 'In 1.3 million years, 0.17 light-years away');
});
