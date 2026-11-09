// How the Milky Way turns. Pure maths; see docs/sources.md ("Galaxy in motion").
// Time t is in millions of years (Myr) from today: negative = the past. Distances in kly, as in galaxy-data.js.
//
// Three different motions, which is the point of the animation:
// - Stars orbit the centre at nearly the same SPEED at every radius (a flat rotation curve), so inner
//   stars go round in far less TIME: the disc shears instead of turning like a wheel.
// - The spiral arms are a pattern (a density wave) that turns at one slower rate. Stars move through it.
// - The central bar turns as one body, faster than the arms.
import { R0, KPC, ARMS, armPoints, discPosition } from './galaxy-data.js';

export const VC_SUN = 229;       // km/s: circular speed at the Sun (Eilers et al. 2019: 229.0 ± 0.2, systematics 2–5%)
export const VC_SLOPE = -1.7;    // km/s per kpc: the curve's gentle decline outside ~5 kpc (same paper)
export const OMEGA_ARMS = 28.2;  // km/s/kpc: spiral pattern speed (Dias et al. 2019: 28.2 ± 2.1; other estimates ~17–28)
export const OMEGA_BAR = 39;     // km/s/kpc: bar pattern speed (Portail et al. 2017: 39.0 ± 3.5; recent estimates converge on 35–41)
const KMS_KPC = 1 / 977.79;      // 1 km/s/kpc expressed in radians per million years
export const radPerMyr = kmsPerKpc => kmsPerKpc * KMS_KPC;

// Circular speed (km/s) at radius R (kly). Rises through the bulge, then nearly flat.
export function circularSpeed(R) { return (VC_SUN + VC_SLOPE * (R - R0) / KPC) * (1 - Math.exp(-R / 2.5)); }
// Angular speed (radians per Myr) of a star on a circular orbit at radius R (kly).
export const omega = R => R < 0.05 ? 0 : radPerMyr(circularSpeed(R) / (R / KPC));
export const SUN_OMEGA = omega(R0);
export const SUN_PERIOD = 2 * Math.PI / SUN_OMEGA;      // ≈ 222 Myr: one galactic year in this model
export const ARMS_OMEGA = radPerMyr(OMEGA_ARMS), BAR_OMEGA = radPerMyr(OMEGA_BAR);

// The Sun also bobs through the disc: now ~20.8 pc above the mid-plane and rising (Bennett & Bovy 2019);
// peak height 49–93 pc and half-period 26–37 Myr (Bahcall & Bahcall 1985). Mid values used.
export const SUN_BOB = { now: 0.0208 * KPC, amp: 0.07 * KPC, period: 64 }; // kly, kly, Myr
const BOB_PHASE = Math.asin(SUN_BOB.now / SUN_BOB.amp);
export const sunHeight = t => SUN_BOB.amp * Math.sin(2 * Math.PI * t / SUN_BOB.period + BOB_PHASE);

// Turn a scene position about the centre by angle a, in the Galaxy's direction of rotation
// (the same sense as increasing azimuth in discPosition). Mirrors the vertex shader in galaxy.js.
export function turn([x, y, z], a) { const c = Math.cos(a), s = Math.sin(a); return [x * c - z * s, y, x * s + z * c]; }
// The Sun's place at time t. Height is relative to today's, so at t = 0 it sits exactly where the
// star map hands over (the seam between the two scales stays exact).
export function sunPosition(t) { const p = turn([-R0, 0, 0], SUN_OMEGA * t); p[1] = sunHeight(t) - sunHeight(0); return p; }

// Bright "tracer" stars that move at their true orbital speed. Most start on the arms (stars are born
// there) and drift out of them over time while the arms themselves keep their shape.
function rng(seed) { let x = seed >>> 0; return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296); }
export function tracerStars(n = 1400, seed = 7) {
  const r = rng(seed), pos = new Float32Array(n * 3), om = new Float32Array(n);
  const arms = ARMS.filter(a => !a.spur).map(a => armPoints(a, 1));
  for (let i = 0; i < n; i++) {
    let R, b;
    if (r() < 0.65) { const pts = arms[Math.floor(r() * arms.length)], p = pts[Math.floor(r() * pts.length)]; R = p[0] + (r() - 0.5) * 1.6; b = p[1] + (r() - 0.5) * 3; }
    else { R = 6 + r() * 42; b = r() * 360; }
    pos.set(discPosition(R, b, (r() - 0.5) * 0.4), i * 3); om[i] = omega(R);
  }
  return { positions: pos, omegas: om };
}

// The clock: range, speed, and how a moment is described.
export const TIME_RANGE = [-250, 250];   // Myr: a little over one galactic year each way
export const MYR_PER_SEC = 10;           // playback: one galactic year in about 22 seconds
const fmt = n => Math.round(n).toLocaleString('en-IN');
export function timeLabel(t) {
  if (Math.abs(t) < 0.5) return 'Today';
  return t < 0 ? `${fmt(-t)} million years ago` : `${fmt(t)} million years from now`;
}
export function lapsLabel(t) {
  const l = Math.abs(t) / SUN_PERIOD;
  if (l < 0.005) return 'The Sun goes round once every ~230 million years';
  const v = l >= 0.995 && l < 1.005 ? 'one full lap' : `${l.toFixed(2)} of a lap`;
  return t < 0 ? `The Sun was ${v} back` : `The Sun has gone ${v}`;
}
// What was happening on Earth (or in the Sun's orbit) at time t, if anything notable.
export const MILESTONES = [
  { t: -66, span: 6, text: 'The dinosaurs die out' },
  { t: -SUN_PERIOD, span: 10, text: 'One lap ago: dinosaurs were new on Earth' },
  { t: SUN_PERIOD, span: 10, text: 'One full lap from today' },
];
export const milestone = t => MILESTONES.find(m => Math.abs(t - m.t) <= m.span)?.text ?? null;
