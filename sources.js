// The Sources screen's data: every scientific claim the app shows, grouped by where it appears, each with the
// sources behind it, plus the list of what is drawn to scale and what is an illustration.
// Single source of truth: claim texts are read from the app's own data (data.js, insights.js, learn.js, tour.js,
// adventure.js, voice/lines.js, science.js and the star/galaxy/cosmos data files), never retyped here. This file only
// adds which source backs which entry. Pure data, no DOM: sources-page.js draws it; tests/sources.test.js checks it.
import { SUN, PLANETS, MOON, MOONS, DWARFS, SUN_SHRINK, DIST_K, DIST_P } from './data.js';
import { INSIGHTS, STRIKING, genericInsight, dwarfInsight, moonInsight, NASA, MOON_COUNT, SAT_SOURCES, JPL_RADII, DWARF_SOURCES, SBDB } from './insights.js';
import { LINES } from './voice/lines.js';
import { PREDICTIONS, JOURNEYS } from './learn.js';
import { SOURCES as TOUR_SOURCES, TOUR_STOPS, sourcesOf } from './tour.js';
import { STOPS as ADVENTURE_STOPS, SCALE_NOTE } from './adventure.js';
import { NEARBY } from './science.js';
import { LANDMARKS, GALAXY_FACTS } from './galaxy-data.js';
import { GALAXIES, LOCAL_FACTS } from './local-data.js';
import { CLUSTERS, FAR_GALAXY, COSMOS_FACTS } from './cosmos-data.js';
import { STAR_FACTS } from './stars-data.js';
import { VISITORS } from './star-motion.js';
import { MILESTONES } from './galaxy-motion.js';
import { EVENTS as COSMIC_EVENTS, eventDate } from './cosmic-calendar.js';

export const CHECKED_ON = '10 November 2026';
const nssdc = b => `https://nssdc.gsfc.nasa.gov/planetary/factsheet/${b}fact.html`;
const sci = p => `https://science.nasa.gov/${p}`;
export const wikiUrl = t => `https://en.wikipedia.org/wiki/${encodeURIComponent(t.replace(/’/g, "'").replace(/ /g, '_'))}`;

