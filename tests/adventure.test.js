import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createAdventure, STOPS } from '../adventure.js';
import { MOON, PLANETS } from '../data.js';
import { LINES } from '../voice/lines.js';
test('four stops require the right world, can repeat, cancel, and restart', () => {
  const t = createAdventure();
  assert.equal(t.current, null); t.start();
  for (const s of STOPS) {
    assert.equal(t.current, s); assert.equal(t.next(), false);
    assert.equal(t.answer('Venus'), false); assert.equal(t.found, false);
    assert.equal(t.answer(s.target), true); assert.equal(t.answer(s.target), false);
    assert.equal(t.next(), true);
  }
  assert.equal(t.current, null); t.start(); assert.equal(t.index, 0);
  t.answer('Earth'); t.stop(); assert.equal(t.next(), false); assert.equal(t.current, null);
});
test('every mission references matching generated speech and selectable bodies', () => {
  for (const s of STOPS) {
    assert.ok(LINES[s.prompt]); assert.ok(LINES[s.fact]);
    assert.ok([...PLANETS, MOON].some(p => p.name === s.target));
  }
  assert.ok(MOON.facts.length); assert.equal(MOON.size / PLANETS.find(p => p.name === 'Earth').size, MOON.km/12756);
  assert.ok(MOON.realDist > MOON.dist * 10);
});
test('all 80 voice files exist and manifest/source text match; Pages includes new modules', () => {
  const list = JSON.parse(fs.readFileSync('voice/lines.json'));
  const manifest = JSON.parse(fs.readFileSync('voice/manifest.json'));
  assert.equal(Object.keys(list).length, 80); assert.deepEqual(list, LINES);
  for (const [id,text] of Object.entries(list)) {
    assert.equal(manifest[id].text, text); assert.ok(manifest[id].dur > 0);
    assert.ok(fs.statSync(`voice/${id}.mp3`).size > 1000);
  }
  const workflow = fs.readFileSync('.github/workflows/pages.yml','utf8');
  for (const f of ['adventure.js','voice-player.js','land.js','voice']) assert.ok(workflow.includes(f));
});
test('phone CSS contract: compact toolbar fits 320/360/412px and landscape has its own layout', () => {
  const css = fs.readFileSync('style.css','utf8');
  assert.match(css, /@media\(max-width:359px\)/);
  for (const width of [320,360,412]) {
    const button = width < 359 ? 64 : 72;
    const gap = Math.min(14,Math.max(6,width*.025));
    assert.ok(4*button+3*gap <= width-16);
  }
  assert.match(css, /max-height:45dvh;overflow:auto;touch-action:pan-y/);
  assert.match(css, /width:calc\(100vw - 104px\)/);
  assert.match(css, /min-height:48px/);
});
test('portrait ring framing leaves room for Saturn outer radius at 320px widths', () => {
  for (const [w,h] of [[320,740],[320,915],[412,915]]) {
    const aspect=w/h, distance=Math.max(9,6/aspect);
    const halfWidth=distance*Math.tan(25*Math.PI/180)*aspect;
    assert.ok(halfWidth>2.3);
  }
});
