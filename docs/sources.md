# Sources for info-panel facts

Accessed 8 November 2026. Values are rounded for display.

| Body | Source |
|---|---|
| Sun | https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html (diameter = 2 × volumetric mean radius 695,700 km; sidereal rotation 609.12 h at 16° latitude; effective temperature 5,772 K; volume 1,304,000 × Earth) |
| Mercury | https://nssdc.gsfc.nasa.gov/planetary/factsheet/mercuryfact.html |
| Venus | https://nssdc.gsfc.nasa.gov/planetary/factsheet/venusfact.html |
| Earth | https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html |
| Moon (orbit 27.32 d, used for animation) | https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html |
| Mars | https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html |
| Jupiter | https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html |
| Saturn | https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturnfact.html |
| Uranus | https://nssdc.gsfc.nasa.gov/planetary/factsheet/uranusfact.html |
| Neptune | https://nssdc.gsfc.nasa.gov/planetary/factsheet/neptunefact.html |
| Ratio overview / moon counts | https://nssdc.gsfc.nasa.gov/planetary/factsheet/planet_table_ratio.html |
| Jupiter moon count (115, IAU-recognised) | https://science.nasa.gov/jupiter/jupiter-moons/ |
| Saturn moon count (293 as of Aug 2026) | https://science.nasa.gov/saturn/moons/ |
| Neptune moon count (16) | https://science.nasa.gov/solar-system/moons/ |

Definitions used:
- Diameter = 2 × equatorial radius (planets).
- Distance from Sun = semimajor axis ÷ Earth's (149.598 million km), in AU.
- Orbital period = sidereal orbit period; animation speeds use these too.
- Day length = NSSDCA "Length of day" (solar day). Where that differs a lot from the spin (sidereal rotation), both are shown.
- Moon counts: NSSDCA sheets list Jupiter 95 / Saturn 274, which are older than the NASA Science pages; the app uses the newer NASA Science counts.

## Kid-mode facts
- "Mars looks red because of rusty dust": https://science.nasa.gov/mars/facts/ (accessed 8 Nov 2026) — "iron minerals in the Martian dirt oxidize, or rust, causing the surface to look red".
- "About 1,300 Earths could fit inside Jupiter": Jupiter fact sheet volume ratio 1,321.
- "About 1.3 million Earths could fit inside the Sun": Sun fact sheet volume ratio 1,304,000.
- "A day on Venus is longer than its year": length of day 2,802 h (≈117 d) vs orbit 224.7 d.
- "Uranus spins on its side": obliquity 97.77°.
- "Nearly 300 moons" (Saturn): 293, NASA Science, Aug 2026.
- All other kid facts restate values in the table above.

## Earth geography
- Coastlines: Natural Earth 1:110m Land (`ne_110m_land`), public domain — https://www.naturalearthdata.com/ (file fetched from https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson, 8 Nov 2026).
- Rasterised once to a 512×256 equirectangular 1-bit mask (`land.js`, ~22 KB); land colours, ice caps and clouds are stylised.

## Scale used in the app (`data.js`)
- Planet radius (scene units) = 0.5 × diameter_km ÷ 12,756 → planet sizes are in true proportion to each other.
- Sun: true-proportion radius would be 54.5 units; the default view shows it at **1/5** (10.9 units). "Real scale" shows the true size.
- Default orbit radius = 25 × AU^0.6 (Mercury 14.2, Earth 25, Jupiter 67.3, Neptune 192.9 units). True ratio Neptune/Mercury is 78:1; shown as 13.6:1.
- Real scale orbit radius = AU × 11,727 units (1 AU = 149,597,870.7 km at the same scale as the sizes) — sizes and distances both true.
- Moon: true size; its distance is shrunk to 1.5 units by default (true would be 30.1 units, used in Real scale).
- Kid mode doubles all planet sizes equally (ratios kept) and keeps the Sun at 1/5; small planets get glowing dot markers and a 60 px tap area.

## Voice
- Kokoro-82M v1.0 TTS model, voice `bm_george` — Apache-2.0 — https://huggingface.co/hexgrad/Kokoro-82M
- kokoro-onnx runtime — MIT — https://github.com/thewh1teagle/kokoro-onnx

## Earth–Moon lab redesign
See [lab-science.md](lab-science.md) for public NASA pages read 9 November 2026, calculations, definitions, in-app source policy and explicit limitations. Existing Natural Earth and surface-generation credits above remain in force. Seven new optional lab narrations use the same Apache-2.0 Kokoro bm_george voice and MIT runtime already credited. No new surface imagery or external runtime dependency is added.

