// Coming up: real sky events from India, December 2026 to November 2027. Each is a moment (at, UT) with a good time to
// look from north Bengal (look.at, UT; checked with sky-math.js for Siliguri: the target is up and the sky is dark) and,
// where the arrangement in space explains it, a view of the Solar System on that date (space: fit the inner planets,
// fitTo out to a planet, or focus a world; side: look across the Sun–Earth line to see the Moon on it). Dates and times are
// from the sources listed with each event; tests/sky-events.test.js checks the app's own maths against them.
const ist = (y, m, d, h, mi = 0) => Date.UTC(y, m - 1, d, h, mi) - 5.5 * 3600000;
const ut = (y, m, d, h, mi = 0) => Date.UTC(y, m - 1, d, h, mi);

const NAOJ = {
  label: 'National Astronomical Observatory of Japan: phenomena of 2027',
  url: 'https://eco.mtk.nao.ac.jp/cgi-bin/koyomi/cande/phenomena_en.cgi?year=2027'
};
const IMO26 = {
  label: 'International Meteor Organization: meteor shower calendar 2026',
  url: 'https://imo.net/files/meteor-shower/cal2026.pdf'
};
const IMO27 = {
  label: 'International Meteor Organization: meteor shower calendar 2027',
  url: 'https://imo.net/files/meteor-shower/cal2027.pdf'
};
const TAD = { label: 'timeanddate.com: eclipses visible in Siliguri', url: 'https://www.timeanddate.com/eclipse/in/india/siliguri' };

