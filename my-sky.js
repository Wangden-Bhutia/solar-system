// "My sky": tonight's real sky from where you stand, drawn on a 2D canvas. Drag to look around, pinch or scroll to
// zoom, tap anything to learn what it is and how far away. Positions come from sky-math.js (see docs/sources.md).
// Finding things: a Tonight list says what is up and when; tapping a name turns the view to it, with an arrow at the
// screen's edge when it is out of view; Aim uses the phone's compass and tilt. Your location is read once, only when you tap, and is never stored or sent anywhere.
import { skyAt, lookText, compass, visibility, heightWord, aimDirection, turnBy, bodyAltAz } from './sky-math.js';

const RAD = Math.PI / 180;
export const PLACES = [
  { name: 'Siliguri', lat: 26.7271, lon: 88.3953 }, { name: 'Delhi', lat: 28.6139, lon: 77.209 }, { name: 'Mumbai', lat: 19.076, lon: 72.8777 },
  { name: 'London', lat: 51.5072, lon: -0.1276 }, { name: 'New York', lat: 40.7128, lon: -74.006 }, { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
// B − V colour index → a star colour (blue-white → white → yellow → orange).
export function starColor(bv) {
  const k = [[-0.3, [155, 176, 255]], [0, [235, 240, 255]], [0.6, [255, 244, 225]], [1.0, [255, 214, 160]], [1.6, [255, 170, 100]]];
  const b = clamp(bv, -0.3, 1.6); for (let i = 1; i < k.length; i++) if (b <= k[i][0]) { const t = (b - k[i - 1][0]) / (k[i][0] - k[i - 1][0]); return k[i - 1][1].map((v, j) => Math.round(lerp(v, k[i][1][j], t))); }
  return k[k.length - 1][1];
}
// The sky's colour at an altitude, given the Sun's altitude: night, then dusk near the horizon, then day.
export function skyColor(sunAlt, alt) {
  const night = [2, 5, 14], dusk = [34, 44, 86], day = [44, 76, 128];
  const tw = clamp((sunAlt + 18) / 18, 0, 1), dy = clamp(sunAlt / 8, 0, 1), glow = Math.max(0, 1 - alt / 55) * tw;
  return night.map((n, i) => Math.round(lerp(lerp(n, dusk[i], glow), day[i], dy)));
}
export const starAlpha = sunAlt => Math.max(0.3, clamp((-sunAlt - 1) / 9, 0, 1));
const fmtTime = d => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export function createMySky({ onLeave } = {}) {
  let root = null, cv, ctx, lowCv, info, whenEl, placeEl, noteEl, slider, sel, ro, chipsEl, aimBtn, target = null, ref = null, tonightList = [], aiming = false, aimVec = null, aimSeen = false, turning = 0, auto = true;
  let sky = null, place = PLACES[0], located = false, offsetH = 0, az0 = 180, alt0 = 26, fov = 75, jumped = false, selected = null, dirty = true, raf = 0, tick = 0, W = 0, H = 0, dpr = 1;
  const pts = new Map(); // pointer id → {x, y}
  let drag = null, pinch0 = 0;

  function build() {
    root = document.createElement('section'); root.id = 'mysky'; root.className = 'mysky'; root.hidden = true; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'My sky');
    root.innerHTML = `<canvas class="mysky-cv" aria-label="The sky above you. Drag to look around."></canvas>
 <div class="mysky-top"><button type="button" class="mysky-x" aria-label="Close My sky">✕</button><div class="mysky-title"><strong>My sky</strong><span class="mysky-place"></span><span class="mysky-when"></span></div></div>
 <div class="mysky-chips" role="list" aria-label="Tonight"></div>
 <p class="mysky-note" aria-live="polite"></p>
 <div class="mysky-card" hidden></div>
 <div class="mysky-bar"><label class="mysky-time">Time <input type="range" min="-12" max="12" step="0.25" value="0" aria-label="Hours from now"></label><select class="mysky-sel" aria-label="Place"></select><button type="button" class="mysky-now">Now</button></div>
 <div class="mysky-acts"><button type="button" class="mysky-aim" aria-pressed="false">◎ Aim phone</button><button type="button" class="mysky-leave primary">Leave Earth ↗</button></div>
 <p class="mysky-src">Sun, Moon and planets: JPL and Astronomical Almanac formulas (about ½° accurate). Stars: HYG catalogue. Dot sizes are nominal.</p>`;
    document.body.appendChild(root);
    cv = root.querySelector('.mysky-cv'); ctx = cv.getContext('2d'); lowCv = document.createElement('canvas');
    info = root.querySelector('.mysky-card'); whenEl = root.querySelector('.mysky-when'); placeEl = root.querySelector('.mysky-place'); noteEl = root.querySelector('.mysky-note');
    slider = root.querySelector('input[type=range]'); sel = root.querySelector('.mysky-sel'); chipsEl = root.querySelector('.mysky-chips'); aimBtn = root.querySelector('.mysky-aim'); aimBtn.onclick = () => (aiming ? stopAim() : startAim());
    sel.innerHTML = '<option value="gps">My location</option>' + PLACES.map((p, i) => `<option value="${i}">${p.name}</option>`).join('');
    root.querySelector('.mysky-x').onclick = close;
    root.querySelector('.mysky-leave').onclick = () => { close(); onLeave?.(); };
    root.querySelector('.mysky-now').onclick = () => { offsetH = 0; slider.value = 0; jumped = false; recompute(); buildTonight(); noteEl.hidden = !noteEl.textContent; };
    slider.oninput = () => { offsetH = Number(slider.value); jumped = false; recompute(); };
    sel.onchange = () => { if (sel.value === 'gps') locate(); else { place = PLACES[Number(sel.value)]; located = false; resetTime(); noteEl.textContent = ''; recompute(true); buildTonight(); target = null; autoAim(); } };
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture?.(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); drag = { x: e.clientX, y: e.clientY, moved: 0 }; if (pts.size === 2) pinch0 = spread(); });
    cv.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return; const p = pts.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 2) { const s = spread(); if (pinch0 > 0) { fov = clamp(fov * pinch0 / s, 20, 120); pinch0 = s; dirty = true; schedule(); } return; }
      if (drag) { drag.moved += Math.abs(dx) + Math.abs(dy); if (aiming) return; const k = fov / Math.max(1, H) * 1.05; az0 = (az0 - dx * k + 360) % 360; alt0 = clamp(alt0 + dy * k, -15, 90); dirty = true; schedule(); }
    });
    const up = e => { const wasTap = drag && drag.moved < 6 && pts.size === 1; pts.delete(e.pointerId); if (wasTap) pick(e.clientX, e.clientY); if (pts.size < 2) pinch0 = 0; if (!pts.size) drag = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', e => { pts.delete(e.pointerId); drag = null; });
    cv.addEventListener('wheel', e => { e.preventDefault(); fov = clamp(fov * Math.exp(e.deltaY * 0.001), 20, 120); dirty = true; schedule(); }, { passive: false });
    root.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    ro = globalThis.ResizeObserver ? new ResizeObserver(() => { size(); }) : null; ro?.observe(root); globalThis.addEventListener?.('resize', size);
  }
  const spread = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  function size() { if (!root || root.hidden) return; const r = root.getBoundingClientRect(); dpr = Math.min(2, globalThis.devicePixelRatio || 1); W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height)); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px'; dirty = true; schedule(); }
  const now = () => new Date(Date.now() + offsetH * 3600000);
  function recompute(recentre) {
    const key = selected && (selected.kind ? 'b:' + selected.name : 's:' + selected.i); sky = skyAt(now(), place.lat, place.lon);
    selected = !key ? null : key[0] === 'b' ? [sky.sun, sky.moon, ...sky.planets].find(o => 'b:' + o.name === key) || null : sky.stars[Number(key.slice(2))] || null;
    if (recentre) { az0 = place.lat >= 0 ? 180 : 0; alt0 = 26; }
    if (recentre && !jumped && offsetH === 0 && sky.sun.alt > -2) { const h = tonight(); if (h != null) { offsetH = h; slider.value = h; jumped = true; sky = skyAt(now(), place.lat, place.lon); } }
    placeEl.textContent = (located ? 'Where you are' : place.name) + ` · ${Math.abs(place.lat).toFixed(1)}°${place.lat >= 0 ? 'N' : 'S'} ${Math.abs(place.lon).toFixed(1)}°${place.lon >= 0 ? 'E' : 'W'}`;
    whenEl.textContent = (offsetH === 0 ? 'Now · ' : `${offsetH > 0 ? '+' : '−'}${Math.abs(offsetH)} h · `) + now().toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + fmtTime(now());
    const sa = sky.sun.alt; const lines = []; if (jumped && offsetH > 0) lines.push('It is daytime here, so this is tonight’s sky. Tap Now for the sky right now.'); else if (sa > -0.8) lines.push('The Sun is up. The stars are still there, drawn faintly.'); else if (sa > -12) lines.push('Twilight: only the brightest stars show yet.');
    if (!located && sel.value === 'gps') lines.push('Showing ' + place.name + ' until your location is found.');
    noteEl.textContent = lines.join(' '); noteEl.hidden = !lines.length; paintCard(); dirty = true; schedule();
  }
  // ---- Tonight: what is up, until when, and what rises later (from the moment the sky was opened or the place changed) ----
  const hhmm = d => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  function buildTonight() {
    ref = now(); tonightList = [];
    for (const name of ['Moon', 'Venus', 'Jupiter', 'Saturn', 'Mars', 'Mercury']) {
      const v = visibility(name, ref, place.lat, place.lon); let text, kind;
      if (v.upNow) { kind = 'up'; text = `${heightWord(v.nowPos.alt)} in the ${compass(v.nowPos.az)}${v.until ? ' · until ' + hhmm(v.until) : ''}`; }
      else if (v.next) { kind = 'later'; text = `from ${hhmm(v.next)}, ${compass(v.nextPos.az)}`; }
      else { kind = 'no'; text = v.nearSun ? 'lost in the Sun’s glare' : 'not up in the next day'; }
      tonightList.push({ name, kind, text, v });
    }
    tonightList.sort((a, b) => ({ up: 0, later: 1, no: 2 }[a.kind] - { up: 0, later: 1, no: 2 }[b.kind]));
    chipsEl.innerHTML = ''; for (const t of tonightList) { const b = document.createElement('button'); b.type = 'button'; b.className = 'mysky-chip ' + t.kind; b.setAttribute('role', 'listitem'); b.innerHTML = `<b>${t.name}</b><span>${t.text}</span>`; b.onclick = () => goTo(t); chipsEl.appendChild(b); }
  }
  function bodyNow(name) { return name === 'Moon' ? sky.moon : sky.planets.find(o => o.name === name); }
  // Turn the view to a body (the sky is drawn for the displayed time); keep an arrow on it until you tap empty sky.
  function goTo(t) {
    if (t.kind === 'no') { noteEl.textContent = t.name + ': ' + (t.v.nearSun ? 'too close to the Sun to see today.' : 'not above the horizon in the next day.'); noteEl.hidden = false; return; }
    if (t.kind === 'later') { const h = (t.v.next.getTime() + 600000 - Date.now()) / 3600000; if (Math.abs(h) <= 12) { offsetH = Math.round(h * 4) / 4; slider.value = offsetH; jumped = false; recompute(); } }
    const o = bodyNow(t.name); if (!o) return; target = { name: t.name }; selected = o; turnTo(o.az, o.alt); paintCard();
  }
  function turnTo(az, alt) {
    if (aiming) return; const a0 = az0, b0 = alt0, da = turnBy(az0, az), db = clamp(alt, 10, 75) - alt0, t0 = performance.now(), id = ++turning;
    const step = now_ => { if (id !== turning) return; const k = clamp((now_ - t0) / 450, 0, 1), e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; az0 = (a0 + da * e + 360) % 360; alt0 = b0 + db * e; dirty = true; draw(); if (k < 1) requestAnimationFrame(step); };
    if (globalThis.requestAnimationFrame) requestAnimationFrame(step); else { az0 = (a0 + da + 360) % 360; alt0 = b0 + db; dirty = true; schedule(); }
  }
  // On opening, turn to the brightest planet that is up (else the Moon), so there is something to see straight away.
  function autoAim() { const t = ['Venus', 'Jupiter', 'Saturn', 'Mars', 'Mercury', 'Moon'].map(n => tonightList.find(x => x.name === n)).find(x => x && x.kind === 'up'); if (t) { target = { name: t.name }; const o = bodyNow(t.name); if (o) { selected = o; turnTo(o.az, o.alt); paintCard(); } } }
  // ---- Aim: follow the phone's compass and tilt ----
  async function startAim() {
    const D = globalThis.DeviceOrientationEvent; if (!D) { noteEl.textContent = 'This device does not report its direction. Drag to look around instead.'; noteEl.hidden = false; return; }
    // iPhones ask on tap. If the answer is no (or the browser has no such question), no readings arrive and the check below says so.
    try { if (typeof D.requestPermission === 'function') await D.requestPermission(); } catch { /* the timeout below handles a refusal */ }
    aiming = true; aimSeen = false; aimVec = null; turning++; fov = 65; aimBtn.setAttribute('aria-pressed', 'true'); aimBtn.textContent = '◎ Aiming: tap to stop'; root.classList.add('aiming');
    noteEl.textContent = 'Hold the phone up and look through it. A phone compass can be 5–15° off: wave it in a figure of 8 to calibrate.'; noteEl.hidden = false;
    globalThis.addEventListener('deviceorientationabsolute', onOrient, true); globalThis.addEventListener('deviceorientation', onOrient, true);
    setTimeout(() => { if (aiming && !aimSeen) { stopAim(); noteEl.textContent = 'No compass reading came from this device. Drag to look around instead.'; noteEl.hidden = false; } }, 2000);
  }
  function stopAim() { aiming = false; aimBtn.setAttribute('aria-pressed', 'false'); aimBtn.textContent = '◎ Aim phone'; root?.classList.remove('aiming'); globalThis.removeEventListener('deviceorientationabsolute', onOrient, true); globalThis.removeEventListener('deviceorientation', onOrient, true); }
  function onOrient(e) {
    if (!aiming || e.beta == null || e.gamma == null) return; const isAbs = e.type === 'deviceorientationabsolute' || e.absolute === true;
    if (aimSeenAbs && !isAbs) return; if (isAbs) aimSeenAbs = true;
    let alpha = e.alpha; if (!isAbs && e.webkitCompassHeading != null) alpha = 360 - e.webkitCompassHeading; if (alpha == null) return; aimSeen = true;
    const d = aimDirection(alpha, e.beta, e.gamma), r = [Math.cos(d.alt * RAD) * Math.sin(d.az * RAD), Math.cos(d.alt * RAD) * Math.cos(d.az * RAD), Math.sin(d.alt * RAD)];
    aimVec = aimVec ? aimVec.map((v, i) => v + (r[i] - v) * 0.25) : r; // smooth the jitter
    az0 = (Math.atan2(aimVec[0], aimVec[1]) / RAD + 360) % 360; alt0 = clamp(Math.asin(clamp(aimVec[2], -1, 1)) / RAD, -15, 90); dirty = true; schedule();
  }
  let aimSeenAbs = false;
  // After dark, at least 14° of Sun below the horizon, within the slider's 12 hours (else stay on now).
  function tonight() { for (let h = 0.25; h <= 12; h += 0.25) if (skyAt(new Date(Date.now() + h * 3600000), place.lat, place.lon).sun.alt < -14) return h; return null; }
  const resetTime = () => { offsetH = 0; slider.value = 0; jumped = false; };
  function locate() {
    noteEl.textContent = 'Finding where you are…'; noteEl.hidden = false;
    const fail = why => { sel.value = '0'; place = PLACES[0]; located = false; resetTime(); recompute(true); buildTonight(); noteEl.textContent = why + ' Showing ' + place.name + '. Pick another place below.'; noteEl.hidden = false; };
    if (!globalThis.navigator?.geolocation) { fail('Location is not available here.'); return; }
    navigator.geolocation.getCurrentPosition(p => { place = { name: 'Your location', lat: p.coords.latitude, lon: p.coords.longitude }; located = true; resetTime(); recompute(true); buildTonight(); autoAim(); }, () => fail('Location was not shared.'), { timeout: 9000, maximumAge: 600000 });
  }
  // ---- projection: stereographic around the view direction ----
  function projector() {
    const a = az0 * RAD, h = alt0 * RAD, f = [Math.cos(h) * Math.sin(a), Math.cos(h) * Math.cos(a), Math.sin(h)], r = [Math.cos(a), -Math.sin(a), 0];
    const u = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]]; // f × r
    const up = (u[2] >= 0) ? u : u.map(v => -v); // screen-up has a positive vertical part
    const S = H / (2 * Math.tan(fov * RAD / 2)), cx = W / 2, cy = H / 2;
    return (alt, az) => { const ca = Math.cos(alt * RAD), v = [ca * Math.sin(az * RAD), ca * Math.cos(az * RAD), Math.sin(alt * RAD)], w = v[0] * f[0] + v[1] * f[1] + v[2] * f[2]; if (w < -0.6) return null; const k = 2 / (1 + w); return { x: cx + k * (v[0] * r[0] + v[1] * r[1]) * S, y: cy - k * (v[0] * up[0] + v[1] * up[1] + v[2] * up[2]) * S, w }; };
  }
  function drawBackground(sunAlt) {
    const lw = Math.max(8, Math.round(W / 5)), lh = Math.max(8, Math.round(H / 5)); lowCv.width = lw; lowCv.height = lh; const lc = lowCv.getContext('2d'), img = lc.createImageData(lw, lh);
    const a = az0 * RAD, h = alt0 * RAD, f = [Math.cos(h) * Math.sin(a), Math.cos(h) * Math.cos(a), Math.sin(h)], r = [Math.cos(a), -Math.sin(a), 0], u0 = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]], u = u0[2] >= 0 ? u0 : u0.map(v => -v), S = H / (2 * Math.tan(fov * RAD / 2));
    for (let j = 0; j < lh; j++) for (let i = 0; i < lw; i++) {
      const p = ((i + 0.5) / lw * W - W / 2) / S, q = -((j + 0.5) / lh * H - H / 2) / S, rho = Math.hypot(p, q), th = 2 * Math.atan(rho / 2), s = rho > 1e-9 ? Math.sin(th) / rho : 0, c = Math.cos(th);
      const vz = c * f[2] + s * (p * r[2] + q * u[2]), alt = Math.asin(clamp(vz, -1, 1)) / RAD; let col;
      if (alt >= 0) col = skyColor(sunAlt, alt); else { const d = clamp(-alt / 25, 0, 1), base = skyColor(sunAlt, 0); col = base.map(v => Math.round(lerp(v * 0.55, 4, d))); }
      const o = (j * lw + i) * 4; img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255;
    }
    lc.putImageData(img, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(lowCv, 0, 0, W, H);
  }
  function draw() {
    dirty = false; if (!sky || !W) return; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); const proj = projector(), sunAlt = sky.sun.alt, sa = starAlpha(sunAlt);
    drawBackground(sunAlt);
    // stars (below the horizon are hidden: the ground is in the way)
    for (const s of sky.stars) { if (s.alt < -0.5) continue; const p = proj(s.alt, s.az); if (!p) continue; if (p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) continue; const [r, g, b] = starColor(s.bv), rad = Math.max(0.55, 2.7 - 0.4 * s.mag), al = clamp(0.35 + (6.5 - s.mag) * 0.14, 0.3, 1) * sa; ctx.fillStyle = `rgba(${r},${g},${b},${al})`; ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, 6.2832); ctx.fill(); }
    // horizon line and compass points
    ctx.strokeStyle = 'rgba(243,200,135,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); let pen = false, last = null;
    for (let az = 0; az <= 360; az += 2) { const p = proj(0, az); if (!p || (last && Math.hypot(p.x - last.x, p.y - last.y) > 120)) { pen = false; last = null; if (!p) continue; } if (!pen) { ctx.moveTo(p.x, p.y); pen = true; } else ctx.lineTo(p.x, p.y); last = p; }
    ctx.stroke(); ctx.fillStyle = 'rgba(243,200,135,.9)'; ctx.font = '600 13px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [t, az] of [['N', 0], ['NE', 45], ['E', 90], ['SE', 135], ['S', 180], ['SW', 225], ['W', 270], ['NW', 315]]) { const p = proj(2.5, az); if (p && p.x > 8 && p.x < W - 8 && p.y > 8 && p.y < H - 8) ctx.fillText(t, p.x, p.y - 8); }
    // named stars, Moon, planets, Sun
    ctx.font = '12px system-ui,sans-serif'; ctx.textAlign = 'left';
    const label = (o, text, x, y) => { ctx.fillStyle = 'rgba(233,230,214,.92)'; ctx.fillText(text, x, y); };
    for (const s of sky.stars) { if (!s.name || s.alt < -0.5) continue; const p = proj(s.alt, s.az); if (p && p.x > 0 && p.x < W && p.y > 40 && p.y < H - 150) label(s, s.name, p.x + 7, p.y - 6); }
    const bodies = [...sky.planets, sky.moon, sky.sun];
    for (const o of bodies) {
      if (o.alt < -0.8) continue; const p = proj(o.alt, o.az); if (!p) continue;
      if (o.name === 'Sun') { const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 34); g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(0.3, 'rgba(255,210,120,.6)'); g.addColorStop(1, 'rgba(255,200,100,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 34, 0, 6.2832); ctx.fill(); }
      else if (o.name === 'Moon') { ctx.fillStyle = '#e8e4d4'; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, 6.2832); ctx.fill(); const sp = proj(sky.sun.alt, sky.sun.az); let ux = 1, uy = 0; if (sp) { const L = Math.hypot(sp.x - p.x, sp.y - p.y) || 1; ux = (sp.x - p.x) / L; uy = (sp.y - p.y) / L; } /* the lit side faces the Sun */ ctx.fillStyle = 'rgba(8,10,20,' + (1 - o.lit) * 0.85 + ')'; ctx.beginPath(); ctx.arc(p.x - ux * 7 * (1 - o.lit), p.y - uy * 7 * (1 - o.lit), 8.4, 0, 6.2832); ctx.fill(); }
      else { const rad = clamp(3.2 - 0.25 * o.mag, 2.6, 5.4); ctx.fillStyle = o.name === 'Mars' ? '#ff9b6b' : o.name === 'Venus' ? '#fff4d6' : o.name === 'Saturn' ? '#f1d9a0' : '#ffe9c4'; ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, 6.2832); ctx.fill(); }
      label(o, o.name, p.x + 12, p.y - 8);
    }
    if (selected) { const p = proj(selected.alt, selected.az); if (p) { ctx.strokeStyle = '#f3c887'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, 15, 0, 6.2832); ctx.stroke(); } }
    if (target) { const o = bodyNow(target.name); if (o && o.alt > -2) {
      const p = proj(o.alt, o.az), inside = p && p.x > 20 && p.x < W - 20 && p.y > 90 && p.y < H - 170;
      if (!inside) { const dAz = turnBy(az0, o.az), dAlt = o.alt - alt0, ang = Math.atan2(-dAlt, dAz * Math.max(0.3, Math.cos(alt0 * RAD))), cx = W / 2, cy = H / 2 - 30, rx = W / 2 - 40, ry = H / 2 - 150, k = 1 / Math.max(Math.abs(Math.cos(ang)) / rx, Math.abs(Math.sin(ang)) / ry), x = cx + Math.cos(ang) * k, y = cy + Math.sin(ang) * k;
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = '#f3c887'; ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-9, -11); ctx.lineTo(-4, 0); ctx.lineTo(-9, 11); ctx.closePath(); ctx.fill(); ctx.restore();
        const msg = `${target.name} · turn ${dAz >= 0 ? 'right' : 'left'} ${Math.round(Math.abs(dAz))}°${Math.abs(dAlt) > 8 ? (dAlt > 0 ? ', look up' : ', look down') : ''}`; ctx.font = '600 12px system-ui,sans-serif'; ctx.textAlign = x > W / 2 ? 'right' : 'left'; ctx.fillStyle = '#f3c887'; ctx.fillText(msg, clamp(x + (x > W / 2 ? -22 : 22), 10, W - 10), y + (y > H / 2 ? -14 : 18)); } } }
    cv._proj = proj;
  }
  function schedule() { if (raf || !root || root.hidden) return; raf = (globalThis.requestAnimationFrame || (f => setTimeout(f, 16)))(() => { raf = 0; if (dirty) draw(); }); }
  function pick(x, y) {
    if (!sky || !cv._proj) return; const r = cv.getBoundingClientRect(), px = x - r.left, py = y - r.top; let best = null, bd = 30;
    const test = (o, bias = 0) => { if (o.alt < -0.8) return; const p = cv._proj(o.alt, o.az); if (!p) return; const d = Math.hypot(p.x - px, p.y - py) - bias; if (d < bd) { bd = d; best = o; } };
    for (const o of [sky.sun, sky.moon, ...sky.planets]) test(o, 8); for (const s of sky.stars) if (s.mag < 4.2 || s.name) test(s, s.name ? 4 : 0);
    selected = best; if (!best) target = null; paintCard(); dirty = true; schedule();
  }
  function paintCard() {
    if (!selected) { info.hidden = true; return; } const o = selected, where = lookText(o.alt, o.az); let title = o.name || 'A star', fact = '';
    const yr = now().getFullYear();
    if (o.kind === 'Planet') fact = `${o.distAU.toFixed(2)} AU from Earth right now. Its light left ${(o.distAU * 8.317).toFixed(0)} minutes ago.`;
    else if (o.kind === 'Star') fact = `Our own star, ${o.distAU.toFixed(2)} AU away. Its light left ${(o.distAU * 8.317).toFixed(1)} minutes ago. Never look at it directly.`;
    else if (o.kind === 'Moon') fact = `${(Math.round(o.distKm / 1000) * 1000).toLocaleString('en-US')} km away, ${Math.round(o.lit * 100)}% lit. Its light left ${(o.distKm / 299792.458).toFixed(1)} seconds ago.`;
    else fact = `About ${o.ly < 100 ? Math.round(o.ly) : Math.round(o.ly / 10) * 10} light-years away. The light you see left it around ${yr - Math.round(o.ly)}.`;
    info.innerHTML = `<strong>${title}</strong><span>${where}</span><span>${fact}</span>`; info.hidden = false;
  }
  function open() {
    if (!root) build(); root.hidden = false; document.body.classList.add('mysky-on'); size(); selected = null; offsetH = 0; slider.value = 0; sel.value = 'gps'; located = false; jumped = false; target = null; recompute(true); buildTonight(); autoAim(); locate();
    tick = setInterval(() => { if (offsetH === 0) recompute(); }, 30000); root.querySelector('.mysky-x').focus?.({ preventScroll: true });
  }
  function close() { if (!root || root.hidden) return; stopAim(); root.hidden = true; document.body.classList.remove('mysky-on'); clearInterval(tick); }
  return { open, close, get isOpen() { return !!root && !root.hidden; }, state: () => ({ place, located, az0, alt0, fov, offsetH, selected }), onOrient, startAim, stopAim, tonight: () => tonightList, goTo, lookAt(az, alt) { az0 = az; alt0 = alt; dirty = true; schedule(); }, draw };
}
