export const CHECKED = '9 November 2026';
export const NASA = {
 earth:'https://science.nasa.gov/earth/facts/',moon:'https://science.nasa.gov/moon/facts/',
 phases:'https://science.nasa.gov/moon/moon-phases/',
 earthfact:'https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html',
 moonfact:'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html',
 marsfact:'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html',
};
export const INSIGHTS = {
 Earth: {
  question:'Why do seasons happen?', experiment:'seasons', line:'lab_earth',
  intro:'A blue home with a tilted axis. One side faces daylight; the other turns into night.',
  features:[['overview','Our home'],['day','Day & night'],['moon','Visit the Moon']],
  deeper:'Earth’s axis is tilted about 23.4° from the perpendicular to its orbital plane. As Earth goes around the Sun, the axis keeps nearly the same direction in space. A hemisphere tilted toward the Sun gets higher midday sunlight and longer days. Summer in the north coincides with winter in the south: distance from the Sun cannot explain that opposition.',
  source:'earth',
 },
 Moon: {
  question:'Explore the phases', experiment:'phases', line:'lab_moon',
  intro:'One rocky companion, many changing shapes. The Moon reflects sunlight; it does not make its own.',
  features:[['overview','Rocky surface'],['phases','Phases from Earth']],
  deeper:'The Sun normally lights half the Moon. The fraction of that sunlit half visible from Earth changes as the Moon orbits. A phase cycle takes about 29.5 days; a trip around Earth relative to distant stars takes about 27.3 days. Earth moves around the Sun too, so the Moon needs extra time to line up with the Sun again. The far side also has day and night.',
  source:'phases',
 },
};
export function genericInsight(body) {
 const {name,rot,period}=body;
 return {intro:body.blurb,question:name==='Sun'?'See the Solar System':'See its place in the Solar System',experiment:null,line:null,
  features:name==='Sun'?[['overview','Our star'],['orbit','Solar System']]:[['overview','Look closer'],['orbit','Its orbit']],
  deeper:name==='Sun'?'The Sun is a star, not a planet. Its visible surface rotates at different rates at different latitudes. The time in the fact card is a representative rotation, not a solid-body day.':`One spin on ${name} takes about ${Math.abs(rot).toLocaleString('en-IN')} Earth hours. Its trip around the Sun takes about ${period.toLocaleString('en-IN')} Earth days. Spin and orbit are different motions; a sunrise-to-sunrise solar day can differ from a rotation measured against distant stars.`,
  source:null};
}

