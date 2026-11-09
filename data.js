// Facts checked 2026-11-08 against NASA NSSDCA fact sheets and NASA Science moon pages; see docs/sources.md.
// Scene sizes/distances are computed at the bottom from km and AU (see docs/sources.md).
export const SUN = { name:'Sun', color:0xffcc55, km:1391400,
  blurb:'Our star, a G2 V main-sequence star. About 1.3 million Earths would fit inside it.', rot:609.12,
  facts:[['Diameter','1,391,400 km'],['Rotation','25.4 days (at 16\u00b0 latitude)'],['Surface temp.','~5,500 \u00b0C (5,772 K)']] };
export const PLANETS = [
 {name:'Mercury',color:0xa8a29a,km:4881,au:0.387,period:87.97,rot:1407.6,tilt:0.03,
  blurb:'Smallest planet and closest to the Sun.',facts:[['Diameter','4,881 km'],['Distance from Sun','0.39 AU'],['Orbital period','88 days'],['Day length','176 Earth days (one spin: 58.6 days)'],['Moons','0']]},
 {name:'Venus',color:0xe8c58a,km:12104,au:0.723,period:224.7,rot:-5832.5,tilt:177.4,
  blurb:'Hottest planet, wrapped in thick CO\u2082 clouds; spins backwards.',facts:[['Diameter','12,104 km'],['Distance from Sun','0.72 AU'],['Orbital period','224.7 days'],['Day length','117 Earth days (spins backwards; one spin: 243 days)'],['Moons','0']]},
 {name:'Earth',color:0x3f7fe0,rim:0x6fb6ff,km:12756,au:1.0,period:365.26,rot:23.93,tilt:23.4,moon:true,
  blurb:'The only world known to host life.',facts:[['Diameter','12,756 km'],['Distance from Sun','1.00 AU'],['Orbital period','365.26 days'],['Day length','24 hours'],['Moons','1']]},
 {name:'Mars',color:0xc1502e,km:6792,au:1.524,period:686.98,rot:24.62,tilt:25.2,
  blurb:'The cold, dusty red planet with the tallest volcano known.',facts:[['Diameter','6,792 km'],['Distance from Sun','1.52 AU'],['Orbital period','687 days'],['Day length','24.7 hours'],['Moons','2']]},
 {name:'Jupiter',color:0xd8b48a,km:142984,au:5.204,period:4332.59,rot:9.93,tilt:3.1,bands:true,
  blurb:'Gas giant more than twice as massive as all other planets combined.',facts:[['Diameter','142,984 km'],['Distance from Sun','5.20 AU'],['Orbital period','11.86 years'],['Day length','9.9 hours'],['Moons','115 (NASA, 2026)']]},
 {name:'Saturn',color:0xe3cf9a,km:120536,au:9.573,period:10755.70,rot:10.7,tilt:26.7,rings:true,bands:true,
  blurb:'Gas giant famous for its bright ring system of ice and rock.',facts:[['Diameter','120,536 km'],['Distance from Sun','9.57 AU'],['Orbital period','29.4 years'],['Day length','10.7 hours'],['Moons','293 (NASA, Aug 2026)']]},
 {name:'Uranus',rings:true,color:0x9fd9e3,km:51118,au:19.165,period:30685.4,rot:-17.2,tilt:97.8,
  blurb:'Ice giant tipped on its side, rolling around the Sun.',facts:[['Diameter','51,118 km'],['Distance from Sun','19.2 AU'],['Orbital period','84 years'],['Day length','17.2 hours (retrograde)'],['Moons','28']]},
 {name:'Neptune',color:0x4166d8,km:49528,au:30.178,period:60189.0,rot:16.1,tilt:28.3,
  blurb:'Windiest planet; the farthest from the Sun.',facts:[['Diameter','49,528 km'],['Distance from Sun','30.18 AU'],['Orbital period','164.8 years'],['Day length','16.1 hours'],['Moons','16']]},
];
export const MOON = {name:'Moon',color:0xbcb9b2,km:3474.8,distKm:384400,period:27.32,rot:655.72,
 blurb:'Earth’s rocky companion, lit by the Sun.',
 facts:[['Mean diameter','3,475 km'],['Mean distance from Earth','384,400 km'],['Orbit (relative to stars)','27.3 days'],['Phase cycle','29.5 days']]};

// ---- Scale (documented in docs/sources.md) ----
// Sizes: radius = 0.5 * diameter_km / 12,756 (Earth radius = 0.5 units) -> true ratios between all planets.
// Sun: shown at 1/5 of its true size in the default view (SUN_SHRINK); true size in "Real scale".
// Distances (default): 25 * AU^0.6 units. Real scale: AU * 11,727 units (true ratio to the sizes).
export const E_R = 0.5, SUN_SHRINK = 5, DIST_K = 25, DIST_P = 0.6;
export const UNITS_PER_AU = E_R * 2 * 149597870.7 / 12756;
const rOf = km => E_R * km / 12756;
SUN.size = rOf(SUN.km) / SUN_SHRINK; SUN.realSize = rOf(SUN.km);
for (const d of PLANETS) { d.size = rOf(d.km); d.dist = DIST_K * d.au ** DIST_P; d.realDist = d.au * UNITS_PER_AU; }
MOON.size = rOf(MOON.km); MOON.dist = 1.5; MOON.realDist = 2 * rOf(MOON.distKm); // Moon distance shrunk to 1.5 units by default

