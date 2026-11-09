// Nearby star systems: every star and brown dwarf within 16 light-years, plus TRAPPIST-1 (40.7 ly)
// for its famous planets. Names, spectral types, distances (ly), positions (RA/Dec, degrees, of each
// system's primary) and visual magnitudes ("J" = infrared-only, null here) from Wikipedia's "List of
// nearest stars" table, which compiles RECONS / Gaia / SIMBAD values; read 9 Nov 2026. TRAPPIST-1:
// NASA Exoplanet Archive overview (RA/Dec) and its 12.47 pc distance. See docs/sources.md.
export const SYSTEMS = [{"name":"Alpha Centauri","stars":[{"name":"Proxima Centauri","type":"M5.5Ve","mag":11.09},{"name":"Rigil Kentaurus","type":"G2V","mag":4.38},{"name":"Toliman","type":"K1V","mag":5.71}],"ly":4.2465,"ra":217.42917,"dec":-62.67944},{"name":"Barnard's Star","stars":[{"name":"Barnard's Star","type":"M4.0Ve","mag":9.53}],"ly":5.9629,"ra":269.45208,"dec":4.69333},{"name":"Luhman 16","stars":[{"name":"Luhman 16 A","type":"L8","mag":null},{"name":"Luhman 16 B","type":"T1","mag":null}],"ly":6.5102,"ra":162.32875,"dec":-53.31944},{"name":"WISE 0855−0714","stars":[{"name":"WISE 0855−0714","type":"Y4","mag":null}],"ly":7.43,"ra":133.795,"dec":-7.24528},{"name":"Wolf 359","stars":[{"name":"Wolf 359","type":"M6.0V","mag":13.44}],"ly":7.856,"ra":164.12167,"dec":7.01472},{"name":"Lalande 21185","stars":[{"name":"Lalande 21185","type":"M2.0V","mag":7.47}],"ly":8.3044,"ra":165.83417,"dec":35.97},{"name":"Sirius","stars":[{"name":"Sirius A","type":"A1V","mag":-1.46},{"name":"Sirius B","type":"DA2","mag":8.44}],"ly":8.7094,"ra":101.28708,"dec":-16.71611},{"name":"Gliese 65","stars":[{"name":"BL Ceti","type":"M5.5Ve","mag":12.54},{"name":"UV Ceti","type":"M6.0Ve","mag":12.99}],"ly":8.77,"ra":24.75542,"dec":-17.95028},{"name":"Ross 154","stars":[{"name":"Ross 154","type":"M3.5Ve","mag":10.43}],"ly":9.7063,"ra":282.45583,"dec":-23.83611},{"name":"Ross 248","stars":[{"name":"Ross 248","type":"M5.5Ve","mag":12.29}],"ly":10.3057,"ra":355.47792,"dec":44.175},{"name":"Epsilon Eridani","stars":[{"name":"Epsilon Eridani","type":"K2V","mag":3.73}],"ly":10.4749,"ra":53.2325,"dec":-9.45833},{"name":"Lacaille 9352","stars":[{"name":"Lacaille 9352","type":"M0.5V","mag":7.34}],"ly":10.7241,"ra":346.46667,"dec":-35.85306},{"name":"Ross 128","stars":[{"name":"Ross 128","type":"M4.0Vn","mag":11.13}],"ly":11.0074,"ra":176.935,"dec":0.80444},{"name":"EZ Aquarii","stars":[{"name":"EZ Aquarii A","type":"M5.0Ve","mag":13.33},{"name":"EZ Aquarii B","type":"M?","mag":13.27},{"name":"EZ Aquarii C","type":"M?","mag":14.03}],"ly":11.109,"ra":339.63917,"dec":-15.29917},{"name":"61 Cygni","stars":[{"name":"61 Cygni A","type":"K5.0V","mag":5.21},{"name":"61 Cygni B","type":"K7.0V","mag":6.03}],"ly":11.4039,"ra":316.72458,"dec":38.74944},{"name":"Procyon","stars":[{"name":"Procyon A","type":"F5IV–V","mag":0.38},{"name":"Procyon B","type":"DQZ","mag":10.7}],"ly":11.463,"ra":114.82542,"dec":5.225},{"name":"Struve 2398","stars":[{"name":"Struve 2398 A","type":"M3.0V","mag":8.9},{"name":"Struve 2398 B","type":"M3.5V","mag":9.69}],"ly":11.4908,"ra":280.69458,"dec":59.63028},{"name":"Groombridge 34","stars":[{"name":"Groombridge 34 A","type":"M1.5V","mag":8.08},{"name":"Groombridge 34 B","type":"M3.5V","mag":11.06}],"ly":11.6191,"ra":4.59542,"dec":44.02306},{"name":"DX Cancri","stars":[{"name":"DX Cancri","type":"M6.5Ve","mag":14.78}],"ly":11.6797,"ra":127.45625,"dec":26.77694},{"name":"Epsilon Indi","stars":[{"name":"Epsilon Indi A","type":"K5Ve","mag":4.69},{"name":"Epsilon Indi Ba","type":"T1.0V","mag":null},{"name":"Epsilon Indi Bb","type":"T6.0V","mag":null}],"ly":11.867,"ra":330.84042,"dec":-56.78611},{"name":"Tau Ceti","stars":[{"name":"Tau Ceti","type":"G8.5Vp","mag":3.49}],"ly":11.9118,"ra":26.01708,"dec":-15.9375},{"name":"GJ 1061","stars":[{"name":"GJ 1061","type":"M5.5V","mag":13.09}],"ly":11.9839,"ra":53.99875,"dec":-44.5125},{"name":"YZ Ceti","stars":[{"name":"YZ Ceti","type":"M4.5V","mag":12.02}],"ly":12.1222,"ra":18.1275,"dec":-16.99889},{"name":"Luyten's Star","stars":[{"name":"Luyten's Star","type":"M3.5Vn","mag":9.86}],"ly":12.3485,"ra":111.85208,"dec":5.22583},{"name":"Teegarden's Star","stars":[{"name":"Teegarden's Star","type":"M6.5V","mag":15.14}],"ly":12.497,"ra":43.25375,"dec":16.88139},{"name":"Kapteyn's Star","stars":[{"name":"Kapteyn's Star","type":"M1.5VI","mag":8.84}],"ly":12.8308,"ra":77.91917,"dec":-45.01833},{"name":"Lacaille 8760","stars":[{"name":"Lacaille 8760","type":"M0.0V","mag":6.67}],"ly":12.9472,"ra":319.31375,"dec":-38.8675},{"name":"SCR 1845−6357","stars":[{"name":"SCR 1845−6357 A","type":"M8.5V","mag":17.39},{"name":"SCR 1845−6357 B","type":"T6","mag":null}],"ly":13.0638,"ra":281.27208,"dec":-63.96333},{"name":"Kruger 60","stars":[{"name":"Kruger 60 A","type":"M3.0V","mag":9.79},{"name":"Kruger 60 B","type":"M4.0V","mag":11.41}],"ly":13.0724,"ra":336.99792,"dec":57.69583},{"name":"DENIS J1048−3956","stars":[{"name":"DENIS J1048−3956","type":"M8.5V","mag":17.39}],"ly":13.1932,"ra":162.06125,"dec":-39.935},{"name":"Ross 614","stars":[{"name":"Ross 614 A","type":"M4.5V","mag":11.15},{"name":"Ross 614 B","type":"M5.5V","mag":14.23}],"ly":13.363,"ra":97.3475,"dec":-2.81389},{"name":"UGPS J0722−0540","stars":[{"name":"UGPS J0722−0540","type":"T9","mag":null}],"ly":13.43,"ra":110.61375,"dec":-5.675},{"name":"Wolf 1061","stars":[{"name":"Wolf 1061","type":"M3.0V","mag":10.07}],"ly":14.05,"ra":247.57542,"dec":-12.6625},{"name":"Van Maanen's Star","stars":[{"name":"Van Maanen's Star","type":"DZ7","mag":12.38}],"ly":14.0718,"ra":12.29125,"dec":5.38861},{"name":"Gliese 1","stars":[{"name":"Gliese 1","type":"M1.5V","mag":8.55}],"ly":14.1747,"ra":1.35167,"dec":-37.3575},{"name":"TZ Arietis","stars":[{"name":"TZ Arietis","type":"M4.5V","mag":12.27}],"ly":14.578,"ra":30.055,"dec":13.05222},{"name":"Wolf 424","stars":[{"name":"Wolf 424 A","type":"M5.5Ve","mag":13.18},{"name":"Wolf 424 B","type":"M7Ve","mag":13.17}],"ly":14.595,"ra":188.32167,"dec":9.02083},{"name":"Gliese 687","stars":[{"name":"Gliese 687","type":"M3.0V","mag":9.17}],"ly":14.8395,"ra":264.10792,"dec":68.33917},{"name":"Gliese 674","stars":[{"name":"Gliese 674","type":"M3.0V","mag":9.38}],"ly":14.8492,"ra":262.16625,"dec":-46.89528},{"name":"LHS 292","stars":[{"name":"LHS 292","type":"M6.5V","mag":15.6}],"ly":14.8706,"ra":162.0525,"dec":-11.33722},{"name":"Gliese 440","stars":[{"name":"Gliese 440","type":"DQ6","mag":11.5}],"ly":15.1226,"ra":176.42875,"dec":-64.84139},{"name":"GJ 1245","stars":[{"name":"GJ 1245 A","type":"M5.5V","mag":13.46},{"name":"GJ 1245 B","type":"M6.0V","mag":14.01},{"name":"GJ 1245 C","type":"M5.5","mag":16.75}],"ly":15.2001,"ra":298.47583,"dec":44.41528},{"name":"WISE 1741+2553","stars":[{"name":"WISE 1741+2553","type":"T9","mag":null}],"ly":15.22,"ra":265.35083,"dec":25.88861},{"name":"Gliese 876","stars":[{"name":"Gliese 876","type":"M3.5V","mag":10.17}],"ly":15.2382,"ra":343.31958,"dec":-14.26361},{"name":"WISE 1639−6847","stars":[{"name":"WISE 1639−6847","type":"Y0.5","mag":null}],"ly":15.336,"ra":249.92042,"dec":-68.79611},{"name":"LHS 288","stars":[{"name":"LHS 288","type":"M5.5V","mag":13.9}],"ly":15.7586,"ra":161.08833,"dec":-61.21},{"name":"GJ 1002","stars":[{"name":"GJ 1002","type":"M5.5V","mag":13.76}],"ly":15.806,"ra":1.6825,"dec":-7.53944},{"name":"DENIS 0255−4700","stars":[{"name":"DENIS 0255−4700","type":"L7.5V","mag":null}],"ly":15.877,"ra":43.76542,"dec":-47.01444},{"name":"Groombridge 1618","stars":[{"name":"Groombridge 1618","type":"K7.0V","mag":6.59}],"ly":15.8857,"ra":152.84208,"dec":49.45417},{"name":"Gliese 412","stars":[{"name":"Gliese 412 A","type":"M1.0V","mag":8.77},{"name":"Gliese 412 B","type":"M5.5V","mag":14.48}],"ly":15.9969,"ra":166.36917,"dec":43.52667},{"name":"TRAPPIST-1","ly":40.66,"ra":346.62637,"dec":-5.04346,"stars":[{"name":"TRAPPIST-1","type":"M8V","mag":18.8}],"far":true}];

