# A Mote in a Sunbeam

*From the Sun to the edge of the universe.* The home-screen name is **Mote**.


An interactive, static Three.js Solar System. The space scene fills the screen; everything else lives in one bottom sheet.

## Immersive layout
- **Overview first.** Portrait phones open on a steeper view of the inner planets (Mercury to Mars, legible and tappable); landscape opens on all eight planets. With the sheet closed, the top-left chip reads **Show all planets** / **Show inner planets** and switches the framing (a re-layout to a different screen size, e.g. rotating or DevTools device emulation, re-frames the overview); outer worlds are also reachable by pinching out, by their labels, or from *Go to a world* in the ☰ menu. Camera distance is fitted to the screen's aspect ratio. Closing the sheet (empty tap, ✕, Escape from peek, Back/Overview) flies the camera back to the overview.
- **Overview display:** only in the overview, the Sun is drawn at 1/10 of its true size (instead of the default 1/5) so the inner planets are not hidden behind it, and orbits run at 1/5 speed so worlds are easy to tap. Close-ups, the Sun's own card and Real scale use the normal sizes and speed. The ☰ menu scale note says so.
- **Tap a world.** Tapping a planet, the Sun or the Moon, or its name label, glides the camera to it and slides up a sheet. Touch taps use a 60 px pick radius (32 px for a mouse); a touch on a name label selects that world even if it drifts before the finger lifts. A tap is recognised from pointer events in the document capture phase (nothing layered over the canvas or OrbitControls' pointer capture can swallow it), allows 14 px of finger movement (6 px for a mouse), picks what was under the finger at touch-down, ignores drags and two-finger gestures, and falls back to `click` when a browser delivers no pointer events.
- **Sheet states:** *closed → peek → half → full.* Peek shows the name, one striking sourced fact and the contextual action (Earth: "Why do seasons happen?"; Moon: "Explore the phases"). Swipe up (or tap/Arrow Up on the grip) for details, comparisons and sources; swipe down, Escape, ✕ or a tap on empty space closes it.
- **Labs:** the slider and month/phase buttons come first under the title, then the result; explanations sit below. In a lab the tabs are hidden (Back returns), Reset is a ↺ icon in the header, and the half-height sheet is 60% of the screen in portrait.
- **Explore / Try it / Compare** are tabs inside the sheet. Experiments open at half height so the scene stays visible, keep their own Reset, and are not dismissed by a stray tap on empty space. Swiping down from an experiment returns to the world's peek card.
- **Back / Overview** sits top-left (it becomes the All/Inner planets switch when the sheet is closed); a small ☰ menu holds go-to-world, pause, speed, labels, trails, sound, real scale and the Solar System overview.
- **Labels** are on by default as tappable name pills (14 px text, ~36 px tall, with a 10 px larger invisible hit area), placed above a world or below it when that would overlap; overlapping names are hidden (Earth, the Sun and the largest worlds take priority) so the view stays uncluttered. Labels can be turned off in the menu.
- The camera uses a view offset so the selected world is centred in the part of the screen the sheet does not cover, in portrait (sheet at the bottom) and landscape phones (sheet docked right). Safe-area insets are respected.
- Each visit shows a one-line hint ("Tap a planet, the Sun or the Moon") until a world is selected. It is no longer remembered across visits: a stored flag hid it for anyone who had tapped once on the same preview origin.
- Accessibility: every swipe has a button/keyboard equivalent; the sheet uses `aria-expanded`, `aria-hidden`/`inert` when closed, and reduced-motion is respected.

The science content is unchanged from the previous design:
- **Try it:** move Earth around a circular orbit, change observing latitude, then remove its 23.44° tilt; or move the Moon and see the illuminated fraction from Earth's direction.
- **Compare:** Earth, Moon and Mars at the same diameter scale, with surface gravity, a mass-to-weight experiment, conditions and labelled distance reference points.

Expand **Go deeper** for explanations, data definitions, limitations and NASA source links. This branch is separate from PR #4 (guided adventure).

## Models, data and licensing
See [science notes](docs/lab-science.md) and [baseline sources](docs/sources.md). These are illustrative teaching models, not live imagery, weather, sky positions or an eclipse simulator. No AI-generated facts or remote AI calls. No analytics or backend.

Earth's Natural Earth coastlines and procedural planet details are preserved. No new surface image downloads: natural details are generated locally at load. Earth has day/night illumination, a tilt guide, clouds and subtle bump relief; relief was reduced rather than exaggerated. Moon craters are illustrative, not mapped. Main scene sizes retain planet ratios (Sun 1/5 by default); orbit and Moon gaps are shortened. **Real scale** restores size/distance ratios, not real-date orbital positions. Experiments isolate one globe; their orbit insets are explicitly not to scale. Comparisons use equatorial diameters; the 3D Moon uses mean diameter, with the distinction stated in-app.

- Three.js r170: MIT (`vendor/THREE-LICENSE`).
- Natural Earth data: public domain, credited in docs/sources.md.
- Voice: Kokoro-82M v1.0 `bm_george`, speed 0.85, Apache-2.0 weights (https://huggingface.co/hexgrad/Kokoro-82M); kokoro-onnx runtime MIT (https://github.com/thewh1teagle/kokoro-onnx).

## Optional voice
Listen reads the visible introduction using tap-initiated Web Audio. No autoplay on entry, world changes or slider movement. Existing saved mute preference is preserved. Missing clips/unsupported Web Audio fall back to Web Speech (a male English voice if the device provides one; calm rate 0.9, normal pitch 1). Returning from another app requires another Listen tap. These compatibility mechanisms are tested with mocks, not a claim of actual Android playback.

26 MP3s, mono 24 kHz / 32 kbps, 628,312 bytes, one calm male voice (Kokoro bm_george, speed 0.85): eight world cards (Sun to Neptune), seven labs and the eleven Earth–Moon adventure lines. Only clips the app can play are kept (`tests/voice-trim.test.js` checks there are no orphans). The Voice switch (menu) is on by default and nothing plays until a tap. Clips are **not** part of Save for offline / install (that download is 60 files, about 4.1 MB); each clip is fetched the first time it plays, with its content hash in the URL (`?h=`), and the service worker keeps it, so a clip heard once also plays offline. Runtime Three.js and audio are local assets; there are no CDN imports.

Regenerate from `voice/lines.json`: install `kokoro-onnx soundfile` plus ffmpeg, download the model and voice weights separately, then:
```
KOKORO_MODEL=/path/kokoro-v1.0.onnx KOKORO_VOICES=/path/voices-v1.0.bin python tools/build-voice.py
```

## Controls
- **Top:** ✦ Journeys (left) and the menu (right). Beneath them, the scale ladder (Solar · Stars · Galaxy · Group · Laniakea · Universe) is the one way to jump between scales; pinching or scrolling past an edge does the same continuously.
- **Cards:** ‹ Back appears only when there is an earlier card at the same scale. ✕ closes the card and stays at that scale (in the voyage, ✕ ends it). Every action, including ♫ Listen, is an equal-height pill in one row: the main action filled, the others outlined.
- **Menu:** Planets in view (Inner · All), Real scale, speed, names, voice, and **Use it offline** (Install app where the browser offers it; Save for offline everywhere).
- There is no hint chip.

## Smooth zooming
- **Easing:** a pinch or scroll past a scale's edge sets where the blend between scales is heading, and each frame eases towards it, so gestures glide instead of stepping.
- **A clean edge:** the Solar System's edge is the all-planets view, so zooming out never passes through a far view where the enlarged inner planets pile up, and coming back lands on that view. Using the scale ladder to go home glides back to the normal framing.
- **No forced flights:** zooming back in re-centres gently on the Sun (or the home point of each scale) as you approach the inner edge, so the hand-over needs no automatic flight.
- **Matching scenery at every seam:** all scales share one background sky (`sky.js`, same stars in the same directions), so nothing flickers while one scale fades into the next. Laniakea draws the Local Group's galaxies with the same glows as the Local Group level, so the group doesn't collapse into dots as you cross.
- **The whole universe fits:** the observable universe's overview and outer zoom limit are fitted to the screen's narrower side, so a tall phone sees the entire sphere.
- **Prepared in advance:** a few seconds after start, the far scales are built and every scene's shaders compiled in idle moments, so the first visit to a scale doesn't stall mid-zoom.

## Fast start and offline use
- **Faster start.** The app no longer paints procedural planet maps that the photographs replace a moment later: planets start in a plain colour until their photo arrives (the procedural map is used only if a photo fails). The labs' 3D scene and the two largest scales are built only when first opened. On a phone-speed simulation (CPU slowed 4×), the time until the Solar System is tappable fell from about 4.9 s to about 1.4 s.
- **Offline.** A service worker (`sw.js`) keeps everything the app has loaded, so after one visit with a connection it opens without one. **Save for offline** (or installing the app) stores all of it at once (60 files, about 4.2 MB; `tools/stamp.mjs` writes the figure into the menu from `precache.json`), using `precache.json`, which `tools/stamp.mjs` writes at deploy. An installed app refreshes its saved copy on each launch, downloading only changed files. The page itself is fetched fresh when online, so new versions show at once.
- **Install.** `manifest.webmanifest` and two icons let phones add the app to the home screen.

## Sources and what is real
☰ → Sources lists every fact the app shows, grouped by where it appears (world cards, labs and questions, guided journeys, the Powers of Ten tour, the Earth–Moon adventure, stars and galaxies, the scale readout), each with tappable links to its sources, and a "Real or illustration?" list of what each view draws to scale and what it changes. Cards, labs and tour stops link to their own section ("All sources ›"). It is built from the app's data (`sources.js`), works offline, and `node tools/check-sources.mjs` re-checks every link. See docs/sources.md.

## Run and test
```
python3 -m http.server 8780 --bind 0.0.0.0
npm ci --ignore-scripts
npm test
python3 tools/check-voice.py
```
Node 24 tests use linkedom (DOM emulation) and Node VM modules. They test science functions; real taps (`tests/tap.test.js` boots the real index.html, app.js, OrbitControls, lab.js and voice player in linkedom and dispatches PointerEvent sequences at coordinates projected from each world); real Three.js geometry with a fake renderer (including the touch pick radius and the sheet-aware view offset), sheet state transitions and swipe classification, tap-to-select, close on empty tap, Back/Reset, DOM event wiring, mocked audio cancellation/fallback and packaging. CSS sheet heights, safe areas, landscape docking and real touch gestures are not exercised by these tests; they are not browser layout assertions. `check-voice.py` uses ffprobe to validate encoded clips and report durations/bytes.

**Before merge:** actual phone visual screenshots and browser console/network inspection, plus actual Android Chrome Listen/mute/background/fallback QA are required. No browser was driven through Shell during implementation. The PR remains draft pending parent visual review. Pages deploys only from main, and no merge or deployment is authorized here.

## Voyage outward
The first entry under **Journeys** is a guided trip across every scale, from home to Andromeda, in seven stops: the Solar System, the nearest stars, Alpha Centauri A and B orbiting each other, the stars drifting (the nearest star changes), the turning Milky Way, the Local Group and Andromeda. Each **Next** travels with the same seamless zoom. Five stops ask a question first: how long light takes to reach the nearest star, how long Alpha Centauri A and B take to orbit, whether Alpha Centauri will always be nearest, how long the Sun takes to go round the Galaxy, and whether Andromeda will hit us. The answer shows once you guess. **✕ End voyage** leaves you free to explore wherever you are; finishing leaves you in the Local Group.

## Earth–Moon adventure
A guided story on top of free exploring: tap **🚀 Adventure** (top bar, next to Journeys). Four stops in the Solar System: **Earth → the Moon → Mars → Saturn**. At each stop a short narration asks the child to find a world; tapping it (or **Show me …** / **Visit Moon**) glides there and plays one fact. A wrong world gets “A different world! Let’s look together.” and the camera stays put. **Next** goes on, **Skip ›** moves on without finding, **▶ / ❚❚** plays or stops the narration (Pause restarts the clip from its start), **✕** ends the story at any time. At the end: **Replay** or **Explore freely**.

- Every narration is shown word for word as a caption (the clip text, `voice/lines.json`), so it works with Voice off and for anyone who can't hear it. Nothing plays on load; audio starts from the Adventure tap (iOS needs that tap).
- While it runs: world cards stay closed, orbits are held still (restored after), Real scale is switched off (the narration describes the shortened default view), the scale readout moves above the panel, and world names keep clear of the panel. Going to another scale, opening Journeys or a card ends it quietly.
- Reduced motion: the glides become jumps; nothing in the panel animates.
- Each stop says what the picture changes (“Illustration · Moon distance shortened …”). Sources: `docs/sources.md` (Earth–Moon adventure).
- Code: `adventure.js` (story state, panel, own voice player); `lab.js` only creates it and tells it when the view changes.

## Learn by guessing first
- **✦ Journeys** (top bar): four short guided tours — *How big is space?*, *Why do we have seasons?*, *The Moon and us*, *Next door: Mars*. Each stop glides the camera to a world; questions must be answered (or skipped) before moving on, and labs open from the step with Back returning to it.
- **Predict, then reveal**: every lab asks a question first and shows the result once you commit.
- **New labs** under Try it: *Why aren't there eclipses every month?* (Moon position + tilted-orbit crossing point), *What makes the tides?* (spring and neap), *How big is space?* (football-sized Sun walk, light race).
- World cards show how long sunlight takes to reach each planet.
- Maths, constants and limits: [docs/lab-science.md](docs/lab-science.md#learning-layer-learnjs-november-2026).

## Moons
Nineteen major moons orbit Mars and the giant planets, at true size, in each planet's equatorial plane (Uranus's on their side, Triton backwards). Tap a planet with moons and choose **Meet its moons** to frame its system and list them; each moon has its own card with sizes, orbit, a one-line fact and NASA/JPL sources. Data and model notes: [docs/sources.md](docs/sources.md#major-moons-datajs-moons-november-2026).

## Asteroids, dwarf planets and real surfaces
- **Asteroid belt** (with Kirkwood gaps) and **Kuiper Belt** as moving clouds of small bodies.
- **Dwarf planets and big asteroids** on their real tilted, stretched orbits: Ceres, Vesta, Pallas, Pluto (with Charon), Haumea (egg-shaped), Makemake, Eris.
- **Photographic maps** for the Sun, Mercury, Earth and clouds, the Moon, Mars, Jupiter, Saturn, Uranus and Neptune — Solar System Scope textures, CC BY 4.0, based on NASA imagery (credited on each card; licence in `textures/`). Venus shows its cloud tops, as it looks from space.
- Close-ups approach from the sunlit side and turn with the planet's orbit, so the day side stays in view.
Details: [docs/sources.md](docs/sources.md).

## Zoom out: the nearby stars
Zoom out past the edge of the Solar System (pinch or scroll) and it hands over to a 3D map of every star and brown dwarf within 16 light-years (plus TRAPPIST-1), placed by real direction and distance, coloured by temperature, glowing by true brightness. Tap a star for its card: type, distance, the year its light left, companions. For stars with known planets, **Visit its planets** opens that system with its orbits to scale, the habitable zone, and Mercury's and Earth's orbits for comparison. Data: [docs/sources.md](docs/sources.md#beyond-the-solar-system-nearby-stars-and-their-planets-stars-datajs-november-2026).

## Zoom out again: the Milky Way
Keep zooming out from the star map and our neighbourhood vanishes into a model of the whole Galaxy: bar and bulge, the spiral arms (after Reid et al. 2019), the Sun's 230-million-year orbit, and tappable landmarks placed by real direction and distance — Sagittarius A*, the Orion Nebula, Pleiades, Betelgeuse, Crab Nebula, Pillars of Creation, Carina Nebula, Omega Centauri. Zooming in (or Back) steps in one level at a time. It is a model, not a photograph, and says so.

## The Milky Way in motion
In the Milky Way a clock at the bottom runs time in millions of years: press play (about 10 million years a second) or drag the slider up to 250 million years back or forward. The camera pulls back to the whole disc. Stars orbit at nearly the same speed at every radius, so inner ones go round much faster and the disc shears; the bright moving stars follow their own orbits. The spiral arms are a density wave, a pattern that turns slowly as one shape, so stars drift through them, while the bar turns faster. The Sun goes once round in about 222 million years. The readout names the moment ("66 million years ago · The dinosaurs die out", "One full lap from today"). Zooming back in first returns to today and to the Sun, so the hand-over to the star map stays exact. Speeds and sources: [docs/sources.md](docs/sources.md#the-milky-way-in-motion-galaxy-motionjs-november-2026).

## The nearby stars in motion
The star map has its own clock, in years: press play (about 2,000 years a second) or scrub up to 100,000 years back or forward. Every star moves at its measured speed, its drift across the sky combined with its speed towards or away from us. A faint line shows where each star has come from, and a gold dashed line joins the Sun to whichever star is nearest at that moment. The readout names it: Alpha Centauri now, then Ross 248 (about 36,500 years from now, 3.0 light-years) and Gliese 445 (about 44,000 years), and Scholz's Star about 80,000 years ago (1.1 light-years). Star cards give each star's speed and closest approach. Three passing stars join the map (Gliese 445, Scholz's Star, Gliese 710), and Gliese 710's card can jump the clock to its pass through the Oort Cloud in about 1.3 million years. Zooming to another scale first returns the clock to today. Data, checks and caveats: [docs/sources.md](docs/sources.md#nearby-stars-in-motion-star-motionjs-november-2026).

## Stars in pairs
Tap Alpha Centauri, Sirius, Procyon, 61 Cygni, Luhman 16 or Epsilon Indi and choose **Watch the pair orbit**. The two stars circle their shared centre of mass on their real orbit, face on and to scale in AU, one lap in about 12 seconds, with the closest of our own planets' orbits dashed for comparison. The card ticks through the years and the distance between the two, and gives the lap time, the closest and farthest separations (with the next closest approach, e.g. 2035 for Alpha Centauri A and B) and the masses, with a Kepler's-third-law check. Elements: [docs/sources.md](docs/sources.md#stars-in-pairs-star-pairsjs-november-2026).

## Zoom out again: the Local Group
Past the Milky Way's edge the zoom continues into the Local Group, at 1 unit = 10,000 light-years. The Milky Way stays in place, drawn by the same model shrunk ten times, with the Magellanic Clouds beside it. Further out are Andromeda and Triangulum, at their real distances and tilts, and about two dozen dwarf galaxies, with rings at 1, 2 and 3 million light-years. Tap any galaxy for its card. Andromeda's card gives its approach of about 110 km/s and both the classic merger prediction (about 4.5 billion years) and the 2025 finding of roughly even odds within 10 billion years. Sources: [docs/sources.md](docs/sources.md#the-local-group-local-datajs-localjs-november-2026).

## To the edge: Laniakea and the observable universe
Two more levels finish the zoom. **Laniakea** (1 unit = 1 million light-years) shows our supercluster as 9,696 real NGC/IC galaxies placed by their redshifts. Clusters such as Virgo, Coma and Perseus stand out, along with the Great Attractor that Laniakea's galaxies flow towards. **The observable universe** (1 unit = 100 million light-years) shrinks all of that to a bright knot inside an illustrated cosmic web. Shells mark how long ago the light left, and MoM-z14, the most distant galaxy known, sits 33.8 billion light-years away. The microwave background marks the edge, about 46 billion light-years out. The voyage now ends there, with one more question. Sources and checks: [docs/sources.md](docs/sources.md#laniakea-laniakea-datajs-cosmos-datajs-cosmosjs-november-2026).

## One zoom, six scales
Solar System → nearby stars → Milky Way → Local Group → Laniakea → observable universe is a single continuous zoom with no cuts. When a scene's camera reaches its outer limit and you keep pinching or scrolling out, the next scale dissolves in around the Sun while the current one recedes and darkens, driven directly by your fingers or wheel, so you can stop or reverse mid-way. Every step after the first is to scale (camera distances ÷ 1,000, ÷ 10, ÷ 100 and ÷ 100), and every scale shares the same black sky. Zooming in at the inner limit plays the same blend backwards. The scale ladder under the top bar shows where you are and can be tapped (or used by keyboard) to jump between levels.

## One continuous zoom ("Powers of Ten")
- **One zoom coordinate.** `zoom.js` and `zoom-ladder.js` hold Z = ln(camera distance in light-years) for every scale, with momentum. The wheel gain is the scenes' old OrbitControls gain (zoomSpeed 1.8: 100 wheel units = 0.0923 in Z), and pinch uses the same log basis. Seams are Z intervals one decade wide, and a steady gesture keeps the same rate through them. OrbitControls only rotate.
- **Continuity, not cross-fades.** `lod.js` fades each object by its own on-screen size, position or density. Proxies are drawn identically by both scales and swapped mid-seam: the sky, the Sun's glow, the HYG star field and the Oort cloud. One "you are here" anchor label is carried across every seam.
- **Transition structures.** `transition.js` and `transition-data.js` are built by `tools/build_transition.py`; sources are in docs/sources.md and illustrations are labelled as such.
- **Scale readout.** `hud.js` shows width of view, distance from the Sun and light-crossing time, with caveats for the compressed Solar model, views centred away from the Sun, and viewpoints outside the observable universe.
- **Reduced motion.** `prefers-reduced-motion` turns off momentum and makes settles instant.
- **Diagnostics.** `?zoomlog` (and `?zoomlog=bright`) give an opt-in local frame log. Nothing is uploaded.

Evidence, measurements and the open acceptance items for the continuous zoom: [docs/shots/powers-of-ten/EVIDENCE.md](docs/shots/powers-of-ten/EVIDENCE.md).

## You are here
- **A line at every scale.** The scale readout starts with where you are (Earth, the Sun, the Milky Way, the Local Group, Laniakea, the centre of the universe), with figures taken from the sourced facts. Text lives in `here.js`.
- **A quiet finale.** After the last Voyage stop, a still card ("Here") appears over the whole universe: four short lines, no question, **Go home** and **Save this moment** (a picture with the first line and the app name as a caption). Zooming, or any other move, lets it go.

## My sky
Menu → **My sky** shows the real sky above you: the Sun, Moon, five naked-eye planets and about 7,700 stars (`sky-math.js`; formulas and checks in docs/sources.md).
- **Tonight** list: each planet and the Moon, with where it is, until when, or when it rises. Tap a name and the view turns to it, with an arrow at the screen's edge while it is out of view ("Saturn · turn right 46°, look up"). It opens already turned to the brightest planet that is up.
- **Aim phone:** the view follows the phone's compass and tilt, so you can hold it up and look through it. Phone compasses can be 5–15° off.
- Drag to look around, pinch to zoom, tap anything for its direction and how long its light has travelled. A slider moves ±12 hours; in the daytime it opens on tonight (**Now** returns). A place picker is the fallback if location is not shared. **Leave Earth** zooms out to the star map.
- Location is read once, on tap, and never stored or sent.

## The cosmic year

Menu → The cosmic year. 13.8 billion years as one calendar year, in 18 steps from the Big Bang (1 Jan) to now (midnight, 31 Dec). A bar shows each moment on the year; most of the story is crammed into the last weeks. Some steps offer "Show it in space". The last step turns your age into seconds of the year.

The cosmic year runs on a small 3D world (`cosmic-world.js`): each era is a stage, Earth wears the land-only city lights of its time, and the camera flies from one to the next. It loads on first open; if WebGL isn't available the 2D backdrops stay.

"▶ Play" in the cosmic year runs it on its own: each card holds for a few seconds, then the card fades, the date counts up through the gap while the camera flies and the bar zooms, and the next card arrives. Any tap on Earlier/Later pauses it; at "Now" it offers a replay.
