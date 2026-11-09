# Earth–Moon lab: science, data and limits

Sources read 9 November 2026 (IST). New descriptions are original, simplified wording. Links are also available inside the app.

## NASA sources read
- [Earth facts](https://science.nasa.gov/earth/facts/): axial tilt causes opposite seasons; surface water, atmosphere, rotation/orbit distinction and Earth's one Moon.
- [Earth fact sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html): 23.44° obliquity; equatorial radius 6,378.137 km; mean surface gravity 9.820 m/s²; mean orbital scale 149.598 million km. This mean gravity differs from defined standard gravity 9.80665 m/s². The app uses the mean explicitly.
- [Moon phases](https://science.nasa.gov/moon/moon-phases/): half the Moon is illuminated, visible fraction changes with viewpoint; Northern-Hemisphere reference diagrams, 29.5-day synodic vs 27.3-day sidereal period, synchronous rotation and the orbit's roughly 5° inclination preventing an eclipse at every new/full Moon.
- [Moon facts](https://science.nasa.gov/moon/facts/): rocky impact-cratered surface, thin exosphere, mean Earth–Moon distance 384,400 km; example surface temperatures around −173°C in darkness and 127°C in full Sun. These are not global averages or live conditions.
- [Moon fact sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html): equatorial radius 1,738.1 km vs mean radius 1,737.4 km, surface gravity 1.62 m/s², mean distance 384,400 km, synodic period 29.53 days, orbit inclination 5.145°.
- [Mars fact sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html): equatorial radius 3,396.2 km, mean surface gravity 3.73 m/s², mean orbital scale 227.956 million km; atmosphere mostly carbon dioxide, tilt and polar climate context. The new comparison deliberately avoids a simplistic single Mars temperature.

An attempted NASA `/earth/seasons/` URL returned 404. The successful Earth facts page supplies the seasons explanation; no claims rely on that missing page.

## Seasons experiment
Orbit angle zero is the June solstice, then September equinox (90°), December solstice (180°), March equinox (270°). These are schematic equal angular spacings on a circular orbit, not dates or live ephemerides.

With tilt ε and orbit angle λ, unit north axis = (sin ε, cos ε, 0); unit direction from Earth to Sun = (cos λ, 0, −sin λ). Their dot product is sin declination, so δ = asin(sin ε cos λ). The rendered tilt group and light use those same values. Axis direction stays fixed while the globe-following camera changes position; the orbit inset shows the fixed projected tilt direction. The main globe is not the view from the selected latitude. A gold dot marks north, a gold circle the chosen latitude, and a pale circle the equator. Daily rotation is held at an illustrative orientation; daylight totals cover a complete daily rotation.

For latitude φ, daylight hours = 24 acos(−tan φ tan δ) / π, clamped to 0/24 for polar night/day. At exact zero declination the idealised result is 12 h (including the pole convention). Geometric noon altitude = max(0, 90° − |φ − δ|). These are calculations from basic spherical geometry, not NASA forecast data. Terrain, atmospheric refraction, twilight, eccentricity, precession and climate feedbacks are omitted. Constant distance intentionally isolates the tilt mechanism; removing tilt removes this model's seasonal daylight variation, not all real-world climate variation.

## Moon phases experiment
Elongation λ maps the circular Moon-from-Earth direction to (cos λ, 0, −sin λ). Sunlight comes from +X. Camera direction from Moon toward Earth is the negative Moon position vector; its sunward dot product gives visible illuminated fraction (1 − cos λ) / 2. The camera and sphere rotate together so one lunar face remains Earth-facing. Quarter phases show half of the visible disk; full is at 180°, new at 0°. In this north-up reference orientation, waxing illumination is on the right; it is not a reproduction of a user's local horizon view.

No ambient light is added in phase mode: a new Moon is dark, not self-luminous. Earthshine and eclipses are omitted. The orbit inset is coplanar to isolate phase geometry, not to suggest eclipses occur monthly; the real ~5° inclination and the absence of eclipse prediction are explicit in the app. Libration and actual mapped lunar features are also omitted.

## Compare
Disks use equatorial diameters at one common scale: Earth 12,756.274 km; Moon 3,476.2 km; Mars 6,792.4 km. The existing 3D Moon uses mean diameter 3,474.8 km; that distinction is stated rather than silently mixing definitions. Weight in newtons = mass in kilograms × mean surface gravity in m/s². Mass does not change. No jump-height, survivability or climate calculation is implied.

Distance labels distinguish Moon-from-Earth from planets-from-Sun, all measured centre-to-centre. Mean orbital scales are not current separations. Moon temperature examples depend on place and illumination. Inherited baseline planet information remains linked to NASA and checked 8 November 2026 (docs/sources.md). Changing outer-planet moon counts are deliberately omitted from the new visible cards rather than presented as live values.

## Visuals and assets
No new imagery was downloaded. Natural Earth continent data and the existing procedural texture generators are unchanged. Bump relief is restrained; fill light in Explore is disclosed. Seasons/phases reuse the single WebGL renderer and texture cache. Experimental orbit insets are not to scale. Main scene preserves default compressed-distance and Real scale options, and now frames the overview according to the outer orbit and stage aspect ratio. This improves findability but does not make the orbit layout a true-date sky.

## Verification limits
Unit tests verify numerical identities, geometry/light/camera consistency, the same face directed toward Earth, opposite-hemisphere daylight, zero-tilt/polar limits, mass/weight units, UI event/state wiring and cancellation. DOM emulation and fake rendering do not verify visual appearance, CSS layout, browser autoplay policy, screen readers or real Android sound. Those require parent-dispatched desktop/phone review before readiness.
