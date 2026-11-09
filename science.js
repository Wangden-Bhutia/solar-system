// Teaching geometry, not an ephemeris. All angles in degrees; see docs/lab-science.md.
export const TILT = 23.44;
const rad = d => d * Math.PI / 180;
export const wrap = a => ((a % 360) + 360) % 360;
export function seasonGeometry(orbit, tilt = TILT) {
  const a = rad(wrap(orbit)), t = rad(tilt);
  // Orbit zero = June solstice. North axis stays fixed in inertial space.
  const sun = [Math.cos(a), 0, -Math.sin(a)];
  const north = [Math.sin(t), Math.cos(t), 0];
  const declination = Math.asin(Math.sin(t) * Math.cos(a)) * 180 / Math.PI;
  return { sun, north, declination };
}
export function daylightHours(latitude, declination) {
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90) throw Error('latitude must be −90…90°');
  if (Math.abs(declination)<1e-10) return 12;
  const x = -Math.tan(rad(latitude)) * Math.tan(rad(declination));
  if (x <= -1) return 24;
  if (x >= 1) return 0;
  return 24 * Math.acos(x) / Math.PI; // solar centre on a perfect horizon, no refraction
}
export function noonAltitude(latitude, declination) { return Math.max(0, 90 - Math.abs(latitude - declination)); }
export function phaseGeometry(elongation) {
  const a = rad(wrap(elongation));
  const moonFromEarth = [Math.cos(a), 0, -Math.sin(a)];
  return { moonFromEarth, observerFromMoon: moonFromEarth.map(v => -v), sun: [1,0,0], illuminated: (1-Math.cos(a))/2 };
}
export function phaseName(angle) {
  const a = wrap(angle);
  if (a < 1 || a > 359) return 'New Moon';
  if (Math.abs(a-90)<1) return 'First quarter';
  if (Math.abs(a-180)<1) return 'Full Moon';
  if (Math.abs(a-270)<1) return 'Last quarter';
  return a<90?'Waxing crescent':a<180?'Waxing gibbous':a<270?'Waning gibbous':'Waning crescent';
}
export function weightNewtons(massKg, gravity) {
  if (!Number.isFinite(massKg) || massKg<0 || !Number.isFinite(gravity) || gravity<0) throw Error('nonnegative mass and gravity required');
  return massKg*gravity;
}
export const NEARBY = {
  Earth: { diameter:12756.274, gravity:9.82, distance:149598000, distanceLabel:'Mean distance from Sun', atmosphere:'Mostly nitrogen and oxygen; thick enough for weather.', condition:'Surface liquid water; a protective atmosphere.', source:'earthfact' },
  Moon: { diameter:3476.2, gravity:1.62, distance:384400, distanceLabel:'Mean distance from Earth', atmosphere:'An extremely thin exosphere; no breathable air.', condition:'Rocky surface. About −173°C at night to 127°C in full Sun (NASA examples, not a global average).', source:'moonfact' },
  Mars: { diameter:6792.4, gravity:3.73, distance:227956000, distanceLabel:'Mean distance from Sun', atmosphere:'Thin, mostly carbon dioxide; no breathable air.', condition:'Cold and dusty; polar ice and seasons.', source:'marsfact' },
};