export const SKY_EVENTS = [
  {
    id: 'geminids-2026',
    kind: 'Meteors',
    at: ut(2026, 12, 14, 14),
    title: 'The Geminids',
    text: 'The year’s richest meteor shower: grit shed by the asteroid Phaethon, burning up as Earth ploughs through it. Up to about 150 an hour under a perfect sky, far fewer from a town. The Moon is a thin crescent that sets early, so the sky is dark.',
    when: 'Night of 14–15 Dec, best after 10 pm',
    look: {
      at: ist(2026, 12, 15, 1),
      radiant: { ra: 112, dec: 33, label: 'Geminids radiant' },
      say: 'Meteors seem to fly out of this spot, near the twin stars of Gemini. Look anywhere around it.'
    },
    space: null,
    src: [IMO26]
  },
  {
    id: 'venus-west-2027',
    kind: 'Morning star',
    at: ut(2027, 1, 3, 18),
    title: 'Venus at its farthest from the Sun',
    text: 'Venus swings 47° west of the Sun, as far as it ever gets, so from India it rises about three and a half hours before the Sun. In space, Earth, Venus and the Sun make a right angle: we see Venus side-on to its orbit.',
    when: '4 Jan, before dawn, south-east',
    look: { at: ist(2027, 1, 4, 5, 30), body: 'Venus' },
    space: { fit: 'inner' },
    src: [NAOJ]
  },
  {
    id: 'quadrantids-2027',
    kind: 'Meteors',
    at: ut(2027, 1, 4, 3, 25),
    title: 'The Quadrantids',
    text: 'A strong but short shower, from the debris of an old comet. Its peak falls in India’s daytime, so the hours before dawn on 4 January catch the build-up. No moonlight to spoil it.',
    when: '4 Jan, 4–5.30 am, north-east',
    look: {
      at: ist(2027, 1, 4, 5),
      radiant: { ra: 230, dec: 49, label: 'Quadrantids radiant' },
      say: 'Meteors seem to fly out of this spot, near the end of the Plough’s handle.'
    },
    space: null,
    src: [IMO27]
  },
  {
    id: 'jupiter-opp-2027',
    kind: 'Opposition',
    at: ut(2027, 2, 11, 0, 29),
    title: 'Jupiter opposite the Sun',
    text: 'Earth passes between the Sun and Jupiter. Jupiter rises at sunset, is up all night and is at its brightest and closest for the year. Binoculars show its four big moons as a line of dots.',
    when: '11 Feb, all night, high at midnight',
    look: { at: ist(2027, 2, 10, 23), body: 'Jupiter' },
    space: { fitTo: 'Jupiter' },
    src: [NAOJ]
  },
  {
    id: 'mars-opp-2027',
    kind: 'Opposition',
    at: ut(2027, 2, 19, 15, 51),
    title: 'Mars opposite the Sun',
    text: 'Nine days after Jupiter, Earth overtakes Mars too. Mars shines orange all night, brighter than it has been for two years. It is a distant opposition, so Mars looks small even in a telescope.',
    when: '19–20 Feb, all night, high at midnight',
    look: { at: ist(2027, 2, 20, 0), body: 'Mars' },
    space: { fit: 'inner' },
    src: [NAOJ]
  },
  {
    id: 'lunar-eclipse-2027',
    kind: 'Eclipse',
    at: ut(2027, 2, 20, 23, 13),
    title: 'A faint eclipse of the Moon',
    text: 'The full Moon passes through the outer part of Earth’s shadow, where only part of the Sun is hidden. One edge looks a little dusky; most people would not notice without being told. Sun, Earth and Moon are almost in a line.',
    when: '21 Feb, about 4.45 am, low in the west',
    look: { at: ist(2027, 2, 21, 4, 43), body: 'Moon' },
    space: { focus: 'Earth', side: true },
    src: [{ label: 'Wikipedia: February 2027 lunar eclipse', url: 'https://en.wikipedia.org/wiki/February_2027_lunar_eclipse' }, TAD]
  },
  {
    id: 'eta-aquariids-2027',
    kind: 'Meteors',
    at: ut(2027, 5, 6, 9),
    title: 'The Eta Aquariids',
    text: 'Dust from Halley’s Comet. This shower favours places nearer the equator, which suits India. Fast meteors, best in the last two hours before dawn, with no Moon this year.',
    when: '6 May, 3.30–4.30 am, east',
    look: {
      at: ist(2027, 5, 6, 4),
      radiant: { ra: 338, dec: -1, label: 'Eta Aquariids radiant' },
      say: 'Meteors seem to fly out of this spot in Aquarius, low in the east.'
    },
    space: null,
    src: [IMO27]
  },
  {
    id: 'venus-saturn-2027',
    kind: 'Close pair',
    at: ut(2027, 5, 7, 18, 46),
    title: 'Venus passes Saturn',
    text: 'Venus and Saturn look a little more than a Moon-width apart. They only line up from where we stand: Saturn is about seven times farther away. Low in the dawn, so you need a clear eastern horizon.',
    when: '8 May, about 4.20 am, low in the east',
    look: { at: ist(2027, 5, 8, 4, 20), body: 'Venus' },
    space: { fitTo: 'Saturn' },
    src: [
      { label: 'Sky Tonight: Venus and Saturn, 7 May 2027', url: 'https://sky-tonight.com/object/close-approach/Venus-Saturn-2027-05-07' }
    ]
  },
  {
    id: 'solar-eclipse-2027',
    kind: 'Eclipse',
    at: ut(2027, 8, 2, 11, 9),
    title: 'A small bite out of the Sun',
    text: 'The Moon passes between us and the Sun. Over Egypt and Arabia it covers the Sun completely; from north Bengal it clips under a tenth of it, late in the afternoon. Never look at the Sun directly or through binoculars: use eclipse glasses or a pinhole.',
    when: '2 Aug, 4.15–5 pm, west',
    look: { at: ist(2027, 8, 2, 16, 39), body: 'Sun' },
    space: { focus: 'Earth', side: true },
    src: [
      TAD,
      { label: 'Tutiempo: solar eclipse in Purnia, 2 August 2027', url: 'https://en.tutiempo.net/solar-eclipse/purnia/2-august-2027.html' }
    ]
  },
  {
    id: 'perseids-2027',
    kind: 'Meteors',
    at: ut(2027, 8, 13, 9),
    title: 'The Perseids',
    text: 'Dust from Comet Swift–Tuttle, and the best-known shower of the year. A bright Moon lights the evening; it has set by the small hours, which are the best. August clouds are the bigger risk in India.',
    when: '13 Aug, 2–4.30 am, north-east',
    look: {
      at: ist(2027, 8, 13, 3, 30),
      radiant: { ra: 48, dec: 58, label: 'Perseids radiant' },
      say: 'Meteors seem to fly out of this spot in Perseus, in the north-east.'
    },
    space: null,
    src: [IMO27]
  },
  {
    id: 'saturn-opp-2027',
    kind: 'Opposition',
    at: ut(2027, 10, 18, 0, 36),
    title: 'Saturn opposite the Sun',
    text: 'Earth passes between the Sun and Saturn. Saturn is up all night, a steady yellowish point. A small telescope shows the rings, now opening up again after being edge-on in 2025.',
    when: '18 Oct, all night, high at midnight',
    look: { at: ist(2027, 10, 17, 23), body: 'Saturn' },
    space: { fitTo: 'Saturn' },
    src: [NAOJ]
  },
  {
    id: 'venus-mars-2027',
    kind: 'Close pair',
    at: ut(2027, 11, 25, 0, 39),
    title: 'Venus passes Mars',
    text: 'Venus and Mars come within just over half a Moon-width of each other in the evening twilight. Venus is dazzling; Mars, now far across the Solar System from us, is a faint orange dot just beside it. Binoculars help.',
    when: '24 Nov, about 5.30 pm, low in the south-west',
    look: { at: ist(2027, 11, 24, 17, 30), body: 'Venus' },
    space: { fit: 'inner' },
    src: [
      {
        label: 'Forecast Bar (JPL ephemeris): Venus–Mars conjunction, 25 Nov 2027',
        url: 'https://forecastbar.com/astronomy/event/jpl:planet-conjunction-venus-mars-2027-01/'
      }
    ]
  }
];

// The events still to come (an event stays listed until a day after its moment), soonest first.
export const upcoming = (now = Date.now(), list = SKY_EVENTS) =>
  list.filter(e => e.at + 86400000 > now && e.look.at + 6 * 3600000 > now).sort((a, b) => a.at - b.at);
