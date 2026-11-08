# Solar System

Interactive 3D solar system (Three.js, vendored). Static site, no backend, no analytics.

- Tap/click a planet or label to fly the camera to it and open its info panel.
- Play/pause, speed slider (orbital speeds follow real orbital periods), trails and labels toggles, reset view.
- Sizes and distances are stylised — **not to scale**. Facts from NASA's Planetary Fact Sheet (rounded); moon counts for Jupiter and Saturn keep changing.

Run locally: `python3 -m http.server` in this folder, then open http://localhost:8000/.
Three.js r170 is MIT-licensed (`vendor/THREE-LICENSE`).

Planet looks are generated in the browser at load (`textures.js`: seeded noise, craters, bands, rings) — no image files, no third-party textures. Stylised, not photographic; feature placement (e.g. Great Red Spot, Valles Marineris, Olympus Mons) is approximate.
