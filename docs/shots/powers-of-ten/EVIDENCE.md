# Powers of Ten zoom: evidence and acceptance status (draft, NOT fully accepted)

Branch `feature/powers-of-ten-zoom` from main `da793b8`. Code under test is **436539b**. This file was added by a docs-only commit after it.

## Commits

| Commit | Content |
|---|---|
| 6df419e | Phase 1: one zoom coordinate Z with momentum |
| 3f9fa4c | Phase 2: per-object LOD replaces the veil; one continuous anchor label |
| e13308c | Phase 3: sourced transition structures |
| b26ba94 | Phase 4: HUD, reduced motion, clip planes |
| 1db0378 | Docs and before-strips |
| 424a795 | Exact proxies at the outer seams |
| 40d748f | Seam light: copy LOD centre fix, 1/D² dimming of point clouds |
| 436539b | Shared density thinning; queued ladder trips; inner planets merge into the Sun; label safe zone; zoomlog JSON |

Test counts: 141 → 151 → 155 → 165 → 165 → 166 → 167 → **168/168** (`npm test` at 436539b). `node --check` and `git diff --check` are clean. All tests run in node with linkedom and a fake renderer: they are scene-graph arithmetic, not GPU pixels.

## Browser evidence for 436539b

Source: one app tab, 412×915, Chromium, 4× CPU throttle, raw captures in `solar-system-shots/powers-of-ten/after-436539b/`.

### Performance

Last 8 s of each trace, both settled in Local. Renderer main thread only; same categories and filters for both traces.

| | Production control (da793b8, single tab, 18.56 s) | 436539b (plain URL, no readPixels, 26.66 s) |
|---|---|---|
| DrawFrame rate | 23.4 /s | 52.0 /s |
| Frame interval median | 41.6 ms | 18.9 ms |
| Frame interval p95 | 51.6 ms | 22.6 ms |
| Long tasks > 50 ms | 1.38 /s | 0.00 /s |
| Whole trace | 20.3 frames/s, median 43.7 ms, p95 86.4 ms; 63 long tasks (5 over 100 ms) | 44.6 frames/s, median 20.2 ms, p95 32.8 ms, max 101.6 ms; 23 long tasks (0 over 100 ms, max 100.0 ms) |

Caveats:
- The control's settled-Galaxy screenshot suggested a stale starfield before recording.
- The two traces have different lengths and paths, so only the rates and the 8 s window are compared.
- Software GL; this is not a mid-range Android device.

### Observed in the browser

- **Fixed:** the white Milky Way blob, the lilac colour jump and the Laniakea streak are gone; the Sun is visible at about 400 AU; a rapid Galaxy-then-Laniakea tap carries out the latest tap.
- **Remaining:**
  - Makemake's label sits under the top menu (the Solar labels don't use the new safe zone).
  - Late in Universe, the Local Group, Virgo and Fornax labels overlap.
  - The pills lag the view slightly.
  - In settled Universe at 10 Gly across, a white pile at Laniakea is visible.
  - **Untested in a real browser:** VOYAGE, Back, reset, reduced motion, offline.

## Zoom log (`?zoomlog=bright`, `__zoomlog.drive({ rate: 3 })`, 25 s, Z −7.69 → 26.29, 562 rows)

- **Z per frame:** no negative dZ, no zero dZ before the Universe clamp, and no jump larger than 0.25 in Z.
  - The summary's "worst dZ/dt step 3.12" is the drive starting (0 → 3 Z/s) at t = 151 ms in Solar.
  - Of the 562 rows, 316 sit at the Z = 26.29 clamp.
- **Z rate is uneven, but the cause is the driver and the compressed Solar rate, not a seam:**
  - Driver: the synthetic driver caps its step at 50 ms of wall time. 427 frames were slower than 50 ms (readPixels overhead), so slow frames advance less Z per wall-second (down to 1.8 Z/s).
  - Solar rate: inside the compressed Solar System the represented Z moves 1/viewRate faster, by design (5 Z/s there).
  - Zoom input smoothing spreads steps across frames.
  - No seam open, settle, clamp or clock rewind shows a jump.
  - **Verdict:** in-browser uniform Z velocity is UNVERIFIED (not shown uniform under this driver at 4× CPU). A real pinch has not been measured.
- **Brightness:**
  - `lumCentre` is the mean of the 48×48 px centre patch, and `lumAnchor` is a 16×16 patch under the anchor (86 seam rows). **Neither is total-screen brightness.**
  - Large centre-patch changes, none inside a seam:

    | Scale | Z | Centre patch |
    |---|---|---|
    | Universe | 24.11 → 24.26 | 0.599 → 0.140 |
    | Solar | about −4.9 | 0.29 → 0.48 |
    | Stars | about −0.15 | 0.47 → 0.25 |
    | Laniakea | about 18.5 | 0.47 → 0.25 |

  - These are rows about 45–110 ms apart while objects cross the 48 px patch, so they are not proof of a full-view flicker either way.
  - **Verdict:** ≤ 8% brightness change per frame across the full view is **NOT proven**.

## Byte budget (deploy copy list in pages.yml)

| | Raw | Text gzipped + binaries |
|---|---|---|
| main | 4,725,633 | 3,881,597 |
| 436539b | 4,900,912 | 3,979,879 |

- Against the 4 MB target: raw is over (main already was); compressed is under 4,000,000 by about 20 kB.
- docs/ is not deployed.

## Strips (sparse captures, ladder taps, 412×915)

- **Before** (main da793b8): `before/*.jpg`.
- **After** (436539b): `after/*_ladder_436539b.jpg` for Solar→Stars, Galaxy→Local, Local→Laniakea and Laniakea→Universe.
  - **No after-capture exists for Stars→Galaxy.**
  - The Galaxy→Local after-frames are all still at the Galaxy scale (the start of the trip), so that seam itself was not captured.
- **Paired** before/after: `before-after_436539b.jpg`.
