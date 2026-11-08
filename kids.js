// Kid mode (default). Facts use only figures listed in docs/sources.md.
import { hooks, setKid, bodies, focus, unfocus } from './app.js';

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
  { id: 'rings', ask: 'Can you find the planet with rings?', pic: '💍', answer: 'Saturn', sticker: '💍' },
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
function say(text) {
  lastSay = text;
  if (store.muted || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.rate = 0.9; u.pitch = 1.1;
    const v = speechSynthesis.getVoices().find(v => /^en/i.test(v.lang) && v.localService) || speechSynthesis.getVoices().find(v => /^en/i.test(v.lang));
    if (v) u.voice = v;
    setTimeout(() => speechSynthesis.speak(u), 250);
  } catch {}
}
const colorOf = b => '#' + (b.data.color).toString(16).padStart(6, '0');
function showBubble(pic, text, color) {
  bPic.textContent = pic; bPic.style.background = color || 'transparent';
  bText.textContent = text; bubble.hidden = false;
}

hooks.onFocus = b => {
  if (!hooks.kid) return;
  const name = b.data.name;
  if (game) return answer(b);
  const list = FACTS[name]; const i = factIdx[name] = ((factIdx[name] ?? -1) + 1) % list.length;
  chime();
  showBubble('', `${name}: ${list[i]}`, colorOf(b));
  say(`${name}. ${list[i]}`);
};

// Find it!
function nextQuest() {
  const left = QUESTS.filter(q => !store.stickers.includes(q.id));
  const pool = left.length ? left : QUESTS;
  game = pool[Math.floor(Math.random() * pool.length)];
  unfocus(true);
  showBubble(game.pic, game.ask);
  say(game.ask);
}
function answer(b) {
  if (b.data.name === game.answer) {
    chime([523, 659, 784, 1047]);
    const fresh = !store.stickers.includes(game.id);
    if (fresh) { store.stickers.push(game.id); save(); }
    sparkle(game.sticker);
    const msg = `Yes! That is ${b.data.name}! ${fresh ? 'You got a sticker!' : 'Well done!'}`;
    showBubble(game.sticker, msg, colorOf(b)); say(msg);
    game = null; $('nextGame').hidden = false;
  } else {
    chime([440]);
    const msg = `That is ${b.data.name}. Try again!`;
    showBubble(game.pic, `${msg} ${game.ask}`); say(`${msg} ${game.ask}`);
    unfocus(false);
  }
}
function sparkle(emoji) {
  const s = $('sparkle'); s.textContent = emoji; s.classList.remove('go'); void s.offsetWidth; s.classList.add('go');
}

// Buttons
$('k-listen').onclick = () => { if (lastSay) say(lastSay); else say('Tap a planet!'); chime([660]); };
$('k-games').onclick = () => { $('book').hidden = true; $('nextGame').hidden = true; nextQuest(); };
$('nextGame').onclick = () => { $('nextGame').hidden = true; nextQuest(); };
$('k-stickers').onclick = () => {
  game = null; bubble.hidden = true; $('nextGame').hidden = true;
  $('book-grid').innerHTML = QUESTS.map(q => `<div class="slot ${store.stickers.includes(q.id) ? 'got' : ''}">${store.stickers.includes(q.id) ? q.sticker : '?'}</div>`).join('');
  $('book').hidden = false;
  const n = store.stickers.length; say(n ? `You have ${n} sticker${n > 1 ? 's' : ''}!` : 'Play Find it to get stickers!');
};
$('book-close').onclick = () => { $('book').hidden = true; };
$('k-home').onclick = () => { game = null; bubble.hidden = true; $('book').hidden = true; $('nextGame').hidden = true; unfocus(true); };
const muteBtn = $('k-mute');
const paintMute = () => { muteBtn.textContent = store.muted ? '🔇' : '🔊'; muteBtn.setAttribute('aria-label', store.muted ? 'Sound off' : 'Sound on'); };
muteBtn.onclick = () => { store.muted = !store.muted; save(); paintMute(); if (store.muted && 'speechSynthesis' in window) speechSynthesis.cancel(); };
paintMute();

// Grown-up mode: press and hold the corner for 2 s
const corner = $('grownup'); let holdT = null;
corner.addEventListener('pointerdown', e => { e.preventDefault(); corner.classList.add('holding'); holdT = setTimeout(() => { corner.classList.remove('holding'); enterGrownup(); }, 2000); });
['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => corner.addEventListener(ev, () => { clearTimeout(holdT); corner.classList.remove('holding'); }));
function enterGrownup() { game = null; bubble.hidden = true; $('book').hidden = true; $('nextGame').hidden = true; if ('speechSynthesis' in window) speechSynthesis.cancel(); setKid(false); }
$('kidBtn').onclick = () => setKid(true);

setKid(true);
window.__kids = { store, QUESTS, startQuest: id => { game = QUESTS.find(q => q.id === id); showBubble(game.pic, game.ask); say(game.ask); }, enterGrownup };
