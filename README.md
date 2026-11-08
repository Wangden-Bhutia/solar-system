# Solar System

Interactive 3D solar system (Three.js, vendored). Static site, no backend, no analytics.

- Tap/click a planet or label to fly the camera to it and open its info panel.
- Play/pause, speed slider (orbital speeds follow real orbital periods), trails and labels toggles, reset view.
- Planet sizes are to scale with each other (Sun shown at 1/5 size); distances are shrunk (25 × AU^0.6). A "Real scale" button shows true sizes and distances. Earth coastlines: Natural Earth (public domain). Facts from NASA's Planetary Fact Sheet (rounded); moon counts for Jupiter and Saturn keep changing.

Run locally: `python3 -m http.server` in this folder, then open http://localhost:8000/.
Three.js r170 is MIT-licensed (`vendor/THREE-LICENSE`).

Planet looks are generated in the browser at load (`textures.js`: seeded noise, craters, bands, rings) — no image files, no third-party textures. Stylised, not photographic; feature placement (e.g. Great Red Spot, Valles Marineris, Olympus Mons) is approximate.

## Voice (kid mode)
Spoken lines are pre-recorded clips in `voice/` (65 MP3s, mono 24 kHz, 32 kbps, ~0.75 MB total), played with Web Audio after the Start tap. If a clip fails to load, the app falls back to the browser's speech voice (a male voice where available, pitch 0.9, rate 0.85). The bubble text always comes from the same `voice/lines.json` entry as the clip.

- Voice: **Kokoro-82M v1.0**, speaker `bm_george`, speed 0.85 — model weights licensed **Apache-2.0** (https://huggingface.co/hexgrad/Kokoro-82M), run via **kokoro-onnx** (MIT, https://github.com/thewh1teagle/kokoro-onnx).
- Rebuild after editing `voice/lines.json`:
  `pip install kokoro-onnx soundfile` (plus ffmpeg), download `kokoro-v1.0.onnx` and `voices-v1.0.bin`, then
  `KOKORO_MODEL=... KOKORO_VOICES=... python tools/build-voice.py` (only changed lines are regenerated).
