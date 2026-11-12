// The cosmic year: the 13.8 billion years since the Big Bang squeezed into one calendar year, as Carl Sagan did in
// "The Dragons of Eden" (1977). Pure data and maths; see docs/sources.md ("The cosmic year").
// Each event's age comes from the cited source; its date is computed here from that age, so the dates are only as good as
// the ages (which vary between sources; the notes say how much). Sagan used 15 billion years; this uses Planck 2018's 13.787.
import { FAR_GALAXY } from './cosmos-data.js';

export const AGE_YEARS = 13.787e9, YEAR_SECONDS = 365 * 86400;
const wiki = t => ({ label: 'Wikipedia: ' + t, url: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(t.replace(/ /g, '_')) });
const CAL = wiki('Cosmic calendar');
// `ago`: years before now. `level`: the scale of the app that shows it (optional).
export const EVENTS = [
  { id: 'bang', ago: AGE_YEARS, title: 'The Big Bang', text: 'Space, time and everything in it begin expanding from an extremely hot, dense state.', level: 'universe', src: [wiki('Big Bang'), wiki('Age of the universe')] },
  { id: 'cmb', ago: AGE_YEARS - 380000, title: 'Light breaks free', text: 'The universe cools enough for the first atoms to form, and the glowing fog clears: light can travel freely. That light is still arriving, stretched by the expanding universe into microwaves: the cosmic microwave background.', note: '380,000 years after the Big Bang', level: 'universe', src: [wiki('Cosmic microwave background')] },
  { id: 'galaxy', ago: FAR_GALAXY.lookback * 1e9, title: 'The earliest galaxy we have seen', text: 'MoM-z14, found by the James Webb Space Telescope, seen as it was only about 280 million years after the Big Bang.', level: 'universe', src: [wiki('MoM-z14')] },
  { id: 'disk', ago: 8.8e9, title: 'The Milky Way’s disk forms', text: 'The flat spinning disk where the Sun will one day live begins to build up.', note: 'estimates vary', level: 'galaxy', src: [CAL, wiki('Milky Way')] },
  { id: 'sun', ago: 4.57e9, title: 'The Sun and its planets form', text: 'A cloud of gas and dust collapses into the Sun, with a disk of leftovers that becomes the planets.', level: 'solar', src: [wiki('Formation and evolution of the Solar System')] },
  { id: 'earth', ago: 4.5e9, title: 'Earth and the Moon', text: 'Earth is struck by a Mars-sized world; the debris becomes the Moon.', note: 'the giant-impact hypothesis', level: 'solar', src: [wiki('Giant-impact hypothesis')] },
  { id: 'life', ago: 3.8e9, title: 'The first life', text: 'The earliest evidence of living things: tiny single cells.', note: 'estimates run from about 3.5 to 4.1 billion years ago', src: [wiki('Earliest known life forms')] },
  { id: 'oxygen', ago: 2.4e9, title: 'Oxygen fills the air', text: 'Photosynthesising microbes release so much oxygen that the whole atmosphere changes: the Great Oxidation Event.', note: 'about 2.4–2.5 billion years ago', src: [wiki('Great Oxidation Event')] },
  { id: 'cells', ago: 2.0e9, title: 'Complex cells', text: 'Cells with a nucleus appear: the kind every animal, plant and fungus is built from.', note: 'estimates run from about 1.85 to 2.1 billion years ago', src: [wiki('Eukaryote')] },
  { id: 'animals', ago: 0.67e9, title: 'The first animals', text: 'Simple animals appear in the sea.', note: 'estimates run from about 540 to 800 million years ago', src: [CAL, wiki('Ediacaran')] },
  { id: 'plants', ago: 0.45e9, title: 'Plants reach the land', text: 'The first plants creep out of the water onto damp ground: small and low, like today’s liverworts and mosses.', src: [CAL, wiki('Evolutionary history of plants')] },
  { id: 'dinos', ago: 0.23e9, title: 'The dinosaurs', text: 'The first dinosaurs appear and go on to rule the land for over 150 million years.', src: [wiki('Dinosaur')] },
  { id: 'impact', ago: 66e6, title: 'The asteroid', text: 'An asteroid about 10 km wide strikes what is now Mexico. The dinosaurs that could not fly die out; mammals inherit the world.', src: [wiki('Cretaceous–Paleogene extinction event')] },
  { id: 'humans', ago: 0.2e6, title: 'Our species', text: 'Anatomically modern humans appear in Africa.', note: 'estimates run from about 200,000 to 300,000 years ago', src: [wiki('Homo sapiens')] },
  { id: 'farming', ago: 12000, title: 'Farming', text: 'People begin growing crops and keeping animals, and settle in villages.', src: [wiki('Neolithic Revolution')] },
  { id: 'writing', ago: 5000, title: 'Writing and the first cities', text: 'Egypt, Mesopotamia and the Indus valley build cities and begin to write. Everything anyone has ever written down is inside this stretch.', src: [CAL, wiki('History of writing')] },
  { id: 'modern', ago: 500, title: 'Telescopes to spaceflight', text: 'Modern science, electricity, aeroplanes, computers, spaceflight and the first photographs of Earth from space: all of it in the last second of the year.', src: [CAL] },
  { id: 'now', ago: 0, title: 'Now', text: 'This is the stroke of midnight on 31 December. You are here.', src: [CAL] },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
// Seconds into the cosmic year (0 = Big Bang, YEAR_SECONDS = now) for an event `ago` years ago.
export const yearSeconds = ago => (AGE_YEARS - ago) / AGE_YEARS * YEAR_SECONDS;
// Calendar date and clock time for a number of seconds into the year (the end of the year is exactly now: "31 Dec 24:00").
export function calendarAt(secs) {
  const s = Math.min(Math.max(secs, 0), YEAR_SECONDS), atEnd = s >= YEAR_SECONDS; let day = Math.min(364, Math.floor(s / 86400)), m = 0;
  const rem = atEnd ? 0 : s - day * 86400; for (; m < 12 && day >= DAYS[m]; m++) day -= DAYS[m];
  const hh = Math.floor(rem / 3600), mm = Math.floor(rem % 3600 / 60), ss = Math.floor(rem % 60), left = YEAR_SECONDS - s;
  const pad = n => String(n).padStart(2, '0');
  let time = null; if (atEnd) time = 'midnight'; else if (left < 120) time = `${pad(hh)}:${pad(mm)}:${pad(ss)}`; else if (left < 3 * 86400 || s < 86400) time = `${pad(hh)}:${pad(mm)}`;
  return { day: day + 1, month: MONTHS[m], date: `${day + 1} ${MONTHS[m]}`, time, label: `${day + 1} ${MONTHS[m]}${time ? ', ' + time : ''}` };
}
export const eventDate = e => calendarAt(yearSeconds(e.ago));
// A span of years as time on the calendar: "11 seconds", "0.18 seconds", "27 minutes".
export function spanOnCalendar(years) {
  const s = years / AGE_YEARS * YEAR_SECONDS;
  if (s < 0.01) return 'less than a hundredth of a second';
  if (s < 1) return `${s.toFixed(2)} seconds`;
  if (s < 90) return `${Math.round(s)} seconds`;
  if (s < 5400) return `${Math.round(s / 60)} minutes`;
  if (s < 2 * 86400) return `${Math.round(s / 3600)} hours`;
  return `${Math.round(s / 86400)} days`;
}
export const agoText = y => y >= 1e9 ? `${+(y / 1e9).toPrecision(4)} billion years ago` : y >= 1e6 ? `${+(y / 1e6).toPrecision(3)} million years ago` : y >= 1000 ? `${Math.round(y).toLocaleString('en-US')} years ago` : y > 0 ? `${Math.round(y)} years ago` : 'today';