// Every source the app cites, by key. The tour's own list comes first, unchanged (tour.js stays its owner).
export const REFS = {
  ...TOUR_SOURCES,
  nssdcSun: { label: 'NASA NSSDCA Sun fact sheet', url: nssdc('sun') },
  nssdcMercury: { label: 'NASA NSSDCA Mercury fact sheet', url: nssdc('mercury') },
  nssdcVenus: { label: 'NASA NSSDCA Venus fact sheet', url: nssdc('venus') },
  nssdcMoon: { label: 'NASA NSSDCA Moon fact sheet', url: NASA.moonfact },
  nssdcMars: { label: 'NASA NSSDCA Mars fact sheet (and its moons)', url: NASA.marsfact },
  nssdcJupiter: { label: 'NASA NSSDCA Jupiter fact sheet', url: nssdc('jupiter') },
  nssdcSaturn: { label: 'NASA NSSDCA Saturn fact sheet', url: nssdc('saturn') },
  nssdcUranus: { label: 'NASA NSSDCA Uranus fact sheet', url: nssdc('uranus') },
  nssdcPluto: { label: 'NASA NSSDCA Pluto fact sheet', url: SAT_SOURCES.Pluto },
  nssdcAsteroids: { label: 'NASA NSSDCA asteroid fact sheet', url: DWARF_SOURCES.Ceres[1] },
  nssdcJovianSats: { label: 'NASA NSSDCA Jovian satellite fact sheet', url: SAT_SOURCES.Jupiter },
  nssdcSaturnianSats: { label: 'NASA NSSDCA Saturnian satellite fact sheet', url: SAT_SOURCES.Saturn },
  nssdcUranianSats: { label: 'NASA NSSDCA Uranian satellite fact sheet', url: SAT_SOURCES.Uranus },
  nssdcNeptunianSats: { label: 'NASA NSSDCA Neptunian satellite fact sheet', url: SAT_SOURCES.Neptune },
  jplRadii: { label: 'NASA JPL: planetary satellite physical parameters', url: JPL_RADII },
  nasaSun: { label: 'NASA Science: Sun facts', url: sci('sun/facts/') },
  nasaMercury: { label: 'NASA Science: Mercury facts', url: sci('mercury/facts/') },
  nasaVenus: { label: 'NASA Science: Venus facts', url: sci('venus/venus-facts/') },
  nasaEarth: { label: 'NASA Science: Earth facts', url: NASA.earth },
  nasaMoon: { label: 'NASA Science: Moon facts', url: NASA.moon },
  nasaPhases: { label: 'NASA Science: Moon phases', url: NASA.phases },
  nasaTidalLocking: { label: 'NASA Science: tidal locking', url: sci('moon/tidal-locking/') },
  nasaMars: { label: 'NASA Science: Mars facts', url: sci('mars/facts/') },
  nasaJupiter: { label: 'NASA Science: Jupiter facts', url: sci('jupiter/jupiter-facts/') },
  nasaSaturn: { label: 'NASA Science: Saturn facts', url: sci('saturn/facts/') },
  nasaUranus: { label: 'NASA Science: Uranus facts', url: sci('uranus/facts/') },
  nasaNeptune: { label: 'NASA Science: Neptune facts', url: sci('neptune/neptune-facts/') },
  nasaJupiterMoons: { label: 'NASA Science: Jupiter’s moons', url: sci('jupiter/jupiter-moons/') },
  nasaSaturnMoons: { label: 'NASA Science: Saturn’s moons', url: sci('saturn/moons/') },
  nasaUranusMoons: { label: 'NASA Science: Uranus’s moons', url: sci('uranus/moons/') },
  nasaNeptuneMoons: { label: 'NASA Science: Neptune’s moons', url: sci('neptune/moons/') },
  nasaPlutoMoons: { label: 'NASA Science: Pluto’s moons', url: sci('dwarf-planets/pluto/moons/') },
  nasaPhobos: { label: 'NASA Science: Phobos', url: sci('mars/moons/phobos/') },
  nasaDeimos: { label: 'NASA Science: Deimos', url: sci('mars/moons/deimos/') },
  nasaIo: { label: 'NASA Science: Io', url: sci('jupiter/jupiter-moons/io/') },
  nasaEuropa: { label: 'NASA Science: Europa', url: sci('jupiter/jupiter-moons/europa/') },
  nasaGanymede: { label: 'NASA Science: Ganymede', url: sci('jupiter/jupiter-moons/ganymede/') },
  nasaCallisto: { label: 'NASA Science: Callisto', url: sci('jupiter/jupiter-moons/callisto/') },
  nasaMimas: { label: 'NASA Science: Mimas', url: sci('saturn/moons/mimas/') },
  nasaEnceladus: { label: 'NASA Science: Enceladus', url: sci('saturn/moons/enceladus/') },
  nasaTethys: { label: 'NASA Science: Tethys', url: sci('saturn/moons/tethys/') },
  nasaDione: { label: 'NASA Science: Dione', url: sci('saturn/moons/dione/') },
  nasaRhea: { label: 'NASA Science: Rhea', url: sci('saturn/moons/rhea/') },
  nasaTitan: { label: 'NASA Science: Titan facts', url: sci('saturn/moons/titan/facts/') },
  nasaIapetus: { label: 'NASA Science: Iapetus', url: sci('saturn/moons/iapetus/') },
  nasaMiranda: { label: 'NASA Science: Miranda', url: sci('uranus/moons/miranda/') },
  nasaAriel: { label: 'NASA Science: Ariel', url: sci('uranus/moons/ariel/') },
  nasaUmbriel: { label: 'NASA Science: Umbriel', url: sci('uranus/moons/umbriel/') },
  nasaTitania: { label: 'NASA Science: Titania', url: sci('uranus/moons/titania/') },
  nasaOberon: { label: 'NASA Science: Oberon', url: sci('uranus/moons/oberon/') },
  nasaTriton: { label: 'NASA Science: Triton', url: sci('neptune/moons/triton/') },
  nasaCharon: { label: 'NASA Science: Charon', url: sci('dwarf-planets/pluto/moons/charon/') },
  nasaCeres: { label: 'NASA Science: Ceres', url: sci('dwarf-planets/ceres/') },
  vestaTrek: { label: 'NASA Vesta Trek: Vesta quick facts', url: 'https://trek.nasa.gov/vesta/jpl/assets/quickfacts/vesta/quick-facts.html' },
  nasaPlutoFacts: { label: 'NASA Science: Pluto facts', url: sci('dwarf-planets/pluto/facts/') },
  nasaPlutoHeart: { label: 'NASA: Pluto’s heart, a cosmic “lava lamp” of nitrogen ice', url: 'https://www.nasa.gov/solar-system/plutos-heart-like-a-cosmic-lava-lamp/' },
  nhPlutoOrbit: { label: 'New Horizons (JHU APL): Pluto’s orbit and Neptune', url: 'https://pluto.jhuapl.edu/Pluto/The-Pluto-System.php?link=The-Inside-Story' },
  nasaHaumea: { label: 'NASA Science: Haumea', url: DWARF_SOURCES.Haumea[1] },
  nasaMakemake: { label: 'NASA Science: Makemake', url: DWARF_SOURCES.Makemake[1] },
  nasaEris: { label: 'NASA Science: Eris', url: DWARF_SOURCES.Eris[1] },
  nasaAsteroidFacts: { label: 'NASA Science: asteroid facts', url: sci('solar-system/asteroids/facts/') },
  gsfcAsteroids: { label: 'NASA Goddard: Solar System tour, asteroids', url: 'https://science.gsfc.nasa.gov/690/solar-system-tour/Asteroids.html' },
  nasaKuiper: { label: 'NASA Science: Kuiper Belt facts', url: sci('solar-system/kuiper-belt/facts/') },
  nasaEclipses: { label: 'NASA Science: eclipses', url: sci('eclipses/') },
  noaaTides: { label: 'NOAA tides tutorial', url: 'https://oceanservice.noaa.gov/education/tutorial_tides/' },
  noaaTideCause: { label: 'NOAA: what causes tides (the Sun’s pull is about half the Moon’s)', url: 'https://oceanservice.noaa.gov/education/tutorial_tides/tides02_cause.html' },
  noaaLunarDay: { label: 'NOAA: the frequency of tides (24 h 50 min)', url: 'https://oceanservice.noaa.gov/education/tutorial_tides/tides05_lunarday.html' },
  noaaSpringNeap: { label: 'NOAA: spring and neap tides', url: 'https://oceanservice.noaa.gov/education/tutorial_tides/tides06_variations.html' },
  noaaTideTypes: { label: 'NOAA: types of tide (one or two a day)', url: 'https://oceanservice.noaa.gov/education/tutorial_tides/tides07_cycles.html' },
  noaaHighestTide: { label: 'NOAA: where is the highest tide?', url: 'https://oceanservice.noaa.gov/facts/highesttide.html' },
  canEncFundy: { label: 'The Canadian Encyclopedia: Bay of Fundy (16.1 m record tide)', url: 'https://thecanadianencyclopedia.ca/en/article/bay-of-fundy-and-gulf-of-maine' },
  usnoSeasons: { label: 'US Naval Observatory: Earth’s seasons and apsides', url: 'https://aa.usno.navy.mil/data/Earth_Seasons' },
  ifabBall: { label: 'IFAB Laws of the Game, Law 2: the ball', url: 'https://www.theifab.com/laws/latest/the-ball/' },
  jplAutoNav: { label: 'NASA JPL: NASA’s self-driving Perseverance Mars rover takes the wheel', url: 'https://www.jpl.nasa.gov/news/nasas-self-driving-perseverance-mars-rover-takes-the-wheel' },
  nasaMarsRelay: { label: 'NASA Science: Mars Relay Network (Earth–Mars distance and signal time)', url: sci('mars/mars-relay-network/') },
  nasaMwResource: { label: 'NASA Science: the Milky Way galaxy', url: sci('resource/the-milky-way-galaxy/') },
  eilers2019: { label: 'Eilers et al. 2019, ApJ 871, 120 (rotation curve)', url: 'https://arxiv.org/abs/1810.09466' },
  dias2019: { label: 'Dias et al. 2019, MNRAS 486, 5726 (spiral pattern speed)', url: 'https://arxiv.org/abs/1905.08133' },
  shen2020: { label: 'Shen & Zheng 2020, the bar and spiral arms (review)', url: 'https://arxiv.org/abs/2012.10130' },
  bahcall1985: { label: 'Bahcall & Bahcall 1985, Nature 316, 706 (the Sun’s up-and-down motion)', url: 'https://ui.adsabs.harvard.edu/abs/1985Natur.316..706B/abstract' },
  nhmDinosaurs: { label: 'Natural History Museum: where did dinosaurs come from?', url: 'https://www.nhm.ac.uk/discover/where-did-dinosaurs-come-from.html' },
  nhmExtinction: { label: 'Natural History Museum: how an asteroid ended the age of the dinosaurs', url: 'https://www.nhm.ac.uk/discover/how-an-asteroid-caused-extinction-of-dinosaurs.html' },
  siHomo: { label: 'Smithsonian Human Origins: the oldest fossil of our genus', url: 'https://humanorigins.si.edu/research/whats-hot-human-origins/oldest-fossil-our-genus' },
  sawala2025: { label: 'Sawala et al. 2025, Nature Astronomy 9, 1206 (Milky Way–Andromeda odds)', url: 'https://doi.org/10.1038/s41550-025-02563-1' },
  uwaAndromeda: { label: 'University of Western Australia: the Milky Way may not crash into Andromeda', url: 'https://www.uwa.edu.au/news/article/2025/june/astronomers-thought-the-milky-way-was-doomed-to-crash-into-andromeda' },
  exoArchive: { label: 'NASA Exoplanet Archive', url: 'https://exoplanetarchive.ipac.caltech.edu/' },
  kopparapu2014: { label: 'Kopparapu et al. 2014, ApJL 787, L29 (habitable zone)', url: 'https://doi.org/10.1088/2041-8205/787/2/L29' },
  hyg: { label: 'HYG star database (CC BY-SA 4.0)', url: 'https://github.com/astronexus/HYG-Database' },
  openNGC: { label: 'OpenNGC galaxy catalogue (CC BY-SA 4.0)', url: 'https://github.com/mattiaverga/OpenNGC' },
  naturalEarth: { label: 'Natural Earth (coastlines, public domain)', url: 'https://www.naturalearthdata.com/' },
  sssTextures: { label: 'Solar System Scope textures (CC BY 4.0), based on NASA imagery', url: 'https://www.solarsystemscope.com/textures/' },
};
// Wikipedia pages the app links for the stars, galaxies and clusters (a secondary source: each one cites the papers).
const wiki = t => { const k = `w:${t}`; if (!REFS[k]) REFS[k] = { label: `Wikipedia: ${t}`, url: wikiUrl(t), secondary: true }; return k; };

