// One continuous zoom across scales: Solar System → nearby stars → Milky Way.
// Each scale is its own scene with its own camera. Between two scales there is a "bridge": a blend
// position t from 0 (the inner scale) to 1 (the outer scale). Zooming past a scene's limit moves t
// directly, so the outer scene dissolves in while the inner one recedes and darkens, with no cut,
// fade-to-black or pause. Pure maths here; drawing is in lab.js / stars.js / galaxy.js.
export const LEVELS = ['solar', 'stars', 'galaxy', 'local'];
export const LEVEL_NAMES = { solar: 'Solar System', stars: 'Stars', galaxy: 'Milky Way', local: 'Local Group' };
export const levelIndex = l => LEVELS.indexOf(l);
export const PAIRS = { 'solar>stars': ['solar', 'stars'], 'stars>galaxy': ['stars', 'galaxy'], 'galaxy>local': ['galaxy', 'local'] };
export const pairFor = (level, dir) => { const i = LEVELS.indexOf(level), j = i + (dir > 0 ? 1 : -1); if (i < 0 || j < 0 || j >= LEVELS.length) return null; const [a, b] = dir > 0 ? [level, LEVELS[j]] : [LEVELS[j], level]; return `${a}>${b}`; };

// Camera distances that meet at the seams.
export const STAR_NEAR = 0.4;      // ly: the star map's closest view (its inner limit) = end of the Solar System bridge
export const STAR_FAR = 120;       // ly: the star map's outer limit = start of the Galaxy bridge
export const GALAXY_NEAR = 12;     // kly: the Galaxy's closest view (inner limit) = end of the Galaxy bridge
export const GALAXY_FAR = 260;     // kly: the Galaxy's outer limit = start of the Local Group bridge
export const LOCAL_UNIT = 10;      // kly per Local Group scene unit
export const LOCAL_NEAR = 60;      // units (600 kly): the Local Group's closest view = end of its bridge
export const LOCAL_FAR = 1300;     // units (13 million ly): the Local Group's outer limit
// How much zooming crosses a whole bridge (wheel deltaY units; a pinch is converted to the same units).
export const BRIDGE_SPAN = 600;

const smooth = t => t * t * (3 - 2 * t);
// Where each camera is and how visible each scene is at blend position t.
export function bridgeFrame(pair, t) {
  t = Math.max(0, Math.min(1, t));
  if (pair === 'solar>stars') {
    // The Solar System recedes (camera pulls back up to 8×) as the star map opens out from just around
    // the Sun (0.02 → 0.4 ly). The Solar System's units are compressed, so this seam is visual, not metric.
    return { inner: { recede: 1 + 7 * t ** 1.5, dim: smooth(t) }, outer: { d: 0.02 * (STAR_NEAR / 0.02) ** t, opacity: smooth(t) } };
  }
  if (pair === 'galaxy>local') {
    // Also metric: the Local Group scene is the Galaxy scene shrunk by 10, around the same target.
    const galD = GALAXY_FAR * (LOCAL_NEAR * LOCAL_UNIT / GALAXY_FAR) ** t;
    return { inner: { d: galD, dim: smooth(t) }, outer: { d: galD / LOCAL_UNIT, opacity: smooth(t) } };
  }
  // Stars → Galaxy is metric: both scenes share the Sun as centre and the same view direction, and
  // the Galaxy's camera distance in kly is exactly the star map's in ly ÷ 1,000 (120 ly = 0.12 kly).
  const starD = STAR_FAR * (GALAXY_NEAR * 1000 / STAR_FAR) ** t;
  return { inner: { d: starD, dim: smooth(t) }, outer: { d: starD / 1000, opacity: smooth(t) } };
}
// Is the active camera at the limit that leads into a bridge? (OrbitControls damping stops just short.)
export const atLimit = (d, min, max, slack = 0.04) => ({ atOuter: d >= max * (1 - slack), atInner: d <= min * (1 + slack) });
// Advance a bridge by a zoom amount (> 0 zooms out). Returns the new t and whether it has settled
// at an end: 'outer' (arrived at the outer scale), 'inner' (back at the inner one) or null.
export function stepBridge(t, amount, span = BRIDGE_SPAN) {
  let next = Math.max(0, Math.min(1, t + amount / span));
  if (next < 1e-9) next = 0; else if (next > 1 - 1e-9) next = 1; // floating-point steps must still land on the ends
  return { t: next, settled: next >= 1 ? 'outer' : next <= 0 ? 'inner' : null };
}
