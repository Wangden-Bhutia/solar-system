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