// Confirmed planets of these systems (NASA Exoplanet Archive, "ps" default parameter sets, read
// 9 Nov 2026): name, mass in Earth masses (usually a minimum mass), orbit size in AU, orbit period in
// days, and radius in Earth radii where it has been measured (only TRAPPIST-1's planets transit).
// Host luminosity: log10(L/L☉) from the same archive where given.
export const PLANET_SYSTEMS = {
 'Alpha Centauri': { host:'Proxima Centauri', logL:-2.82102, planets:[['Proxima d',0.26,0.02881,5.12338],['Proxima b',1.055,0.04848,11.18465]] },
 "Barnard's Star": { logL:-2.44977, planets:[['Barnard d',0.263,0.0188,2.3402],['Barnard b',0.299,0.0229,3.1542],['Barnard c',0.335,0.0274,4.1244],['Barnard e',0.193,0.0381,6.7392]] },
 'Epsilon Eridani': { planets:[['Epsilon Eridani b',317.828,3.53,2680]] },
 'Ross 128': { logL:-2.44129, planets:[['Ross 128 b',1.40,0.0496,9.8658]] },
 'Lacaille 9352': { logL:-1.43415, planets:[['Lacaille 9352 e',1.46,0.0417,4.4249],['Lacaille 9352 b',3.90,0.0683,9.2619],['Lacaille 9352 c',6.50,0.121,21.784],['Lacaille 9352 d',6.10,0.212,50.77]] },
 'Groombridge 34': { host:'Groombridge 34 A', logL:-1.655, planets:[['Groombridge 34 A b',3.03,0.072,11.4407],['Groombridge 34 A c',36.0,5.4,7600]] },
 'Epsilon Indi': { host:'Epsilon Indi A', planets:[['Epsilon Indi A b',2065.88,15.76,25450]] },
 'Tau Ceti': { planets:[['Tau Ceti g',1.75,0.133,20.0],['Tau Ceti h',1.83,0.243,49.41],['Tau Ceti f',3.93,1.334,636.13]] },
 'YZ Ceti': { logL:-2.65857, planets:[['YZ Ceti b',0.70,0.01634,2.02087],['YZ Ceti c',1.14,0.02156,3.05989],['YZ Ceti d',1.09,0.02851,4.65626]] },
 'GJ 1061': { logL:-2.76955, planets:[['GJ 1061 b',1.11,0.021,3.2073],['GJ 1061 c',1.81,0.0342,6.6821],['GJ 1061 d',1.67,0.054,13.066]] },
 "Teegarden's Star": { logL:-3.14146, planets:[['Teegarden’s Star b',1.16,0.0259,4.90634],['Teegarden’s Star c',1.05,0.0455,11.416],['Teegarden’s Star d',0.82,0.0791,26.13]] },
 "Kapteyn's Star": { planets:[['Kapteyn c',7.0,0.311,121.54]] },
 'Wolf 1061': { logL:-1.9914, planets:[['Wolf 1061 b',1.91,0.0375,4.8869],['Wolf 1061 c',3.41,0.089,17.8719],['Wolf 1061 d',7.70,0.47,217.21]] },
 'Gliese 687': { planets:[['Gliese 687 b',17.2,0.163,38.142],['Gliese 687 c',16.0,1.165,727.562]] },
 'Gliese 674': { logL:-1.796, planets:[['Gliese 674 b',11.09,0.039,4.6938]] },
 'Gliese 876': { logL:-1.90658, planets:[['Gliese 876 d',6.83,0.0208,1.93778],['Gliese 876 c',226.98,0.1296,30.0881],['Gliese 876 b',723.22,0.2083,61.1166],['Gliese 876 e',14.6,0.3343,124.26]] },
 'GJ 1002': { logL:-2.85201, planets:[['GJ 1002 b',1.08,0.0457,10.3465],['GJ 1002 c',1.36,0.0738,21.202]] },
 'Struve 2398': { host:'Struve 2398 A', logL:-1.809, planets:[['Struve 2398 A b',2.78,0.068,11.2201]] },
 'TZ Arietis': { logL:-2.59517, planets:[['TZ Arietis c',66.74,0.88,771.36]] },
 // TRAPPIST-1: radii (Earth = 1) from the transit discovery papers (Gillon et al. 2016, 2017), orbit
 // sizes from Agol et al. 2021, via the NASA Exoplanet Archive overview; no masses used.
 'TRAPPIST-1': { logL:-3.26, transits:true, planets:[['TRAPPIST-1 b',null,0.01154,1.51,1.12],['TRAPPIST-1 c',null,0.01580,2.42,1.10],['TRAPPIST-1 d',null,0.02227,4.05,0.79],['TRAPPIST-1 e',null,0.02925,6.10,0.92],['TRAPPIST-1 f',null,0.03849,9.21,1.05],['TRAPPIST-1 g',null,0.04683,12.35,1.13],['TRAPPIST-1 h',null,0.06189,18.77,0.76]] },
};

