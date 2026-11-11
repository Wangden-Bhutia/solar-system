// "You are here": one line per scale that keeps your own place in view, and the quiet words that end the Voyage.
// Pure text. Every figure comes from a source the app already cites (docs/sources.md: the Galaxy, the Local Group,
// Laniakea and the observable universe) or from cosmos-data.js; the tests pin them to those.
import { COSMOS_FACTS } from './cosmos-data.js';

export const HERE = {
  solar: 'You are here: Earth, the third planet from the Sun',
  stars: 'You are here: the Sun. The nearest other star is 4.2 light-years away',
  galaxy: 'You are here: the Sun, one star among 100–400 billion, 27,000 light-years from the centre',
  local: 'You are here: the Milky Way, one of more than 100 galaxies in the Local Group',
  super: `You are here: the Local Group, one small part of Laniakea (${COSMOS_FACTS.laniakeaGalaxies} galaxies)`,
  universe: `You are here: the small knot at the centre. Galaxies in the universe we can see: ${COSMOS_FACTS.galaxies}`,
};
export const hereLine = level => HERE[level] || '';

// The last screen of the Voyage. Plain, true, and short; no question to answer.
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
