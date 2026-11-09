// Kid mode (default). Facts use only figures listed in docs/sources.md.
import { hooks, setKid, bodies, focus, unfocus } from './app.js';
import { LINES, VOICE } from './voice/lines.js';
import { createVoicePlayer } from './voice-player.js';
import { createAdventure, STOPS } from './adventure.js';

const FACTS = {
  Moon: ['The Moon goes around Earth.', 'The Moon has a rocky surface with many craters.'],
  Sun: ['The Sun is a star! About 1.3 million Earths could fit inside it.', 'The Sun spins around once in about 25 days.'],
  Mercury: ['Mercury is the closest planet to the Sun.', 'Mercury goes all the way around the Sun in just 88 days.', 'Mercury has no moons.'],
  Venus: ['A day on Venus is longer than its whole year!', 'Venus spins backwards.', 'Venus has no moons.'],
  Earth: ['Earth is our home!', 'Earth goes around the Sun once every year. That is 365 days.', 'Earth has one Moon.'],
  Mars: ['Mars looks red because of rusty dust.', 'Mars has two small moons.', 'A day on Mars is a little longer than a day on Earth.'],
  Jupiter: ['Jupiter is the biggest planet. About 1,300 Earths could fit inside!', 'A day on Jupiter is only about 10 hours.'],
  Saturn: ['Saturn has beautiful rings.', 'Saturn has nearly 300 moons!'],
  Uranus: ['Uranus spins tipped over on its side.', 'Uranus takes 84 years to go around the Sun.'],
  Neptune: ['Neptune is the farthest planet from the Sun.', 'Neptune takes about 165 years to go around the Sun.', 'Neptune has 16 moons.'],
};
const QUESTS = [
  { id: 'red', ask: 'Can you find the red planet?', pic: '🔴', answer: 'Mars', sticker: '🔴' },
  { id: 'rings', ask: 'Can you find the planet with big, bright rings?', pic: '💍', answer: 'Saturn', sticker: '💍' },
  { id: 'big', ask: 'Can you find the biggest planet?', pic: '🐘', answer: 'Jupiter', sticker: '🐘' },
  { id: 'home', ask: 'Can you find our home, Earth?', pic: '🏠', answer: 'Earth', sticker: '🌍' },
  { id: 'sun', ask: 'Can you find the Sun?', pic: '☀️', answer: 'Sun', sticker: '☀️' },
  { id: 'close', ask: 'Can you find the planet closest to the Sun?', pic: '🔥', answer: 'Mercury', sticker: '🔥' },
  { id: 'side', ask: 'Can you find the planet that spins on its side?', pic: '🙃', answer: 'Uranus', sticker: '🙃' },
  { id: 'far', ask: 'Can you find the planet farthest from the Sun?', pic: '🔭', answer: 'Neptune', sticker: '🔭' },
];
const KEY = 'solar.kids.v1';
const store = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
store.stickers ||= []; store.muted ||= false;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch {} };