## Major moons (`data.js` MOONS, November 2026)
Nineteen moons besides Earth's: Phobos, Deimos; Io, Europa, Ganymede, Callisto; Mimas, Enceladus, Tethys, Dione, Rhea, Titan, Iapetus; Miranda, Ariel, Umbriel, Titania, Oberon; Triton. All read 9 November 2026.
- **Orbits** (semi-major axis, sidereal period): NASA NSSDCA fact sheets — Mars https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html (Phobos 9,378 km / 0.31891 d; Deimos 23,459 km / 1.26244 d), Jovian satellites (updated 6 Dec 2023) https://nssdc.gsfc.nasa.gov/planetary/factsheet/joviansatfact.html, Saturnian (22 Jul 2025) https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturniansatfact.html, Uranian (11 Mar 2023) https://nssdc.gsfc.nasa.gov/planetary/factsheet/uraniansatfact.html, Neptunian (11 Mar 2024) https://nssdc.gsfc.nasa.gov/planetary/factsheet/neptuniansatfact.html. Triton: period −5.876854 d (retrograde), inclination 157.345°.
- **Sizes**: mean radii from JPL SSD *Planetary Satellite Physical Parameters*, https://ssd.jpl.nasa.gov/sats/phys_par/ (NSSDCA gives three-axis sizes for several Saturnian and Uranian moons). Note: Triton's mean radius uses NSSDCA's 1,353.4 km (JPL lists 1,352.6 km). JPL's mean-elements table was also read but its period column did not match the fact sheets for the Galilean moons, so it was not used.
- **Moon counts** change often and sources disagree (Live Science, 25 Mar 2026: Jupiter 101, Saturn at least 285, Uranus 28 plus one awaiting confirmation, Neptune 16; EarthSky, 20 Mar 2026, citing Minor Planet Center MPEC K26/K26F14: Jupiter 101, Saturn 285; the older `facts` entries in this file say 115 and 293). The app therefore says "more than 100" and "more than 280", true under every source.
- **One-line facts** on moon cards restate well-established NASA mission findings (Io volcanism, Europa's subsurface ocean, Ganymede larger than Mercury, Enceladus plumes, Titan's methane lakes, Iapetus two-tone surface, Miranda's Verona Rupes, Triton retrograde, Phobos orbiting faster than Mars rotates).
- **Model**: true sizes in proportion to each planet. Orbits compressed: distance in planet radii = floor + 0.5 × ln(a / a_innermost), keeping order and relative spacing; floors keep the innermost moon outside the drawn rings (Mars 2.0, Jupiter 2.0, Saturn 2.45, Uranus 2.2, Neptune 3.0). Real scale uses true distances. Orbits lie in each planet's equatorial plane (inheriting its tilt); Triton's plane is turned 157°; Iapetus's ~15° inclination and other small inclinations are ignored. Moons are tidally locked spheres with illustrative colours. Screen speed is true up to one orbit per 4 s; faster moons are slowed as cap × (ω/cap)^0.25 so order is kept. Moons of other planets are hidden, unlabelled and untappable until their planet or a sibling moon is selected.

## Photographic surface maps (`textures/`, November 2026)
- Sun, Mercury, Earth (with clouds), Moon, Mars, Jupiter, Saturn, Uranus, Neptune: **Solar System Scope texture library**, © 2010–2017 Solar System Scope, licensed **CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/), https://www.solarsystemscope.com/textures — based on NASA mission imagery. Taken from the copy shipped in Qt 3D's official `planets-qml` example (qt/qt3d, branch 5.15, `examples/qt3d/planets-qml/images/solarsystemscope`, with its `license.txt`, copied to `textures/LICENSE-solarsystemscope.txt`). Changes: resized to 2048×1024 (normal maps 1024×512) and re-encoded as WebP; Earth's cloud layer kept as alpha only on white. Each world card credits the map.
- Normal (relief) maps used for Mercury, the Moon and Mars from the same set.
- **Venus** keeps its procedural cloud deck on purpose: from space Venus is uniformly cloud-covered; the library's Venus map is radar imagery of the hidden surface.
- Saturn's and Uranus's rings stay procedural (the library's ring images are top-down pictures that do not match this ring geometry).
- Dwarf planets, asteroids and the major moons use tinted illustrative surfaces; no comparable licensed maps were available in this workspace.
- Maps load after the first frame; the procedural map shows until each photo arrives (and stays if one fails).

## Dwarf planets, asteroids and belts (`data.js`, November 2026)
- **Orbits**: JPL Small-Body Database API (epoch JD 2461200.5), read 9 Nov 2026 — Ceres a 2.77 AU, e 0.0797, i 10.6°, Ω 80.2°, ω 73.3°; Vesta 2.36, 0.0902, 7.14°, 104°, 151°; Pallas 2.77, 0.231, 34.9°, 173°, 311°; Haumea 43.1, 0.194, 28.2°, 122°, 241°; Makemake 45.6, 0.159, 29.0°, 79.3°, 297°; Eris 67.9, 0.438, 43.9°, 36°, 151°. Pluto: NASA NSSDCA Pluto fact sheet (updated 11 Jan 2024), J2000 mean elements a 39.48 AU, e 0.2488, i 17.14°, Ω 110.30°, ω 113.76° (from longitude of perihelion 224.07°), period 90,560 days, day 153.3 h (retrograde); Charon radius 606 km, 19,596 km from Pluto, 6.3872 days.
- **Sizes and periods**: NSSDCA asteroid fact sheet (Ceres 965×961×891 km → 939 mean; Vesta 569×555×453 → 526; Pallas 582×556×500 → 546; periods 4.60, 3.63, 4.61 yr); NASA Science pages for Eris (about 2,400 km, 557 yr, moon Dysnomia), Haumea (about 1,740 km equatorial, 285 yr, 4-hour spin, rings, two moons), Makemake (about 1,430 km, 305 yr, 22.5-hour day, one moon). Haumea is drawn as an ellipsoid with illustrative axis ratios 1 : 0.78 : 0.5. Rotation periods of Ceres, Vesta, Pallas and Eris are used only to spin the models and are not shown as facts.
- **Asteroid belt** (NASA Science asteroid facts): 1.1–1.9 million asteroids larger than 1 km; total mass less than the Moon's. Drawn as 4,000 points between 2.06 and 3.28 AU with the Kirkwood gaps at 2.50, 2.82 and 2.95 AU emptied, Rayleigh-distributed eccentricity (σ 0.09) and inclination (σ 7°); positions are statistical, not a catalogue. **Kuiper Belt**: 1,600 points — cold classical belt 42–47.5 AU and Pluto-like bodies near 39.4 AU. Each point moves on its own Kepler orbit.
- **Model**: elliptical, tilted orbits drawn from the elements; distance from the Sun compressed point by point with the planets' 25 × AU^0.6 rule (Real scale uses true AU). Positions along each orbit are illustrative, not today's sky. In shared taps, a planet wins over a dwarf planet or asteroid unless the latter is clearly closer (1.6× distance weighting).

## Beyond the Solar System: nearby stars and their planets (`stars-data.js`, November 2026)
- **Stars**: every star and brown dwarf within 16 light-years (50 systems, 70 objects) — name, spectral type, distance, RA/Dec of each system's primary and visual magnitude — from Wikipedia's *List of nearest stars* table (which compiles RECONS, Gaia and SIMBAD values), read 9 Nov 2026. Infrared-only (J-band) magnitudes of brown dwarfs are not used for brightness.
- **TRAPPIST-1** (40.7 ly, outside the bubble, included for its planets): NASA Exoplanet Archive overview page — RA 23h06m30.33s, Dec −05°02′36.46″, log L/L☉ −3.26 (Agol et al. 2021); planet radii from the transit discovery papers (Gillon et al. 2016, 2017); orbit sizes b–g from Agol et al. 2021 as shown on that page. Planet h's orbit (0.06189 AU) is Agol et al.'s value but was beyond the portion of the page read in this session. Distance 12.47 pc.
- **Planets**: NASA Exoplanet Archive, `ps` table default parameter sets for systems within 5 pc, read 9 Nov 2026: planet name, mass (Earth masses; for planets found by the star's wobble this is a minimum mass), orbit size (AU), period (days); host log L/L☉ where given. 43 planets in 19 systems plus TRAPPIST-1's seven.
- **Positions**: RA/Dec converted to ecliptic coordinates (obliquity 23.4393°) so the star map shares the Solar System scene's frame; distance in light-years. Stems drop to the ecliptic plane; rings at 5, 10, 15 ly.
- **Colour and temperature**: typical effective temperatures for each spectral class and subclass (main-sequence values, e.g. G2 ≈ 5,800 K, M5.5 ≈ 3,000 K), shown as "about"; white and brown dwarfs use class-typical values. Glow size encodes visual luminosity from magnitude and distance (log scale), not physical size.
- **Habitable zone**: conservative zone of Kopparapu et al. 2014 (ApJL 787, L29), runaway-greenhouse and maximum-greenhouse limits for an Earth-mass planet, with the star's temperature from its spectral type (Sun: 0.95–1.68 AU). Drawn only when the archive gives the host's luminosity.
- **Planet sizes** for planets that do not transit: estimated from (minimum) mass — R = M^0.28 below 2 M⊕, 0.808 M^0.59 up to Jupiter size (capped at 11.2 R⊕); labelled "estimated" in the app. Orbits drawn circular and coplanar; motion slowed and compressed.
- **One-line facts** for well-known systems restate standard results (nearest system; Barnard's Star's proper motion and its four planets announced 2024–25; Sirius B white dwarf; Epsilon Eridani's debris belts; 61 Cygni first parallax, 1838; Luhman 16 found 2013; WISE 0855 coldest brown dwarf; Kapteyn's Star from the halo; Van Maanen's Star nearest lone white dwarf; TRAPPIST-1's three habitable-zone planets per NASA).

## The Milky Way (`galaxy-data.js`, November 2026)
- **Frame**: galactocentric, Sun at R0 = 26,996 ly from Sagittarius A* (GRAVITY Collaboration value, as given on Wikipedia's Sgr A* page, read 9 Nov 2026). RA/Dec → galactic l, b with the standard J2000 constants (NGP RA 192.85948°, Dec 27.12825°, l of NCP 122.93192°); checked against catalogue values for six landmarks to within 0.25°.
- **Galaxy facts** (Wikipedia *Milky Way*, read 9 Nov 2026; NASA *The Milky Way Galaxy* for the Sun's place in the Orion Spur between the Sagittarius and Perseus arms): 100–400 billion stars; width about 87,400 ly (D25 isophote) to 100,000+ ly depending on the edge used — shown as "about 100,000"; disc about 1,000 ly thick; Sun's galactic year 212–240 million years — shown as "about 230 million"; Sgr A* about 4.3 million solar masses, imaged by the Event Horizon Telescope (released 2022, data from 2017).
- **Spiral arms**: log spirals with kinks after Reid et al. 2019 (ApJ 885, 131), parameters rescaled from their R0 = 8.15 kpc; arm names and the Orion Spur as on the Wikipedia/NASA maps. The far side of the Galaxy is extrapolated. Bar: illustrative half-length 16 kly at 27° (published estimates: half-length 3,000–16,000 ly, angle 10–50°). Particle cloud (bulge, bar, exponential disc of scale length ≈ 8.5 kly, arms with star-forming knots) is a model, not a photograph — the app says so.
- **Landmarks** (distance; RA/Dec; Wikipedia entries read 9 Nov 2026): Sagittarius A* 26,996 ly; Orion Nebula 1,267 ly; Pleiades 444 ly (age ≈ 125 Myr); Betelgeuse 548 ly (2020 estimate; radius ≈ 764 R☉); Crab Nebula 6,500 ly (supernova of 1054); Eagle Nebula 5,700 ly (Pillars of Creation); Carina Nebula 8,500 ly (Eta Carinae, 100–150 M☉, ~4 million L☉); Omega Centauri 17,090 ly (≈ 10 million stars, ~150 ly across).

## The Milky Way in motion (`galaxy-motion.js`, November 2026)
- **Rotation curve:** Eilers et al. 2019, ApJ 871, 120 ([arXiv:1810.09466](https://arxiv.org/abs/1810.09466), abstract read 9 Nov 2026). Circular speed at the Sun 229.0 ± 0.2 km/s (systematics 2–5%); gently declining at −1.7 km/s per kpc between 5 and 25 kpc. The model uses 229 km/s and that slope, with a smooth rise through the bulge (an illustrative shape, not a fit inside 5 kpc). With R0 = 26,996 ly this gives one lap of the Sun in about 222 million years, inside the 212–240 million quoted elsewhere in the app.
- **Spiral arm pattern speed:** Dias et al. 2019, MNRAS 486, 5726 ([arXiv:1905.08133](https://arxiv.org/abs/1905.08133), read 9 Nov 2026): 28.2 ± 2.1 km/s/kpc, the same for every arm; corotation radius 8.51 ± 0.64 kpc, close to the Sun. Other estimates are lower (e.g. about 23 km/s/kpc from gas models, quoted in the review below). The arms are drawn as a single rigid pattern with their present shape.
- **Bar pattern speed:** Shen & Zheng 2020 review "The Bar and Spiral Arms in the Milky Way" ([arXiv:2012.10130](https://arxiv.org/abs/2012.10130), read 9 Nov 2026): measurements converge on about 35–40 km/s/kpc (Portail et al. 2017: 39.0 ± 3.5; Sanders et al. 2019: 41 ± 3). The model uses 39.
- **The Sun's vertical motion:** Bahcall & Bahcall 1985, Nature 316, 706 ([abstract](https://ui.adsabs.harvard.edu/abs/1985Natur.316..706B/abstract), read 9 Nov 2026): half-period 26–37 Myr, peak height 49–93 pc. The model uses a 64 Myr period and 70 pc. The Sun's present height of about 20.8 pc above the mid-plane is from Bennett & Bovy 2019 (MNRAS 482, 1417). At the Galaxy scale this bob is too small to see; it is described in the card.
- **Earth milestones on the clock:** the end-Cretaceous extinction 66 million years ago; dinosaurs first appear in the Late Triassic, roughly 230–245 million years ago, so one lap back (about 222 million) they were "new on Earth".
- **Simplifications, stated in the app:** circular orbits (no epicycles or radial migration), arm shapes held fixed, clock limited to ±250 million years (about one lap each way), and nebulae and young clusters hidden away from today because they last only a few million years.

## Nearby stars in motion (`star-motion.js`, November 2026)
- **Proper motions and radial velocities.** Taken from each star's Wikipedia infobox, which quotes Gaia DR3 or SIMBAD values (read 9 Nov 2026), for: Proxima Centauri (used for the Alpha Centauri system), Barnard's Star, Luhman 16, WISE 0855−0714, Wolf 359, Lalande 21185, Sirius, Gliese 65, Ross 154, Ross 248, Epsilon Eridani, GJ 1061, Teegarden's Star, Kapteyn's Star, SCR 1845−6357, DENIS J1048−3956, UGPS J0722−0540, Wolf 424, Gliese 440, GJ 1245, WISE 1741+2553, WISE 1639−6847, LHS 288, DENIS 0255−4700, TRAPPIST-1, and the passing stars Gliese 445, Scholz's Star and Gliese 710. The Luhman 16 radial velocity (23.1 km/s) comes from the article text.
- **The remaining stars** come from the [HYG database v4.1](https://github.com/astronexus/HYG-Database): Hipparcos proper motions and Gliese-catalogue radial velocities, licensed CC BY-SA 4.0. HYG was also used as a cross-check. It has a placeholder for Barnard's Star's declination motion and records unknown radial velocities as 0, which is why the infobox values above were preferred.
- **Radial velocity not measured.** Treated as unknown (drawn with sideways drift only, and the card says so) for WISE 0855−0714, SCR 1845−6357, Gliese 440, WISE 1741+2553, WISE 1639−6847 and DENIS 0255−4700. LHS 288 is also treated as unknown: SIMBAD lists 155.6 km/s without a cited source, and no published encounter list uses it.
- **Model.** Each star moves in a straight line, p(t) = p₀ + v·t, with v built from its proper motion, radial velocity and distance (4.74047 km/s per arcsec/yr per parsec). The clock covers ±100,000 years. Beyond that range (the Gliese 710 flyby) only the chosen passing star is drawn.
- **Checks against published encounters.** The [List of nearest stars](https://en.wikipedia.org/wiki/List_of_nearest_stars) table (read 9 Nov 2026), compiled from Bailer-Jones et al. and others, counts from about the year 2000 CE. The model reproduces it to within a few per cent:

  | Star | Published | This model |
  |---|---|---|
  | Proxima / Alpha Centauri | 28,650 yr, 3.12 ly | 26,700 yr from now, 3.11 ly |
  | Ross 248 | 38,500 yr, 3.04 ly | 36,500 yr, 3.04 ly |
  | Gliese 445 | 46,300 yr, 3.34 ly | 44,300 yr, 3.34 ly |
  | Barnard's Star | 11,700 yr, 3.77 ly | 9,700 yr, 3.77 ly |
  | Lalande 21185 | 22,000 yr, 4.68 ly | 20,000 yr, 4.68 ly |
  | Gliese 710 | 1.30 million yr, 0.167 ly | 1.34 million yr, 0.173 ly; a 2026 study gives 1.345 million yr, 0.062 pc |
  | Scholz's Star | 70,000–81,000 yr ago, 0.82–1.08 ly (two studies) | 80,600 yr ago, 1.06 ly |
  | Epsilon Eridani | 105,000 yr ago, 7 ly (its article) | 105,200 yr ago, 7.0 ly |

- **"Nearest star" readout.** The nearest system to the Sun at the clock's time, by this model. Older eras (for example Luhman 16 being nearest roughly 15,000–60,000 years ago) follow from the same data but have not been checked against a published study.

## Stars in pairs (`star-pairs.js`, November 2026)
- **Relative-orbit elements and masses** come from each system's Wikipedia infobox (read 9 Nov 2026), which cites the orbit papers:

  | Pair | Period | Semi-major axis | Eccentricity | Periastron | Masses |
  |---|---|---|---|---|---|
  | Alpha Centauri A–B | 79.762 yr | 23.299 AU | 0.51947 | 1875.66 | 1.0788 / 0.9092 M☉ |
  | Sirius A–B | 50.1284 yr | 19.8 AU | 0.59142 | 1994.5715 | 2.063 / 1.018 M☉ |
  | Procyon A–B | 40.840 yr | 15.137 AU | 0.39785 | 1968.076 | 1.478 / 0.592 M☉ |
  | 61 Cygni A–B | 707.1 yr | 86.76 AU | 0.4424 | JD 2596496 (≈ 2396.85) | 0.6771 / 0.6289 M☉ |
  | Luhman 16 A–B | 26.55 yr | 3.52 AU | 0.344 | 2018.060 | 35.4 / 29.4 Jupiter masses |
  | Epsilon Indi Ba–Bb | 11.0197 yr | 2.4058 AU | 0.54042 | not published there | 66.92 / 53.25 Jupiter masses |

  For Epsilon Indi Ba–Bb the starting point along the orbit is illustrative, and the card says so.
- **Proxima's orbit around A–B:** period about 511,000 years, periastron about 4,100 AU, apastron about 12,300 AU (same infobox).
- **Check:** for every pair, Kepler's third law (a³/P²) reproduces the measured total mass to within 1%, and the computed next periastrons fall in 2035 (Alpha Centauri) and 2044 (Sirius).
- **Drawing:** each orbit is shown face on, in its own plane, so inclination and orientation on the sky are not shown. Star sizes are not to scale; white dwarfs are drawn small because they are about Earth-sized.

## The Local Group (`local-data.js`, `local.js`, November 2026)
- **Distances** come from Wikipedia's [List of nearest galaxies](https://en.wikipedia.org/wiki/List_of_nearest_galaxies) (read 9 Nov 2026). For example: Andromeda 2.538 Mly, Triangulum 2.73, LMC 0.163, SMC 0.205, Sagittarius Dwarf 0.078, Leo I 0.820, WLM 3.043.
- **J2000 positions** are the catalogued values. They were checked against HYG's deep-sky list (`misc/dso.csv`, for M31, M32, M33, M110, NGC 147, NGC 185, IC 10, IC 1613, NGC 6822, LMC and SMC) and against Wikipedia infoboxes (Leo I, Draco, Sagittarius Dwarf, WLM). They are converted to the Galaxy scene's frame and shrunk 10×, so 1 unit = 10,000 ly.
- **Discs.** Andromeda is drawn 152,000 ly wide (D25), inclined 77°. Triangulum is 61,000 ly wide, inclined 54° (both from Wikipedia). The position angles (35° and 23°) are from HYG. The spiral and cloud shapes are simple models.
- **Facts.** Andromeda: about 1 trillion stars. Triangulum: about 40 billion stars, probably a satellite of Andromeda. LMC: about 20 billion stars, 32,200 ly across, predicted to merge with the Milky Way in about 2.4 billion years. SMC: 18,900 ly across. All from the galaxies' Wikipedia articles, read 9 Nov 2026. The SMC's star count differs within its article (3 billion in the infobox, "several hundred million" in the text), so the app says "a few billion" only loosely; it may be revised.
- **Local Group size and mass.** About 2 × 10¹² solar masses and more than 100 members ([Local Group](https://en.wikipedia.org/wiki/Local_Group)). Its width depends on where the edge is drawn: the app says 10–17 million light-years.
- **Andromeda's approach.** It is approaching at about 110 km/s. A merger was long predicted for about 4.5 billion years from now. Sawala et al. (2025, Nature Astronomy), using Gaia and Hubble data and including Triangulum and the LMC, found about a 50% chance of a merger within 10 billion years ([Andromeda–Milky Way collision](https://en.wikipedia.org/wiki/Andromeda%E2%80%93Milky_Way_collision); [UWA news release](https://www.uwa.edu.au/news/article/2025/june/astronomers-thought-the-milky-way-was-doomed-to-crash-into-andromeda)). The app presents both results.
- **Seam with the Galaxy.** The Milky Way in this scene is the Galaxy scene's own particle model, shrunk 10×, and the camera distance here is exactly the Galaxy's ÷ 10, centred on the same point.

## Laniakea (`laniakea-data.js`, `cosmos-data.js`, `cosmos.js`, November 2026)
- **Galaxies.** 9,696 NGC and IC galaxies with measured redshifts from [OpenNGC](https://github.com/mattiaverga/OpenNGC) (CC BY-SA 4.0; `database_files/NGC.csv`), packed by `tools/build_laniakea.py`. That generated file is a derivative of OpenNGC and carries the same licence.
- **Distances.** Each distance comes from the Hubble law, cz / H0 with H0 = 70 km/s/Mpc. Galaxies with cz < 1,000 km/s are left out, because the Hubble law fails there.
- **Known limitations, stated in the card:**
  - Motions inside clusters stretch each cluster along the line of sight ("fingers of God").
  - The NGC/IC catalogues favour bright, nearby galaxies.
  - Few galaxies appear behind the Milky Way's disc (the zone of avoidance).
- **Check:** at least 25 catalogue galaxies cluster around each of the Virgo, Coma and Perseus positions (tests).
- **Cluster centres and distances.** From each Wikipedia article, read 9 Nov 2026: Virgo 53.8 Mly, Fornax 62, Perseus 240, Coma 321 (infobox 336), Norma 221 (near the centre of the Great Attractor), Shapley 652.
- **Nearby groups.** These use their brightest galaxy's measured distance: M81 11.8 Mly, NGC 253 11.4, Centaurus A about 12, Sombrero 31.1.
- **Laniakea itself.** About 100,000 galaxies and about 10¹⁷ solar masses. It was defined in 2014 by Tully, Courtois, Hoffman and Pomarède ([Laniakea Supercluster](https://en.wikipedia.org/wiki/Laniakea_Supercluster)). Its quoted width varies (Wikipedia gives 400 million ly; other sources about 520), so the app says 400–500 million.

## The observable universe (`cosmos-data.js`, `cosmos.js`, November 2026)
- **Cosmology.** Flat ΛCDM with Planck 2018 values (H0 = 67.66 km/s/Mpc, Ωm = 0.3111, radiation 9 × 10⁻⁵), integrated numerically.
- **Checks against [Observable universe](https://en.wikipedia.org/wiki/Observable_universe) and [MoM-z14](https://en.wikipedia.org/wiki/MoM-z14):**
  - Age 13.786 Gyr (published 13.787 ± 0.020).
  - Distance now to the CMB 45.3 Gly (published about 45.7; the small gap is the simplified radiation and neutrino terms).
  - MoM-z14 (z = 14.44, announced 16 May 2025) at 33.9 Gly now, light 13.50 Gyr old (published 33.8 and 13.53).
- **Shells of equal look-back time.** 4.6 Gyr (as the Sun formed) is at 5.5 Gly, 10 Gyr at 15.9 Gly and 13 Gyr at 28.5 Gly, all distances now.
- **Illustrations, labelled as such in the app:**
  - The cosmic web: knots joined to their nearest neighbours by strands. The real strands are far finer.
  - The CMB's warm and cool speckle: the real map is shown in the Planck and WMAP all-sky images.
- **Other figures.** "As many as 2 trillion galaxies" is the estimate quoted by Wikipedia. The CMB redshift is 1091.64 and it was discovered in 1965 (Penzias and Wilson).

## Continuous zoom: transition structures (Phase 3)
Built by `tools/build_transition.py` into `transition-data.js` (84.8 KB); drawn by `transition.js`. Anything marked *illustration* is a random sample of a published size or density law, not a catalogue of objects.
- **Stars to 1,000 ly**: HYG Database v4.1 (github.com/astronexus/HYG-Database, `hyg/CURRENT/hygdata_v41.csv`, CC BY-SA 4.0, sha256 d9f69fd86bbf90a4…, fetched 10 Nov 2026). All 7,696 stars with V ≤ 6.5 and a parallax distance ≤ 1,000 ly, Sun excluded. Distances beyond a few hundred ly carry tens-of-percent errors. Colour from B−V via Ballesteros (2012, EPL 97, 34009).
- **HYG completeness (drawing rule, not data).** The 1,000-ly layer is brightness-limited (V ≤ 6.5), so faint stars are present only near the Sun and the field seen from outside is many times denser in its inner 100 ly than on average: a selection effect, not a real density peak. Each star therefore has a completeness distance d_lim = d × 10^((6.5 − V)/5), the distance out to which a star like it would still be in the catalogue. For a field radius R (the camera's distance from the Sun, 1–1,000 ly) only stars with d_lim ≥ R are drawn at full weight (log-smoothstep from 0.8 R to R). From inside the Solar System (R = 1 ly) all 7,696 stars are drawn, so the naked-eye sky is unchanged; from 1,000 ly out the kept subset is volume-complete to 1,000 ly (absolute magnitude M_V ≤ −0.93, 977 stars). No star is moved, added or recoloured; stars only fade (`transition.js` `hygWeight`). Using a volume-limited subsample is the standard remedy for this selection effect in a magnitude-limited sample ([Malmquist bias](https://en.wikipedia.org/wiki/Malmquist_bias)).
- **Globular clusters**: Harris, W. E. 1996, AJ 112, 1487 (2010 edition), Part I, physics.mcmaster.ca/~harris/mwgc.dat (free of charge; redistributed with this reference), 157 clusters, l, b and distance from the Sun.
- **Council of Giants**: McCall, M. L. 2014, MNRAS 440, 405, distances as tabulated by Wikipedia's "Local Sheet" (read 10 Nov 2026). RA/Dec from OpenNGC (CC BY-SA 4.0) for the 9 members in NGC/IC. Maffei 1, Maffei 2 and Circinus are left out because they have no OpenNGC position.
- **Heliosphere**: Voyager 1 crossed the termination shock at 94 AU (Dec 2004) and the heliopause at 121.6 AU (25 Aug 2012). Voyager 2 crossed the heliopause at 119 AU (Nov 2018) (NASA/JPL). Drawn as spheres, an *illustration*: the real shape is not spherical.
- **Oort cloud**: *illustration*. Isotropic, radii log-uniform 2,000–100,000 AU (NASA, Oort Cloud overview).
- **Kuiper belt**: about 30–50 AU (existing statistical belt, data.js).
- **Local Bubble**: *illustration*. A sphere 1,000 ly across (Zucker et al. 2022, Nature 601, 334: a ~1,000-ly cavity); the real shape is irregular.
- **Stellar halo**: *illustration*. Density ∝ r^−2.77, flattening q = 0.64 (Jurić et al. 2008, ApJ 673, 864), 15–300 kly.
- **Sagittarius stream**: *illustration* of its plane. Orbital pole (l, b) = (273.8°, −13.46°) (Majewski et al. 2003, ApJ 599, 1082; Law & Majewski 2010), 15–60 kpc from the centre.
- **Magellanic Clouds** in the Milky Way view: soft point clouds at the positions and sizes already in local-data.js (*illustration* of their extent).
- **Local Sheet**: *illustration*. 34 Mly across, 1.52 Mly thick (McCall 2014 via Wikipedia), drawn in the supergalactic plane; Wikipedia gives an 8° tilt from that plane. Supergalactic pole (l, b) = (47.37°, 6.32°).
- **Local Void**: *illustration* shell. Centre direction RA 18h38m, Dec +18° (SIMBAD "NAME Local Void"), centre at least 23 Mpc ≈ 75 Mly away (Tully et al. 2008, ApJ 676, 184); drawn with a 75 Mly radius.
- **Virgo direction**: a brighter glow at the Virgo Cluster's position from cosmos-data.js.
- **NGC → web hand-over**: OpenNGC points fade by their on-screen density (0.05 → 0.5 points per px², lod.js). The cosmic web remains an *illustration*.
- **2MRS not used**: no explicit licence was found for redistribution, so it was not added.
- **Solar compressed → true scale**: past a camera ~300 AU out, the compressed distance rule blends to true scale. The blend is complete at 0.08 ly (≈5,060 AU), where the seam to the stars begins (zoom-ladder.js SOLAR_METRIC). Inside ~300 AU, planet distances remain compressed.

### Seam stand-ins and one distance per galaxy (correction)

- Galaxy → Local Group: the Local Group scene draws the Milky Way scene's own objects (disc cloud, tracers, core, globulars, halo, Sagittarius stream, Magellanic Clouds). They use the same BufferGeometry, the same material settings and positions scaled by 1/LOCAL_UNIT. The Local scene's separate random LMC/SMC blobs are no longer drawn when these copies exist.
- Local Group → Laniakea: the Local Sheet, the Local Void shell and the far-galaxy sprites are shared the same way, scaled by 0.01 (Mly per Local unit).
- Laniakea → Universe: both scenes build the NGC/IC layer from the same catalogue with one style (`NGC_STYLE`).
- One distance per galaxy: M81 (11.8 Mly), NGC 253 (11.4 Mly) and Centaurus A (12 Mly) now use the cosmos-data group values everywhere. The Council of Giants table (McCall 2014, MNRAS 440, 405) gives rounded values; the real distance uncertainty is about ±5–10%. Each Council galaxy records which source its number comes from.
- `tests/proxies.test.js` checks these pairs numerically (style, projection, sprite size, exclusivity). That is not a check of the rendered brightness on a GPU.
