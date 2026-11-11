// Learning layer: predictions, guided journeys, scale and light-time, eclipses and tides.
// Pure data and maths (no DOM), so it is testable in Node. Sources and limits: docs/lab-science.md.
import { SUN, PLANETS, DWARFS } from './data.js';

export const LIGHT_KM_S = 299792.458;         // exact, by definition of the metre
export const AU_KM = 149597870.7;             // IAU 2012
export const MOON_INCLINATION = 5.145;        // degrees, Moon's orbit to the ecliptic (NASA moon fact sheet)
export const SOLAR_TO_LUNAR_TIDE = 0.46;      // Sun's tide-raising force ≈ 46% of the Moon's (NOAA)
export const FOOTBALL_CM = 22;                // a size 5 football is about 22 cm across
export const MARS_EARTH_KM = [54.6e6, 401e6];  // closest possible and farthest Earth–Mars distances (NASA)

const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
const wrap = a => ((a % 360) + 360) % 360;
const signed = a => { const w = wrap(a); return w > 180 ? w - 360 : w; };

// ---- Light travel time ----
export const lightSeconds = km => km / LIGHT_KM_S;
export function formatDuration(s) {
  if (s < 1) return 'under a second';
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)} seconds`;
  if (s < 3600) { const m = Math.floor(s / 60), r = Math.round(s - m * 60); return r === 60 ? `${m + 1} min` : `${m} min ${r} s`; }
  const h = Math.floor(s / 3600), m = Math.round((s - h * 3600) / 60);
  return m === 60 ? `${h + 1} h` : `${h} h ${m} min`;
}
export const sunlightTo = name => { const p = PLANETS.find(x => x.name === name) || DWARFS.find(x => x.name === name); return p ? lightSeconds(p.au * AU_KM) : null; };

// ---- Scale walk: shrink the Sun to a ball of a chosen size ----
export function scaleWalk(sunCm = FOOTBALL_CM) {
  if (!(sunCm > 0)) throw Error('Sun size must be positive');
  const k = sunCm / SUN.km;                    // centimetres per kilometre
  return PLANETS.map(p => ({ name: p.name, sizeMm: p.km * k * 10, distanceM: p.au * AU_KM * k / 100 }));
}
export function sizeLike(mm) {
  if (mm < 0.5) return 'a grain of fine sand';
  if (mm < 1.2) return 'a grain of sugar';
  if (mm < 3) return 'a peppercorn';
  if (mm < 6) return 'a lentil';
  if (mm < 12) return 'a pea';
  if (mm < 30) return 'a grape';
  return 'a lemon';
}
export const formatMetres = m => m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m < 10000 ? 2 : 1)} km`;

// ---- Eclipses: the Moon's orbit is tilted, so new and full Moons usually miss ----
// elongation: Moon's angle from the Sun direction as seen from Earth (0 = new, 180 = full).
// node: where the Moon's tilted orbit crosses Earth's orbital plane, measured the same way.
// Returns the Moon's ecliptic latitude and whether an eclipse happens at this alignment.
// Limits are the standard approximate ecliptic limits as latitudes: a solar eclipse needs the
// Moon within about 1.5° of the ecliptic at new Moon, a lunar eclipse within about 1.0° at full Moon.
export const SOLAR_LIMIT = 1.5, LUNAR_LIMIT = 1.0, CENTRAL_LIMIT = 0.9, TOTAL_LUNAR_LIMIT = 0.4;
export function eclipseGeometry(elongation, node, incl = MOON_INCLINATION) {
  const latitude = deg(Math.asin(Math.sin(rad(incl)) * Math.sin(rad(elongation - node))));
  const fromNew = Math.abs(signed(elongation)), fromFull = Math.abs(signed(elongation - 180));
  const b = Math.abs(latitude);
  let kind = 'none', label;
  if (fromNew < 1) {
    if (b < CENTRAL_LIMIT) { kind = 'solar-central'; label = 'Solar eclipse: the Moon covers the Sun’s centre (total or annular)'; }
    else if (b < SOLAR_LIMIT) { kind = 'solar-partial'; label = 'Partial solar eclipse: the Moon clips the Sun'; }
    else label = `No eclipse: the Moon passes ${b.toFixed(1)}° ${latitude > 0 ? 'above' : 'below'} the Sun`;
  } else if (fromFull < 1) {
    if (b < TOTAL_LUNAR_LIMIT) { kind = 'lunar-total'; label = 'Total lunar eclipse: the whole Moon is in Earth’s shadow'; }
    else if (b < LUNAR_LIMIT) { kind = 'lunar-partial'; label = 'Partial lunar eclipse: part of the Moon enters Earth’s shadow'; }
    else label = `No eclipse: the Moon passes ${b.toFixed(1)}° ${latitude > 0 ? 'above' : 'below'} Earth’s shadow`;
  } else label = 'Eclipses can only happen at new Moon or full Moon';
  return { latitude, kind, label, moonWidths: b / 0.52 };   // Moon looks about 0.52° wide from Earth
}