// ---- Which source backs which entry ----
const BODY = { Sun: ['nssdcSun', 'nasaSun'], Mercury: ['nssdcMercury', 'nasaMercury'], Venus: ['nssdcVenus', 'nasaVenus'], Earth: ['nssdcEarth', 'nasaEarth'],
  Moon: ['nssdcMoon', 'nasaMoon'], Mars: ['nssdcMars', 'nasaMars'], Jupiter: ['nssdcJupiter', 'nasaJupiter'], Saturn: ['nssdcSaturn', 'nasaSaturn'],
  Uranus: ['nssdcUranus', 'nasaUranus'], Neptune: ['nssdcNeptune', 'nasaNeptune'] };
// The card's one striking line (insights.js STRIKING), its one-line description (data.js blurb) and its narration.
const STRIKING_SRC = { Sun: ['nssdcSun'], Mercury: ['nasaMercury'], Venus: ['nssdcVenus'], Earth: ['nasaEarth'], Moon: ['nasaMoon'], Mars: ['nasaMars'],
  Jupiter: ['nssdcJupiter'], Saturn: ['nasaSaturn'], Uranus: ['nasaUranus'], Neptune: ['nasaNeptune'] };
const BLURB_SRC = { Sun: ['nssdcSun'], Mercury: ['nasaMercury'], Venus: ['nasaVenus'], Earth: ['nasaEarth'], Moon: ['nasaMoon', 'nasaPhases'], Mars: ['nasaMars'],
  Jupiter: ['nasaJupiter'], Saturn: ['nasaSaturn'], Uranus: ['nasaUranus'], Neptune: ['nasaNeptune'] };
