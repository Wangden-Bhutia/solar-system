// Opt-in zoom diagnostics for real-browser testing. Off unless the page URL has ?zoomlog (or ?zoomlog=bright);
// then window.__zoomlog records one row per animation frame into a bounded buffer, in memory only: no network,
// no storage, no analytics. Nothing here changes what the app draws.
//   __zoomlog.start() / stop()       record (start clears the buffer)
//   __zoomlog.drive({ rate, to })    a steady synthetic pinch through the app's own zoom input: rate = gesture Z
//                                    per second (+ out, − in; Z = ln distance in ly; inside the compressed Solar
//                                    System the represented Z moves 1/viewRate faster), until Z reaches `to` or stop()
//   __zoomlog.rows()                 the rows: { t, dt, Z, dZ, level, seam, blend, ...extra }
//   __zoomlog.summary()              frame-time and dZ/dt statistics, worst dZ/dt step and where it happened
//   __zoomlog.csv()                  the rows as CSV text (copy from the console)
//   __zoomlog.json()                 the rows and summary as JSON text (copy(__zoomlog.json()) in DevTools)
// extra(row) (optional) adds fields per row, e.g. anchor position and screen brightness (lab.js supplies it).
export function createZoomLog({ input, z, extra, cap = 36000 } = {}) {
  const q = globalThis.location?.search || '';
  if (!/[?&]zoomlog(=|&|$)/.test(q)) return null;
  const mode = (q.match(/[?&]zoomlog=([^&]*)/) || [])[1] || '1';
  let rows = [], on = false, t0 = 0, lastZ = null, drive = null, lastNow = 0;
  const now = () => globalThis.performance?.now?.() ?? Date.now();
  const api = {
    mode,
    start() { rows = []; on = true; t0 = now(); lastZ = null; lastNow = t0; return 'recording'; },
    stop() { on = false; drive = null; return `${rows.length} frames`; },
    // dt: the frame's step (s) as the app saw it; Z: the zoom coordinate after this frame's zoom step.
    frame(dt, Z, bridge, level) {
      const t = now();
      if (drive) { const step = drive.rate * Math.min(0.05, (t - (drive.last || t)) / 1000); drive.last = t; if (step) input(step); if (drive.to != null && (drive.rate > 0 ? z() >= drive.to : z() <= drive.to)) drive = null; }
      if (!on) return;
      if (rows.length >= cap) rows.shift();
      const row = { t: +(t - t0).toFixed(2), frameMs: +(t - lastNow).toFixed(2), dt: +(dt * 1000).toFixed(2), Z: +Z.toFixed(5), dZ: lastZ == null ? 0 : +(Z - lastZ).toFixed(6), level, seam: bridge?.pair || '', blend: bridge ? +bridge.t.toFixed(4) : null };
      lastNow = t; lastZ = Z; if (extra) Object.assign(row, extra(row));
      rows.push(row);
    },
    drive({ rate = 0.6, to = null } = {}) { drive = { rate, to, last: 0 }; if (!on) api.start(); return 'driving'; },
    rows: () => rows,
    json() { return JSON.stringify({ cap, rows, summary: api.summary?.() ?? null }); },
    csv() { if (!rows.length) return ''; const k = Object.keys(rows[rows.length - 1]); return [k.join(','), ...rows.map(r => k.map(x => r[x] ?? '').join(','))].join('\n'); },
    summary() {
      const ms = rows.slice(1).map(r => r.frameMs).sort((a, b) => a - b), pct = p => ms.length ? ms[Math.min(ms.length - 1, Math.floor(p * ms.length))] : null;
      let worst = { step: 0 };
      for (let i = 2; i < rows.length; i++) { const a = rows[i - 1], b = rows[i]; if (!(a.frameMs > 0 && b.frameMs > 0)) continue; const va = a.dZ / a.frameMs * 1000, vb = b.dZ / b.frameMs * 1000, s = Math.abs(vb - va); if (s > worst.step) worst = { step: +s.toFixed(4), at: b.t, Z: b.Z, seam: b.seam, level: b.level }; }
      return { frames: rows.length, frameMs: { median: pct(0.5), p95: pct(0.95), max: ms.at(-1) ?? null, over50: ms.filter(x => x > 50).length }, worstDZdtStep: worst, zRange: rows.length ? [rows[0].Z, rows.at(-1).Z] : null };
    },
  };
  globalThis.__zoomlog = api;
  return api;
}
