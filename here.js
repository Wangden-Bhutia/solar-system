// "You are here": one line per scale that keeps your own place in view, and the quiet words that end the tour.
// Pure text. Every figure comes from a source the app already cites (docs/sources.md: the Galaxy, the Local Group,
// Laniakea and the observable universe) or from cosmos-data.js; the tests pin them to those.
import { COSMOS_FACTS } from './cosmos-data.js';

// The short line shows all the time (short enough for one line on a phone, beside the Time chip); the second sentence (HERE_MORE) waits in the readout's tap-to-open part.
export const HERE = {
  solar: 'You are here: Earth, third planet from the Sun',
  stars: 'You are here: the Sun',
  galaxy: 'You are here: the Sun, in the Milky Way',
  local: 'You are here: the Milky Way',
  super: 'You are here: the Local Group',
  universe: 'You are here: the small knot at the centre',
};
export const HERE_MORE = {
  stars: 'The nearest other star is 4.2 light-years away',
  // the word joiner and no-break space keep "100–400 billion" on one line
  galaxy: 'One star among 100\u2013\u2060400\u00a0billion, 27,000 light-years from the centre',
  local: 'One of more than 100 galaxies in the Local Group',
  super: `One small part of Laniakea (${COSMOS_FACTS.laniakeaGalaxies} galaxies)`,
  universe: `Galaxies in the universe we can see: ${COSMOS_FACTS.galaxies}`,
};
export const hereLine = level => HERE[level] || '';
export const hereMore = level => HERE_MORE[level] || '';

// The last screen of the tour. Plain, true, and short; no question to answer.
export const FINALE = {
  title: 'Here',
  lines: [
    'Somewhere near the middle of this picture is the Sun, and a small planet going round it. At this size you cannot see it.',
    'Every person who has ever lived was born on that planet.',
    `This is only the part we can see: ${COSMOS_FACTS.edge} light-years in every direction. What lies beyond, nobody knows.`,
    'Small, yes. But it is the part of the universe that can look back at all of this.',
  ],
  home: 'Go home',
  save: 'Save this moment',
  caption: 'A Mote in a Sunbeam · from the Sun to the edge of the universe',
};