// One well-established fact for the best-known systems.
export const STAR_FACTS = {
 'Alpha Centauri':'The nearest star system: three stars. Proxima Centauri is the closest star to the Sun.',
 "Barnard's Star":'It moves across our sky faster than any other star. Four small planets were found around it in 2024–25.',
 'Sirius':'The brightest star in our night sky. Its faint companion is a white dwarf, the core of a dead star.',
 'Epsilon Eridani':'A young star, ringed by dusty belts, with a giant planet.',
 'Procyon':'One of the brightest stars in our sky, with a white-dwarf companion.',
 'Tau Ceti':'The nearest single star much like our Sun.',
 'Luhman 16':'The nearest brown dwarfs, two “failed stars” found only in 2013.',
 'WISE 0855−0714':'The coldest brown dwarf known: colder than the freezing point of water.',
 '61 Cygni':'The first star whose distance was ever measured, in 1838.',
 "Kapteyn's Star":'An ancient star from the Milky Way’s halo, just passing through our neighbourhood.',
 "Van Maanen's Star":'The nearest lone white dwarf: the leftover core of a star like the Sun.',
 'TRAPPIST-1':'Seven Earth-sized planets, all closer to their star than Mercury is to the Sun. Three are in the habitable zone.',
 'Lalande 21185':'One of the brightest red dwarfs in our sky, though still too faint to see without binoculars.',
 'Wolf 359':'One of the smallest and faintest stars near us.',
};

