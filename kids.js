// Kid mode (default). Facts use only figures listed in docs/sources.md.
import { hooks, setKid, bodies, focus, unfocus } from './app.js';
import { LINES, VOICE } from './voice/lines.js';

const FACTS = {
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
let ctx = null, lastSay = '', game = null, factIdx = {};

// Audio: unlocked on first tap
addEventListener('pointerdown', () => { if (!ctx) { try { ctx = new AudioContext(); } catch {} } else if (ctx.state === 'suspended') ctx.resume(); }, { capture: true });
function chime(notes = [660, 880]) {
  if (store.muted || !ctx) return;
  notes.forEach((f, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * 0.14;
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 1);
  });
}
// Voice: pre-recorded clips (voice/<id>.mp3, Kokoro bm_george) played via Web Audio.
// Falls back to Web Speech (male voice, slower, lower) if a clip can't load.
const clipCache = {};
let sayToken = 0, curSrc = null;
const textOf = ids => ids.map(id => LINES[id]).join(' ');
function loadClip(id) {
  if (!clipCache[id]) clipCache[id] = fetch(`voice/${id}.mp3`).then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); })
    .then(buf => ctx.decodeAudioData(buf)).catch(() => { delete clipCache[id]; return null; });
  return clipCache[id];
}
function stopVoice() { sayToken++; try { curSrc?.stop(); } catch {} curSrc = null; if ('speechSynthesis' in window) speechSynthesis.cancel(); }
const wait = ms => new Promise(r => setTimeout(r, ms));
function speakFallback(text) {
  return new Promise(res => {
    if (!('speechSynthesis' in window)) return res();
    try {
      const u = new SpeechSynthesisUtterance(text); u.rate = 0.85; u.pitch = 0.9;
      const vs = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
      const male = /male|george|daniel|david|james|arthur|oliver|guy|ryan|thomas|alex|fred|rishi|aaron/i;
      const v = vs.find(v => male.test(v.name) && !/female/i.test(v.name) && v.localService) || vs.find(v => male.test(v.name) && !/female/i.test(v.name)) || vs.find(v => v.localService) || vs[0];
      if (v) u.voice = v;
      u.onend = u.onerror = () => res();
      speechSynthesis.speak(u);
      setTimeout(res, 1500 + text.length * 120); // never hang the intro
    } catch { res(); }
  });
}
// say(['id', ...]) -> Promise resolving when speech ends. Bubble text = textOf(ids).
async function say(ids) {
  ids = [].concat(ids); lastSay = ids; stopVoice(); const me = sayToken;
  const est = ids.reduce((t, id) => t + (VOICE.dur[id] ?? 2) * 1000 + 150, 0);
  if (store.muted || !ctx) return wait(est);
  if (ctx.state === 'suspended') { try { await ctx.resume(); } catch {} }
  const bufs = await Promise.all(ids.map(loadClip));
  if (me !== sayToken) return;
  if (bufs.some(b => !b)) return speakFallback(textOf(ids));
  for (const b of bufs) {
    if (me !== sayToken) return;
    await new Promise(res => {
      const src = ctx.createBufferSource(); src.buffer = b; src.connect(ctx.destination);
      src.onended = res; curSrc = src; src.start();
    });
    await wait(120);
  }
}
function speak(pic, ids, color) { showBubble(pic, textOf([].concat(ids)), color); return say(ids); }
const colorOf = b => '#' + (b.data.color).toString(16).padStart(6, '0');
function showBubble(pic, text, color) {
  bPic.textContent = pic; bPic.style.background = color || 'transparent';
  bText.textContent = text; bubble.hidden = false;
}

