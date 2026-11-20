// Coming up: real sky events from India, December 2026 to December 2029. The list shows the next 6 months only
// (window): an event drops off a day after it happens, and the next one joins when it comes within six months. Each is a moment (at, UT) with a good time to
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
const HEMEL28 = { label: 'Hemel.waarnemen.com: astronomical calendar 2028', url: 'https://hemel.waarnemen.com/astrokal/2028.html' };
const TL28 = {
  label: 'Cambridge, Turn Left at Orion: sky calendar 2028',
  url: 'https://www.cambridge.org/turnleft/pages/whats_up_tonight/calendar2028'
};
const TL29 = {
  label: 'Cambridge, Turn Left at Orion: sky calendar 2029',
  url: 'https://www.cambridge.org/turnleft/pages/whats_up_tonight/calendar2029'
};
const hemel = (planet, slug, d) => ({
  label: `Hemel.waarnemen.com: ${planet} opposition ${d}`,
  url: `https://hemel.waarnemen.com/${slug}`
});
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
    when: 'Night of 10–11 Feb, high at midnight',
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
    when: 'Night of 17–18 Oct, high at midnight',
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
  },
  {
    id: 'quadrantids-2028',
    kind: 'Meteors',
    at: ut(2028, 1, 4, 10),
    title: 'The Quadrantids',
    text: 'The year opens with a strong, short shower from the debris of an old comet. The Moon is out of the way, so the hours before dawn are dark. The peak itself falls in India’s afternoon, so expect the build-up rather than the best.',
    when: '4 Jan, 4–5.30 am, north-east',
    look: {
      at: ist(2028, 1, 4, 5),
      radiant: { ra: 230, dec: 49, label: 'Quadrantids radiant' },
      say: 'Meteors seem to fly out of this spot, near the end of the Plough’s handle.'
    },
    space: null,
    src: [TL28]
  },
  {
    id: 'jupiter-opp-2028',
    kind: 'Opposition',
    at: ut(2028, 3, 12, 15, 37),
    title: 'Jupiter opposite the Sun',
    text: 'Earth passes between the Sun and Jupiter again, about 13 months after the last time: Jupiter has moved on a twelfth of its orbit, so we need a little longer to catch it up. It shines in Leo all night.',
    when: '12 Mar, all night, high near midnight',
    look: { at: ist(2028, 3, 12, 23), body: 'Jupiter' },
    space: { fitTo: 'Jupiter' },
    src: [HEMEL28, TL28]
  },
  {
    id: 'venus-east-2028',
    kind: 'Evening star',
    at: ut(2028, 3, 22, 12, 27),
    title: 'Venus at its farthest from the Sun',
    text: 'Venus stands 46° east of the Sun, the brilliant evening star, setting more than three hours after sunset. Two weeks later, on 3–4 April, it passes through the Pleiades star cluster: a fine sight in binoculars.',
    when: '22 Mar, after sunset, west',
    look: { at: ist(2028, 3, 22, 19), body: 'Venus' },
    space: { fit: 'inner' },
    src: [HEMEL28, TL28]
  },
  {
    id: 'lunar-eclipse-jul-2028',
    kind: 'Eclipse',
    at: ut(2028, 7, 6, 18, 20),
    title: 'A partial eclipse of the Moon',
    text: 'Earth’s dark shadow covers about two-fifths of the full Moon, a clear bite that anyone can see. The partial phase runs from 10.38 pm to 1 am, with the Moon part-way up in the south.',
    when: '6 Jul, 10.40 pm – 1 am, biggest at 11.50 pm',
    look: { at: ist(2028, 7, 6, 23, 49), body: 'Moon' },
    space: { focus: 'Earth', side: true },
    src: [
      { label: 'Wikipedia: July 2028 lunar eclipse', url: 'https://en.wikipedia.org/wiki/July_2028_lunar_eclipse' },
      { label: 'Orbital Radar: 6 July 2028 lunar eclipse from Kolkata', url: 'https://orbitalradar.com/eclipse/2028-july-6-lunar/kolkata' }
    ]
  },
  {
    id: 'venus-west-2028',
    kind: 'Morning star',
    at: ut(2028, 8, 10, 16, 3),
    title: 'Venus at its farthest from the Sun',
    text: 'Venus has swung round to the other side: now 46° west of the Sun, the morning star, rising more than three hours before sunrise. Monsoon cloud permitting.',
    when: '11 Aug, before dawn, east',
    look: { at: ist(2028, 8, 11, 4, 30), body: 'Venus' },
    space: { fit: 'inner' },
    src: [HEMEL28, TL28]
  },
  {
    id: 'mercury-east-2028',
    kind: 'Evening star',
    at: ut(2028, 5, 9, 6, 13),
    title: 'Mercury at its best after sunset',
    text: 'Mercury, the hardest of the bright planets to catch, stands 21° from the Sun: about as far as it gets. Look low in the west half an hour after sunset for a steady point of light. Binoculars help find it; put them away before the Sun is in view.',
    when: '9 May, about 6.50 pm, low in the west',
    look: { at: ist(2028, 5, 9, 18, 50), body: 'Mercury' },
    space: { fit: 'inner' },
    src: [HEMEL28, TL28]
  },
  {
    id: 'saturn-opp-2028',
    kind: 'Opposition',
    at: ut(2028, 10, 30, 17, 34),
    title: 'Saturn opposite the Sun',
    text: 'Saturn is up all night in Aries. It moves so slowly that each opposition comes only about two weeks later in the year than the last. The rings are tilting wider towards us every year now.',
    when: '30 Oct, all night, high near midnight',
    look: { at: ist(2028, 10, 30, 23), body: 'Saturn' },
    space: { fitTo: 'Saturn' },
    src: [HEMEL28, TL28]
  },
  {
    id: 'venus-jupiter-2028',
    kind: 'Close pair',
    at: ut(2028, 11, 10, 0, 52),
    title: 'Venus passes Jupiter',
    text: 'The two brightest planets meet just over a Moon-width apart in the dawn. Jupiter is nearly five times farther away than Venus; they only line up from where we stand.',
    when: '10 Nov, about 5 am, east',
    look: { at: ist(2028, 11, 10, 5), body: 'Venus' },
    space: { fitTo: 'Jupiter' },
    src: [
      HEMEL28,
      {
        label: 'Forecast Bar (JPL ephemeris): Venus–Jupiter conjunction, 10 Nov 2028',
        url: 'https://forecastbar.com/astronomy/event/jpl:planet-conjunction-venus-jupiter-2028-01/'
      }
    ]
  },
  {
    id: 'geminids-2028',
    kind: 'Meteors',
    at: ut(2028, 12, 14, 2),
    title: 'The Geminids',
    text: 'The richest shower of the year, with the crescent Moon set early: as good as it gets. The peak comes just after dawn in India, so the night of 13–14 December is the one to watch.',
    when: 'Night of 13–14 Dec, best after 10 pm',
    look: {
      at: ist(2028, 12, 14, 1),
      radiant: { ra: 112, dec: 33, label: 'Geminids radiant' },
      say: 'Meteors seem to fly out of this spot, near the twin stars of Gemini. Look anywhere around it.'
    },
    space: null,
    src: [TL28]
  },
  {
    id: 'lunar-eclipse-dec-2028',
    kind: 'Eclipse',
    at: ut(2028, 12, 31, 16, 52),
    title: 'A total eclipse of the Moon',
    text: 'The full Moon slides right into Earth’s shadow and turns a deep copper red for 71 minutes, lit only by sunlight bent through Earth’s air: every sunrise and sunset on the planet at once. High in the sky on New Year’s Eve.',
    when: '31 Dec, red from 9.45 to 11 pm',
    look: { at: ist(2028, 12, 31, 22, 21), body: 'Moon' },
    space: { focus: 'Earth', side: true },
    src: [
      { label: 'Wikipedia: December 2028 lunar eclipse', url: 'https://en.wikipedia.org/wiki/December_2028_lunar_eclipse' },
      {
        label: 'Orbital Radar: 31 December 2028 lunar eclipse from Kolkata',
        url: 'https://orbitalradar.com/eclipse/2028-december-31-lunar/kolkata'
      }
    ]
  },
  {
    id: 'mars-opp-2029',
    kind: 'Opposition',
    at: ut(2029, 3, 25, 7, 49),
    title: 'Mars opposite the Sun',
    text: 'Earth catches up with Mars again, about 25 months after the last time. A little closer than in 2027: 97 million km on 29 March. Mars shines orange in Virgo all night.',
    when: '25 Mar, all night, high near midnight',
    look: { at: ist(2029, 3, 25, 23), body: 'Mars' },
    space: { fit: 'inner' },
    src: [hemel('Mars', 'mars/opposities/marsoppositie_20290325.html', '2029'), TL29]
  },
  {
    id: 'jupiter-opp-2029',
    kind: 'Opposition',
    at: ut(2029, 4, 12, 5),
    title: 'Jupiter opposite the Sun',
    text: 'Jupiter, in Virgo this time, is at its brightest and up all night. With binoculars held steady, its four big moons change places from night to night.',
    when: '12 Apr, all night, high near midnight',
    look: { at: ist(2029, 4, 12, 23), body: 'Jupiter' },
    space: { fitTo: 'Jupiter' },
    src: [hemel('Jupiter', 'jupiter/opposities/jupiteroppositie_20290412.html', '2029'), TL29]
  },
  {
    id: 'mercury-east-apr-2029',
    kind: 'Evening star',
    at: ut(2029, 4, 21, 13),
    title: 'Mercury at its best after sunset',
    text: 'Mercury swings out to 20° east of the Sun. Spring evenings are the best time for it from the north, because its path stands steeply above the sunset. Low in the west, soon after sunset.',
    when: '21 Apr, about 6.45 pm, low in the west',
    look: { at: ist(2029, 4, 21, 18, 45), body: 'Mercury' },
    space: { fit: 'inner' },
    src: [TL29]
  },
  {
    id: 'apophis-2029',
    kind: 'Asteroid',
    at: ut(2029, 4, 13, 21, 46),
    title: 'Apophis skims past Earth',
    text: 'A 340-metre asteroid passes about 31,000 km above us, closer than the satellites that carry television. It will look like a star as bright as those of the Plough, sliding slowly across the sky; most of Asia can see it. It will not hit us: its path is known well enough to rule that out. The exact track across India’s sky will be published nearer the date.',
    when: 'Night of 13–14 Apr, track to be announced',
    look: null,
    space: null,
    src: [
      {
        label: 'Live Science: Apophis could be visible to 90% of Earth’s population',
        url: 'https://livescience.com/space/asteroids/shared-cosmic-experience-potentially-hazardous-asteroid-apophis-could-be-visible-to-90-percent-of-earths-population-during-ultraclose-2029-flyby-new-maps-reveal'
      },
      {
        label: 'ESA: Apophis orbit diverted by Earth’s gravity',
        url: 'https://www.esa.int/ESA_Multimedia/Images/2021/03/Apophis_orbit_diverted_by_Earth_s_gravity'
      },
      TL29
    ]
  },
  {
    id: 'perseids-2029',
    kind: 'Meteors',
    at: ut(2029, 8, 12, 21),
    title: 'The Perseids',
    text: 'A good year for them: no Moon at all, and the peak falls in India’s small hours. The only question is the monsoon cloud.',
    when: '13 Aug, 1–4.30 am, north-east',
    look: {
      at: ist(2029, 8, 13, 2, 30),
      radiant: { ra: 48, dec: 58, label: 'Perseids radiant' },
      say: 'Meteors seem to fly out of this spot in Perseus, in the north-east.'
    },
    space: null,
    src: [TL29]
  },
  {
    id: 'mercury-east-aug-2029',
    kind: 'Evening star',
    at: ut(2029, 8, 19, 21),
    title: 'Mercury at its best after sunset',
    text: 'Mercury reaches 27° from the Sun, its widest this year, but August evenings set its path at a shallow slant, so it stays low. A clear western horizon between monsoon clouds is the challenge.',
    when: '19 Aug, about 6.45 pm, very low in the west',
    look: { at: ist(2029, 8, 19, 18, 45), body: 'Mercury' },
    space: { fit: 'inner' },
    src: [TL29]
  },
  {
    id: 'venus-east-2029',
    kind: 'Evening star',
    at: ut(2029, 10, 27, 12),
    title: 'Venus at its farthest from the Sun',
    text: 'Venus reaches 47° east of the Sun, the evening star in the south-west after sunset. It stays bright there through November and into December.',
    when: '27 Oct, after sunset, south-west',
    look: { at: ist(2029, 10, 27, 17, 45), body: 'Venus' },
    space: { fit: 'inner' },
    src: [TL29]
  },
  {
    id: 'saturn-opp-2029',
    kind: 'Opposition',
    at: ut(2029, 11, 13, 16),
    title: 'Saturn opposite the Sun',
    text: 'Saturn is up all night, still in Aries. Its rings are opening wider every year, an easy sight in any small telescope.',
    when: '13 Nov, all night, high near midnight',
    look: { at: ist(2029, 11, 13, 23), body: 'Saturn' },
    space: { fitTo: 'Saturn' },
    src: [hemel('Saturn', 'saturnus/opposities/saturnusoppositie_20291113.html', '2029'), TL29]
  },
  {
    id: 'lunar-eclipse-dec-2029',
    kind: 'Eclipse',
    at: ut(2029, 12, 20, 22, 43),
    title: 'A total eclipse of the Moon',
    text: 'Another red Moon, this time before dawn. Totality lasts 54 minutes, with the Moon sinking in the west; the partial phase ends just before it sets.',
    when: '21 Dec, red from 3.45 to 4.40 am',
    look: { at: ist(2029, 12, 21, 4, 11), body: 'Moon' },
    space: { focus: 'Earth', side: true },
    src: [
      { label: 'Wikipedia: December 2029 lunar eclipse', url: 'https://en.wikipedia.org/wiki/December_2029_lunar_eclipse' },
      {
        label: 'Orbital Radar: 20–21 December 2029 lunar eclipse from Kolkata',
        url: 'https://orbitalradar.com/eclipse/2029-december-20-lunar/kolkata'
      }
    ]
  }
];

// The window: events from a day ago to six months ahead, soonest first. An event joins the list on the same date six
// months before it happens (calendar months, so 22 Mar 2028 joins on 22 Sep 2027) and is marked New for its first month.
export const joinsAt = e => {
  const d = new Date(e.at);
  d.setUTCMonth(d.getUTCMonth() - 6);
  return d.getTime();
};
export const upcoming = (now = Date.now(), list = SKY_EVENTS) =>
  list.filter(e => e.at + 86400000 > now && (e.look?.at ?? e.at) + 6 * 3600000 > now && now >= joinsAt(e)).sort((a, b) => a.at - b.at);
// The next event not yet in the list, if any.
export const nextToJoin = (now = Date.now(), list = SKY_EVENTS) =>
  list.filter(e => now < joinsAt(e)).sort((a, b) => a.at - b.at)[0] || null;
export const isNew = (e, now = Date.now()) => now >= joinsAt(e) && now - joinsAt(e) < 30 * 86400000;