const LINE_SRC = { f_Sun_0: ['nssdcSun', 'nasaSun'], f_Mercury_0: ['nasaMercury'], f_Venus_0: ['nssdcVenus'], f_Mars_0: ['nasaMars'], f_Jupiter_0: ['nssdcJupiter', 'nasaJupiter'],
  f_Saturn_0: ['nasaSaturn'], f_Uranus_0: ['nasaUranus'], f_Neptune_0: ['nasaNeptune'],
  lab_earth: ['nasaEarth'], lab_moon: ['nasaPhases'], lab_seasons: ['nasaEarth'], lab_phases: ['nasaPhases'], lab_compare: ['nssdcEarth', 'nssdcMoon', 'nssdcMars'],
  lab_day: ['nasaEarth', 'nssdcEarth'] };
const DEEPER_SRC = { Earth: ['nasaEarth', 'nssdcEarth'], Moon: ['nasaPhases', 'nssdcMoon'], Sun: ['nssdcSun', 'nasaSun'] };
const MOON_FACT_SRC = { Phobos: ['nasaPhobos'], Deimos: ['nasaDeimos', 'jplRadii'], Io: ['nasaIo'], Europa: ['nasaEuropa'], Ganymede: ['nasaGanymede', 'jplRadii', 'nssdcMercury'],
  Callisto: ['nasaCallisto'], Mimas: ['nasaMimas'], Enceladus: ['nasaEnceladus'], Tethys: ['nasaTethys'], Dione: ['nasaDione'], Rhea: ['nasaRhea'], Titan: ['nasaTitan'],
  Iapetus: ['nasaIapetus'], Miranda: ['nasaMiranda'], Ariel: ['nasaAriel'], Umbriel: ['nasaUmbriel'], Titania: ['nasaTitania'], Oberon: ['nasaOberon', 'nssdcUranianSats'],
  Charon: ['nasaCharon', 'nasaPlutoMoons'], Triton: ['nasaTriton'] };
const SAT_KEY = { Mars: 'nssdcMars', Jupiter: 'nssdcJovianSats', Saturn: 'nssdcSaturnianSats', Uranus: 'nssdcUranianSats', Neptune: 'nssdcNeptunianSats', Pluto: 'nssdcPluto' };
const DWARF_ROWS = { Ceres: 'nssdcAsteroids', Vesta: 'nssdcAsteroids', Pallas: 'nssdcAsteroids', Pluto: 'nssdcPluto', Eris: 'nasaEris', Haumea: 'nasaHaumea', Makemake: 'nasaMakemake' };
const DWARF_FACT_SRC = { Ceres: ['nasaCeres'], Vesta: ['vestaTrek'], Pallas: ['sbdb:Pallas'], Pluto: ['nasaPlutoHeart'], Haumea: ['nasaHaumea'], Makemake: ['nasaMakemake'], Eris: ['nasaEris', 'sbdb:Eris'] };
const MOON_COUNT_SRC = { Mercury: ['nasaMercury'], Venus: ['nasaVenus'], Earth: ['nasaEarth'], Mars: ['nasaMars'], Jupiter: ['nasaJupiterMoons'], Saturn: ['nasaSaturnMoons'],
  Uranus: ['nasaUranusMoons'], Neptune: ['nasaNeptuneMoons'], Pluto: ['nasaPlutoMoons'], Eris: ['nasaEris'], Haumea: ['nasaHaumea'], Makemake: ['nasaMakemake'],
  Ceres: ['nasaCeres'], Vesta: ['vestaTrek'], Pallas: ['nssdcAsteroids'] };
for (const d of DWARFS) REFS[`sbdb:${d.name}`] = { label: `NASA JPL Small-Body Database: ${d.name} orbit`, url: SBDB(d.name) };

// Labs: the predict-then-reveal questions (learn.js PREDICTIONS), the lab notes and the Compare lab's data.
const PREDICTION_SRC = { seasons: ['nasaEarth'], phases: ['nasaPhases'], eclipses: ['nasaPhases', 'nssdcMoon', 'nasaEclipses'], tides: ['noaaLunarDay', 'noaaTideTypes'],
  scale: ['nssdcSun', 'iauAu', 'ifabBall', 'nssdcNeptune'], 'light-earth': ['iauAu', 'siC'], 'light-neptune': ['nssdcNeptune', 'iauAu', 'siC'],
  closest: ['usnoSeasons', 'nssdcEarth', 'nasaEarth'], 'mars-day': ['nssdcMars'], 'mars-weight': ['nssdcMars', 'nssdcEarth'],
  'jupiter-fit': ['nssdcJupiter', 'nasaJupiter'], 'saturn-float': ['nssdcSaturn', 'nasaSaturn'], 'asteroid-mass': ['nasaAsteroidFacts'], 'pluto-planet': ['nasaPlutoFacts'] };