hooks.intercept = b => {
  if (!hooks.kid || !game || b.data.name === game.answer) return false;
  chime([440]);
  speak(game.pic, [`that_${b.data.name}`, 'try_again', `ask_${game.id}`]);
  return true; // camera stays put
};
hooks.onFocus = b => {
  if (!hooks.kid) return;
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
$('k-listen').onclick = () => { say(lastSay || 'tap_planet'); chime([660]); };
$('k-games').onclick = () => { $('book').hidden = true; $('nextGame').hidden = true; nextQuest(); };
$('nextGame').onclick = () => { $('nextGame').hidden = true; nextQuest(); };
$('k-stickers').onclick = () => {
  game = null; bubble.hidden = true; $('nextGame').hidden = true;
  $('book-grid').innerHTML = QUESTS.map(q => `<div class="slot ${store.stickers.includes(q.id) ? 'got' : ''}">${store.stickers.includes(q.id) ? q.sticker : '?'}</div>`).join('');
  $('book').hidden = false;
  say(`stickers_${Math.min(store.stickers.length, 8)}`);
};
$('book-close').onclick = () => { $('book').hidden = true; };
$('k-home').onclick = () => { game = null; bubble.hidden = true; $('book').hidden = true; $('nextGame').hidden = true; unfocus(true); };
const muteBtn = $('k-mute');
const paintMute = () => { muteBtn.textContent = store.muted ? '🔇' : '🔊'; muteBtn.setAttribute('aria-label', store.muted ? 'Sound off' : 'Sound on'); };
muteBtn.onclick = () => { store.muted = !store.muted; save(); paintMute(); if (store.muted) stopVoice(); };
paintMute();

// Grown-up mode: press and hold the corner for 2 s
const corner = $('grownup'); let holdT = null;
corner.addEventListener('pointerdown', e => { e.preventDefault(); corner.classList.add('holding'); holdT = setTimeout(() => { corner.classList.remove('holding'); enterGrownup(); }, 2000); });
['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => corner.addEventListener(ev, () => { clearTimeout(holdT); corner.classList.remove('holding'); }));
function enterGrownup() { introRun++; introOn = false; intro.hidden = true; document.body.classList.remove('intro'); game = null; bubble.hidden = true; $('book').hidden = true; $('nextGame').hidden = true; stopVoice(); setKid(false); }

// Earth-first opening
const earthBody = () => bodies.find(b => b.data.name === 'Earth');
const intro = $('intro'); let introRun = 0, introOn = false;
function startCloseOnEarth() {
  setKid(true, { noHome: true });
  hooks.here = false; document.body.classList.add('intro');
  focus(earthBody(), { silent: true, mul: innerWidth < innerHeight ? 7 : 4.5, dur: 0.01, outside: true });
}
// Each step waits for its clip to finish (no fixed timings).
async function playIntro() {
  intro.hidden = true; introOn = true; const run = ++introRun;
  const live = () => run === introRun && introOn;
  chime(); await speak('🌍', 'intro_1', '#3f7fe0'); if (!live()) return;
  await wait(400); if (!live()) return;
  await speak('☀️', 'intro_2'); if (!live()) return;
  bubble.hidden = true; unfocus(true, 5);
  await wait(5300); if (!live()) return;
  endIntro();
}
function endIntro() {
  introRun++;
  if (!introOn) return; introOn = false;
  document.body.classList.remove('intro'); hooks.here = true;
  speak('🚀', 'intro_3');
}
function skipIntro() { if (!introOn) return; introRun++; stopVoice(); unfocus(true, 1.2); setTimeout(() => { introOn = true; endIntro(); }, 1300); introOn = false; }
$('introStart').onclick = e => { e.stopPropagation(); playIntro(); };
addEventListener('pointerdown', e => { if (introOn && !e.target.closest('#grownup')) skipIntro(); });
$('kidBtn').onclick = () => { setKid(true); hooks.here = true; };
startCloseOnEarth();
window.__kids = { store, playIntro, QUESTS, startQuest: id => { game = QUESTS.find(q => q.id === id); speak(game.pic, `ask_${game.id}`); }, LINES, say, enterGrownup };
