import test from 'node:test';
import assert from 'node:assert/strict';
import { julianDate, centuries, siderealTime, horizontal, planetEquatorial, moonEquatorial, angularSeparation, moonLit, namedIndex, NAMED_STARS, skyAt, lookText, compass, ELEMENTS } from '../sky-math.js';
import { hygStars } from '../transition.js';

const at = iso => new Date(iso);
test('Julian date and sidereal time match the standard values', () => {
  assert.equal(julianDate(at('2000-01-01T12:00:00Z')), 2451545);
  // 1987-04-10 19:21:00 UT: Greenwich sidereal time 8h 34m 57.09s (Meeus, Astronomical Algorithms, ex. 12.b)
  assert.ok(Math.abs(siderealTime(julianDate(at('1987-04-10T19:21:00Z')), 0) - (8 + 34 / 60 + 57.09 / 3600) * 15) < 0.01);
});
test('the Sun is at RA 0 and Dec 0 at the March equinox, and Dec +23.4 at the June solstice', () => {
  const eq = planetEquatorial('Sun', centuries(julianDate(at('2026-03-20T14:46:00Z'))));
  assert.ok(Math.abs(((eq.ra + 180) % 360) - 180) < 0.6 && Math.abs(eq.dec) < 0.3, JSON.stringify(eq));
  const sol = planetEquatorial('Sun', centuries(julianDate(at('2026-06-21T08:25:00Z'))));
  assert.ok(Math.abs(sol.dec - 23.44) < 0.1 && Math.abs(sol.ra - 90) < 0.6, JSON.stringify(sol));
  assert.ok(Math.abs(eq.dist - 0.996) < 0.003);
});
test('Venus and Jupiter pass within 2° of each other on 8–9 June 2026 (the widely reported conjunction)', () => {
  const sep = d => { const T = centuries(julianDate(at(d))); return angularSeparation(planetEquatorial('Venus', T), planetEquatorial('Jupiter', T)); };
  assert.ok(sep('2026-06-09T00:00:00Z') < 2, String(sep('2026-06-09T00:00:00Z')));
  assert.ok(sep('2026-06-09T00:00:00Z') < sep('2026-05-20T00:00:00Z') && sep('2026-06-09T00:00:00Z') < sep('2026-07-05T00:00:00Z'));
});
test('the Moon is new about 9 Nov 2026 and full about 24 Nov 2026, at about 384,000 km', () => {
  const sep = d => { const T = centuries(julianDate(at(d))); return { e: angularSeparation(moonEquatorial(T), planetEquatorial('Sun', T)), m: moonEquatorial(T) }; };
  assert.ok(sep('2026-11-09T07:00:00Z').e < 6, String(sep('2026-11-09T07:00:00Z').e)); // never exactly 0: the Moon passes about 5° from the Sun, so there is no eclipse
  assert.ok(sep('2026-11-09T07:00:00Z').e < sep('2026-11-07T07:00:00Z').e && sep('2026-11-09T07:00:00Z').e < sep('2026-11-11T07:00:00Z').e);
  assert.ok(sep('2026-11-24T15:00:00Z').e > 174, String(sep('2026-11-24T15:00:00Z').e));
  const d = sep('2026-11-09T07:00:00Z').m.distKm; assert.ok(d > 356000 && d < 407000);
  const T = centuries(julianDate(at('2026-11-24T15:00:00Z'))); assert.ok(moonLit(moonEquatorial(T), planetEquatorial('Sun', T)) > 0.98);
});
test('Polaris stays at about the observer’s latitude, and the Sun rises in the east', () => {
  const sky = skyAt(at('2026-11-10T20:00:00Z'), 26.7271, 88.3953), pol = sky.stars.find(s => s.name === 'Polaris');
  assert.ok(pol && Math.abs(pol.alt - 26.7) < 1.5 && (pol.az < 2 || pol.az > 358), `${pol.alt} ${pol.az}`);
  // Sunrise at Siliguri on 10 Nov 2026 is about 05:50 IST (00:20 UTC), with the Sun in the east-south-east
  let rise=null,prev=null;for(let t=Date.UTC(2026,10,9,22);t<Date.UTC(2026,10,10,3)&&!rise;t+=60000){const x=skyAt(new Date(t),26.7271,88.3953).sun;if(prev!==null&&prev<-0.83&&x.alt>=-0.83)rise={t,az:x.az};prev=x.alt;}
  assert.ok(rise&&rise.t>=Date.UTC(2026,10,10,0,0)&&rise.t<=Date.UTC(2026,10,10,0,45)&&rise.az>105&&rise.az<113,JSON.stringify(rise));
  assert.ok(skyAt(at('2026-11-10T06:30:00Z'), 26.7271, 88.3953).sun.alt > 40, 'high Sun at noon IST');
});
test('horizontal(): the pole is at the latitude; the zenith star is overhead', () => {
  assert.ok(Math.abs(horizontal(0, 90, 40, 123).alt - 40) < 1e-9);
  assert.ok(Math.abs(horizontal(100, 40, 40, 100).alt - 90) < 1e-6);
});
test('every named star is matched to the right bright star', () => {
  const idx = namedIndex(), s = hygStars();
  assert.equal(idx.size, NAMED_STARS.length);
  for (const [i, name] of idx) { const row = NAMED_STARS.find(r => r[0] === name); assert.ok(angularSeparation({ ra: row[1], dec: row[2] }, { ra: s.ra[i], dec: s.dec[i] }) < 0.5, name); assert.ok(Math.abs(s.mag[i] - row[3]) < 0.7, `${name} ${s.mag[i]}`); }
});
test('the sky has the Sun, the Moon, five planets and thousands of stars, and describes directions in words', () => {
  const sky = skyAt(at('2026-11-10T20:00:00Z'), 26.7271, 88.3953);
  assert.equal(sky.planets.length, 5); assert.ok(sky.stars.length > 7000); assert.ok(sky.moon.lit >= 0 && sky.moon.lit <= 1);
  assert.equal(compass(95), 'east'); assert.equal(lookText(34.2, 180), '34° above the south horizon'); assert.match(lookText(-5, 0), /below the north horizon/);
  assert.equal(Object.keys(ELEMENTS).length, 6);
});