// Lab notes (the ⓘ text in each lab): what the lab's own links cite. Keyed by lab; lab.js reads its links from here.
export const LAB_REFS = {
  seasons: ['nasaEarth', 'nssdcEarth'], phases: ['nasaPhases', 'nssdcMoon'], day: ['nasaEarth', 'nssdcEarth'],
  eclipses: ['nasaEclipses', 'nssdcMoon'], tides: ['noaaTides', 'noaaTideCause', 'noaaSpringNeap', 'noaaTideTypes', 'noaaHighestTide', 'canEncFundy'],
  compare: ['nssdcEarth', 'nssdcMoon', 'nssdcMars', 'nasaMoon'], scale: ['nssdcSun', 'iauAu', 'ifabBall'], light: ['iauAu', 'siC'],
};
const LAB_NOTES = {
  seasons: 'Seasons lab: tilt and daylight. Daylight hours and noon height are worked out from Earth’s 23.4° tilt with basic spherical geometry.',
  phases: 'Phases lab: the Sun lights half the Moon; how much of that half we see sets the phase. 29.5 days from new Moon to new Moon; 27.3 days to go round relative to the stars.',
  day: 'Day and night: Earth spins once in about 24 hours; its axis tilts about 23.4°.',
  eclipses: 'Eclipse lab: the Moon’s orbit is tilted 5.145°, so most new and full Moons miss; eclipse seasons come about every 173 days; the eclipse limits used are approximate teaching values.',
  tides: 'Tides lab: the Sun’s tide-raising force is about half (46%) of the Moon’s; spring tides at new and full Moon, neap tides at quarter Moons; coastlines change real tides (the Bay of Fundy reaches about 16 m).',
  compare: 'Compare: weight = mass × surface gravity; Earth 9.82, Moon 1.62, Mars 3.73 m/s² (mean values).',
  scale: 'Scale walk: with the Sun as a 22 cm football, Earth is a 2 mm peppercorn about 24 m away and Neptune is about 700 m away (true to scale).',
  light: 'Light race: sunlight takes 8 min 19 s to reach Earth (1 au ÷ the speed of light).',
};
// Guided journeys (learn.js): each step with a claim names its sources; steps that are only an invitation map to null.
export const JOURNEY_SRC = {
  'scale.0': ['nssdcSun'], 'scale.1': ['iauAu'], 'scale.2': ['nssdcNeptune'], 'scale.3': null,
  'seasons.0': ['nasaEarth'], 'seasons.1': null, 'seasons.2': null, 'seasons.3': ['nssdcMars', 'nasaMars'],
  'moon.0': ['nasaPhases', 'nasaMoon'], 'moon.1': null, 'moon.2': null, 'moon.3': ['noaaTideCause', 'noaaSpringNeap'],
  'scale.found': ['iauAu', 'siC', 'nssdcNeptune'], 'seasons.found': ['nasaEarth', 'usnoSeasons'], 'moon.found': ['nasaPhases', 'nasaEclipses', 'noaaTideCause'], 'mars.found': ['nssdcMars', 'nasaMarsRelay', 'siC'],
  'giants.0': ['nssdcJupiter', 'nasaJupiter'], 'giants.1': ['nasaJupiter'], 'giants.2': ['nasaSaturn'], 'giants.3': ['nasaEuropa', 'nasaEnceladus'], 'giants.4': ['nasaTitan'],
  'giants.found': ['nssdcJupiter', 'nasaSaturn', 'nasaEuropa', 'nasaEnceladus'],
  'small.0': ['nasaAsteroidFacts'], 'small.1': ['nasaCeres', 'sbdb:Ceres'], 'small.2': ['nasaPlutoFacts'], 'small.3': ['nasaCharon'], 'small.4': ['nasaKuiper'],
  'small.found': ['nasaAsteroidFacts', 'nasaCeres', 'nasaPlutoFacts', 'nasaKuiper'],
  'mars.0': ['nasaMars'], 'mars.1': ['nssdcMars'], 'mars.2': ['nssdcMars'], 'mars.3': ['nasaMarsRelay', 'siC', 'jplAutoNav'],
};
// The adventure (adventure.js STOPS): which clip says what, and where that is checked (docs/sources.md table).
const ADVENTURE_SRC = { trip_earth: ['nasaEarth'], trip_earth_found: ['nasaEarth', 'nasaMoon'], trip_moon: ['nasaMoon'], trip_moon_found: ['nasaMoon'],
  trip_mars: ['nasaMars'], trip_mars_found: ['nasaMars'], trip_saturn: ['nasaSaturn'], trip_saturn_found: ['nasaSaturn'] };

