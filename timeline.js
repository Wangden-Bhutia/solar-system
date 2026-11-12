// Joining time and space: far away is long ago. For the edge of the current view, how long ago its light set out,
// a moment from the cosmic year to set that against, and the date it falls on in the cosmic year.
// Pure: lab.js shows it in the scale readout; tests/timeline.test.js checks it.
import { distanceNow, lookback } from './cosmos-data.js';
import { EVENTS, yearSeconds, calendarAt } from './cosmic-calendar.js';

// Below this, a light-year of distance is a year of travel to better than 0.1% (the universe's expansion is too
// small to matter). Beyond it, the travel time comes from the Planck 2018 model in cosmos-data.js, because space has
// stretched while the light was on its way: the edge of what we can see is 46.5 billion light-years away now, but
// its light has travelled for 13.8 billion years.
export const NEAR_LY = 1e7;
let table = null; // [distance now (ly), light travel time (years)] from redshift 0 to the CMB, built once
function buildTable() {
  // redshifts spaced evenly in log z from 0.0001 (about 1.4 million light-years) to the CMB at 1,100, so the table is
  // as fine near home, where the model takes over from light-years, as it is far out
  const t = [[0, 0]];
  for (let i = 0; i <= 320; i++) { const z = 1e-4 * Math.pow(1100 / 1e-4, i / 320); t.push([distanceNow(z) * 1e9, lookback(z) * 1e9]); }
  return t;
}
export function travelYears(ly) {
  if (!(ly > 0)) return 0;
  if (ly < NEAR_LY) return ly;
  table ||= buildTable();
  // at the edge (the microwave background) use the age of the light that broke free then, so this agrees with its cosmic-year card
  if (ly >= table[table.length - 1][0]) return EVENTS.find(e => e.id === 'cmb').ago;
  let k = 1; while (table[k][0] < ly) k++;
  const [d0, t0] = table[k - 1], [d1, t1] = table[k], f = (ly - d0) / (d1 - d0);
  return t0 + (t1 - t0) * f;
}

// How each cosmic-year moment reads when the light set out shortly before or after it.
const BEFORE = { cmb: 'before light broke free', galaxy: 'before the earliest galaxy we have seen', disk: 'before the Milky Way’s disk formed',
  sun: 'before the Sun formed', earth: 'before Earth formed', life: 'before life began on Earth', oxygen: 'before Earth’s air had oxygen',
  cells: 'before the first complex cells', animals: 'before the first animals', cambrian: 'before the Cambrian explosion', plants: 'before plants reached the land', ashore: 'before fish crawled onto land', dinos: 'before the first dinosaurs',
  impact: 'before the asteroid that ended the dinosaurs', ancestors: 'before our ancestors walked upright', humans: 'before our species appeared', farming: 'before farming began', writing: 'before writing began' };
const AFTER = { bang: 'just after the Big Bang', cmb: 'not long after light broke free', galaxy: 'after the first galaxies formed', disk: 'after the Milky Way’s disk formed',
  sun: 'after the Sun formed', earth: 'after Earth formed', life: 'after life began on Earth', oxygen: 'after oxygen filled the air', cells: 'after the first complex cells',
  animals: 'after the first animals', cambrian: 'after the Cambrian explosion', plants: 'after plants reached the land', ashore: 'after fish crawled onto land', dinos: 'in the age of the dinosaurs', impact: 'after the asteroid ended the dinosaurs',
  ancestors: 'after our ancestors began walking upright', humans: 'after our species appeared', farming: 'after farming began', writing: 'after writing began' };
// Under 2,000 years the calendar says more than the cosmic year does ("in 1926", "around 1390").
const RECENT = 2000;

// ly: how far the edge of the view is. Returns null when the light is less than a year old (the Solar System).
export function lightLeft(ly, year = new Date().getFullYear()) {
  const ago = travelYears(ly);
  if (ago < 1) return null;
  let when, event;
  if (ago < RECENT) {
    const y = year - ago, rounded = ago < 150 ? Math.round(y) : Math.round(y / 10) * 10;
    when = ago < 150 ? `in ${rounded}` : `around ${rounded < 1 ? `${1 - rounded} BCE` : rounded}`;
    event = EVENTS.find(e => e.id === 'modern');
  } else {
    // the nearer of the two moments either side, measured in ratios (a million years is near 2 million, far from 2,000)
    const older = [...EVENTS].reverse().find(e => e.ago >= ago && AFTER[e.id]), younger = EVENTS.find(e => e.ago < ago && BEFORE[e.id]);
    const useYounger = younger && (!older || Math.log(ago / younger.ago) < Math.log(older.ago / ago));
    event = useYounger ? younger : older;
    when = useYounger ? BEFORE[event.id] : AFTER[event.id];
  }
  // two significant figures (three for billions, so the edge reads 13.8): the edge of the view moves with every zoom
  // frame, and more digits would claim a precision the view does not have, and flicker
  const shown = ago >= 1e9 ? `${+(ago / 1e9).toPrecision(3)} billion years` : ago >= 1e6 ? `${+(ago / 1e6).toPrecision(2)} million years`
    : ago >= 100 ? `${(+ago.toPrecision(2)).toLocaleString('en-US')} years` : `${Math.round(ago)} ${Math.round(ago) === 1 ? 'year' : 'years'}`;
  const about = ago >= 100 ? 'about ' : '';
  return { ago, short: `Its light is ${about}${shown} old`, text: `Light from the far side of this view left ${about}${shown} ago, ${when}.`,
    cosmic: calendarAt(yearSeconds(ago)).label, eventId: event.id };
}
