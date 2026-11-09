# Solar System · Look closer

An interactive, static Three.js Solar System. The space scene fills the screen; everything else lives in one bottom sheet.

## Immersive layout
- **Tap a world.** Tapping a planet, the Sun or the Moon glides the camera to it and slides up a sheet. Touch taps use a 48 px pick radius (28 px for a mouse), so planets that are only a few pixels wide in the overview are still easy to hit.
- **Sheet states:** *closed → peek → half → full.* Peek shows the name, one striking sourced fact and the contextual action (Earth: "Why do seasons happen?"; Moon: "Explore the phases"). Swipe up (or tap/Arrow Up on the grip) for details, comparisons and sources; swipe down, Escape, ✕ or a tap on empty space closes it.
- **Explore / Try it / Compare** are tabs inside the sheet. Experiments open at half height so the scene stays visible, keep their own Reset, and are not dismissed by a stray tap on empty space. Swiping down from an experiment returns to the world's peek card.
- **Overview / Back** sits top-left; a small ☰ menu holds go-to-world, pause, speed, labels, trails, sound, real scale and the Solar System overview.
- The camera uses a view offset so the selected world is centred in the part of the screen the sheet does not cover, in portrait (sheet at the bottom) and landscape phones (sheet docked right). Safe-area insets are respected.
- First visit shows a one-line hint ("Tap a planet, the Sun or the Moon"), remembered in `localStorage`.
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
Node 24 tests use linkedom (DOM emulation) and Node VM modules. They test science functions, real Three.js geometry with a fake renderer (including the touch pick radius and the sheet-aware view offset), sheet state transitions and swipe classification, tap-to-select, close on empty tap, Back/Reset, DOM event wiring, mocked audio cancellation/fallback and packaging. CSS sheet heights, safe areas, landscape docking and real touch gestures are not exercised by these tests; they are not browser layout assertions. `check-voice.py` uses ffprobe to validate encoded clips and report durations/bytes.

**Before merge:** actual phone visual screenshots and browser console/network inspection, plus actual Android Chrome Listen/mute/background/fallback QA are required. No browser was driven through Shell during implementation. The PR remains draft pending parent visual review. Pages deploys only from main, and no merge or deployment is authorized here.
