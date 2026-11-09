// Continuous zoom between scales: Solar System → nearby stars → Milky Way.
// Each scene keeps its own camera limits. When the camera is already at its outer limit and the
// person keeps zooming out (scroll wheel or pinch), that extra "push" builds up; past a threshold
// we move out one level. The same works inward at the inner limit. Pure logic, no DOM.
export const LEVELS = ['solar', 'stars', 'galaxy'];
export const LEVEL_NAMES = { solar: 'Solar System', stars: 'Stars', galaxy: 'Milky Way' };
export const levelIndex = l => LEVELS.indexOf(l);

// A push accumulator. amount > 0 means zooming out, < 0 zooming in (wheel deltaY, or the log of a
// pinch's finger-spread ratio scaled to the same units). Returns 'out' / 'in' when a step should
// happen, otherwise null. Pushes decay if the person stops (after idleMs) or reverses direction,
// and only count while the camera sits at the matching limit.
export function createPush({ threshold = 260, idleMs = 900 } = {}) {
  let acc = 0, last = 0;
  return {
    feed(amount, { atOuter, atInner, now = Date.now() }) {
      if (now - last > idleMs) acc = 0; last = now;
      if (amount > 0 && atOuter) acc = Math.max(0, acc) + amount;
      else if (amount < 0 && atInner) acc = Math.min(0, acc) + amount;
      else acc = 0;
      if (acc >= threshold) { acc = 0; return 'out'; }
      if (acc <= -threshold) { acc = 0; return 'in'; }
      return null;
    },
    get progress() { return Math.min(1, Math.abs(acc) / threshold); },
    get direction() { return acc > 0 ? 'out' : acc < 0 ? 'in' : null; },
    reset() { acc = 0; },
  };
}
// Within this fraction of a limit counts as "at" it (OrbitControls damping stops just short).
export const atLimit = (d, min, max, slack = 0.04) => ({ atOuter: d >= max * (1 - slack), atInner: d <= min * (1 + slack) });
// What the edge hint says while a push builds up.
export function edgeHint(level, dir) {
  if (dir === 'out') return level === 'solar' ? 'Keep zooming out to leave the Solar System' : level === 'stars' ? 'Keep zooming out to see the Milky Way' : null;
  if (dir === 'in') return level === 'stars' ? 'Keep zooming in to return to the Solar System' : level === 'galaxy' ? 'Keep zooming in to return to the nearby stars' : null;
  return null;
}
