// Coming up: the listed dates are from published sources (sky-events.js); here the app's own sky maths is checked
// against them, and every "where to look" moment is checked from Siliguri: the target is up and the sky is dark.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SKY_EVENTS, upcoming, nextToJoin, isNew, joinsAt } from '../sky-events.js';
import {
  planetEquatorial,
  moonEquatorial,
  angularSeparation,
  centuries,
  julianDate,
  bodyAltAz,
  horizontal,
  siderealTime
} from '../sky-math.js';

const H = 3600000,
  D = 24 * H,
  T = ms => centuries(julianDate(new Date(ms))),
  eq = (n, ms) => (n === 'Moon' ? moonEquatorial(T(ms)) : planetEquatorial(n, T(ms))),
  sep = (a, b, ms) => angularSeparation(eq(a, ms), eq(b, ms)),
  ev = id => SKY_EVENTS.find(e => e.id === id);
// The moment within ±days of `at` where f is largest (sign +1) or smallest (−1), searched hour by hour.
function extreme(f, at, days, sign) {
  let best = at,
    v = f(at);
  for (let t = at - days * D; t <= at + days * D; t += H) if (sign * f(t) > sign * v) [best, v] = [t, f(t)];
  return { t: best, v };
}

test('oppositions: the app puts each planet opposite the Sun within a day of the published moment', () => {
  for (const [id, n] of [
    ['jupiter-opp-2027', 'Jupiter'],
    ['mars-opp-2027', 'Mars'],
    ['saturn-opp-2027', 'Saturn'],
    ['jupiter-opp-2028', 'Jupiter'],
    ['saturn-opp-2028', 'Saturn'],
    ['mars-opp-2029', 'Mars'],
    ['jupiter-opp-2029', 'Jupiter'],
    ['saturn-opp-2029', 'Saturn']
  ]) {
    const e = ev(id),
      m = extreme(t => sep(n, 'Sun', t), e.at, 6, 1);
    assert.ok(Math.abs(m.t - e.at) < 1.2 * D, `${n}: ${new Date(m.t).toISOString()}`);
    assert.ok(m.v > 170, `${n} is ${m.v.toFixed(1)}° from the Sun`);
  }
});

test('close pairs: closest within a day of the published moment, at the published separation', () => {
  for (const [id, a, b, deg] of [
    ['venus-saturn-2027', 'Venus', 'Saturn', 0.61],
    ['venus-mars-2027', 'Venus', 'Mars', 0.31],
    ['venus-jupiter-2028', 'Venus', 'Jupiter', 0.61]
  ]) {
    const e = ev(id),
      m = extreme(t => sep(a, b, t), e.at, 5, -1);
    assert.ok(Math.abs(m.t - e.at) < D, `${a}–${b}: ${new Date(m.t).toISOString()}`);
    assert.ok(Math.abs(m.v - deg) < 0.15, `${a}–${b}: ${m.v.toFixed(2)}° against ${deg}°`);
  }
});

test('Venus: farthest from the Sun (46–47°) within two days of each published moment', () => {
  for (const [id, deg] of [
    ['venus-west-2027', 47],
    ['venus-east-2028', 46],
    ['venus-west-2028', 46],
    ['venus-east-2029', 47]
  ]) {
    const e = ev(id),
      m = extreme(t => sep('Venus', 'Sun', t), e.at, 8, 1);
    assert.ok(Math.abs(m.t - e.at) < 2 * D, `${id}: ${new Date(m.t).toISOString()}`);
    assert.ok(Math.abs(m.v - deg) < 1, `${id}: ${m.v.toFixed(1)}°`);
  }
});

test('Mercury: farthest from the Sun within two days of each published moment', () => {
  for (const [id, deg] of [
    ['mercury-east-2028', 21],
    ['mercury-east-apr-2029', 20],
    ['mercury-east-aug-2029', 27]
  ]) {
    const e = ev(id),
      m = extreme(t => sep('Mercury', 'Sun', t), e.at, 6, 1);
    assert.ok(Math.abs(m.t - e.at) < 2 * D, `${id}: ${new Date(m.t).toISOString()}`);
    assert.ok(Math.abs(m.v - deg) < 1.5, `${id}: ${m.v.toFixed(1)}°`);
  }
});

