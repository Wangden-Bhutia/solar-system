// Earth–Moon adventure (adventure.js). The story-state tests are pure; the rest drive the real app modules in
// linkedom (tests/integration-harness.js) with a fake renderer: DOM/model checks, NOT a browser, GPU or phone test,
// and no audio is played (the harness has no AudioContext or speech, so the player reports 'retry').
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createAdventure,STOPS,SCALE_NOTE,captionOf,moonFrameMul} from '../adventure.js';
import {MOON,PLANETS} from '../data.js';import {LINES,VOICE} from '../voice/lines.js';
import {bootApp} from './integration-harness.js';

test('four stops require the right world, can be skipped, cancelled and restarted', () => {
  const t = createAdventure();
  assert.equal(t.current, null); t.start();
  for (const s of STOPS) {
    assert.equal(t.current, s); assert.equal(t.next(), false, 'Next needs a find (Skip is separate)');
    assert.equal(t.answer('Venus'), false); assert.equal(t.found, false);
    assert.equal(t.answer(s.target), true); assert.equal(t.answer(s.target), false);
    assert.equal(t.next(), true);
  }
  assert.equal(t.current, null); t.start(); assert.equal(t.index, 0);
  assert.equal(t.skip(), true); assert.equal(t.current, STOPS[1]); assert.equal(t.found, false);
  t.answer('Moon'); t.stop(); assert.equal(t.next(), false); assert.equal(t.skip(), false); assert.equal(t.current, null);
  t.start(); for (let i = 0; i < STOPS.length; i++) t.skip(); assert.equal(t.current, null, 'skipping the last stop ends the story');
});

test('every narration the story plays has a clip, a manifest entry and an identical caption; Pages ships it', () => {
  const manifest = JSON.parse(fs.readFileSync('voice/manifest.json', 'utf8'));
  const ids = [...STOPS.flatMap(s => [s.prompt, s.fact]), 'trip_retry', 'trip_done', 'trip_explore'];
  for (const id of ids) {
    assert.ok(LINES[id], id); assert.equal(captionOf(id), LINES[id]); assert.equal(manifest[id].text, LINES[id], `${id}: caption = clip text`);
    assert.ok(VOICE.dur[id] > 0); assert.ok(fs.statSync(`voice/${id}.mp3`).size > 1000, id);
  }
  assert.equal(captionOf(['trip_retry', 'trip_moon']), `${LINES.trip_retry} ${LINES.trip_moon}`);
  for (const s of STOPS) assert.ok([...PLANETS, MOON].some(p => p.name === s.target));
  // Narration that names a button names one the panel really shows.
  assert.match(LINES.trip_moon, /Visit Moon/); assert.equal(STOPS[1].hint, 'Visit Moon');
  assert.match(LINES.trip_mars, /Show me/); assert.match(STOPS[2].hint, /^Show me/);
  assert.match(LINES.trip_done, /Replay/); assert.doesNotMatch(LINES.trip_done, /Find it/, 'no game that the current app does not have');
  assert.match(LINES.trip_explore, /Adventure/);
  // "The Moon is much farther from Earth than we show here": true in the default view the story uses.
  assert.ok(MOON.realDist > MOON.dist * 10);
  for (const n of SCALE_NOTE) assert.match(n, /^Illustration/);
  const wf = fs.readFileSync('.github/workflows/pages.yml', 'utf8');
  assert.match(wf, /\badventure\.js\b/); assert.match(wf, /\bvoice\b/, 'voice/ is copied (precache.json lists every copied file)');
});

const ready = async o => { const a = await bootApp(o); a.step(40); return a; };
const story = a => a.$('story');
const cap = a => a.$('story-caption').textContent;
const main = a => a.$('story-main');
const tapWorld = (a, name) => { const [x, y] = a.screenOf(name); a.tapAt(x, y, { type: 'touch' }); };

