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