// ---- Tides: two bulges; Sun and Moon add (spring) or partly cancel (neap) ----
// Relative tidal range for a Moon at this elongation from the Sun, where 1 = Moon alone.
export function tideRange(elongation, ratio = SOLAR_TO_LUNAR_TIDE) {
  return Math.sqrt(1 + ratio * ratio + 2 * ratio * Math.cos(2 * rad(elongation)));
}
export function tideLabel(elongation) {
  const r = tideRange(elongation), max = 1 + SOLAR_TO_LUNAR_TIDE, min = 1 - SOLAR_TO_LUNAR_TIDE;
  const pct = Math.max(0, Math.min(100, Math.round(100 * (r - min) / (max - min)))) || 0;
  const e = wrap(elongation);
  const near = (x) => Math.abs(signed(e - x)) < 15;
  const name = near(0) || near(180) ? 'Spring tides' : near(90) || near(270) ? 'Neap tides' : 'Between spring and neap';
  return { name, range: r, pct, ratio: r / min };
}

// ---- Predict, then reveal ----
// Each lab (and some journey steps) asks a question first; the result shows once the learner commits.
export const PREDICTIONS = {
  // The giants and their moons; Small worlds.
  'jupiter-fit': { q: 'Jupiter is about 11 times wider than Earth. How many Earths could fit inside it?', options: ['About 11', 'About 100', 'More than 1,000'], answer: 2,
    explain: 'More than 1,000. Eleven times wider is about 11 × 11 × 11 times the volume: Jupiter has about 1,300 times the volume of Earth.' },
  'saturn-float': { q: 'Saturn is the second-biggest planet. In a bathtub big enough, would it float?', options: ['Yes: it is less dense than water', 'No: planets always sink', 'Only its rings would float'], answer: 0,
    explain: 'Saturn is the only planet whose average density is less than water’s: about 0.69 times. In a big enough bathtub, it would float.' },
  'asteroid-mass': { q: 'The asteroid belt holds millions of rocks. Put them all together: how much would they come to?', options: ['More than Earth', 'About as much as Mars', 'Less than our Moon'], answer: 2,
    explain: 'All the asteroids together have less mass than Earth’s Moon, spread around a ring between Mars and Jupiter.' },
  'pluto-planet': { q: 'In 2006 Pluto stopped being called a planet. Why?', options: ['It is too small', 'It is too far from the Sun', 'It has not cleared its orbit of other objects'], answer: 2,
    explain: 'Pluto is big enough to pull itself round, like a planet, but it shares its orbit with many other icy objects. The IAU calls a world like that a dwarf planet.' },
  seasons: { q: 'If Earth had no tilt, what would daylight be like at 40° north through the year?',
    options: ['Long summer days and short winter days, as now', 'About 12 hours every day, all year', 'Always dark in winter'], answer: 1,
    explain: 'Without tilt, sunlight meets every place at the same angle all year, so day and night stay close to 12 hours each. Tick “What if Earth had no tilt?” to check.' },
  phases: { q: 'What makes the Moon’s shape seem to change?',
    options: ['Earth’s shadow covers part of it', 'We see different amounts of its sunlit half', 'The Moon itself changes shape'], answer: 1,
    explain: 'The Sun always lights half of the Moon. As the Moon orbits, we see more or less of that lit half. Earth’s shadow only matters during a lunar eclipse.' },
  eclipses: { q: 'The Moon passes between Earth and the Sun every month. Is there a solar eclipse every month?',
    options: ['Yes, every new Moon', 'No — the Moon usually passes just above or below the Sun', 'No — the Moon is too small to block the Sun'], answer: 1,
    explain: 'The Moon’s orbit is tilted about 5°. Most new Moons pass a little above or below the Sun. Eclipses happen only when a new or full Moon falls near a crossing point (node).' },
  tides: { q: 'How many high tides do most coasts get in about a day?',
    options: ['One', 'Two', 'Four'], answer: 1,
    explain: 'The ocean bulges on the side facing the Moon and on the far side too, so most coasts pass through two bulges about every 24 hours 50 minutes. Some places get one tide a day because of the shape of their seas.' },
  scale: { q: 'If the Sun were a football (22 cm), how far away would Earth be?',
    options: ['About 2 metres', 'About 24 metres', 'About 2 kilometres'], answer: 1,
    explain: 'About 24 metres — and Earth would be the size of a peppercorn. Neptune would be about 700 metres away.' },
  'light-earth': { q: 'Light is the fastest thing there is. How long does sunlight take to reach Earth?',
    options: ['About 8 seconds', 'About 8 minutes', 'About 8 hours'], answer: 1,
    explain: `About ${formatDuration(lightSeconds(AU_KM))}, crossing 150 million km. You always see the Sun as it was about 8 minutes ago.` },
  'light-neptune': { q: 'Neptune is about 30 times farther from the Sun. How long does sunlight take to get there?',
    options: ['About 30 minutes', 'About 4 hours', 'About 4 days'], answer: 1,
    explain: `About ${formatDuration(sunlightTo('Neptune'))}. Thirty times farther means thirty times longer.` },
  closest: { q: 'In June, when it is summer in India, is Earth at its closest to the Sun?',
    options: ['Yes, it is closest then', 'No — Earth is farthest from the Sun in early July', 'The distance never changes'], answer: 1,
    explain: 'Earth is closest around 3 January and farthest in early July (3 to 6 July in recent years), only about 3% apart. Distance does not cause seasons; the tilt does.' },
  'mars-day': { q: 'How long is one day on Mars?',
    options: ['About 10 hours', 'About 24 hours 40 minutes', 'About 687 Earth days'], answer: 1,
    explain: 'A Martian day (a “sol”) lasts about 24 hours 40 minutes, very close to ours. 687 days is the length of its year.' },
  'mars-weight': { q: 'A child weighs 30 kg on Earth’s scales. On Mars, the same child would…',
    options: ['weigh much less — about 38% as much', 'weigh the same', 'weigh more'], answer: 0,
    explain: 'Mars’s surface gravity is about 3.73 m/s², 38% of Earth’s. The child’s mass is still 30 kg; the pull on them is weaker. Try it in Compare.' },
};
export function judge(id, choice) {
  const p = PREDICTIONS[id];
  if (!p || !(choice >= 0 && choice < p.options.length)) throw Error(`unknown prediction ${id}:${choice}`);
  return { right: choice === p.answer, answer: p.options[p.answer], explain: p.explain };
}

