# Solar System · Look closer

An interactive, static Three.js Solar System with three primary actions:
- **Explore:** choose any of the eight planets, the Sun or Moon. Fly closer, turn the globe, choose a feature, or open sourced facts. Earth leads to a seasons lab; Moon leads to phases. Other worlds have a working Solar System/orbit view.
- **Try it:** two substantive experiments, not a list of placeholders. Move Earth around a circular orbit, change observing latitude, then remove its 23.44° tilt. Or move the Moon and see the illuminated fraction from Earth's direction. Back restores context; Reset returns reproducible starting values.
- **Compare:** Earth, Moon and Mars at the same diameter scale, with surface gravity, a mass-to-weight experiment, conditions and explicitly labelled distance reference points. Other worlds remain fully explorable; their comparisons are not implemented.

The entry is approachable without forcing narration. Expand **Go deeper** for original explanations, data definitions, limitations and NASA source links. Pause, speed, labels, trails, scale and optional sound live in **Controls** rather than another toolbar. The redesign is separate from the guided-adventure PR #4; it does not merge or supersede that PR automatically.

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
Node 24 tests use linkedom (DOM emulation) and Node VM modules. They test science functions, real Three.js geometry with a fake renderer, state/Back/Reset, DOM event wiring, mocked audio cancellation/fallback and packaging. Narrow-width contracts are not browser layout assertions. `check-voice.py` uses ffprobe to validate encoded clips and report durations/bytes.

**Before merge:** actual phone visual screenshots and browser console/network inspection, plus actual Android Chrome Listen/mute/background/fallback QA are required. No browser was driven through Shell during implementation. The PR remains draft pending parent visual review. Pages deploys only from main, and no merge or deployment is authorized here.