test('412×915: Adventure chip starts the story; four stops by tapping, Show me and Visit Moon; cards stay closed; exit returns to free exploring', async () => {
  const a = await ready();
  const chip = a.$('adventure'); assert.ok(chip, 'entry chip'); assert.equal(chip.parentNode.id, 'topbar'); assert.equal(chip.textContent.trim().replace(/\s+/g, ' '), '🚀Adventure');
  assert.equal(story(a).hidden, true);
  const playing = a.$('play').dataset.state;
  a.click(chip); a.step(40);
  assert.equal(story(a).hidden, false); assert.equal(chip.hidden, true);
  assert.equal(a.$('story-step').textContent, '1 / 4 · Our home'); assert.equal(cap(a), LINES.trip_earth);
  assert.match(a.$('story-note').textContent, /^Illustration/); assert.equal(main(a).textContent, 'Show me Earth');
  assert.equal(a.$('play').dataset.state, 'paused', 'orbits held still so worlds are easy to tap');
  // Wrong world: the camera stays put, the story asks again.
  tapWorld(a, 'Mars'); assert.equal(a.sheet, 'closed'); assert.equal(cap(a), `${LINES.trip_retry} ${LINES.trip_earth}`); assert.equal(a.app.solarFocused?.() ?? null, null);
  tapWorld(a, 'Earth'); assert.equal(a.sheet, 'closed', 'no world card during the story'); assert.equal(cap(a), LINES.trip_earth_found);
  assert.equal(main(a).textContent, 'Visit the Moon →'); assert.equal(a.$('story-skip').hidden, true);
  a.click(main(a)); a.step(40);
  assert.equal(a.$('story-step').textContent, '2 / 4 · Our Moon'); assert.equal(cap(a), LINES.trip_moon); assert.equal(main(a).textContent, 'Visit Moon');
  const [mx, my, mz] = a.screenOf('Moon'); assert.ok(mx > 0 && mx < 412 && my > 0 && my < 915 && mz < 1, `Moon on screen at ${mx.toFixed(0)},${my.toFixed(0)}`);
  tapWorld(a, 'Moon'); assert.equal(cap(a), LINES.trip_moon_found); assert.equal(a.sheet, 'closed');
  a.click(main(a)); a.step(40);
  assert.equal(cap(a), LINES.trip_mars); assert.equal(main(a).textContent, 'Show me Mars');
  a.click(main(a)); a.step(40); assert.equal(cap(a), LINES.trip_mars_found, 'Show me glides there and counts as found');
  a.click(main(a)); a.step(40);
  assert.equal(cap(a), LINES.trip_saturn); assert.equal(a.app.hooks.homeScope, 'all', 'Saturn is in view');
  const [sx, sy] = a.screenOf('Saturn'); assert.ok(sx > 0 && sx < 412 && sy > 0 && sy < 915, 'Saturn on screen');
  tapWorld(a, 'Saturn'); assert.equal(cap(a), LINES.trip_saturn_found);
  a.click(main(a)); a.step(40);
  assert.equal(a.$('story-step').textContent, 'Adventure complete'); assert.equal(cap(a), LINES.trip_done);
  assert.equal(main(a).textContent, 'Replay'); assert.equal(a.$('story-skip').textContent, 'Explore freely');
  assert.equal(a.$('play').dataset.state, playing, 'orbit motion restored');
  a.click(a.$('story-skip')); assert.equal(cap(a), LINES.trip_explore, 'the exit line is captioned too');
  a.click(a.$('story-exit')); assert.equal(story(a).hidden, true); assert.equal(chip.hidden, false);
  a.step(40); tapWorld(a, 'Earth'); assert.equal(a.sheet, 'peek', 'free exploring: world cards are back'); assert.equal(a.$('title').textContent, 'Earth');
  assert.equal(a.errors.length, 0);
});

test('the Moon stop frames Earth and the Moon on a portrait phone for any Moon position', async () => {
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const a = await ready({ seed });
    a.click(a.$('adventure')); a.step(40); tapWorld(a, 'Earth'); a.click(main(a)); a.step(40);
    const [x, y, z] = a.screenOf('Moon'); assert.ok(x > 8 && x < 404 && y > 60 && y < 915 && z < 1, `seed ${seed}: Moon at ${x.toFixed(0)},${y.toFixed(0)}`);
    const picked = a.app.pickAt(x, y, 'touch'); assert.ok(['Moon', 'Earth'].includes(picked?.data.name), `seed ${seed}`);
  }
  assert.ok(moonFrameMul(412 / 915) > moonFrameMul(16 / 9), 'portrait frames wider');
});

