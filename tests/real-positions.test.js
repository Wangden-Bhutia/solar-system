import test from 'node:test';
import assert from 'node:assert/strict';
import { heliocentric, moonLongitude, moonEquatorial, planetEquatorial, siderealTime } from '../sky-math.js';

const T = ms => (ms - Date.UTC(2000, 0, 1, 12)) / 864e5 / 36525;
const lonDeg = (n, ms) => {
  const h = heliocentric(n, T(ms));
  return ((Math.atan2(h[1], h[0]) * 180) / Math.PI + 360) % 360;
};

test('the Earth is where the calendar says: opposite the Sun’s place in the sky (equinoxes and solstices)', () => {
  // The Sun's ecliptic longitude is 0° at the March equinox, 90° at the June solstice; the Earth is 180° from it.
  for (const [ms, sunLon] of [
    [Date.UTC(2026, 2, 20, 14, 46), 0],
    [Date.UTC(2026, 5, 21, 8, 24), 90],
    [Date.UTC(2026, 8, 23, 0, 5), 180],
    [Date.UTC(2026, 11, 21, 20, 50), 270]
  ]) {
    /* heliocentric() works in the J2000 ecliptic (as the scene's star frame does); the equinox of the date has moved by precession, 1.397° a century */
    const d = ((((lonDeg('Earth', ms) + 1.3969713 * T(ms) - (sunLon + 180)) % 360) + 540) % 360) - 180;
    assert.ok(Math.abs(d) < 0.2, `${new Date(ms).toISOString()}: off by ${d.toFixed(2)}°`);
  }
});

test('Mars opposition of 19 Feb 2027: Mars and the Earth line up on the same side of the Sun', () => {
  const ms = Date.UTC(2027, 1, 19);
  const d = ((((lonDeg('Mars', ms) - lonDeg('Earth', ms)) % 360) + 540) % 360) - 180;
  assert.ok(Math.abs(d) < 3, `Mars − Earth longitude ${d.toFixed(1)}°`);
});

test('the Moon: full when opposite the Sun (full Moon of 24 Nov 2026), new when with it (9 Nov 2026)', () => {
  for (const [ms, want] of [
    [Date.UTC(2026, 10, 24, 14, 53), 180],
    [Date.UTC(2026, 10, 9, 7, 2), 0]
  ]) {
    const sun = planetEquatorial('Sun', T(ms)),
      sunLon =
        ((Math.atan2(
          Math.sin((sun.ra * Math.PI) / 180) * Math.cos(0.40909) + Math.tan((sun.dec * Math.PI) / 180) * Math.sin(0.40909),
          Math.cos((sun.ra * Math.PI) / 180)
        ) *
          180) /
          Math.PI +
          360) %
        360,
      d = ((((moonLongitude(T(ms)) - sunLon - want) % 360) + 540) % 360) - 180;
    assert.ok(Math.abs(d) < 3, `${new Date(ms).toISOString()}: ${d.toFixed(1)}°`);
  }
  assert.ok(moonEquatorial(T(Date.UTC(2026, 10, 20))).distKm > 350000);
});

test('the hour the Earth is turned to: noon at Greenwich puts the Sun near longitude 0°', () => {
  const ms = Date.UTC(2026, 10, 20, 12),
    t = T(ms),
    sub = ((((planetEquatorial('Sun', t).ra - siderealTime(ms / 864e5 + 2440587.5, 0)) % 360) + 540) % 360) - 180;
  assert.ok(Math.abs(sub) < 5, `subsolar longitude ${sub.toFixed(1)}° (the equation of time allows a few degrees)`);
});