test('eclipses: Sun, Earth and Moon line up at the published moments', () => {
  const lun = ev('lunar-eclipse-2027'),
    sol = ev('solar-eclipse-2027');
  assert.ok(sep('Moon', 'Sun', lun.at) > 178.5, 'the full Moon is in line with the shadow');
  for (const id of ['lunar-eclipse-jul-2028', 'lunar-eclipse-dec-2028', 'lunar-eclipse-dec-2029'])
    assert.ok(sep('Moon', 'Sun', ev(id).at) > 178.5, `${id}: the full Moon is in line with the shadow`);
  assert.ok(sep('Moon', 'Sun', sol.at) < 1.5, 'the new Moon is in front of the Sun');
});

test('where to look: from Siliguri, each target is up and the sky dark at the moment given (the solar eclipse in daylight)', () => {
  const lat = 26.7271,
    lon = 88.3953;
  for (const e of SKY_EVENTS.filter(e => e.look)) {
    const d = new Date(e.look.at),
      sun = bodyAltAz('Sun', d, lat, lon),
      r = e.look.radiant,
      h = r ? horizontal(r.ra, r.dec, lat, siderealTime(julianDate(d), lon)) : bodyAltAz(e.look.body, d, lat, lon);
    assert.ok(h.alt > 3, `${e.id}: target at ${h.alt.toFixed(1)}°`);
    if (e.id === 'solar-eclipse-2027') assert.ok(Math.abs(sun.alt - 22) < 3, `the Sun at ${sun.alt.toFixed(1)}° (published 22°)`);
    else assert.ok(sun.alt < -6, `${e.id}: Sun at ${sun.alt.toFixed(1)}°`);
    if (r) assert.ok(bodyAltAz('Moon', d, lat, lon).alt < 15 || e.id === 'quadrantids-2027', `${e.id}: Moon out of the way`);
    assert.ok(Math.abs(e.look.at - e.at) < 2 * D, `${e.id}: the look is near the event`);
  }
});

test('every event has a title, text, India time, sources and a valid space view; the list keeps only what is to come', () => {
  const worlds = new Set(['Sun', 'Moon', 'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn']);
  for (const e of SKY_EVENTS) {
    assert.ok(e.title && e.text.length > 40 && e.when && e.kind, e.id);
    assert.ok(e.src.length && e.src.every(s => /^https:\/\//.test(s.url) && s.label), e.id);
    if (e.look?.body) assert.ok(worlds.has(e.look.body), e.id);
    if (e.space)
      assert.ok(e.space.focus ? worlds.has(e.space.focus) : worlds.has(e.space.fitTo) || ['inner', 'all'].includes(e.space.fit), e.id);
  }
  const t0 = Date.UTC(2026, 10, 20),
    shown = upcoming(t0);
  assert.ok(SKY_EVENTS.length >= 25 && Math.max(...SKY_EVENTS.map(e => e.at)) > Date.UTC(2029, 11, 1), 'three years are listed');
  assert.ok(shown.length > 5 && shown.every(e => e.at < t0 + 185 * D), 'only the next six months are shown');
  assert.deepEqual(
    shown.map(e => e.at),
    [...shown.map(e => e.at)].sort((a, b) => a - b)
  );
  const nx = nextToJoin(t0);
  assert.equal(nx.id, 'solar-eclipse-2027', 'the next event is held back until it is six months away');
  assert.ok(!upcoming(joinsAt(nx) - H).includes(nx) && upcoming(joinsAt(nx) + H).some(e => e.id === nx.id), 'and joins on time');
  assert.ok(
    isNew(nx, joinsAt(nx) + 5 * D) && !isNew(nx, joinsAt(nx) + 40 * D) && !isNew(nx, joinsAt(nx) - D),
    'marked New for its first month'
  );
  const later = upcoming(Date.UTC(2027, 6, 1));
  assert.equal(later[0].id, 'solar-eclipse-2027', 'events in the past drop off');
  assert.ok(
    later.some(e => e.id === 'saturn-opp-2027'),
    'and later ones have joined'
  );
  for (let t = t0; t < Date.UTC(2029, 9, 1); t += 10 * D)
    assert.ok(upcoming(t).length >= 3, `at least three events shown at ${new Date(t).toISOString().slice(0, 10)}`);
  assert.equal(new Date(joinsAt(ev('venus-east-2028'))).toISOString().slice(0, 10), '2027-09-22', 'six calendar months ahead');
  assert.equal(upcoming(Date.UTC(2030, 0, 1)).length, 0);
  assert.equal(nextToJoin(Date.UTC(2029, 6, 1)), null);
});