// ---- The claims, grouped by where they appear ----
const C = (text, src, note) => ({ text, src: src || [], ...(note ? { note } : {}) });
const rowsText = rows => rows.map(([k, v]) => `${k}: ${v}`).join(' · ');
function worlds() {
  const order = [SUN, ...PLANETS.slice(0, 3), MOON, ...PLANETS.slice(3)];
  const sections = order.map(b => {
    const n = b.name, info = INSIGHTS[n] || genericInsight(b), line = info.line || `f_${n}_0`, claims = [];
    claims.push(C(STRIKING[n], STRIKING_SRC[n]));
    if (LINES[line]) claims.push(C(LINES[line], LINE_SRC[line], 'Also spoken by the card’s Listen button.'));
    if (b.blurb !== LINES[line]) claims.push(C(b.blurb, BLURB_SRC[n]));
    claims.push(C(rowsText(b.facts.filter(([k]) => k !== 'Moons')), [BODY[n][0]]));
    if (MOON_COUNT[n]) claims.push(C(`${n} has ${MOON_COUNT[n]}.`, MOON_COUNT_SRC[n]));
    claims.push(C(info.deeper, DEEPER_SRC[n] || [BODY[n][0]]));
    return { id: `world-${n}`, title: n, claims };
  });
  const moons = { id: 'world-moons', title: 'Major moons', claims: MOONS.flatMap(m => {
    const i = moonInsight(m), sheet = SAT_KEY[m.parent];
    return [C(`${m.name}: ${m.fact}`, MOON_FACT_SRC[m.name]), C(`${m.name}: ${rowsText(m.facts)}`, [sheet, 'jplRadii']),
      C(`${m.name}: ${i.deeper}`, [sheet, 'jplRadii', 'nasaTidalLocking', ...(m.incl ? ['nasaTriton'] : [])])];
  }) };
  const dwarfs = { id: 'world-dwarfs', title: 'Dwarf planets and big asteroids', claims: DWARFS.flatMap(d => {
    const i = dwarfInsight(d), belt = d.a < 5;
    return [C(`${d.name}: ${d.fact}`, DWARF_FACT_SRC[d.name]), C(`${d.name}: ${rowsText(d.facts)}`, [DWARF_ROWS[d.name], `sbdb:${d.name}`]),
      C(i.intro, [DWARF_ROWS[d.name]]),
      C(i.deeper, [`sbdb:${d.name}`, ...(belt ? ['nasaAsteroidFacts', 'gsfcAsteroids'] : ['nasaKuiper']), ...(d.name === 'Pluto' ? ['nhPlutoOrbit'] : [])])];
  }) };
  for (const n of ['Pluto', 'Eris', 'Haumea', 'Makemake', 'Ceres', 'Vesta', 'Pallas']) dwarfs.claims.push(C(`${n} has ${MOON_COUNT[n]}.`, MOON_COUNT_SRC[n]));
  return [...sections, moons, dwarfs];
}
function labs() {
  const narrated = ['lab_seasons', 'lab_phases', 'lab_compare', 'lab_day'];
  return [
    { id: 'labs-notes', title: 'Lab notes', claims: Object.entries(LAB_NOTES).map(([k, t]) => C(t, LAB_REFS[k])) },
    { id: 'labs-lines', title: 'Lab narration', claims: narrated.map(id => C(LINES[id], LINE_SRC[id], 'Spoken by the Listen button.')) },
    { id: 'labs-compare', title: 'Compare data', claims: Object.entries(NEARBY).map(([n, d]) => C(`${n}: diameter ${d.diameter.toLocaleString('en-IN')} km · gravity ${d.gravity} m/s² · ${d.distanceLabel.toLowerCase()} ${d.distance.toLocaleString('en-IN')} km · ${d.atmosphere} ${d.condition}`, [BODY[n][0], BODY[n][1]])) },
    { id: 'labs-questions', title: 'Questions (predict, then reveal)', claims: Object.entries(PREDICTIONS).map(([id, p]) => C(p.explain, PREDICTION_SRC[id])) },
  ];
}
function journeys() {
  return JOURNEYS.map(j => ({ id: `journey-${j.id}`, title: j.title,
    claims: [...j.steps.map((st, i) => ({ st, src: JOURNEY_SRC[`${j.id}.${i}`] })).filter(x => x.src).map(x => C(x.st.text, x.src)),
      ...(j.found ? [C(j.found, JOURNEY_SRC[`${j.id}.found`], 'What you found: the line on the journey’s last stop.')] : [])] }));
}
function tour() {
  return TOUR_STOPS.map((s, i) => ({ id: `tour-${s.id}`, title: `${i + 1}. ${s.title}`,
    claims: [C(s.text, sourcesOf(s), s.facts.filter(f => f.computed).map(f => `${f.says}: ${f.computed}`).join('; ') || undefined)] }));
}
function adventure() {
  return [{ id: 'adventure-stops', title: 'The four stops', claims: ADVENTURE_STOPS.flatMap(s => [s.prompt, s.fact]).map(id => C(LINES[id], ADVENTURE_SRC[id], 'Spoken narration; the caption shows the same words.')) }];
}
function beyond() {
  const stars = { id: 'beyond-stars', title: 'Nearby stars', claims: [
    ...Object.entries(STAR_FACTS).map(([n, t]) => C(`${n}: ${t}`, [wiki(n === 'WISE 0855−0714' ? 'WISE 0855−0714' : n), wiki('List of nearest stars')])),
    ...VISITORS.map(v => C(`${v.name}: ${v.fact}`, [wiki(v.name), wiki('List of nearest stars')])),
    C('Star positions, distances, temperatures and magnitudes in the star map.', [wiki('List of nearest stars'), 'hyg']),
    C('Exoplanets: sizes, masses, orbits; habitable zone (conservative zone of Kopparapu et al. 2014).', ['exoArchive', 'kopparapu2014']) ] };
  const galaxy = { id: 'beyond-galaxy', title: 'The Milky Way', claims: [
    C(`Stars: ${GALAXY_FACTS.stars} · width ${GALAXY_FACTS.diameter} light-years · disc thickness ${GALAXY_FACTS.thickness} light-years · one orbit of the Sun ${GALAXY_FACTS.orbitMyr} years`, [wiki('Milky Way'), 'nasaMilkyWay', 'nasaMwResource']),
    C('The Sun moves around the centre at about 229 km/s; the rotation curve is nearly flat.', ['eilers2019']),
    C('The spiral arms are a density-wave pattern turning at about 28 km/s per kiloparsec; the bar at about 39.', ['dias2019', 'shen2020']),
    C('The Sun bobs up and down through the disc every few tens of millions of years.', ['bahcall1985']),
    ...MILESTONES.filter(m => m.t < 0).map(m => C(`Time slider: “${m.text}”`, m.t === -66 ? ['nhmExtinction'] : ['nhmDinosaurs', 'eilers2019'])),
    ...LANDMARKS.map(m => C(`${m.name}: ${m.fact}`, [wiki(m.name)])) ] };
  const local = { id: 'beyond-local', title: 'The Local Group', claims: [
    C(`Width ${LOCAL_FACTS.width} light-years · members ${LOCAL_FACTS.members} · total mass ${LOCAL_FACTS.mass}`, [wiki('Local Group')]),
    C('Andromeda is moving towards us at about 110 km/s; a 2025 study gives about even odds of a merger within 10 billion years.', [wiki('Andromeda Galaxy'), 'sawala2025', 'uwaAndromeda']),
    C('The light from Andromeda left it about 2.5 million years ago, around when the first humans of our genus, Homo, appeared.', ['nasaM31', 'siHomo']),
    ...GALAXIES.filter(g => g.fact).map(g => C(`${g.name}: ${g.fact}`, [wiki(g.here ? 'Milky Way' : g.name), wiki('List of nearest galaxies')])) ] };
  const cosmos = { id: 'beyond-cosmos', title: 'Laniakea and the observable universe', claims: [
    C(`Laniakea: ${COSMOS_FACTS.laniakeaWidth} light-years across · ${COSMOS_FACTS.laniakeaGalaxies} galaxies · ${COSMOS_FACTS.laniakeaMass}`, [wiki('Laniakea Supercluster'), 'tully2014', 'uhLaniakea']),
    C('Every dot in the Laniakea view is a real NGC/IC galaxy (9,696), placed by its redshift with the Hubble law.', ['openNGC']),
    ...CLUSTERS.filter(c => c.fact).map(c => C(`${c.name}: ${c.fact}`, [wiki(c.name)])),
    C(`${FAR_GALAXY.name}: ${FAR_GALAXY.fact}`, [wiki('MoM-z14')]),
    C(`Age of the universe ${COSMOS_FACTS.age} · edge about ${COSMOS_FACTS.edge} light-years away · galaxies: ${COSMOS_FACTS.galaxies}`, ['planck2018', 'davis2004', wiki('Observable universe')]),
    C('The cosmic microwave background: the oldest light, released about 380,000 years after the Big Bang; redshift about 1,090.', ['planck2018', wiki('Cosmic microwave background')]) ] };
  return [stars, galaxy, local, cosmos];
}
function scale() {
  return [{ id: 'scale-hud', title: 'Scale readout', claims: [
    C('Distances in au: 1 au = 149,597,870,700 m exactly.', ['iauAu']),
    C('Light travel times and light-years: light travels 299,792,458 m/s exactly; a light-year is the distance it covers in a Julian year (365.25 days), about 63,241 au.', ['siC', 'iauAu']),
    C('Beyond about 46.5 billion light-years the readout says the viewpoint is outside the observable universe.', ['davis2004', 'planck2018']),
    C('“Light from the edge of view left …”: how long light from the edge of the view has been travelling. Up to 10 million light-years a light-year is a year of travel; further out it is computed from Planck 2018 cosmology, because space has stretched while the light travelled (light from 46.5 billion light-years away now left 13.8 billion years ago). The moment it is set against, and its date, come from the cosmic year.', ['planck2018', 'davis2004']) ] }];
}
// The cosmic year: each step's date (computed from its age) and claim, with the sources that used to sit on its card.
function cosmicYear() {
  const key = r => { const k = `cy:${r.url}`; if (!REFS[k]) REFS[k] = { label: r.label, url: r.url, secondary: /wikipedia/i.test(r.url) }; return k; };
  return [{ id: 'cosmicyear-steps', title: 'The 18 steps', claims: [
    C('Dates are worked out from each event’s age, with the universe 13.787 billion years old; ages differ between sources, so dates can shift by a day or two. Carl Sagan first told the story this way, in 1977, with 15 billion years.', [key({ label: 'Wikipedia: Cosmic calendar', url: wikiUrl('Cosmic calendar') })]),
    ...COSMIC_EVENTS.map(e => C(`${eventDate(e).label}: ${e.title}. ${e.text}${e.note ? ` (${e.note})` : ''}`, e.src.map(key))) ] }];
}
export function claimGroups() {
  return [
    { id: 'worlds', title: 'World cards', sections: worlds() },
    { id: 'labs', title: 'Labs and questions', sections: labs() },
    { id: 'journeys', title: 'Guided journeys', sections: journeys() },
    { id: 'tour', title: 'Powers of Ten tour', sections: tour() },
    { id: 'adventure', title: 'Earth–Moon adventure', sections: adventure() },
    { id: 'beyond', title: 'Stars, galaxies and the universe', sections: beyond() },
    { id: 'scale', title: 'Scale readout', sections: scale() },
    { id: 'cosmicyear', title: 'The cosmic year', sections: cosmicYear() },
  ];
}

