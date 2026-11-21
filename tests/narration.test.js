// One narrator: the guided stories are read in the same recorded voice, saying what the screen shows.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { narrationLines, NARRATION_PREFIXES } from '../tools/voice-lines.mjs';
import { spoken } from '../narration.js';
import { createNarrator } from '../narrator.js';
import { createTour, TOUR_STOPS } from '../tour.js';
import { LINES, VOICE } from '../voice/lines.js';

test('every story line is recorded, and says what the screen shows (re-run tools/voice-lines.mjs and build-voice.py when text changes)', () => {
  const want = narrationLines(),
    json = JSON.parse(fs.readFileSync('voice/lines.json', 'utf8'));
  assert.ok(Object.keys(want).length >= 70);
  for (const [id, text] of Object.entries(want)) {
    assert.equal(json[id], text, `${id}: voice/lines.json is out of step with the screen`);
    assert.equal(LINES[id], text, `${id}: voice/lines.js`);
    assert.ok(VOICE.hash[id] && fs.existsSync(`voice/${id}.mp3`), `${id}: recorded`);
    assert.ok(
      VOICE.dur[id] > 1.5 && VOICE.dur[id] < 3 + text.split(' ').length * 0.75,
      `${id}: ${VOICE.dur[id]} s for ${text.length} characters`
    );
  }
  for (const id of Object.keys(json)) if (NARRATION_PREFIXES.test(id)) assert.ok(want[id], `${id}: no longer on screen`);
});

test('spoken form: units and symbols are read in words', () => {
  assert.equal(spoken('Earth is 12,756 km wide'), 'Earth is 12,756 kilometres wide');
  assert.equal(
    spoken('about 0.2 mm thick, 6 µm wide, 2 nm wide, 8 cm wide'),
    'about 0.2 millimetres thick, 6 micrometres wide, 2 nanometres wide, 8 centimetres wide'
  );
  assert.equal(spoken('1 au away; 30.07 au from the Sun'), '1 astronomical unit away; 30.07 astronomical units from the Sun');
  assert.equal(spoken('tilted about 23.4°.'), 'tilted about 23.4 degrees.');
  assert.equal(spoken('Sagittarius A*, the black hole'), 'Sagittarius A-star, the black hole');
  assert.equal(spoken('The telescope (1609), modern science'), 'The telescope, in 1609, modern science');
  assert.equal(spoken('Midnight on 31 December: now.'), 'Midnight on the 31st of December: now.');
  assert.equal(spoken('Gaia–Enceladus crashes'), 'Gaia Enceladus crashes');
  for (const text of Object.values(narrationLines())) assert.doesNotMatch(text, /\d\s?(km|mm|cm|µm|nm|au)\b|°|\*|\(\d{4}\)/, text);
});

function fakePlayer() {
  const p = { said: [], stops: 0, unlocks: 0, resolve: null };
  p.say = id => {
    p.said.push(id);
    return new Promise(r => (p.resolve = r));
  };
  p.stop = () => {
    p.stops++;
    p.resolve?.();
  };
  p.unlock = () => p.unlocks++;
  return p;
}

test('narrator: ♫ switches Voice on and reads the step; each step once; busy until the line ends; release stops it', async () => {
  const player = fakePlayer();
  let voice = false;
  const n = createNarrator({ player, has: id => id !== 'none', voiceOn: () => voice, setVoiceOn: v => (voice = v) });
  const btn = { attrs: {}, setAttribute: (k, v) => (btn.attrs[k] = v), classList: { toggle: (c, on) => (btn.on = on) } },
    note = { textContent: '' };
  n.bind(btn, note);
  n.read('tour_earth');
  assert.deepEqual(player.said, [], 'nothing reads before ♫');
  n.toggle('tour_earth');
  assert.equal(voice, true, 'a ♫ tap switches Voice on');
  assert.equal(btn.attrs['aria-pressed'], 'true');
  assert.deepEqual(player.said, ['tour_earth']);
  assert.equal(n.busy, true);
  n.read('tour_earth');
  assert.equal(player.said.length, 1, 'arriving again does not repeat');
  player.resolve();
  await new Promise(r => setTimeout(r, 0));
  assert.equal(n.busy, false);
  n.read('none');
  assert.equal(player.said.length, 1, 'a step without a clip stays silent');
  n.state('offline');
  assert.match(note.textContent, /connection/);
  n.release();
  assert.equal(n.on, false);
  assert.ok(player.stops > 0);
});

test('tour: while the narrator is reading, the tour waits at the stop; then it moves on', () => {
  let held = true,
    arrive = null;
  const t = createTour({ travel: (s, done) => (arrive = done), hold: () => held });
  t.start(0);
  arrive();
  t.tick(30);
  assert.equal(t.index, 0, 'held: still at the first stop after 30 s');
  held = false;
  t.tick(0.1);
  assert.equal(t.index, 1, 'the line ended: on to the next stop');
  assert.equal(TOUR_STOPS.length > 1, true);
});
