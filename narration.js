// One narrator across the app: the tour, the journeys, the journey inward and the cosmic year are read in the same
// recorded voice as the world cards and labs (voice/lines.js, built by tools/build-voice.py). This module names each
// clip and turns on-screen text into the words the narrator says (units spelled out, symbols read aloud), so the
// recording always says what the screen shows. tests/narration.test.js checks voice/lines.json against it.
export const tourClip = stop => `tour_${stop.id}`;
export const journeyClip = (journeyId, step) => `jr_${journeyId}_${step}`;
export const inwardClip = rungId => `in_${rungId}`;
export const INWARD_END_CLIP = 'in_end';
export const cosmicClip = eventId => `cy_${eventId}`;

const UNITS = [
  [/(\d)\s?km\b/g, '$1 kilometres'],
  [/(\d)\s?cm\b/g, '$1 centimetres'],
  [/(\d)\s?mm\b/g, '$1 millimetres'],
  [/(\d)\s?µm\b/g, '$1 micrometres'],
  [/(\d)\s?nm\b/g, '$1 nanometres'],
  [/\b1 au\b/g, '1 astronomical unit'],
  [/(\d)\s?au\b/g, '$1 astronomical units'],
  [/(\d)°/g, '$1 degrees']
];
const WORDS = [
  [/Sagittarius A\*/g, 'Sagittarius A-star'],
  [/MoM-z14/g, 'MoM zed 14'],
  [/\s*\((\d{4})\),?/g, ', in $1,'],
  [/\b(\d{1,2}) December\b/g, (_, d) => `the ${ordinal(Number(d))} of December`],
  [/(\w)–(\w)/g, '$1 $2'] // Gaia–Enceladus: a name, read as one
];
const ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
export function spoken(text) {
  let s = String(text);
  for (const [re, to] of [...WORDS, ...UNITS]) s = s.replace(re, to);
  return s.replace(/\s+/g, ' ').trim();
}
// "Title. Text": the heading is read first, as the eye reads it.
export const say = (title, text) => spoken(`${title}${/[.!?]$/.test(title) ? '' : '.'} ${text}`);