// One striking, previously sourced fact per world for the collapsed card (see docs/sources.md and docs/lab-science.md).
export const STRIKING = {
 Sun:'About 1.3 million Earths could fit inside the Sun.',
 Mercury:'A year on Mercury lasts just 88 Earth days.',
 Venus:'A day on Venus is longer than its year.',
 Earth:'Earth’s axis is tilted about 23.4°. That tilt gives us seasons.',
 Moon:'The same side of the Moon always faces Earth.',
 Mars:'Mars looks red because iron in its rocks and dust has rusted.',
 Jupiter:'About 1,300 Earths could fit inside Jupiter.',
 Saturn:'Saturn’s rings are made of countless chunks of ice and rock.',
 Uranus:'Uranus spins tipped over on its side, at about 98°.',
 Neptune:'One trip around the Sun takes Neptune about 165 Earth years.',
};
// Known moons per planet, kept deliberately loose because the counts keep rising (Jupiter 101 and
// Saturn at least 285 per Live Science / EarthSky, March 2026; other sources differ). Uranus: 29 officially
// recognized as of August 2026 (NASA Science, Uranus moons, read 10 Nov 2026; was 28).
export const MOON_COUNT = { Mercury:'no moons', Venus:'no moons', Earth:'one Moon', Mars:'two small moons', Jupiter:'more than 100 known moons', Saturn:'more than 280 known moons', Uranus:'29 known moons', Neptune:'16 known moons', Pluto:'five known moons', Eris:'one known moon, Dysnomia', Haumea:'two known moons and a ring', Makemake:'one known moon', Ceres:'no moons', Vesta:'no moons', Pallas:'no moons' };
// NASA NSSDCA satellite fact sheets used for moon cards (orbits) — read 9 November 2026.
export const SAT_SOURCES = { Mars:'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html', Jupiter:'https://nssdc.gsfc.nasa.gov/planetary/factsheet/joviansatfact.html', Saturn:'https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturniansatfact.html', Uranus:'https://nssdc.gsfc.nasa.gov/planetary/factsheet/uraniansatfact.html', Neptune:'https://nssdc.gsfc.nasa.gov/planetary/factsheet/neptuniansatfact.html', Pluto:'https://nssdc.gsfc.nasa.gov/planetary/factsheet/plutofact.html' };
export const JPL_RADII = 'https://ssd.jpl.nasa.gov/sats/phys_par/';
// Dwarf planets and asteroids: where their size and orbit facts come from (read 9 November 2026).
export const DWARF_SOURCES = {
 Ceres:['NASA · asteroid fact sheet','https://nssdc.gsfc.nasa.gov/planetary/factsheet/asteroidfact.html'], Vesta:['NASA · asteroid fact sheet','https://nssdc.gsfc.nasa.gov/planetary/factsheet/asteroidfact.html'], Pallas:['NASA · asteroid fact sheet','https://nssdc.gsfc.nasa.gov/planetary/factsheet/asteroidfact.html'],
 Pluto:['NASA · Pluto fact sheet','https://nssdc.gsfc.nasa.gov/planetary/factsheet/plutofact.html'], Eris:['NASA · Eris','https://science.nasa.gov/dwarf-planets/eris/'], Haumea:['NASA · Haumea','https://science.nasa.gov/dwarf-planets/haumea/'], Makemake:['NASA · Makemake','https://science.nasa.gov/dwarf-planets/makemake/'],
};
export const SBDB = name => `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(name)}`;

// Dwarf-planet and major-moon cards: built from data.js values (their sources: DWARF_SOURCES, SAT_SOURCES, JPL_RADII).
export function dwarfInsight(d){
 const belt=d.a<5,years=d.period/365.25,km=d.km.toLocaleString('en-IN');
 return {intro:`${d.name} is ${d.kind==='Asteroid'?'one of the largest asteroids':'a dwarf planet'}, about ${km} km across, in the ${belt?'asteroid belt between Mars and Jupiter':'Kuiper Belt beyond Neptune'}.`,
  question:'See its orbit',experiment:null,line:null,features:[['overview','Look closer'],['orbit','Its orbit']],
  deeper:`${d.name} takes about ${years<10?years.toFixed(1):Math.round(years)} years to go round the Sun, at an average of ${d.a} AU. Its orbit is tilted ${d.i}° to Earth’s and ${d.e>0.15?'noticeably stretched':'nearly round'} (eccentricity ${d.e}).${d.name==='Pluto'?' At its closest it comes inside Neptune’s orbit, but the two never meet: Pluto goes round twice for every three Neptune orbits.':''}${belt?' The asteroid belt holds over a million rocks larger than 1 km, yet together they weigh less than our Moon. They are so far apart that spacecraft fly through without trying to dodge.':' The Kuiper Belt is a wide ring of icy worlds left over from when the planets formed.'}`,
  source:null,dwarf:true};
}
export function moonInsight(d){
 const km=Math.round(d.km).toLocaleString('en-IN');
 return {intro:`${d.name} is one of ${d.parent}’s moons, about ${km} km across.`,question:`See all of ${d.parent}’s big moons`,experiment:null,line:null,
  features:[['overview','Look closer'],['parent',`Back to ${d.parent}`]],
  deeper:`${d.name} is about ${km} km across and orbits ${d.parent} once every ${d.period<2?(d.period*24).toFixed(1)+' hours':d.period.toFixed(d.period<10?2:1)+' days'}, at an average of ${d.aKm.toLocaleString('en-IN')} km. Like our Moon, it keeps the same face toward its planet.${d.incl?' Its orbit is tilted past upright, so it travels the opposite way to its planet’s spin.':''}`,
  source:null,moon:true};
}