const $ = id => document.getElementById(id);
const bubble = $('bubble'), bText = $('b-text'), bPic = $('b-pic');
let lastSay = '', game = null, factIdx = {};
let audioState = 'idle';
const player = createVoicePlayer({ lines: LINES, durations: VOICE.dur, onState: state => {
  if (state === 'idle' && audioState === 'retry') return;
  audioState = state;
  $('audio-status').textContent = state === 'retry' ? 'Sound paused? Tap Listen.' : '';
  $('k-listen').setAttribute('aria-label', state === 'speaking' ? 'Repeat narration' : 'Listen');
} });
// Pointer AND keyboard activation unlock sound directly, before fetching/decoding.
function unlockAudio() { player.unlock(); }
addEventListener('pointerdown', unlockAudio, { capture: true });
addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') unlockAudio(); }, { capture: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) player.stop();
  else if (lastSay && !store.muted) { audioState = 'retry'; $('audio-status').textContent = 'Tap Listen to hear again.'; }
});
function chime(notes = [660, 880]) {
  const ctx = player.context;
  if (store.muted || !ctx || ctx.state !== 'running') return;
  notes.forEach((f, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * 0.14;
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07, t + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.7);
  });
}
const textOf = ids => ids.map(id => LINES[id]).join(' ');
function stopVoice() { player.stop(); }
async function say(ids) { ids = [].concat(ids); lastSay = ids; return player.say(ids, store.muted); }
function speak(pic, ids, color) { showBubble(pic, textOf([].concat(ids)), color); return say(ids); }
const trip = createAdventure();
let tripRun = 0;
const tripPanel = $('mission'), tripAction = $('mission-action');
function endTrip() { tripAction.disabled = false; tripRun++; trip.stop(); hooks.guided = false; tripPanel.hidden = true; tripAction.hidden = true; }
function paintTrip() {
  const step = trip.current;
  tripPanel.hidden = !step;
  if (!step) return;
  $('mission-title').textContent = `${trip.index + 1} / ${STOPS.length} · ${step.title}`;
  $('mission-scale').textContent = trip.index < 2 ? 'Moon gap shortened · worlds enlarged' : 'Planet gaps shortened · Sun smaller';
  tripAction.textContent = trip.found ? step.next : step.hint;
  tripAction.hidden = false;
}
function showStop() {
  const step = trip.current; hooks.guided = true;
  if (trip.index < 2) focus(earthBody(), { silent: true, mul: innerWidth < innerHeight ? 9 : 7, outside: true });
  else { unfocus(true, 2.5); hooks.here = true; }
  paintTrip(); speak(step.pic, step.prompt);
}
function startTrip() {
  endTrip(); stopVoice(); game = null; $('book').hidden = true; $('nextGame').hidden = true;
  intro.hidden = true; document.body.classList.remove('intro');
  setKid(true, { noHome: true }); trip.start(); showStop();
}
async function visitStop(b) {
  if (!trip.answer(b.data.name)) return;
  const run = ++tripRun, step = trip.current;
  chime(); paintTrip(); tripAction.disabled = true;
  await speak(step.pic, step.fact, colorOf(b));
  if (run === tripRun && trip.current) { tripAction.disabled = false; paintTrip(); }
}
tripAction.onclick = () => {
  if (!trip.current) return;
  if (!trip.found) { focus(bodies.find(b => b.data.name === trip.current.target)); return; }
  trip.next(); tripAction.disabled = false;
  if (trip.current) showStop();
  else { endTrip(); unfocus(true, 2.5); hooks.here = true; sparkle('⭐'); speak('⭐', 'trip_done'); }
};
$('mission-exit').onclick = () => { endTrip(); stopVoice(); unfocus(true); speak('🚀', 'trip_explore'); };
const colorOf = b => '#' + (b.data.color).toString(16).padStart(6, '0');
function showBubble(pic, text, color) {
  bPic.textContent = pic; bPic.style.background = color || 'transparent';
  bText.textContent = text; bubble.hidden = false;
}

hooks.intercept = b => {
  if (!hooks.kid) return false;
  if (trip.current) {
    if (trip.found) return true;
    if (b.data.name === trip.current.target) return false;
    speak(trip.current.pic, ['trip_retry', trip.current.prompt]); return true;
  }
  if (!game || b.data.name === game.answer) return false;
  chime([440]);
  speak(game.pic, [`that_${b.data.name}`, 'try_again', `ask_${game.id}`]);
  return true; // camera stays put
};
hooks.onFocus = b => {
  if (!hooks.kid) return;
  if (trip.current) { visitStop(b); return; }
  const name = b.data.name;
  if (game) return answer(b);
  const list = FACTS[name]; const i = factIdx[name] = ((factIdx[name] ?? -1) + 1) % list.length;
  chime();
  speak('', `f_${name}_${i}`, colorOf(b));
};

