// The cosmic year screen: step through 18 moments of the 13.8 billion years, each on its date in one calendar year.
// A bar shows where each falls in the year (nearly everything happens in the last weeks). Data and maths: cosmic-calendar.js.
import { createBackdrop } from './cosmic-backdrop.js';
import { createWorld } from './cosmic-world.js';
import { EVENTS, YEAR_SECONDS, AGE_YEARS, yearSeconds, eventDate, calendarAt, spanOnCalendar, agoText } from './cosmic-calendar.js';

// The bar is a lens on the year, always ending at midnight on 31 December. Each step picks the smallest window that holds it,
// so the bar zooms from the whole year down to the last few seconds, like the app zooms through space.
const D = 86400, SCALES = [[YEAR_SECONDS, 'The whole year'], [120 * D, 'The last 4 months'], [31 * D, 'The last month'], [4 * D, 'The last 4 days'], [D, 'The last day'], [3600, 'The last hour'], [60, 'The last minute'], [15, 'The last 15 seconds']];
export function scaleFor(ago) { const d = YEAR_SECONDS - yearSeconds(ago); let pick = SCALES[0]; for (const sc of SCALES) if (sc[0] >= d * 1.15) pick = sc; return pick; }

export function createCosmicYear({ onGo, onOpen, onClose } = {}) {
  let root, bar, marker, kick, ttl, when, txt, goBtn, prev, next, ageRow, ageIn, ageOut, dots, playBtn, mainEl, markSec = null, play = null, playRaf = 0, bg, world, worldTry, worldFailed = false, opener = null, scaleEl, gapEl, loEl, spansEl, S = YEAR_SECONDS, St = YEAR_SECONDS, tween = 0, i = 0;
  function build() {
    root = document.createElement('section'); root.id = 'cyear'; root.className = 'cyear'; root.hidden = true; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.tabIndex = -1; root.setAttribute('aria-label', 'The cosmic year');
    root.innerHTML = `<canvas class="cy-bg" aria-hidden="true"></canvas><canvas class="cy-3d" aria-hidden="true" hidden></canvas><div class="cy-top"><button type="button" class="cy-x" aria-label="Close the cosmic year"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button><div class="cy-head"><strong>The cosmic year</strong><span>13.8 billion years as one year: 1 January is the Big Bang, midnight on 31 December is now.</span></div></div>
 <div class="cy-main"><p class="cy-kick"></p><h2 class="cy-title"></h2><p class="cy-when"></p><p class="cy-text"></p>
 <label class="cy-age" hidden>How old are you? <input type="number" inputmode="numeric" min="0" max="120" value="80" aria-label="Your age in years"> <span class="cy-ageout"></span></label>
 <button type="button" class="cy-go" hidden>Show it in space ↗</button></div>
 <div class="cy-barwrap" aria-hidden="true"><div class="cy-lens"><b class="cy-scale"></b><em class="cy-gap"></em></div><div class="cy-bar"><i class="cy-spans"></i><i class="cy-marker"></i></div><div class="cy-axis"><span class="cy-lo"></span><span class="cy-hi">midnight, 31 Dec: now</span></div></div>
 <div class="cy-nav"><span class="cy-dots" aria-live="polite"></span><div class="cy-ctl"><button type="button" class="cy-prev" aria-label="Earlier"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><button type="button" class="cy-play" aria-label="Play the year" data-state="play"><svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg><svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg><svg class="i-replay" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a7 7 0 1 0 2.2-5.1M5 4.5v4h4"/></svg></button><button type="button" class="cy-next" aria-label="Later"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button></div><span class="cy-spacer"></span></div>`;
    document.body.appendChild(root); bg = createBackdrop(root.querySelector('.cy-bg'), { reduced: () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches });
    const q = s => root.querySelector(s); bar = q('.cy-bar'); marker = q('.cy-marker'); kick = q('.cy-kick'); ttl = q('.cy-title'); when = q('.cy-when'); txt = q('.cy-text'); goBtn = q('.cy-go'); prev = q('.cy-prev'); next = q('.cy-next'); ageRow = q('.cy-age'); ageIn = ageRow.querySelector('input'); ageOut = q('.cy-ageout'); dots = q('.cy-dots'); playBtn = q('.cy-play'); mainEl = q('.cy-main');
    scaleEl = q('.cy-scale'); gapEl = q('.cy-gap'); loEl = q('.cy-lo'); spansEl = q('.cy-spans');
    for (const [k, e] of EVENTS.entries()) { const t = document.createElement('i'); t.className = 'cy-tick'; t.dataset.k = k; bar.insertBefore(t, marker); }
    q('.cy-x').onclick = close; prev.onclick = () => nav(i - 1); next.onclick = () => nav(i + 1); playBtn.onclick = () => play ? stopPlay() : startPlay();
    goBtn.onclick = () => { const l = EVENTS[i].level; stopPlay(); close(); if (l) onGo?.(l); };
    ageIn.oninput = () => { paintAge(); paintSpans(EVENTS[i]); };
    root.addEventListener('keydown', e => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight' && e.target !== ageIn) nav(i + 1); else if (e.key === 'ArrowLeft' && e.target !== ageIn) nav(i - 1); });
    let x0 = null; root.addEventListener('pointerdown', e => { x0 = e.target.closest('button,input') ? null : e.clientX; }); root.addEventListener('pointerup', e => { if (x0 != null && Math.abs(e.clientX - x0) > 60) nav(i + (e.clientX < x0 ? 1 : -1)); x0 = null; });
  }
  const paintAge = () => { const y = Math.max(0, Math.min(120, Number(ageIn.value) || 0)); ageOut.textContent = `A life of ${y} years lasts ${spanOnCalendar(y)} of this year. All of written history: ${spanOnCalendar(5000)}.`; };
  const xOf = sec => (sec - (YEAR_SECONDS - S)) / S;
  function layout() {
    const ticks = bar.querySelectorAll('.cy-tick');
    for (const t of ticks) { const x = xOf(yearSeconds(EVENTS[Number(t.dataset.k)].ago)); t.style.left = (x * 100) + '%'; t.hidden = x < -0.01 || x > 1.01; }
    marker.style.left = (Math.max(0, Math.min(1, xOf(markSec ?? yearSeconds(EVENTS[i].ago)))) * 100) + '%';
    loEl.textContent = calendarAt(YEAR_SECONDS - S).label;
    for (const sp of spansEl.children) sp.style.width = Math.min(100, Number(sp.dataset.sec) / S * 100) + '%';
  }
  function zoomTo(target) {
    St = target; cancelAnimationFrame(tween); const a = Math.log(S), b = Math.log(St), t0 = performance.now();
    if (a === b || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches || typeof requestAnimationFrame !== 'function') { S = St; layout(); return; }
    const step = now => { const k = Math.min(1, (now - t0) / 1300), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; S = Math.exp(a + (b - a) * e); layout(); if (k < 1) tween = requestAnimationFrame(step); };
    tween = requestAnimationFrame(step);
  }
  function paintSpans(e) {
    spansEl.innerHTML = '';
    if (e.id !== 'now') return;
    const years = Math.max(0, Math.min(120, Number(ageIn.value) || 0));
    gapEl.textContent = 'Blue: all written history. White: your life.';
    for (const [label, y] of [['all written history', 5000], ['a life', years]]) { const sp = document.createElement('b'); sp.dataset.sec = y / AGE_YEARS * YEAR_SECONDS; sp.textContent = label; spansEl.appendChild(sp); }
    layout();
  }
  // Play the year: the date counter runs from one step to the next while the camera flies and the bar zooms, then the card appears.
  const reducedMotion = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches, ease = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const dwell = () => Math.min(8000, 3800 + EVENTS[i].text.length * 28);
  function nav(k) { stopPlay(); show(k); }
  function startPlay() { if (i >= EVENTS.length - 1) show(0); play = { phase: 'dwell', t0: performance.now(), dur: Math.min(dwell(), 4200) }; playBtn.dataset.state = 'pause'; playBtn.setAttribute('aria-label', 'Pause'); cancelAnimationFrame(playRaf); playRaf = requestAnimationFrame(tick); }
  function stopPlay(done) { const was = play; play = null; cancelAnimationFrame(playRaf); markSec = null; mainEl?.classList.remove('travel'); if (!playBtn) return; playBtn.dataset.state = done ? 'replay' : 'play'; playBtn.setAttribute('aria-label', done ? 'Play again' : 'Play the year'); if (was) { layout(); kick.textContent = eventDate(EVENTS[i]).label; } }
  function tick(now) {
    if (!play) return; const k = (now - play.t0) / play.dur;
    if (play.phase === 'dwell') { if (k >= 1) { if (i >= EVENTS.length - 1) { stopPlay(true); return; } depart(now); } }
    else { const sec = play.from + (play.to - play.from) * ease(Math.min(1, k)); markSec = sec; kick.textContent = calendarAt(sec).label; layout(); if (k >= 1) { markSec = null; mainEl.classList.remove('travel'); show(i + 1); play = { phase: 'dwell', t0: now, dur: dwell() }; } }
    playRaf = requestAnimationFrame(tick);
  }
  function depart(now) {
    const a = EVENTS[i], b = EVENTS[i + 1], from = yearSeconds(a.ago), to = yearSeconds(b.ago);
    if (reducedMotion()) { show(i + 1); play = { phase: 'dwell', t0: now, dur: dwell() }; return; }
    mainEl.classList.add('travel'); const [target, name] = scaleFor(b.ago); scaleEl.textContent = name; zoomTo(target); if (world && !worldOff()) world.go(i + 1); else bg.set(b.id);
    play = { phase: 'travel', t0: now, from, to, dur: 2700 + Math.min(2300, Math.log10(to - from + 1) * 330) };
  }
  function show(k) {
    i = Math.max(0, Math.min(EVENTS.length - 1, k)); const e = EVENTS[i], d = eventDate(e);
    kick.textContent = d.label; ttl.textContent = e.title; when.textContent = (e.note && e.ago > 1e9 - 1 && e.id === 'cmb' ? e.note : agoText(e.ago)) + (e.note && e.id !== 'cmb' ? ' · ' + e.note : ''); txt.textContent = e.text;
    goBtn.hidden = !e.level; ageRow.hidden = e.id !== 'now'; if (e.id === 'now') paintAge();
    const [target, name] = scaleFor(e.ago); scaleEl.textContent = name;
    gapEl.textContent = i === 0 ? '' : `${spanOnCalendar(EVENTS[i - 1].ago - e.ago)} later`;
    for (const t of bar.querySelectorAll('.cy-tick')) t.classList.toggle('on', Number(t.dataset.k) === i);
    paintSpans(e); zoomTo(target);
    if (world && !worldOff()) world.go(i); else bg.set(e.id); prev.disabled = i === 0; next.disabled = i === EVENTS.length - 1; dots.innerHTML = `<b>${i + 1}</b> / ${EVENTS.length}`; dots.setAttribute('aria-label', `Step ${i + 1} of ${EVENTS.length}`);
  }
  // The 3D world loads on first open (three.js is large). Until it is ready, and if WebGL fails, the 2D backdrop stays.
  const worldOff = () => root.querySelector('.cy-3d').hidden;
  function useWorld() { const c = root.querySelector('.cy-3d'); c.hidden = false; bg.stop(); root.querySelector('.cy-bg').hidden = true; world.start(); world.go(i, true); }
  function useFlat() { root.querySelector('.cy-3d').hidden = true; root.querySelector('.cy-bg').hidden = false; world?.stop(); bg.set(EVENTS[i].id); if (!root.hidden) bg.start(); }
  async function load() {
    if (worldFailed) return;
    if (world) { useWorld(); return; }
    if (worldTry) return; worldTry = true;
    const c = root.querySelector('.cy-3d');
    try {
      const w = await createWorld(c, { reduced: reducedMotion });
      world = w; c.addEventListener('webglcontextlost', e => { e.preventDefault(); worldFailed = true; useFlat(); world = null; }, { once: true });
      if (!root.hidden) useWorld();
    } catch (err) { worldFailed = true; useFlat(); }
  }
  function open() { if (!root) build(); opener = document.activeElement; stopPlay(); S = St = YEAR_SECONDS; root.hidden = false; document.body.classList.add('cyear-on'); onOpen?.(); show(0); if (!world) bg.start(); load(); root.focus?.({ preventScroll: true }); }
  function close() { if (!root || root.hidden) return; stopPlay(); root.hidden = true; bg.stop(); world?.stop(); document.body.classList.remove('cyear-on'); onClose?.(); const back = opener?.isConnected && opener.offsetParent ? opener : document.querySelector('#settings summary'); back?.focus?.({ preventScroll: true }); opener = null; }
  // open at one moment (the readout's 'this light left…' link): open, then fly there
  function openAt(id) { open(); const k = EVENTS.findIndex(e => e.id === id); if (k > 0) show(k); }
  return { open, openAt, close, show, get isOpen() { return !!root && !root.hidden; }, get index() { return i; } };
}
