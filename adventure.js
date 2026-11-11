// The Earth–Moon adventure: a guided story of four stops (Earth, the Moon, Mars, Saturn) on top of free
// exploring. Ported from feature/earth-moon-adventure (PR #4, never merged) and adapted to the current app:
// it runs inside the Solar System scale only, uses the app's own focus/home glides (instant with reduced
// motion), keeps world cards closed while it runs, and shows every narration line as an on-screen caption.
// Self-contained: lab.js calls initAdventure() once (passing the app.js module) and adventure.sync() from its
// render(). No import of app.js here, so the story logic loads in plain Node for tests.
import { MOON } from './data.js';
import { LINES, VOICE } from './voice/lines.js';
import { createVoicePlayer } from './voice-player.js';

export const STOPS = [
  { target: 'Earth', title: 'Our home', pic: '🌍', prompt: 'trip_earth', fact: 'trip_earth_found', hint: 'Show me Earth', next: 'On to the Moon →' },
  { target: 'Moon', title: 'Our Moon', pic: '🌙', prompt: 'trip_moon', fact: 'trip_moon_found', hint: 'Visit Moon', next: 'Meet our neighbours →' },
  { target: 'Mars', title: 'A red neighbour', pic: '🔴', prompt: 'trip_mars', fact: 'trip_mars_found', hint: 'Show me Mars', next: 'One more discovery →' },
  { target: 'Saturn', title: 'A ringed world', pic: '🪐', prompt: 'trip_saturn', fact: 'trip_saturn_found', hint: 'Show me Saturn', next: 'Finish adventure ⭐' },
];
// What the picture leaves out at each stop (shown with the caption): the scene is an illustration.
export const SCALE_NOTE = ['Illustration · Moon distance shortened (really about 30 Earths away)', 'Illustration · Moon distance shortened (really about 30 Earths away)',
  'Illustration · planet distances shortened · Sun shown smaller', 'Illustration · planet distances shortened · Sun shown smaller'];

// The story's state, without any DOM (tests drive it directly).
export function createAdventure() {
  let index = -1, found = false;
  return {
    get current() { return STOPS[index] || null; }, get index() { return index; }, get found() { return found; },
    start() { index = 0; found = false; },
    stop() { index = -1; found = false; },
    answer(name) { if (!STOPS[index] || found || name !== STOPS[index].target) return false; found = true; return true; },
    // Next after a find; skip moves on without one. Both end the story (index -1) after the last stop.
    next() { if (!found) return false; index++; found = false; if (index === STOPS.length) index = -1; return true; },
    skip() { if (!STOPS[index]) return false; index++; found = false; if (index === STOPS.length) index = -1; return true; },
  };
}

// The caption for a narration (one or more line ids): exactly the text the clip was generated from.
export const captionOf = ids => [].concat(ids).map(id => LINES[id]).join(' ');

const reduced = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Framing for the Moon stop: far enough out that Earth and the Moon's whole (shortened) orbit fit the
// screen width, also on a 412 px portrait phone.
export function moonFrameMul(aspect, fovDeg = 50, earthRadius = 0.5) {
  const half = Math.tan(fovDeg * Math.PI / 360) * Math.min(1, aspect);
  return Math.max(7, (MOON.dist + MOON.size) * 1.3 / half / earthRadius);
}