// ---- Major moons (besides Earth's Moon) ----
// Orbits: semi-major axis and sidereal period from NASA NSSDCA satellite fact sheets (Mars fact sheet
// 2025; Jovian Dec 2023; Saturnian Jul 2025; Uranian Mar 2023; Neptunian Mar 2024). Mean radii from
// JPL SSD "Planetary Satellite Physical Parameters". Read 9 Nov 2026; see docs/sources.md.
// incl: orbit inclination to the planet's equator, only where it matters for the picture (Triton is
// retrograde). Colours are illustrative, not measured albedo maps.
export const MOONS = [
 { name:'Phobos', parent:'Mars', r:11.08, aKm:9378, period:0.31891, color:0x7a6f63, fact:'Phobos goes round Mars three times a day, faster than Mars spins.' },
 { name:'Deimos', parent:'Mars', r:6.2, aKm:23459, period:1.26244, color:0x9a8f82, fact:'Deimos is only about 12 km across, smaller than many cities.' },
 { name:'Io', parent:'Jupiter', r:1821.49, aKm:421800, period:1.769138, color:0xd8c160, fact:'Io is the most volcanically active world known.' },
 { name:'Europa', parent:'Jupiter', r:1560.80, aKm:671100, period:3.551181, color:0xd9cfbd, fact:'Under Europa’s ice is a salty ocean with more water than all of Earth’s oceans.' },
 { name:'Ganymede', parent:'Jupiter', r:2631.20, aKm:1070400, period:7.154553, color:0x9d9284, fact:'Ganymede is the biggest moon in the Solar System, wider than Mercury.' },
 { name:'Callisto', parent:'Jupiter', r:2410.30, aKm:1882700, period:16.689017, color:0x6f6559, fact:'Callisto is one of the most heavily cratered worlds known.' },
 { name:'Mimas', parent:'Saturn', r:198.20, aKm:185520, period:0.9424218, color:0xbfbcb5, fact:'One huge crater, Herschel, covers about a third of Mimas’s width.' },
 { name:'Enceladus', parent:'Saturn', r:252.10, aKm:238020, period:1.370218, color:0xf2f5f8, fact:'Enceladus sprays jets of water ice from an ocean under its south pole.' },
 { name:'Tethys', parent:'Saturn', r:531.10, aKm:294660, period:1.887802, color:0xdcd8d0, fact:'Tethys is made almost entirely of water ice.' },
 { name:'Dione', parent:'Saturn', r:561.40, aKm:377400, period:2.736915, color:0xcac5bc, fact:'Bright ice cliffs streak across Dione’s trailing side.' },
 { name:'Rhea', parent:'Saturn', r:763.50, aKm:527040, period:4.5175, color:0xbcb7ae, fact:'Rhea is Saturn’s second-largest moon, a cold ball of ice and rock.' },
 { name:'Titan', parent:'Saturn', r:2574.76, aKm:1221870, period:15.945421, color:0xd7a14a, plain:true, fact:'Titan has a thick atmosphere and lakes of liquid methane.' },
 { name:'Iapetus', parent:'Saturn', r:734.30, aKm:3560850, period:79.330183, color:0x8f8678, fact:'One side of Iapetus is dark as coal; the other is bright as snow.' },
 { name:'Miranda', parent:'Uranus', r:235.8, aKm:129900, period:1.413479, color:0xa9a7a3, fact:'Miranda has cliffs about 20 km high, among the tallest known.' },
 { name:'Ariel', parent:'Uranus', r:578.9, aKm:190900, period:2.520379, color:0xb6b3ad, fact:'Ariel is the brightest of Uranus’s big moons, its surface crossed by valleys.' },
 { name:'Umbriel', parent:'Uranus', r:584.7, aKm:266000, period:4.144176, color:0x6e6b67, fact:'Umbriel is the darkest of Uranus’s big moons.' },
 { name:'Titania', parent:'Uranus', r:788.9, aKm:436300, period:8.705867, color:0xa69f97, fact:'Titania is Uranus’s largest moon.' },
 { name:'Oberon', parent:'Uranus', r:761.4, aKm:583500, period:13.463234, color:0x8d857c, fact:'Oberon is the outermost of Uranus’s five big moons, old and heavily cratered.' },
 { name:'Triton', parent:'Neptune', r:1353.4, aKm:354760, period:5.876854, incl:157.345, color:0xd9c8be, fact:'Triton orbits Neptune backwards, against the way Neptune spins.' },
];
// Scene geometry: true sizes. Orbits are compressed so each system fits between neighbouring planets:
// distance (in planet radii) = floor + 0.5 × ln(a / a_innermost), which keeps the order and relative
// spacing of a planet's moons. The floor keeps the innermost moon outside the drawn rings (Saturn's
// reach 2.27 radii, Uranus's 2.0). Real scale uses the true distance.
export const MOON_SPREAD = 0.5, MOON_FLOOR = { Mars:2.0, Jupiter:2.0, Saturn:2.45, Uranus:2.2, Neptune:3.0 };
const PLANET_KM = Object.fromEntries(PLANETS.map(p => [p.name, p.km]));
for (const m of MOONS) {
  m.km = 2 * m.r; m.size = rOf(m.km);
  const parent = PLANETS.find(p => p.name === m.parent);
  const inner = Math.min(...MOONS.filter(x => x.parent === m.parent).map(x => x.aKm));
  m.dist = parent.size * (MOON_FLOOR[m.parent] + MOON_SPREAD * Math.log(m.aKm / inner)); m.realDist = m.aKm / 12756;
  m.rot = m.period * 24; // tidally locked: one spin per orbit
  m.blurb = `A moon of ${m.parent}.`;
  m.facts = [['Mean diameter', `${Math.round(m.km).toLocaleString('en-IN')} km`], [`Mean distance from ${m.parent}`, `${m.aKm.toLocaleString('en-IN')} km`], ['One orbit', m.period < 2 ? `${(m.period * 24).toFixed(1)} hours` : `${m.period.toFixed(m.period < 10 ? 2 : 1)} days`]];
}
