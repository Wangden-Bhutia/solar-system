// The scale readout (Phase 4): width of the view, the camera's distance from the Sun, and how long light takes to
// cross the view, all changing continuously with the zoom. Pure formatting and geometry here; lab.js places it.
import { AU_LY } from './zoom-ladder.js';
export const DAY_YR = 1 / 365.25;
// Width of the view across the screen at the centre of view: 2 · D · tan(fov/2) · aspect (D: camera to the point
// it looks at, in ly; fov: vertical, degrees; aspect: width / height).
export const viewWidth = (Dly, fovDeg, aspect) => 2 * Dly * Math.tan(fovDeg * Math.PI / 360) * aspect;
const sig = (x, n = 2) => { if (!(x > 0)) return '0'; const d = Math.max(0, n - 1 - Math.floor(Math.log10(x))); const r = Number(x.toFixed(Math.min(d, 6))); return r.toLocaleString('en-US', { maximumFractionDigits: Math.min(d, 6) }); };
// A distance in light-years with units rolling over: km → AU → light-years → thousand / million / billion ly.
export function formatLy(ly) {
  if (!(ly > 0)) return '0';
  const au = ly / AU_LY;
  if (au < 0.01) return `${sig(au * 149597870.7)} km`;
  if (au < 10000) return `${sig(au)} AU`;
  if (ly < 1000) return `${sig(ly)} light-years`;
  if (ly < 1e6) return `${sig(ly / 1e3)} thousand light-years`;
  if (ly < 1e9) return `${sig(ly / 1e6)} million light-years`;
  return `${sig(ly / 1e9)} billion light-years`;
}
// Light-crossing time of a width in ly (a light-year takes a year): seconds → minutes → hours → days → years
// → thousand / million / billion years.
export function formatLight(ly) {
  const yr = ly, s = yr * 365.25 * 86400;
  if (!(s > 0)) return '0 s';
  if (s < 90) return `${sig(s)} seconds`;
  if (s < 5400) return `${sig(s / 60)} minutes`;
  if (s < 2 * 86400) return `${sig(s / 3600)} hours`;
  if (yr < 1) return `${sig(s / 86400)} days`;
  if (yr < 1000) return `${sig(yr)} years`;
  if (yr < 1e6) return `${sig(yr / 1e3)} thousand years`;
  if (yr < 1e9) return `${sig(yr / 1e6)} million years`;
  return `${sig(yr / 1e9)} billion years`;
}
// Caveats, so the numbers never claim more than the picture shows.
//  - model: the Solar System's distances are compressed until ~300 AU and blend to true scale by the seam; its
//    numbers are the distance the view represents (≈).
//  - offSun: the view is centred away from the Sun (a planet, the Galactic Centre, another galaxy): the width is
//    at that centre and the distance from the Sun is the camera's, not the centre's.
//  - beyond: the camera is farther than the edge of the observable universe (~46.5 billion ly): a viewpoint for
//    seeing the whole, not a place anything could be.
export const OBSERVABLE_LY = 46.5e9;
export function hudText({ widthLy, sunLy, model = false, offSun = false }) {
  const approx = model ? '≈ ' : '';
  const lines = [`View ${approx}${formatLy(widthLy)} across`, `${approx}${formatLy(sunLy)} from the Sun`, `Light crosses it in ${approx}${formatLight(widthLy)}`];
  const notes = [];
  if (model) notes.push('Solar System distances compressed (model)');
  if (offSun) notes.push('centred away from the Sun');
  if (sunLy > OBSERVABLE_LY) notes.push('viewpoint outside the observable universe');
  return { lines, note: notes.join(' · ') };
}
