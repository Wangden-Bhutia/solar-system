// One continuous zoom across six scales: Solar System → nearby stars → Milky Way → Local Group → Laniakea →
// observable universe. Each scale is its own scene with its own camera and units. Pure maths here; drawing is
// in lab.js and the scene modules.
//
// ONE zoom coordinate for every scale: Z = ln(camera distance from its centre of view, in light-years).
// Each scene converts Z into its own units (stars: ly, Galaxy: kly, Local Group: 10 kly, Laniakea: Mly,
// universe: 100 Mly), so every metric seam is exact: outer distance = inner distance ÷ k at every Z.
// The Solar System is the exception: its distances are compressed (25 × AU^0.6 scene units, sizes true), so
// its Z is the distance the compressed view *represents* (see solarUnits below); that is a model mapping,
// not a physical camera distance, and the readout says so.
//
// Between two scales there is a seam: an interval of Z where both scenes are drawn, the camera of each at
// exactly the same Z. The blend position t inside a seam is derived from Z (t = 0 at the inner end, 1 at
// the outer end); it is never stepped separately, so zooming has the same speed through a seam as inside a
// scene. Every seam spans exactly one decade of distance (ΔZ = ln 10), so each takes a comparable gesture.
import { DIST_K, DIST_P, UNITS_PER_AU } from './data.js';
export const LEVELS = ['solar', 'stars', 'galaxy', 'local', 'super', 'universe'];
export const LEVEL_NAMES = { solar: 'Solar System', stars: 'Stars', galaxy: 'Milky Way', local: 'Local Group', super: 'Laniakea', universe: 'Universe' };
export const levelIndex = l => LEVELS.indexOf(l);
export const PAIRS = Object.fromEntries(LEVELS.slice(1).map((l, i) => [`${LEVELS[i]}>${l}`, [LEVELS[i], l]]));
export const pairFor = (level, dir) => { const i = LEVELS.indexOf(level), j = i + (dir > 0 ? 1 : -1); if (i < 0 || j < 0 || j >= LEVELS.length) return null; const [a, b] = dir > 0 ? [level, LEVELS[j]] : [LEVELS[j], level]; return `${a}>${b}`; };

// Light-years per scene unit at each scale (the Solar System's compressed units are handled separately).
export const LY_KM = 9460730472580.8, AU_KM = 149597870.7, AU_LY = AU_KM / LY_KM;
export const UNIT_LY = { stars: 1, galaxy: 1e3, local: 1e4, super: 1e6, universe: 1e8 };
// Seams as camera distances in light-years [inner end, outer end]: one decade each. Chosen so each scene's
// own glides (enter, overview) stay inside its exclusive range, between the seams.
export const SEAM_LY = {
  'solar>stars': [0.08, 0.8],       // ≈ 5,000–50,000 AU: leaving the planets, inside the Oort cloud
  'stars>galaxy': [300, 3000],      // the Sun's neighbourhood becomes a patch of the Orion Arm
  'galaxy>local': [2.5e5, 2.5e6],   // the Milky Way and its satellites become one galaxy of the group
  'local>super': [1e7, 1e8],        // the Local Group becomes one knot of Laniakea
  'super>universe': [8e8, 8e9],     // Laniakea becomes a speck of the cosmic web
};
export const SEAM_Z = Object.fromEntries(Object.entries(SEAM_LY).map(([k, [a, b]]) => [k, [Math.log(a), Math.log(b)]]));
// The metric seams: outer units = inner units ÷ k (stars → Galaxy: 1 kly = 1,000 ly, exact).
export const SEAMS = {
  'stars>galaxy': { k: UNIT_LY.galaxy / UNIT_LY.stars },
  'galaxy>local': { k: UNIT_LY.local / UNIT_LY.galaxy },
  'local>super': { k: UNIT_LY.super / UNIT_LY.local },
  'super>universe': { k: UNIT_LY.universe / UNIT_LY.super },
};
for (const [pair, m] of Object.entries(SEAMS)) { const [a, b] = SEAM_LY[pair], [i, o] = PAIRS[pair]; m.far = a / UNIT_LY[i]; m.near = b / UNIT_LY[o]; }