// ---- Helpers (pure) ----
const rad = d => d * Math.PI / 180, OBLIQUITY = rad(23.4393);
// RA/Dec (degrees) + distance → scene coordinates in light-years, in the same ecliptic frame as the
// Solar System scene (x, ecliptic north = y, z = −ecliptic Y).
export function starPosition(raDeg, decDeg, ly) {
  const a = rad(raDeg), d = rad(decDeg), x = Math.cos(d) * Math.cos(a), y = Math.cos(d) * Math.sin(a), z = Math.sin(d);
  const Y = y * Math.cos(OBLIQUITY) + z * Math.sin(OBLIQUITY), Z = -y * Math.sin(OBLIQUITY) + z * Math.cos(OBLIQUITY);
  return [x * ly, Z * ly, -Y * ly];
}
// Visual luminosity (Sun = 1) from apparent magnitude and distance.
export const visualLuminosity = (mag, ly) => mag == null ? null : 10 ** (-0.4 * (mag - 5 * Math.log10(ly / 3.26156 / 10) - 4.83));
// Rough temperature and kind from the spectral type (typical values for each class).
const TEMP = { O:35000, B:15000, A:9500, F:6600, G:5700, K:4600, M:3300, L:1700, T:1000, Y:400 };
export function starKind(type) {
  const t = type.trim(), c = t[0];
  if (c === 'D') return { kind:'White dwarf', blurb:'the hot leftover core of a dead star', temp: t[1] === 'A' ? 20000 : 7000 };
  if ('LTY'.includes(c)) return { kind:'Brown dwarf', blurb:'a “failed star” too small to shine by fusion', temp: TEMP[c] };
  // Typical effective temperature at subclass 0 and 9 of each class (main-sequence values).
  const RANGE = { O:[40000,31000], B:[30000,10500], A:[9700,7400], F:[7200,6000], G:[5940,5300], K:[5270,3940], M:[3850,2400] }[c];
  const sub = Math.min(9, parseFloat(t.slice(1)) || 0), temp = RANGE ? RANGE[0] + (RANGE[1] - RANGE[0]) * sub / 9 : TEMP[c];
  const kind = c === 'M' ? 'Red dwarf' : c === 'K' ? 'Orange dwarf' : c === 'G' ? 'Yellow dwarf, like the Sun' : c === 'F' ? 'Yellow-white star' : 'White star';
  return { kind, blurb: kind.toLowerCase(), temp: Math.round(temp / 100) * 100 };
}
// Blackbody-ish display colour for a temperature (enough to tell red, orange, yellow, white, blue).
export function starColor(temp) {
  const stops = [[400,[0.45,0.1,0.15]],[1000,[0.8,0.25,0.15]],[2500,[1,0.55,0.35]],[3300,[1,0.7,0.5]],[4600,[1,0.83,0.65]],[5700,[1,0.95,0.86]],[6600,[1,0.98,0.96]],[9500,[0.8,0.87,1]],[20000,[0.68,0.78,1]]];
  for (let i = 1; i < stops.length; i++) if (temp <= stops[i][0]) { const [t0, c0] = stops[i - 1], [t1, c1] = stops[i], f = (temp - t0) / (t1 - t0); return c0.map((v, k) => v + (c1[k] - v) * f); }
  return stops.at(-1)[1];
}
// Habitable zone (where an Earth-like planet could keep liquid water): the "conservative" zone of
// Kopparapu et al. 2014 (ApJL 787, L29), from the runaway-greenhouse and maximum-greenhouse limits for
// an Earth-mass planet. The flux limits depend on the star's temperature (fit valid 2,600–7,200 K):
// around the Sun 0.95–1.68 AU.
const HZ_FIT = { inner: [1.107, 1.332e-4, 1.58e-8, -8.308e-12, -1.931e-15], outer: [0.356, 6.171e-5, 1.698e-9, -3.198e-12, -5.575e-16] };
const seff = (c, teff) => { const t = Math.max(2600, Math.min(7200, teff)) - 5780; return c[0] + c[1] * t + c[2] * t * t + c[3] * t ** 3 + c[4] * t ** 4; };
export const habitableZone = (logL, teff = 5780) => { const L = 10 ** logL; return [Math.sqrt(L / seff(HZ_FIT.inner, teff)), Math.sqrt(L / seff(HZ_FIT.outer, teff))]; };
// Size estimate from mass (Earth units) for planets never seen crossing their star: rocky below
// 2 Earth masses, Neptune-like to 130, Jupiter-sized above. Indicative only.
export const sizeFromMass = m => m < 2 ? m ** 0.28 : Math.min(11.2, 0.808 * m ** 0.59);
export const lightLeftYear = (ly, now = 2026) => Math.round(now - ly);

