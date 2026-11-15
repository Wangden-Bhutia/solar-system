// The journey inward: a full-screen view that zooms from Earth down to one carbon atom in a little girl's hand.
// Pinch, scroll or drag up and down to zoom; the arrows glide one step at a time; Play goes all the way, pausing at
// each step. Zooming out past Earth closes it. Data: inward-data.js; the 3D scene: inward-world.js.
import { RUNGS, Z_MAX, Z_MIN, rungAt, formatMetres, compareWithYou } from './inward-data.js';
import { createZoomController, wheelZ, pinchZ } from './zoom.js';

// The journey spans 34 powers of ten, so the gestures move further than in space: twice the app's pinch and wheel.
const GAIN = 2, DRAG = 0.011; /* ln units per pixel of one-finger drag */
const reducedMotion = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const ease = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;

export function createInward({ onOpen, onClose } = {}) {
  let root, canvas, card, here, txt, note, readout, dots, prev, next, playBtn, world, worldTry = false, failed = false, opener = null;
  let raf = 0, last = 0, glide = null, play = null, shown = null;
  const zc = createZoomController({ reduced: reducedMotion });
  const idx = r => RUNGS.indexOf(r);
  function build() {
    root = document.createElement('section'); root.className = 'inward cyear'; root.hidden = true; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.tabIndex = -1; root.setAttribute('aria-label', 'Journey inward');
    root.innerHTML = `<canvas class="iw-3d cy-3d" aria-hidden="true"></canvas><div class="cy-top"><button type="button" class="cy-x" aria-label="Close the journey inward"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button><div class="cy-head"><strong>Journey inward</strong><span>From Earth to one atom, a power of ten at a time. Pinch, scroll or drag to zoom.</span></div></div>
 <p class="iw-read" aria-live="off"></p>
 <div class="cy-main iw-card"><p class="cy-kick iw-here"></p><p class="cy-text iw-text"></p><p class="iw-note"></p></div>
 <div class="cy-nav"><span class="cy-dots" aria-live="polite"></span><div class="cy-ctl"><button type="button" class="cy-prev" aria-label="Zoom out a step"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><button type="button" class="cy-play" aria-label="Play the journey" data-state="play"><svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg><svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg><svg class="i-replay" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a7 7 0 1 0 2.2-5.1M5 4.5v4h4"/></svg></button><button type="button" class="cy-next" aria-label="Zoom in a step"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button></div><span class="cy-spacer"></span></div>`;
    document.body.appendChild(root);
    const q = s => root.querySelector(s); canvas = q('.iw-3d'); card = q('.iw-card'); here = q('.iw-here'); txt = q('.iw-text'); note = q('.iw-note'); readout = q('.iw-read'); dots = q('.cy-dots'); prev = q('.cy-prev'); next = q('.cy-next'); playBtn = q('.cy-play');
    q('.cy-x').onclick = close; prev.onclick = () => step(-1); next.onclick = () => step(1); playBtn.onclick = () => play ? stopPlay() : startPlay();
    root.addEventListener('keydown', e => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') step(1); else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') step(-1); });
    // gestures on the picture (not on the buttons): wheel, two-finger pinch, one-finger drag (up = in)
    root.addEventListener('wheel', e => { if (e.target.closest('button')) return; e.preventDefault(); user(); zc.nudge(GAIN * wheelZ(e.deltaY, e.deltaMode, e.ctrlKey)); }, { passive: false });
    const pts = new Map(); let spread = 0, lastY = null;
    const spreadOf = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    root.addEventListener('pointerdown', e => { if (e.target.closest('button,a')) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); root.setPointerCapture?.(e.pointerId); user(); if (pts.size === 2) { spread = spreadOf(); lastY = null; } else lastY = e.clientY; });
    root.addEventListener('pointermove', e => { const p = pts.get(e.pointerId); if (!p) return; p.x = e.clientX; p.y = e.clientY; const now = performance.now();
      if (pts.size === 2) { const d = spreadOf(); if (spread > 0 && d > 0) zc.drag(GAIN * pinchZ(d / spread), now); spread = d; }
      else if (pts.size === 1 && lastY != null) { zc.drag((e.clientY - lastY) * DRAG, now); lastY = e.clientY; } });
    const up = e => { if (!pts.delete(e.pointerId)) return; zc.release(performance.now()); spread = 0; lastY = pts.size === 1 ? [...pts.values()][0].y : null; };
    root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up);
  }
  // any touch of the controls by hand stops a glide and Play
  function user() { glide = null; stopPlay(); }
  const W = () => Math.exp(zc.z);
  function paint(force) {
    const w = W(), r = rungAt(w);
    readout.textContent = `Width of view: ${formatMetres(w)} · ${compareWithYou(w)}`;
    if (r !== shown || force) { shown = r; here.textContent = r.here; txt.textContent = r.text; note.textContent = r.note || ''; note.hidden = !r.note;
      const k = idx(r); dots.innerHTML = `<b>${k + 1}</b> / ${RUNGS.length}`; dots.setAttribute('aria-label', `Step ${k + 1} of ${RUNGS.length}`); }
    const k = idx(r), at = Math.abs(Math.log10(w / r.w)) < 0.05;
    prev.disabled = k === 0 && (at || w > r.w); next.disabled = k === RUNGS.length - 1 && (at || w < r.w);
    card.classList.toggle('travel', !!glide);
  }
  // glide to a step's width, smoothly in powers of ten
  function glideTo(k, then) {
    const r = RUNGS[Math.max(0, Math.min(RUNGS.length - 1, k))], a = zc.z, b = Math.log(r.w); zc.stop();
    if (reducedMotion() || Math.abs(a - b) < 1e-3) { zc.set(b); glide = null; paint(); then?.(); return; }
    glide = { a, b, t0: performance.now(), dur: Math.min(6000, 1400 + Math.abs(a - b) / Math.LN10 * 650), then };
  }
  function step(d) { stopPlay(); glide = null; const w = W(), r = rungAt(w), k = idx(r), at = Math.abs(Math.log10(w / r.w)) < 0.05;
    /* not resting on a step: the first press goes to the nearest one in that direction */
    const target = at ? k + d : (d > 0 ? (w > r.w ? k : k + 1) : (w < r.w ? k : k - 1)); glideTo(target); }
  function startPlay() { const k = idx(rungAt(W())); if (k >= RUNGS.length - 1) { zc.set(Math.log(RUNGS[0].w)); paint(true); }
    play = true; playBtn.dataset.state = 'pause'; playBtn.setAttribute('aria-label', 'Pause'); advance(); }
  function advance() { if (!play) return; const k = idx(rungAt(W()));
    if (k >= RUNGS.length - 1 && Math.abs(Math.log10(W() / RUNGS[k].w)) < 0.05) { stopPlay(true); return; }
    glideTo(Math.min(RUNGS.length - 1, k + (Math.abs(Math.log10(W() / RUNGS[k].w)) < 0.05 || W() < RUNGS[k].w ? 1 : 0)), () => { if (!play) return; const r = rungAt(W()); play = setTimeout(advance, Math.min(7000, 3000 + (r.text.length + (r.note || '').length) * 22)); }); }
  function stopPlay(done) { if (typeof play === 'number') clearTimeout(play); play = null; if (!playBtn) return; playBtn.dataset.state = done ? 'replay' : 'play'; playBtn.setAttribute('aria-label', done ? 'Play again' : 'Play the journey'); }
  function tick(now) {
    if (!root || root.hidden) return; raf = requestAnimationFrame(tick); const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (glide) { const k = Math.min(1, (now - glide.t0) / glide.dur); zc.set(glide.a + (glide.b - glide.a) * ease(k)); if (k >= 1) { const t = glide.then; glide = null; t?.(); } }
    else { const res = zc.step(dt, { min: Z_MIN, max: Z_MAX + 0.5 }); if (zc.z > Z_MAX + 0.35 && res.dz > 0) { close(); return; } }
    world?.setW(W()); paint();
  }
  async function load() {
    if (world || worldTry || failed) return; worldTry = true;
    try { world = await createInwardWorld(canvas); world.setW(W()); canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); failed = true; world?.stop(); world = null; showFail(); }, { once: true }); if (!root.hidden) { world.resize(); world.start(); } }
    catch (err) { failed = true; showFail(); }
  }
  const createInwardWorld = (...a) => import('./inward-world.js').then(m => m.createInwardWorld(...a));
  function showFail() { if (note) { note.hidden = false; note.textContent = 'This journey needs 3D graphics (WebGL), which are not available here.'; } }
  function open() {
    if (!root) build(); opener = document.activeElement; stopPlay(); glide = null; zc.set(Math.log(RUNGS[0].w)); shown = null;
    root.hidden = false; document.body.classList.add('cyear-on', 'inward-on'); onOpen?.(); paint(true);
    if (world) { world.setW(W()); world.resize(); world.start(); } else load(); if (failed) showFail();
    cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(tick); root.focus?.({ preventScroll: true });
  }
  function close() {
    if (!root || root.hidden) return; stopPlay(); glide = null; cancelAnimationFrame(raf); root.hidden = true; world?.stop();
    document.body.classList.remove('cyear-on', 'inward-on'); onClose?.();
    const back = opener?.isConnected && opener.offsetParent ? opener : document.querySelector('#settings summary'); back?.focus?.({ preventScroll: true }); opener = null;
  }
  return { open, close, get isOpen() { return !!root && !root.hidden; }, get width() { return W(); }, glideTo, _step: step };
}
