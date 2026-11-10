// Screen boxes of the fixed controls on a 412 × 915 phone, for the DOM emulation (linkedom has no layout). Derived
// from style.css: #topbar at top 12 px (36 px chips), #ladder at top 56 px (24 px buttons + padding + border), the
// scale readout (.hud) at left 10 / bottom 10 (11 px text, 1.35 line height, 4/7 px padding, max 62vw) and the time
// bar (#gtime) at bottom 14, 24 px side margins, ~66 px tall. Estimates, not measured browser boxes.
export function phoneLayout(document, rect, W = 412, H = 915) {
 const set = (id, f) => { const el = document.getElementById(id); if (el) el.getBoundingClientRect = f; };
 set('topbar', () => rect(12, 12, W - 24, 36));
 set('ladder', () => rect(12, 56, W - 24, 32));
 set('gtime', () => rect(12, H - 14 - 66, W - 24, 66));
 return { hudRect(hud) { const lines = [...hud.children].filter(c => c.textContent).map(c => c.textContent); if (!lines.length) return null; const w = Math.min(W * 0.62, Math.max(...lines.map(t => t.length * 6.1)) + 14), h = lines.length * 14.85 + 8; return rect(10, H - 10 - h, w, h); } };
}