// One entry per system: its primary star decides colour and brightness; companions are listed.
export function neighbourEntry(s) {
  const primary = s.stars[0], k = starKind(primary.type), Lv = visualLuminosity(primary.mag, s.ly);
  return { ...s, primary, kind: k.kind, kindBlurb: k.blurb, temp: k.temp, Lv, pos: starPosition(s.ra, s.dec, s.ly), planets: PLANET_SYSTEMS[s.name] || null };
}
export const NEIGHBOURS = SYSTEMS.map(neighbourEntry);
export const SUN_ENTRY = { name: 'Sun', ly: 0, kind: 'Yellow dwarf', kindBlurb: 'our own star', temp: 5800, Lv: 1, pos: [0, 0, 0], stars: [{ name: 'Sun', type: 'G2V' }], primary: { name: 'Sun', type: 'G2V', mag: -26.74 }, sun: true };
// Glow size in pixels from visual luminosity (log scale): the Sun 14 px, Sirius ~18, faint red dwarfs ~5.
export const starPixels = e => e.kind === 'Brown dwarf' ? 3.5 : Math.max(4, Math.min(24, 14 + 3.2 * Math.log10(e.Lv ?? 1e-4)));
// Everything the planetary-system view and card need, without any drawing.
export function systemSummary(entry) {
  const ps = entry.planets; if (!ps) return null;
  const hz = ps.logL != null ? habitableZone(ps.logL, entry.temp) : null, aMax = Math.max(...ps.planets.map(p => p[2])), scale = 10 / aMax;
  const planets = ps.planets.map(([name, mass, a, period, radius]) => ({ name, mass, a, period, r: radius ?? sizeFromMass(mass), measured: radius != null, inHZ: !!hz && a >= hz[0] && a <= hz[1] }));
  // Our own planets' orbits for comparison, only when they fit sensibly in the same view.
  const compare = [['Mercury’s orbit', 0.387], ['Earth’s orbit', 1]].filter(([, au]) => au * scale <= 40 && au * scale >= 0.6).map(([label, au]) => ({ label, au }));
  return { planets, hz, aMax, compare };
}