// ---- Guided journeys ----
// A step can glide to a world (world) or show the whole system (world omitted), ask a
// prediction that must be answered before moving on (predict), and offer a lab (lab) or compare.
export const JOURNEYS = [
  { id: 'scale', title: 'How big is the Solar System?', blurb: 'Light-speed trips and a Sun the size of a football.', found: 'Sunlight takes about 8 minutes to reach us and about 4 hours to reach Neptune. The Tour goes much further.', steps: [
    { world: 'Sun', title: 'Our star', text: 'The Sun is about 1.39 million km wide. You could line up 109 Earths across it.' },
    { world: 'Earth', title: 'Sunlight’s trip to Earth', text: 'Sunlight crosses about 150 million km of space to reach us.', predict: 'light-earth' },
    { world: 'Neptune', title: 'To the edge of the planets', text: 'Neptune is the farthest planet, about 30 times farther from the Sun than Earth.', predict: 'light-neptune' },
    { title: 'Shrink it all down', text: 'Now shrink the Sun to a football and walk the planets out. How far would you walk?', lab: 'scale' },
  ] },
  { id: 'seasons', title: 'Why do we have seasons?', blurb: 'It is not about distance. Find out what it is.', found: 'Seasons come from the tilt, not the distance.', steps: [
    { world: 'Earth', title: 'A tilted spinning top', text: 'Earth spins around an axis tilted about 23.4°. As it orbits, that axis keeps pointing the same way in space.' },
    { world: 'Earth', title: 'Closer means warmer?', text: 'Many people think summer comes when Earth is nearer the Sun.', predict: 'closest' },
    { world: 'Earth', title: 'Test it yourself', text: 'Move Earth around the Sun and watch daylight change. Then take the tilt away.', lab: 'seasons' },
    { world: 'Mars', title: 'Seasons on Mars', text: 'Mars is tilted about 25°, close to Earth’s, so it has seasons too. Its year is 687 days, so each season lasts about twice as long. Its orbit is egg-shaped, so its seasons are not equal: the southern summer lasts 154 Martian days, the northern summer 178.' },
  ] },
  { id: 'moon', title: 'The Moon and us', blurb: 'Phases, eclipses and the tides it pulls.', found: 'One Moon, three effects: its changing shape, the rare line-ups that make eclipses, and the tides.', steps: [
    { world: 'Moon', title: 'Our Moon', text: 'The Moon makes no light of its own. It reflects sunlight, and the same side always faces Earth.' },
    { world: 'Moon', title: 'Phases', text: 'Move the Moon around Earth and see why its shape seems to change.', lab: 'phases', predict: 'phases' },
    { world: 'Moon', title: 'Eclipses', text: 'Line up the Sun, Earth and Moon, and see when an eclipse can happen.', lab: 'eclipses', predict: 'eclipses' },
    { world: 'Earth', title: 'Tides', text: 'The Moon’s pull, with help from the Sun’s, stretches Earth’s oceans. Watch the high tides grow and shrink twice a month.', lab: 'tides', predict: 'tides' },
  ] },
  { id: 'mars', title: 'Next door: Mars', blurb: 'Days, weight and talking to rovers.', found: `A day like ours, a year nearly twice as long, 38% of our weight, and ${Math.round(lightSeconds(MARS_EARTH_KM[0]) / 60)} to ${Math.round(lightSeconds(MARS_EARTH_KM[1]) / 60)} minutes away by radio.`, steps: [
    { world: 'Mars', title: 'The red planet', text: 'Mars looks red because iron in its rocks and dust has rusted.' },
    { world: 'Mars', title: 'A Martian day', text: 'Mars spins once in a little over a day.', predict: 'mars-day' },
    { world: 'Mars', title: 'Lighter on Mars', text: 'Mars is about half as wide as Earth and has much less mass.', predict: 'mars-weight', compare: ['Earth', 'Mars'] },
    { world: 'Mars', title: 'Calling a rover', text: `Radio signals travel at the speed of light. Between Earth and Mars they take from about ${Math.round(lightSeconds(MARS_EARTH_KM[0]) / 60)} to ${Math.round(lightSeconds(MARS_EARTH_KM[1]) / 60)} minutes each way, depending on where the planets are. So no one can steer a rover live: each day’s plan is sent ahead, and the rover steers round rocks on its own.` },
  ] },
  { id: 'giants', title: 'The giants and their moons', blurb: 'Worlds of gas, rings of ice, and oceans hidden under ice.', found: 'More than 1,000 Earths would fit inside Jupiter; Saturn would float; and under the ice of some of their moons are oceans.', steps: [
    { world: 'Jupiter', title: 'The biggest planet', text: 'Jupiter is about 143,000 km wide, 11 times wider than Earth.', predict: 'jupiter-fit' },
    { world: 'Jupiter', title: 'A storm bigger than Earth', text: 'The Great Red Spot is a storm wider than Earth. People have watched it for more than 300 years.' },
    { world: 'Saturn', title: 'Rings of ice', text: 'Saturn’s rings are billions of chunks of ice and rock, from grains to boulders the size of a building. In the main rings they are typically only about 10 metres thick.', predict: 'saturn-float' },
    { world: 'Europa', title: 'Oceans under the ice', text: 'Under Europa’s icy shell, scientists believe there is a saltwater ocean with about twice as much water as all of Earth’s oceans. Saturn’s small moon Enceladus sprays its own hidden ocean into space through cracks in its ice.' },
    { world: 'Titan', title: 'Lakes of methane', text: 'Titan, Saturn’s biggest moon, has a thick atmosphere, mostly nitrogen, and lakes and seas of liquid methane and ethane. It is the only place besides Earth known to have liquid on its surface.' },
  ] },
  { id: 'small', title: 'Small worlds', blurb: 'Asteroids, dwarf planets, and where comets come from.', found: 'All the asteroids together have less mass than our Moon; Ceres and Pluto are dwarf planets; and many comets start in the icy belt beyond Neptune.', steps: [
    { title: 'The asteroid belt', text: 'Between Mars and Jupiter, between 1.1 and 1.9 million asteroids bigger than 1 km circle the Sun, with millions of smaller ones.', predict: 'asteroid-mass' },
    { world: 'Ceres', title: 'Ceres', text: 'Ceres, 939 km across, is the largest object in the asteroid belt. In 2006 it was named a dwarf planet.' },
    { world: 'Pluto', title: 'Pluto', text: 'Pluto is about 2,377 km across, smaller than our Moon. From its discovery in 1930 until 2006 it was called the ninth planet.', predict: 'pluto-planet' },
    { world: 'Charon', title: 'Pluto and Charon', text: 'Charon is half the size of Pluto: no other moon is so big next to the world it circles. The same sides of Pluto and Charon always face each other.' },
    { scope: 'all', title: 'The Kuiper belt and comets', text: 'Beyond Neptune, from about 30 to 50 times Earth’s distance from the Sun, lies the Kuiper belt: millions of small, icy objects. Some are nudged towards the Sun and become comets; most long-period comets come from the far more distant Oort cloud.' },
  ] },
];
export const journey = id => JOURNEYS.find(j => j.id === id) || null;
// A step with a question can only move on once it has been answered (or skipped).
export const canAdvance = (step, answers) => !step?.predict || answers?.[step.predict] !== undefined;