test('controls: Skip moves on, ▶/❚❚ replays or stops the narration, ✕ exits mid-story and restores motion', async () => {
  const a = await ready();
  a.click(a.$('adventure')); a.step(5);
  a.click(a.$('story-skip')); assert.equal(a.$('story-step').textContent, '2 / 4 · Our Moon');
  const v = a.$('story-voice'); assert.ok(['Play narration', 'Pause narration'].includes(v.getAttribute('aria-label')));
  a.click(v); assert.equal(cap(a), LINES.trip_moon, 'replaying keeps the caption');
  a.click(a.$('story-exit')); a.step(40);
  assert.equal(cap(a), LINES.trip_explore); assert.equal(a.$('play').dataset.state, 'playing');
  assert.equal(a.app.solarFocused(), null, 'back at the overview');
  a.click(a.$('story-exit')); assert.equal(story(a).hidden, true);
});

test('another scale, a journey or Real scale: the story ends quietly or adapts', async () => {
  const a = await ready();
  a.click(a.$('adventure')); a.step(5); assert.equal(story(a).hidden, false);
  a.click(a.$('journeys')); a.step(5); assert.equal(story(a).hidden, true, 'opening Journeys ends the story');
  a.click(a.$('adventure')); a.step(5); assert.equal(story(a).hidden, false);
  a.click(a.document.querySelector('#ladder [data-level="stars"]')); a.step(120);
  assert.equal(story(a).hidden, true, 'leaving the Solar System ends the story');
  a.click(a.$('adventure')); a.step(200);
  assert.equal(story(a).hidden, false, 'starting from the stars glides back to the Solar System first');
  assert.equal(cap(a), LINES.trip_earth);
  const b = await ready(); b.$('realBtn').click(); b.step(5); assert.equal(b.app.isRealScale(), true);
  b.click(b.$('adventure')); b.step(5); assert.equal(b.app.isRealScale(), false, 'captions describe the shortened default view');
  assert.equal(a.errors.length + b.errors.length, 0);
});

test('reduced motion: Show me jumps (no glide) and the story still works', async () => {
  const a = await ready({ reducedMotion: true });
  a.click(a.$('adventure')); a.step(2); a.click(main(a)); a.step(1);
  const e = a.app.bodies.find(b => b.data.name === 'Earth').mesh.getWorldPosition(a.app.controls.target.clone());
  assert.ok(a.app.controls.target.distanceTo(e) < 1e-6, 'arrived in one frame'); assert.equal(cap(a), LINES.trip_earth_found);
});

test('world names keep clear of the story panel (shared label exclusions)', async () => {
  const a = await ready();
  a.click(a.$('adventure')); a.step(5); a.click(a.$('story-skip')); a.click(a.$('story-skip')); a.step(40); // Mars: whole-system view
  const top = 560; story(a).getBoundingClientRect = () => ({ left: 10, top, right: 402, bottom: 905, width: 392, height: 345 });
  a.step(20);
  const boxes = [...a.document.querySelectorAll('.lbl')].filter(l => !l.hidden && l.style.visibility !== 'hidden').map(l => {
    const m = /translate\(([-\d.]+)px,([-\d.]+)px\) translate\(-50%,calc\(-100% - ([-\d.]+)px\)\)/.exec(l.style.transform || ''); return m && { name: l.textContent, bottom: +m[2] - +m[3] };
  }).filter(Boolean);
  assert.ok(boxes.length >= 3, `some names shown (${boxes.map(b => b.name)})`);
  for (const b of boxes) assert.ok(b.bottom <= top, `${b.name} label ends at ${b.bottom.toFixed(0)} px, above the panel`);
});
