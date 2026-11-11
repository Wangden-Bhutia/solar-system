// "Continue where you left off" (lab.js): the spot the user was exploring, saved under SPOT_KEY. Pure: no DOM, no
// THREE. A spot is one zoom coordinate (Z = ln of the camera distance in light-years, zoom-ladder.js), the scale it
// rests in, the camera's viewing direction in that scale's frame, and what was selected (a world in the Solar
// System; a star or landmark further out). Anything that does not check out against today's app (a new layout of
// the scales, a renamed star, a hand-edited value, a very old save) is ignored, and the app starts as usual.
export const SPOT_KEY = 'solar.spot.v1';
export const SPOT_VERSION = 1;
export const SPOT_MAX_AGE_MS = 90 * 24 * 3600 * 1000; // older than about three months: start fresh
export const SAVE_EVERY_MS = 1500;                    // at most one write every 1.5 s while exploring
export const AWAY_Z = Math.log(2);                    // "meaningfully away": twice as far, or half as far, as home
export const SAVE_VIEWS = new Set(['explore', 'stars', 'galaxy', 'local', 'super', 'universe']);
const LEVEL_OF = { explore: 'solar', stars: 'stars', galaxy: 'galaxy', local: 'local', super: 'super', universe: 'universe' };
const SCALE_NAMES = { solar: 'Solar System', stars: 'nearby stars', galaxy: 'Milky Way', local: 'Local Group', super: 'Laniakea', universe: 'observable universe' };

// The record written to storage (numbers rounded: a direction to 4 decimals, Z to 5).
export function makeSpot({ view, Z, dir, world = null, star = null, landmark = null, now = Date.now() }) {
  const r = (x, n) => Math.round(x * 10 ** n) / 10 ** n;
  const level = LEVEL_OF[view];
  return { v: SPOT_VERSION, t: now, level, view, Z: r(Z, 5), dir: [r(dir.x, 4), r(dir.y, 4), r(dir.z, 4)],
    world: level === 'solar' ? world : null, star: view === 'stars' ? star : null, landmark: level !== 'solar' && view !== 'stars' ? landmark : null };
}

// Read a stored value back. ctx: { now, levelAt(Z) → { level, pair }, zMin, zMax, names: { worlds, stars, landmarks } (Sets or
// functions of a level returning a Set) }. Returns a clean spot or null.
export function parseSpot(raw, ctx) {
  let s; try { s = typeof raw === 'string' ? JSON.parse(raw) : null; } catch { return null; }
  if (!s || typeof s !== 'object' || s.v !== SPOT_VERSION) return null;
  if (!Number.isFinite(s.t) || ctx.now - s.t > SPOT_MAX_AGE_MS || s.t - ctx.now > 60e3) return null;
  if (!SAVE_VIEWS.has(s.view) || LEVEL_OF[s.view] !== s.level) return null;
  if (!Number.isFinite(s.Z) || s.Z < ctx.zMin) return null;
  if (s.level === 'universe' && s.Z > (typeof ctx.zMax === 'function' ? ctx.zMax() : ctx.zMax ?? Infinity)) return null; // read only when needed (it builds the scale)
  const lay = ctx.levelAt(s.Z); if (!lay || lay.pair || lay.level !== s.level) return null; // rests in its own scale, not in a seam
  if (!Array.isArray(s.dir) || s.dir.length !== 3 || !s.dir.every(Number.isFinite)) return null;
  const len = Math.hypot(...s.dir); if (len < 0.5 || len > 1.5) return null;
  const dir = { x: s.dir[0] / len, y: s.dir[1] / len, z: s.dir[2] / len };
  const known = (set, name) => name == null || (typeof name === 'string' && !!set?.has(name));
  if (!known(ctx.names?.worlds, s.world) || !known(ctx.names?.stars, s.star)) return null;
  if (s.landmark != null) { const lm = typeof ctx.names?.landmarks === 'function' ? ctx.names.landmarks(s.level) : ctx.names?.landmarks; if (!known(lm, s.landmark)) return null; }
  if ([s.world, s.star, s.landmark].filter(x => x != null).length > 1) return null;
  return { level: s.level, view: s.view, Z: s.Z, dir, world: s.world ?? null, star: s.star ?? null, landmark: s.landmark ?? null, t: s.t };
}

// Worth offering? Anything selected, another scale, or the Solar System seen from twice (or half) the home distance.
export function isAway(spot, homeZ) {
  if (!spot) return false;
  if (spot.world || spot.star || spot.landmark || spot.level !== 'solar') return true;
  return Math.abs(spot.Z - homeZ) > AWAY_Z;
}

// The prompt's words: what was selected, and at which scale.
export function spotLabel(spot, homeZ = 0) {
  const thing = spot.world || spot.star || spot.landmark;
  const scale = SCALE_NAMES[spot.level];
  if (thing) return spot.level === 'solar' ? thing : `${thing} · ${scale}`;
  return spot.level === 'solar' ? 'the Solar System, zoomed ' + (spot.Z > homeZ ? 'out' : 'in') : `the ${scale}`;
}
