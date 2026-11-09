// One continuous zoom across scales: Solar System → nearby stars → Milky Way.
// Each scale is its own scene with its own camera. Between two scales there is a "bridge": a blend
// position t from 0 (the inner scale) to 1 (the outer scale). Zooming past a scene's limit moves t
// directly, so the outer scene dissolves in while the inner one recedes and darkens, with no cut,
// fade-to-black or pause. Pure maths here; drawing is in lab.js / stars.js / galaxy.js.
export const LEVELS = ['solar', 'stars', 'galaxy', 'local', 'super', 'universe'];
export const LEVEL_NAMES = { solar: 'Solar System', stars: 'Stars', galaxy: 'Milky Way', local: 'Local Group', super: 'Laniakea', universe: 'Universe' };
export const levelIndex = l => LEVELS.indexOf(l);
export const PAIRS = Object.fromEntries(LEVELS.slice(1).map((l, i) => [`${LEVELS[i]}>${l}`, [LEVELS[i], l]]));
export const pairFor = (level, dir) => { const i = LEVELS.indexOf(level), j = i + (dir > 0 ? 1 : -1); if (i < 0 || j < 0 || j >= LEVELS.length) return null; const [a, b] = dir > 0 ? [level, LEVELS[j]] : [LEVELS[j], level]; return `${a}>${b}`; };

// Camera distances that meet at the seams.
export const STAR_NEAR = 0.4;      // ly: the star map's closest view (its inner limit) = end of the Solar System bridge
export const STAR_FAR = 120;       // ly: the star map's outer limit = start of the Galaxy bridge
export const GALAXY_NEAR = 12;     // kly: the Galaxy's closest view (inner limit) = end of the Galaxy bridge
export const GALAXY_FAR = 260;     // kly: the Galaxy's outer limit = start of the Local Group bridge
export const LOCAL_UNIT = 10;      // kly per Local Group scene unit
export const LOCAL_NEAR = 60;      // units (600 kly): the Local Group's closest view = end of its bridge
export const LOCAL_FAR = 1300;     // units (13 million ly): the Local Group's outer limit
export const SUPER_NEAR = 25;      // Mly (Laniakea units): its closest view
export const SUPER_FAR = 1400;     // Mly: its outer limit
export const UNIVERSE_NEAR = 30;   // units of 100 Mly (3 billion ly): the universe's closest view
export const UNIVERSE_FAR = 1500;  // units of 100 Mly: far enough to see the whole observable universe
// The metric seams: outer scene units = inner scene units ÷ k, the inner scene's outer limit (far) meets
// the outer scene's inner limit (near). Only Solar System → stars is not metric (its distances are squeezed).
export const SEAMS = {
  'stars>galaxy': { k: 1000, far: STAR_FAR, near: GALAXY_NEAR },
  'galaxy>local': { k: LOCAL_UNIT, far: GALAXY_FAR, near: LOCAL_NEAR },
  'local>super': { k: 100, far: LOCAL_FAR, near: SUPER_NEAR },
  'super>universe': { k: 100, far: SUPER_FAR, near: UNIVERSE_NEAR },
};
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
  // Every other seam is metric: both scenes share the view direction and centre, and the outer scene's
  // camera distance is exactly the inner one's ÷ k (stars → Galaxy: 120 ly = 0.12 kly).
  const m = SEAMS[pair], innerD = m.far * (m.near * m.k / m.far) ** t;
  return { inner: { d: innerD, dim: smooth(t) }, outer: { d: innerD / m.k, opacity: smooth(t) } };
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
