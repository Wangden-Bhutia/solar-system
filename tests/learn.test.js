import test from 'node:test'; import assert from 'node:assert/strict';
import * as L from '../learn.js';
import { PLANETS } from '../data.js';
const near = (a, b, e) => assert.ok(Math.abs(a - b) < e, `${a} vs ${b}`);

test('light time: 1 AU ≈ 8 min 19 s, Neptune ≈ 4 h 11 min; durations read naturally', () => {
  near(L.lightSeconds(L.AU_KM), 499.0, 0.1);
  assert.equal(L.formatDuration(L.lightSeconds(L.AU_KM)), '8 min 19 s');
  assert.equal(L.formatDuration(L.sunlightTo('Neptune')), '4 h 11 min');
  assert.equal(L.formatDuration(1.28), '1.3 seconds');
  assert.equal(L.sunlightTo('Moon'), null);
  for (let i = 1; i < PLANETS.length; i++) assert.ok(L.sunlightTo(PLANETS[i].name) > L.sunlightTo(PLANETS[i - 1].name));
});

test('scale walk with a 22 cm Sun: Earth a ~2 mm peppercorn ~24 m away, Neptune ~714 m; scales linearly', () => {
  const w = L.scaleWalk(22), earth = w.find(p => p.name === 'Earth'), nep = w.find(p => p.name === 'Neptune');
  near(earth.sizeMm, 2.02, 0.01); near(earth.distanceM, 23.65, 0.05); near(nep.distanceM, 713.8, 0.5);
  assert.equal(L.sizeLike(earth.sizeMm), 'a peppercorn');
  const big = L.scaleWalk(44); near(big[2].distanceM, 2 * earth.distanceM, 1e-9);
  assert.equal(L.formatMetres(23.65), '24 m'); assert.equal(L.formatMetres(2365), '2.37 km'); assert.equal(L.formatMetres(71380), '71.4 km');
  assert.throws(() => L.scaleWalk(0));
});

test('eclipses: only at new/full Moon, only near a node; the 5° tilt makes most months miss', () => {
  // Node on the Sun line: new Moon gives a central solar eclipse, full Moon a total lunar eclipse.
  assert.equal(L.eclipseGeometry(0, 0).kind, 'solar-central');
  assert.equal(L.eclipseGeometry(180, 0).kind, 'lunar-total');
  assert.equal(L.eclipseGeometry(180, 180).kind, 'lunar-total');
  // Default node 30°: the new Moon passes about 2.6° below the Sun. No eclipse.
  const miss = L.eclipseGeometry(0, 30); near(miss.latitude, -2.57, 0.02); assert.equal(miss.kind, 'none'); assert.match(miss.label, /below the Sun/);
  // Between the limits: partial.
  assert.equal(L.eclipseGeometry(0, 13).kind, 'solar-partial');
  assert.equal(L.eclipseGeometry(180, 180 + 8).kind, 'lunar-partial');
  // Quarter Moons never eclipse, whatever the node.
  for (let n = 0; n < 360; n += 15) assert.equal(L.eclipseGeometry(90, n).kind, 'none');
  assert.match(L.eclipseGeometry(90, 90).label, /only happen at new Moon or full Moon/);
  // Over all node positions, eclipses are the minority: a new Moon eclipses for only ~1/6 of them.
  let hits = 0; for (let n = 0; n < 360; n++) if (L.eclipseGeometry(0, n).kind !== 'none') hits++;
  assert.ok(hits > 40 && hits < 70, `${hits}`);
});

test('tides: spring at new and full, neap at quarters; spring/neap ≈ 2.7 with the 0.46 solar ratio', () => {
  near(L.tideRange(0), 1.46, 1e-9); near(L.tideRange(180), 1.46, 1e-9); near(L.tideRange(90), 0.54, 1e-9);
  near(L.tideRange(0) / L.tideRange(90), 2.70, 0.01);
  assert.equal(L.tideLabel(0).name, 'Spring tides'); assert.equal(L.tideLabel(180).name, 'Spring tides');
  assert.equal(L.tideLabel(270).name, 'Neap tides'); assert.equal(L.tideLabel(45).name, 'Between spring and neap');
  assert.equal(L.tideLabel(90).pct, 0); assert.equal(L.tideLabel(0).pct, 100);
});

test('every prediction has a valid answer and explanation; judge checks it', () => {
  for (const [id, p] of Object.entries(L.PREDICTIONS)) {
    assert.ok(p.q && p.explain && p.options.length >= 2, id);
    assert.ok(p.answer >= 0 && p.answer < p.options.length, id);
    assert.equal(L.judge(id, p.answer).right, true); assert.equal(L.judge(id, (p.answer + 1) % p.options.length).right, false);
  }
  assert.throws(() => L.judge('nope', 0)); assert.throws(() => L.judge('tides', 9));
  assert.match(L.PREDICTIONS['light-earth'].explain, /8 min 19 s/);
});

test('journeys: every step points at real worlds, labs and predictions; questions gate the Next button', () => {
  const worlds = new Set(['Sun', 'Moon', ...PLANETS.map(p => p.name)]), labs = new Set(['seasons', 'phases', 'eclipses', 'tides', 'scale']);
  assert.ok(L.JOURNEYS.length >= 4);
  for (const j of L.JOURNEYS) {
    assert.equal(L.journey(j.id), j); assert.ok(j.steps.length >= 3, j.id);
    for (const s of j.steps) {
      assert.ok(s.title && s.text, j.id);
      if (s.world) assert.ok(worlds.has(s.world), s.world);
      if (s.lab) assert.ok(labs.has(s.lab), s.lab);
      if (s.predict) { assert.ok(L.PREDICTIONS[s.predict], s.predict); assert.equal(L.canAdvance(s, {}), false); assert.equal(L.canAdvance(s, { [s.predict]: 'skip' }), true); }
      else assert.equal(L.canAdvance(s, {}), true);
    }
  }
  assert.equal(L.journey('nope'), null);
  assert.match(L.journey('mars').steps.at(-1).text, /about 3 to 22 minutes/);
});