// api (from lab.js): app — the app.js module; enter(after) — go to the Solar System scale with cards closed, then call after();
// stopAudio() — stop the lab's own narration; voiceOn() — the menu's Voice switch.
export function initAdventure(api, doc = document) {
  const { hooks, bodies, focus, unfocus, setHomeScope, isRealScale, camera } = api.app;
  const $ = id => doc.getElementById(id);
  const trip = createAdventure();
  let phase = 'off'; // 'off' | 'stop' | 'done' | 'outro'
  let speaking = false, lastIds = null, run = 0, wasPlaying = null, scopeBefore = null, outroTimer = null;
  const player = createVoicePlayer({ lines: LINES, durations: VOICE.dur, versions: VOICE.hash, onState: s => { speaking = s === 'loading' || s === 'speaking'; paintVoice(s); } });

  // Entry chip, next to Journeys in the top bar.
  const chip = doc.createElement('button');
  chip.id = 'adventure'; chip.className = 'chip'; chip.type = 'button';
  chip.setAttribute('aria-label', 'Start the Earth and Moon adventure');
  chip.innerHTML = '<span aria-hidden="true">🚀</span>Adventure';
  const journeys = $('journeys');
  if (journeys?.after) journeys.after(chip); else $('topbar')?.appendChild(chip);

  // The story panel: caption first, then the controls. Labels keep clear of it (data-label-exclude).
  const panel = doc.createElement('section');
  panel.id = 'story'; panel.hidden = true; panel.setAttribute('aria-label', 'Adventure'); panel.dataset.labelExclude = '';
  panel.innerHTML = `<div class="story-head"><span class="story-pic" id="story-pic" aria-hidden="true"></span><p class="story-step" id="story-step"></p>
<button type="button" class="story-icon" id="story-voice" aria-label="Pause narration">❚❚</button><button type="button" class="story-icon" id="story-exit" aria-label="Exit the adventure and explore freely">✕</button></div>
<p class="story-caption" id="story-caption" aria-live="polite"></p><p class="story-note" id="story-note"></p><p class="story-status" id="story-status" aria-live="polite"></p>
<div class="story-actions"><button type="button" class="story-main" id="story-main"></button><button type="button" class="story-skip" id="story-skip">Skip ›</button></div>`;
  ($('stage')?.parentNode || doc.body).appendChild(panel);
  const el = id => panel.querySelector('#' + id);

  function say(ids) {
    lastIds = ids; el('story-caption').textContent = captionOf(ids);
    if (!api.voiceOn()) { player.stop(); el('story-status').textContent = 'Voice is off (menu). Read along here.'; setPanelHeight(); return Promise.resolve(); }
    el('story-status').textContent = ''; setPanelHeight(); // the caption changed the panel's height: lift the scale readout again
    return player.say(ids);
  }
  function paintVoice(s) {
    const b = el('story-voice'); if (!b) return;
    b.textContent = speaking ? '❚❚' : '▶';
    b.setAttribute('aria-label', speaking ? 'Pause narration' : 'Play narration');
    if (s === 'retry') { el('story-status').textContent = 'Tap ▶ to hear it again.'; setPanelHeight(); }
  }
  function setPanelHeight() { doc.body.style.setProperty('--story-h', panel.hidden ? '0px' : `${panel.offsetHeight || 0}px`); }
  function paint() {
    const st = trip.current, active = phase !== 'off';
    panel.hidden = !active; chip.hidden = phase === 'stop' || phase === 'done';
    doc.body.classList.toggle('story', active);
    panel.dataset.phase = phase;
    el('story-skip').hidden = phase !== 'stop' || trip.found;
    el('story-main').hidden = phase === 'outro';
    if (phase === 'stop' && st) {
      el('story-pic').textContent = st.pic;
      el('story-step').textContent = `${trip.index + 1} / ${STOPS.length} · ${st.title}`;
      el('story-note').textContent = SCALE_NOTE[trip.index];
      el('story-main').textContent = trip.found ? st.next : st.hint;
    } else if (phase === 'done') {
      el('story-pic').textContent = '⭐'; el('story-step').textContent = 'Adventure complete';
      el('story-note').textContent = ''; el('story-main').textContent = 'Replay';
      el('story-skip').hidden = false; el('story-skip').textContent = 'Explore freely';
    } else if (phase === 'outro') {
      el('story-pic').textContent = '🚀'; el('story-step').textContent = 'Exploring freely'; el('story-note').textContent = '';
    }
    if (phase === 'stop') el('story-skip').textContent = 'Skip ›';
    paintVoice();
    setPanelHeight();
  }
  const body = name => bodies.find(b => b.data.name === name);
  function frameStop() {
    const st = trip.current, dur = reduced() ? .01 : 1.6;
    if (trip.index === 0) unfocus(true, dur);
    else if (trip.index === 1) focus(body('Earth'), { silent: true, mul: moonFrameMul(camera.aspect, camera.fov), outside: true });
    else {
      if (st.target === 'Saturn' && hooks.homeScope !== 'all') { scopeBefore = scopeBefore || hooks.homeScope; setHomeScope('all'); }
      unfocus(true, dur);
    }
  }
  function showStop() { phase = 'stop'; run++; frameStop(); paint(); say(trip.current.prompt); }
  function holdOrbits() { const p = $('play'); if (p && p.dataset.state === 'playing') { wasPlaying = true; p.click(); } }
  function releaseOrbits() { const p = $('play'); if (wasPlaying && p && p.dataset.state !== 'playing') p.click(); wasPlaying = null; }
  function restoreScope() { if (scopeBefore && hooks.homeScope !== scopeBefore) setHomeScope(scopeBefore); scopeBefore = null; }

  function start() {
    player.unlock(); api.stopAudio(); clearTimeout(outroTimer);
    phase = 'starting';
    api.enter(() => {
      if (isRealScale()) $('realBtn')?.click(); // the captions describe the default (shortened) view
      holdOrbits(); trip.start(); showStop();
    });
  }
  // End the story. quiet: no outro (the visitor went somewhere else, e.g. another scale or a card).
  function end(quiet) {
    run++; trip.stop(); player.stop(); releaseOrbits(); restoreScope(); clearTimeout(outroTimer);
    if (quiet) { phase = 'off'; paint(); return; }
    phase = 'outro'; unfocus(true, reduced() ? .01 : 1.2); paint();
    say('trip_explore').then(() => { if (phase === 'outro') outroTimer = setTimeout(() => { if (phase === 'outro') { phase = 'off'; paint(); } }, api.voiceOn() ? 1500 : 7000); });
  }
  async function visit(b) {
    if (!trip.answer(b.data.name)) return;
    const me = ++run; paint();
    await say(trip.current.fact);
    if (me === run) paint();
  }
  // A wrong world during a stop: the camera stays put and the story asks again.
  hooks.intercept = b => {
    if (phase !== 'stop' || !trip.current) return false;
    if (trip.found) return true; // found: the camera stays on it until Next
    if (b.data.name === trip.current.target) return false;
    say(['trip_retry', trip.current.prompt]); return true;
  };
  const labFocus = hooks.onFocus;
  hooks.onFocus = b => { if (phase === 'stop' && trip.current) { visit(b); return; } labFocus?.(b); };

  chip.onclick = () => start();
  el('story-main').onclick = () => {
    player.unlock();
    if (phase === 'done') { start(); return; }
    if (phase !== 'stop' || !trip.current) return;
    if (!trip.found) { focus(body(trip.current.target)); return; } // "Show me": glides there and counts as found
    trip.next();
    if (trip.current) showStop(); else finish();
  };
  el('story-skip').onclick = () => {
    player.unlock();
    if (phase === 'done') { end(false); return; }
    if (phase !== 'stop') return;
    trip.skip(); if (trip.current) showStop(); else finish();
  };
  el('story-exit').onclick = () => { player.unlock(); if (phase === 'outro') { player.stop(); phase = 'off'; paint(); return; } end(false); };
  el('story-voice').onclick = () => {
    player.unlock();
    if (speaking) { player.stop(); return; } // pause: the clip restarts from its beginning on ▶
    if (lastIds) say(lastIds);
  };
  function finish() { phase = 'done'; run++; releaseOrbits(); restoreScope(); unfocus(true, reduced() ? .01 : 2.5); paint(); say('trip_done'); }
  doc.addEventListener?.('visibilitychange', () => { if (doc.hidden && speaking) player.stop(); });
  globalThis.addEventListener?.('resize', setPanelHeight);
  // Any other change of the panel's size (fonts loading, text wrapping) also moves the readout clear of it.
  if (typeof globalThis.ResizeObserver === 'function') new globalThis.ResizeObserver(() => setPanelHeight()).observe(panel);

  const api2 = {
    get phase() { return phase; }, trip, start, end, panel, chip, player,
    // From lab.js render(): another scale, a card or a journey ends the story quietly.
    sync(level, s) {
      if (phase === 'starting' || phase === 'off') return;
      if (level !== 'solar' || (s && s.sheet !== 'closed')) end(true);
    },
  };
  return api2;
}