// ---- What is real and what is illustration ----
// shown: what the picture does; real: the true value or what is measured. Texts from the tour and adventure are their own.
const TRUE_SUN_UNITS = (SUN.km / 12756).toFixed(0);
export function illustrations() {
  const tourNotes = TOUR_STOPS.filter(s => s.illustration).map(s => ({ where: `Tour: ${s.title}`, shown: s.illustration, real: s.text, src: sourcesOf(s) }));
  return [
    { where: 'Solar System', shown: `Planet distances compressed (${DIST_K} × AU^${DIST_P}) so all eight fit on a screen; the scale readout marks them ≈.`, real: 'Neptune is really 78 times as far from the Sun as Mercury. Real scale (menu) shows true sizes and distances.', src: ['nssdcMercury', 'nssdcNeptune'] },
    { where: 'Solar System', shown: `The Sun is drawn at 1/${SUN_SHRINK} of its true size (1/10 in the overview) so the inner planets stay visible.`, real: `It is 109 Earths wide (${TRUE_SUN_UNITS} × Earth’s diameter); Real scale shows it at true size.`, src: ['nssdcSun'] },
    { where: 'Earth and Moon', shown: `Moon distance shortened to ${MOON.dist} Earth-widths in the normal view. Adventure: “${SCALE_NOTE[0]}”.`, real: 'The Moon is 384,400 km away on average, about 30 Earth-widths.', src: ['nssdcMoon', 'nasaMoon'] },
    { where: 'Moons of other planets', shown: 'Moon orbits are compressed (a log rule) so each system fits between its neighbours; sizes are true.', real: 'Real scale uses each moon’s true distance.', src: ['nssdcJovianSats', 'jplRadii'] },
    { where: 'Solar System', shown: 'Planets’ places along their orbits and the speed of time are illustrative, not today’s sky.', real: 'Orbit sizes and periods are real; dates are not.', src: ['nssdcEarth'] },
    { where: 'Surfaces', shown: 'Planet maps are photographic (based on NASA imagery); moons, dwarf planets and asteroids use tinted illustrative surfaces. Venus shows its cloud tops.', real: 'Only Pluto, Ceres and Vesta among the dwarf worlds have been seen up close.', src: ['sssTextures', 'nasaVenus'] },
    { where: 'Asteroid and Kuiper belts', shown: 'Thousands of points stand for millions of bodies, spread statistically (not a catalogue).', real: '1.1–1.9 million asteroids larger than 1 km; together less mass than the Moon.', src: ['nasaAsteroidFacts', 'nasaKuiper'] },
    { where: 'Labs', shown: 'Orbit insets are not to scale; tide bulges are exaggerated thousands of times; the eclipse view pulls the Sun into view.', real: 'The maths in each lab uses the real values listed in the lab notes.', src: ['noaaTides', 'nssdcMoon'] },
    { where: 'Nearby stars', shown: 'Glow size shows brightness, not size; exoplanet orbits are drawn circular and in one plane, sizes of non-transiting planets are estimated.', real: 'Star positions and distances are measured, so the 3D layout is real.', src: [wiki('List of nearest stars'), 'exoArchive'] },
    { where: 'Star pairs', shown: 'Each pair’s orbit is shown face on; star sizes are not to scale.', real: 'Periods, orbit sizes and masses are the published values.', src: [wiki('Alpha Centauri'), wiki('Sirius')] },
    { where: 'Milky Way', shown: 'A model: arms fitted to measurements and extrapolated on the far side; the bar is illustrative.', real: 'No one has photographed our Galaxy from outside.', src: ['reid2019', 'shen2020'] },
    { where: 'Local Group', shown: 'Spiral and cloud shapes are simple models.', real: 'Positions and distances are catalogued values.', src: [wiki('List of nearest galaxies')] },
    { where: 'Laniakea', shown: 'Real galaxies, but redshift distances stretch clusters along our line of sight.', real: 'Every dot is a real catalogued galaxy.', src: ['openNGC'] },
    { where: 'Observable universe', shown: 'The cosmic web and the speckled CMB are illustrations of the pattern, not maps.', real: 'Distances of the look-back shells are computed from Planck 2018 cosmology.', src: ['planck2018'] },
    ...tourNotes,
  ];
}

// Flat views for tests and counts.
export const allClaims = () => claimGroups().flatMap(g => g.sections.flatMap(s => s.claims.map(c => ({ ...c, group: g.id, section: s.id }))));
export function usedRefs() { const keys = new Set([...allClaims().flatMap(c => c.src), ...illustrations().flatMap(i => i.src)]); return [...keys]; }