import { bodyAltAz, visibility, heightWord, aimDirection, turnBy } from '../sky-math.js';
test('what is up at Siliguri on 11 Nov 2026: Saturn tonight, Venus only before dawn (past its October inferior conjunction), Mars and Jupiter late', () => {
  const from = new Date('2026-11-11T12:30:00Z'); // 18:00 IST
  const sat = visibility('Saturn', from, 26.7271, 88.3953); assert.ok(sat.upNow && sat.until, JSON.stringify(sat)); assert.ok(sat.nowPos.alt > 35 && sat.nowPos.az > 90 && sat.nowPos.az < 180);
  const ven = visibility('Venus', from, 26.7271, 88.3953); assert.ok(!ven.upNow && ven.next, JSON.stringify(ven)); const vh = (ven.next.getTime() - Date.UTC(2026, 10, 11, 18, 30)) / 3600000; assert.ok(vh > 3 && vh < 5.5, 'a morning star: visible from about 04:00 IST, ' + vh); assert.ok(ven.nextPos.az > 90 && ven.nextPos.az < 125);
  const jup = visibility('Jupiter', from, 26.7271, 88.3953); assert.ok(!jup.upNow && jup.next, 'Jupiter rises later'); const hr = (jup.next.getTime() - from.getTime()) / 3600000; assert.ok(hr > 4 && hr < 9, String(hr));
  assert.ok(jup.nextPos.az > 40 && jup.nextPos.az < 130, 'rises in the east');
});
test('the Moon is up when it is above the horizon, in daylight too', () => {
  const v = visibility('Moon', new Date('2026-11-24T14:00:00Z'), 51.5, -0.13); assert.equal(typeof v.upNow, 'boolean');
  const b = bodyAltAz('Moon', new Date('2026-11-24T14:00:00Z'), 51.5, -0.13); assert.equal(v.upNow, b.alt > 0.5);
});
test('aimDirection: upright and facing north, east, west; tilted back to look up; flat screen-up looks at the ground', () => {
  const near = (a, b, t = 1e-6) => Math.abs(a - b) < t;
  let d = aimDirection(0, 90, 0); assert.ok(near(d.alt, 0) && near(d.az, 0), JSON.stringify(d));
  d = aimDirection(90, 90, 0); assert.ok(near(d.alt, 0) && near(d.az, 270), 'a quarter turn anticlockwise faces west ' + JSON.stringify(d));
  d = aimDirection(270, 90, 0); assert.ok(near(d.alt, 0) && near(d.az, 90), 'faces east ' + JSON.stringify(d));
  d = aimDirection(0, 135, 0); assert.ok(near(d.alt, 45, 1e-6) && near(d.az, 0), 'tilted back 45° looks 45° up ' + JSON.stringify(d));
  d = aimDirection(0, 0, 0); assert.ok(near(d.alt, -90, 1e-6), 'lying flat, the back looks down');
});
test('words for height and turning', () => {
  assert.equal(heightWord(10), 'low'); assert.equal(heightWord(30), 'part-way up'); assert.equal(heightWord(70), 'high');
  assert.equal(turnBy(350, 10), 20); assert.equal(turnBy(10, 350), -20); assert.equal(Math.abs(turnBy(0, 180)), 180);
});