// Find it!
function nextQuest() {
  const left = QUESTS.filter(q => !store.stickers.includes(q.id));
  const pool = left.length ? left : QUESTS;
  game = pool[Math.floor(Math.random() * pool.length)];
  unfocus(true);
  speak(game.pic, `ask_${game.id}`);
}
function answer(b) {
  if (b.data.name === game.answer) {
    chime([523, 659, 784, 1047]);
    const fresh = !store.stickers.includes(game.id);
    if (fresh) { store.stickers.push(game.id); save(); }
    sparkle(game.sticker);
    speak(game.sticker, [`yes_${b.data.name}`, fresh ? 'got_sticker' : 'well_done'], colorOf(b));
    game = null; $('nextGame').hidden = false;
  }
}
function sparkle(emoji) {
  const s = $('sparkle'); s.textContent = emoji; s.classList.remove('go'); void s.offsetWidth; s.classList.add('go');
}

// Buttons
$('k-listen').onclick = () => { unlockAudio(); say(lastSay || 'tap_planet'); };
$('k-games').onclick = () => { endTrip(); stopVoice(); $('book').hidden = true; $('nextGame').hidden = true; nextQuest(); };
$('nextGame').onclick = () => { $('nextGame').hidden = true; nextQuest(); };
$('k-stickers').onclick = () => { endTrip(); stopVoice();
  game = null; bubble.hidden = true; $('nextGame').hidden = true;
  $('book-grid').innerHTML = QUESTS.map(q => `<div class="slot ${store.stickers.includes(q.id) ? 'got' : ''}">${store.stickers.includes(q.id) ? q.sticker : '?'}</div>`).join('');
  $('book').hidden = false;
  say(`stickers_${Math.min(store.stickers.length, 8)}`);
};
$('book-close').onclick = () => { $('book').hidden = true; };
$('k-home').onclick = () => { unlockAudio(); startTrip(); };
const muteBtn = $('k-mute');
const paintMute = () => { muteBtn.textContent = store.muted ? '🔇' : '🔊'; muteBtn.setAttribute('aria-label', store.muted ? 'Sound off' : 'Sound on'); };
muteBtn.onclick = () => { store.muted = !store.muted; save(); paintMute(); if (store.muted) stopVoice(); else { unlockAudio(); if (lastSay) say(lastSay); } };
paintMute();

// Grown-up mode: press and hold the corner for 2 s
const corner = $('grownup'); let holdT = null;
corner.addEventListener('pointerdown', e => { e.preventDefault(); corner.classList.add('holding'); holdT = setTimeout(() => { corner.classList.remove('holding'); enterGrownup(); }, 2000); });
['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => corner.addEventListener(ev, () => { clearTimeout(holdT); corner.classList.remove('holding'); }));
function enterGrownup() { endTrip(); intro.hidden = true; document.body.classList.remove('intro'); game = null; bubble.hidden = true; $('book').hidden = true; $('nextGame').hidden = true; stopVoice(); setKid(false); }

// Earth-first invitation: the Start gesture unlocks audio; the child chooses each visit.
const earthBody = () => bodies.find(b => b.data.name === 'Earth');
const intro = $('intro');
function startCloseOnEarth() {
  setKid(true, { noHome: true }); hooks.here = false; document.body.classList.add('intro');
  focus(earthBody(), { silent: true, mul: innerWidth < innerHeight ? 7 : 4.5, dur: 0.01, outside: true });
}
$('introStart').onclick = e => { e.stopPropagation(); unlockAudio(); startTrip(); };
$('kidBtn').onclick = () => { unlockAudio(); startTrip(); };
startCloseOnEarth();
window.__kids = { store, startTrip, QUESTS, trip, LINES, say, enterGrownup,
  startQuest: id => { endTrip(); game = QUESTS.find(q => q.id === id); speak(game.pic, `ask_${game.id}`); } };