// Each scene's exclusive range (in its own units): between the seam inside it and the seam outside it.
// Its glides (zoomOut, zoomBackIn) end here, and a seam is then crossed by the zoom itself.
export const STAR_NEAR = SEAM_LY['solar>stars'][1];                        // 0.8 ly
export const STAR_FAR = SEAM_LY['stars>galaxy'][0];                         // 300 ly
export const GALAXY_NEAR = SEAM_LY['stars>galaxy'][1] / UNIT_LY.galaxy;     // 3 kly
export const GALAXY_FAR = SEAM_LY['galaxy>local'][0] / UNIT_LY.galaxy;      // 250 kly
export const LOCAL_UNIT = UNIT_LY.local / UNIT_LY.galaxy;                   // kly per Local Group unit
export const LOCAL_NEAR = SEAM_LY['galaxy>local'][1] / UNIT_LY.local;       // 250 units = 2.5 million ly
export const LOCAL_FAR = SEAM_LY['local>super'][0] / UNIT_LY.local;         // 1,000 units = 10 million ly
export const SUPER_NEAR = SEAM_LY['local>super'][1] / UNIT_LY.super;        // 100 Mly
export const SUPER_FAR = SEAM_LY['super>universe'][0] / UNIT_LY.super;      // 800 Mly
export const UNIVERSE_NEAR = SEAM_LY['super>universe'][1] / UNIT_LY.universe; // 80 units = 8 billion ly
export const UNIVERSE_FAR = 1500;                                            // 150 billion ly (fitted wider on tall screens)
// Each scene's full range, seams included (its OrbitControls must not clamp a distance the zoom sets).
export const SCENE_RANGE = {
  stars: [SEAM_LY['solar>stars'][0], SEAM_LY['stars>galaxy'][1]],
  galaxy: [SEAM_LY['stars>galaxy'][0] / UNIT_LY.galaxy, SEAM_LY['galaxy>local'][1] / UNIT_LY.galaxy],
  local: [SEAM_LY['galaxy>local'][0] / UNIT_LY.local, SEAM_LY['local>super'][1] / UNIT_LY.local],
  super: [SEAM_LY['local>super'][0] / UNIT_LY.super, SEAM_LY['super>universe'][1] / UNIT_LY.super],
  universe: [SEAM_LY['super>universe'][0] / UNIT_LY.universe, Infinity],
};

const clamp01 = t => Math.max(0, Math.min(1, t)), smooth = t => { t = clamp01(t); return t * t * (3 - 2 * t); };
export { smooth };
// Where Z sits: inside one scale, or inside a seam with its blend position t (0 = inner end, 1 = outer end).
const ORDER = Object.keys(SEAM_Z);
export function layoutAt(Z) {
  for (let i = 0; i < ORDER.length; i++) {
    const [a, b] = SEAM_Z[ORDER[i]];
    if (Z <= a) return { level: LEVELS[i], pair: null, t: 0 };
    if (Z < b) return { level: null, pair: ORDER[i], t: (Z - a) / (b - a) };
  }
  return { level: 'universe', pair: null, t: 0 };
}
// Z of a metric scene's camera distance, and back.
export const zOf = (level, d) => Math.log(d * UNIT_LY[level]);
export const dOf = (level, Z) => Math.exp(Z) / UNIT_LY[level];

// ---- The Solar System's compressed distances ----
// A planet a AU from the Sun is drawn DIST_K × a^DIST_P scene units out (sizes are true: 1 unit = 12,756 km).
// The camera is placed by the same rule, so a Z that represents a camera D light-years away sits where the
// compressed model puts D. metric (0…1) blends the rule towards true scale (a × UNITS_PER_AU), geometric
// in between; metricBlend(Z) says how much, by Z. Leaving the planets (past a camera ~300 AU out) the rule
// blends to true scale, complete where the Solar System → stars seam starts (0.08 ly ≈ 5,060 AU). So the seam
// itself is metric: the Oort cloud, the heliosphere and the Sun's glow are at the same true distances in both
// scenes. Inside ~300 AU the planets' distances stay compressed (and are labelled so).
export const SOLAR_METRIC_AU = 300;
export const SOLAR_METRIC = [Math.log(SOLAR_METRIC_AU * AU_KM / LY_KM), Math.log(SEAM_LY['solar>stars'][0])]; // [Z blend starts, Z complete]
export const metricBlend = Z => SOLAR_METRIC ? smooth((Z - SOLAR_METRIC[0]) / (SOLAR_METRIC[1] - SOLAR_METRIC[0])) : 0;
const LN_K = Math.log(DIST_K), LN_TRUE = Math.log(UNITS_PER_AU / DIST_K);
// Scene units for a distance of `au` AU under blend m (also used for planet orbits).
export const auToUnits = (au, m = 0) => Math.exp(LN_K + m * LN_TRUE + Math.log(au) * (DIST_P + (1 - DIST_P) * m));
export const solarUnits = (D, real = false) => real ? D / AU_LY * UNITS_PER_AU : auToUnits(D / AU_LY, metricBlend(Math.log(D)));
// Inverse: the Z represented by a Solar System camera distance of d units. Monotonic, so bisection is exact.
export function solarZ(d, real = false) {
  if (real) return Math.log(d / UNITS_PER_AU * AU_LY);
  const ld = Math.log(d); let lo = -40, hi = 10;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (Math.log(solarUnits(Math.exp(mid))) < ld) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
// How fast the picture changes per unit of Z. In the compressed Solar System, apparent sizes change as
// d^(DIST_P + (1 − DIST_P) m) with the represented distance, so the same gesture would feel slower; the zoom
// multiplies its input by 1 / viewRate there, so the picture changes at the same rate as everywhere else.
// Inside the Solar System → stars seam it eases back to 1, so the rate never steps.
export function viewRate(Z, real = false) {
  if (real) return 1;
  const [a, b] = SEAM_Z['solar>stars'], s = z => DIST_P + (1 - DIST_P) * metricBlend(z);
  if (Z <= a) return s(Z);
  if (Z >= b) return 1;
  const k = smooth((Z - a) / (b - a)); return s(a) * (1 - k) + k;
}
