# Solar System · Look closer

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
Listen reads the visible introduction using tap-initiated Web Audio. No autoplay on entry, world changes or slider movement. Existing saved mute preference is preserved. Missing clips/unsupported Web Audio fall back to Web Speech (male voice if the device provides one; pitch 0.9, rate 0.85). Returning from another app requires another Listen tap. These compatibility mechanisms are tested with mocks, not a claim of actual Android playback.

72 MP3s, mono 24 kHz / 32 kbps, 957,120 bytes total. Seven new lab clips; the 65 prior kid clips remain available. Clips load on demand. Runtime Three.js and audio are local assets; there are no CDN imports. There is no service worker, so an uncached remote visit does not work without a network; serving the folder locally needs no external assets.

Regenerate from `voice/lines.json`: install `kokoro-onnx soundfile` plus ffmpeg, download the model and voice weights separately, then:
```
KOKORO_MODEL=/path/kokoro-v1.0.onnx KOKORO_VOICES=/path/voices-v1.0.bin python tools/build-voice.py
```

## Run and test
```
python3 -m http.server 8780 --bind 0.0.0.0
npm ci --ignore-scripts
npm test
python3 tools/check-voice.py
```
Node 24 tests use linkedom (DOM emulation) and Node VM modules. They test science functions; real taps (`tests/tap.test.js` boots the real index.html, app.js, OrbitControls, lab.js and voice player in linkedom and dispatches PointerEvent sequences at coordinates projected from each world); real Three.js geometry with a fake renderer (including the touch pick radius and the sheet-aware view offset), sheet state transitions and swipe classification, tap-to-select, close on empty tap, Back/Reset, DOM event wiring, mocked audio cancellation/fallback and packaging. CSS sheet heights, safe areas, landscape docking and real touch gestures are not exercised by these tests; they are not browser layout assertions. `check-voice.py` uses ffprobe to validate encoded clips and report durations/bytes.

**Before merge:** actual phone visual screenshots and browser console/network inspection, plus actual Android Chrome Listen/mute/background/fallback QA are required. No browser was driven through Shell during implementation. The PR remains draft pending parent visual review. Pages deploys only from main, and no merge or deployment is authorized here.

## Learn by guessing first
- **✦ Journeys** (top bar): four short guided tours — *How big is space?*, *Why do we have seasons?*, *The Moon and us*, *Next door: Mars*. Each stop glides the camera to a world; questions must be answered (or skipped) before moving on, and labs open from the step with Back returning to it.
- **Predict, then reveal**: every lab asks a question first and shows the result once you commit.
- **New labs** under Try it: *Why aren't there eclipses every month?* (Moon position + tilted-orbit crossing point), *What makes the tides?* (spring and neap), *How big is space?* (football-sized Sun walk, light race).
- World cards show how long sunlight takes to reach each planet.
- Maths, constants and limits: [docs/lab-science.md](docs/lab-science.md#learning-layer-learnjs-november-2026).

## Moons
Nineteen major moons orbit Mars and the giant planets, at true size, in each planet's equatorial plane (Uranus's on their side, Triton backwards). Tap a planet with moons and choose **Meet its moons** to frame its system and list them; each moon has its own card with sizes, orbit, a one-line fact and NASA/JPL sources. Data and model notes: [docs/sources.md](docs/sources.md#major-moons-datajs-moons-november-2026).
