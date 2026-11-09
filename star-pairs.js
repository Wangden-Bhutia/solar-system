// Pairs of stars orbiting each other. Pure data and maths; see docs/sources.md ("Stars in pairs").
// Elements are for the relative orbit (one star around the other) from each system's Wikipedia
// infobox (read 9 Nov 2026), which cites the orbit papers: period P (years), semi-major axis a (AU),
// eccentricity e, year of periastron T0 (closest approach), and masses (Sun = 1). Each star moves
// around the pair's centre of mass on its own ellipse, the lighter one on the bigger ellipse.
const MJ = 0.000954588; // one Jupiter mass in Sun masses
export const PAIRS = {
  'Alpha Centauri': { A: 'Rigil Kentaurus', B: 'Toliman', mA: 1.0788, mB: 0.9092, P: 79.762, a: 23.299, e: 0.51947, T0: 1875.66,
    note: 'Proxima Centauri circles this pair too, from thousands of AU away, once every ~500,000 years.' },
  'Sirius': { A: 'Sirius A', B: 'Sirius B', mA: 2.063, mB: 1.018, P: 50.1284, a: 19.8, e: 0.59142, T0: 1994.5715,
    note: 'Sirius B is a white dwarf: the leftover core of a star once bigger than Sirius A, now about the size of Earth.' },
  'Procyon': { A: 'Procyon A', B: 'Procyon B', mA: 1.478, mB: 0.592, P: 40.84, a: 15.137, e: 0.39785, T0: 1968.076,
    note: 'Procyon B is a white dwarf, found in 1896 because of the wobble it gives Procyon A.' },
  '61 Cygni': { A: '61 Cygni A', B: '61 Cygni B', mA: 0.6771, mB: 0.6289, P: 707.1, a: 86.76, e: 0.4424, T0: 2396.85, // periastron JD 2596496
    note: 'Two orange dwarfs so far apart that one lap takes about 700 years: the last periastron was before the telescope was invented.' },
  'Luhman 16': { A: 'Luhman 16 A', B: 'Luhman 16 B', mA: 35.4 * MJ, mB: 29.4 * MJ, P: 26.55, a: 3.52, e: 0.344, T0: 2018.06, brown: true,
    note: 'Two brown dwarfs, each about 30 times Jupiter’s mass, closer together than Jupiter is to the Sun.' },
  'Epsilon Indi': { A: 'Epsilon Indi Ba', B: 'Epsilon Indi Bb', mA: 66.92 * MJ, mB: 53.25 * MJ, P: 11.0197, a: 2.4058, e: 0.54042, T0: null, brown: true,
    note: 'Two brown dwarfs orbiting each other about 1,500 AU from their star, Epsilon Indi A.' },
};
export const pairOf = name => PAIRS[name] || null;

// Solve Kepler's equation M = E − e sin E.
export function eccentricAnomaly(M, e) {
  M = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 30; i++) { const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); E -= d; if (Math.abs(d) < 1e-12) break; }
  return E;
}
// Where the two stars are in the year `year` (decimal). Positions in AU in the orbit's own plane,
// periastron along +x, centre of mass at the origin. T0 unknown: phase counted from periastron (illustrative).
export function pairState(p, year) {
  const t0 = p.T0 ?? 2026, M = 2 * Math.PI * (year - t0) / p.P, E = eccentricAnomaly(M, p.e);
  const rel = [p.a * (Math.cos(E) - p.e), p.a * Math.sqrt(1 - p.e * p.e) * Math.sin(E)], sep = p.a * (1 - p.e * Math.cos(E));
  const fA = p.mB / (p.mA + p.mB), fB = p.mA / (p.mA + p.mB);
  return { rel, sep, A: [-rel[0] * fA, -rel[1] * fA], B: [rel[0] * fB, rel[1] * fB], fA, fB };
}
export const periastron = p => p.a * (1 - p.e), apastron = p => p.a * (1 + p.e);
// Next periastron after a given year (null when the date of periastron is unknown).
export function nextPeriastron(p, year) { if (p.T0 == null) return null; const n = Math.ceil((year - p.T0) / p.P); return p.T0 + n * p.P; }
// Our own planets' orbits for comparison: the ones of similar size to the pair's orbit.
const OURS = [['Earth’s orbit', 1], ['Mars’s orbit', 1.52], ['Jupiter’s orbit', 5.2], ['Saturn’s orbit', 9.58], ['Uranus’s orbit', 19.2], ['Neptune’s orbit', 30.1]];
export function compareOrbits(p) { const q = apastron(p); return OURS.filter(([, au]) => au / q > 0.18 && au / q < 1.3).slice(-2); }
// Total mass from Kepler's third law (a³ / P², Sun masses) — a check on the published elements.
export const keplerMass = p => p.a ** 3 / p.P ** 2;
