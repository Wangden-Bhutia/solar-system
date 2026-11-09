# Solar System

Interactive 3D solar system (Three.js, vendored). Static site, no backend, no analytics.

- Tap/click a planet or label to fly the camera to it and open its info panel.
- Play/pause, speed slider (orbital speeds follow real orbital periods), trails and labels toggles, reset view.
- Planet sizes are to scale with each other (Sun shown at 1/5 size); distances are shrunk (25 × AU^0.6). A "Real scale" button shows true sizes and distances. Earth coastlines: Natural Earth (public domain). Facts from NASA's Planetary Fact Sheet (rounded); moon counts for Jupiter and Saturn keep changing.

Run locally: `python3 -m http.server` in this folder, then open http://localhost:8000/.
Three.js r170 is MIT-licensed (`vendor/THREE-LICENSE`).

Planet looks are generated in the browser at load (`textures.js`: seeded noise, craters, bands, rings) — no image files, no third-party textures. Stylised, not photographic; feature placement (e.g. Great Red Spot, Valles Marineris, Olympus Mons) is approximate.

## Voice (kid mode)
Spoken lines are pre-recorded clips in `voice/` (80 MP3s, mono 24 kHz, 32 kbps, 1,063,168 bytes total), played with Web Audio after the Start tap. If a clip fails to load, the app falls back to the browser's speech voice (a male voice where available, pitch 0.9, rate 0.85). The bubble text always comes from the same `voice/lines.json` entry as the clip.

- Voice: **Kokoro-82M v1.0**, speaker `bm_george`, speed 0.85 — model weights licensed **Apache-2.0** (https://huggingface.co/hexgrad/Kokoro-82M), run via **kokoro-onnx** (MIT, https://github.com/thewh1teagle/kokoro-onnx).
- Rebuild after editing `voice/lines.json`:
  `pip install kokoro-onnx soundfile` (plus ffmpeg), download `kokoro-v1.0.onnx` and `voices-v1.0.bin`, then
  `KOKORO_MODEL=... KOKORO_VOICES=... python tools/build-voice.py` (only changed lines are regenerated).


## Earth → Moon → neighbours adventure
Start with a tap on Earth, visit its Moon, then zoom out to discover Mars and Saturn. Four short narrated stops are child-paced: tap the world or use the single “Show me”/“Visit Moon” button. Correct visits explain one thing; another choice gets a gentle reminder without losing progress. The scene pauses orbital motion during the adventure so targets stay put. “Explore freely” exits; Replay starts over. Existing Find it games and saved stickers remain available.

The existing procedural Moon is now selectable and has its own close-up and facts. Its diameter ratio is preserved; its gap from Earth is deliberately shortened in the default/kid views. Guided views state this and narration explains it. Grown-up Real scale retains the actual mean Earth–Moon distance ratio. The surface is illustrative, not a mapped lunar atlas. Real Earth continent data, planet textures and the two existing scale choices are unchanged.

### Voice and mobile checks
The Start/Listen/Replay taps (or keyboard activation) unlock/resume Web Audio directly before clip loading. Repeat uses cached decoded clips. Missing clips or unavailable Web Audio use Web Speech (a male voice if the device offers one); fetching is bounded, speech has a watchdog, and cancelled sequences cannot restart later. Going to another app stops speech; returning offers a Listen reminder rather than autoplay. Muting stops narration immediately; unmuting repeats the current line. Actual available fallback voices depend on the device.

Run `npm test` (Node 24; no dependencies) for mission state, fake-DOM interaction wiring, real Three.js scene-graph/scale math with a fake renderer, mocked audio/network/cancellation tests, voice manifest consistency, and static 320/360/412px toolbar fit contracts. Run `python3 tools/check-voice.py` (ffprobe installed) to validate every MP3's channel count, sample rate, bitrate and duration. These are NOT browser-rendering or real Android tests. Phone visual review and actual Android Chrome audio interruption testing are still required before merging. Preview: `python3 -m http.server 8770`.
