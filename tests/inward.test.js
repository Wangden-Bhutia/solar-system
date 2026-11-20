import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  RUNGS,
  END_W,
  END,
  W_MAX,
  W_MIN,
  rungAt,
  formatMetres,
  compareWithYou,
  SOURCES,
  CHAIN,
  CHAIN_W,
  LEAF_W,
  TOP_W,
  toTrue,
  toPicture
} from '../inward-data.js';

test('journey inward: sixteen steps from Earth into an atom, each smaller than the last and inside the zoom range', () => {
  assert.equal(RUNGS.length, 16);
  assert.equal(RUNGS[0].id, 'earth');
  assert.equal(RUNGS.at(-1).id, 'proton');
  assert.ok(END_W < RUNGS.at(-1).w / 100 && END_W > W_MIN, 'the end lies below the last step');
  assert.equal(END.lines.length, 3);
  for (let k = 1; k < RUNGS.length; k++) assert.ok(RUNGS[k].w < RUNGS[k - 1].w, RUNGS[k].id);
  for (const r of RUNGS) {
    assert.ok(r.w < W_MAX && r.w > W_MIN, r.id);
    assert.equal(rungAt(r.w), r, r.id);
    assert.match(r.here, /^You are here: /);
    assert.ok(r.text.length > 20 && r.text.length < 260, r.id);
  }
  assert.equal(new Set(RUNGS.map(r => r.id)).size, RUNGS.length);
});
test('journey inward: every fact about the body and atoms has a source; the steps that only say where we are need none', () => {
  for (const r of RUNGS) if (/[0-9]/.test(r.text) && r.id !== 'earth') assert.ok(r.src.length > 0, r.id);
  assert.ok(SOURCES.every(s => /^https:\/\/en\.wikipedia\.org\/wiki\//.test(s.url) && s.label.startsWith('Wikipedia: ')));
});
test('journey inward: the width readout rolls its units over and compares with a person in round numbers', () => {
  const cases = [
    [1.6e7, '16,000 km'],
    [2.4e4, '24 km'],
    [300, '300 m'],
    [1.1, '1.1 m'],
    [0.16, '16 cm'],
    [0.045, '4.5 cm'],
    [3e-3, '3 mm'],
    [3e-4, '300 µm'],
    [4e-5, '40 µm'],
    [1.2e-7, '120 nm'],
    [9e-10, '0.9 nm'],
    [6e-11, '60 pm'],
    [2.4e-15, '2.4 fm']
  ];
  for (const [m, s] of cases) assert.equal(formatMetres(m), s, String(m));
  assert.equal(compareWithYou(1.1), 'about your own height');
  assert.equal(compareWithYou(300), 'about 190 times bigger than you');
  assert.equal(compareWithYou(3e-3), 'about 530 times smaller than you');
  assert.equal(compareWithYou(9e-6), 'about 180 thousand times smaller than you');
  assert.equal(compareWithYou(9e-10), 'about 1.8 billion times smaller than you');
});
test('journey inward: its pictures and modules ship with the app, and Explore offers it', () => {
  const yml = fs.readFileSync('.github/workflows/pages.yml', 'utf8');
  for (const f of ['inward.js', 'inward-data.js', 'inward-world.js']) assert.ok(yml.includes(f), f);
  for (const c of CHAIN) assert.ok(fs.statSync(`textures/${c.f}.webp`).size < 500e3, c.f);
  const world = fs.readFileSync('inward-world.js', 'utf8');
  assert.ok(world.includes('textures/${CHAIN[k].f}.webp'));
  const lab = fs.readFileSync('lab.js', 'utf8');
  assert.match(lab, /card\('inward',\s*'Journey inward'/);
  assert.match(lab, /top\s*===\s*'inward'\)\s*inward\?\.close\(\)/);
  assert.match(lab, /data\?\.name\s*===\s*'Earth'[\s\S]{0,400}?b\.gateIn\s*=\s*pushInward/);
});
test('journey inward: the picture chain nests each picture in the next, and the real widths run from the leaf to 3,600 km', () => {
  assert.equal(CHAIN.length, 16);
  for (let k = 1; k < CHAIN.length; k++) {
    assert.ok(CHAIN[k].s > 0.25 && CHAIN[k].s < 0.45, CHAIN[k].f);
    assert.ok(CHAIN_W[k] > CHAIN_W[k - 1]);
  }
  assert.ok(Math.abs(toTrue(CHAIN_W[0]) / LEAF_W - 1) < 1e-9);
  assert.ok(Math.abs(toTrue(CHAIN_W.at(-1)) / TOP_W - 1) < 1e-9);
  for (const w of [1e-9, 0.05, 1, 300, 5e4, 1e6, 1.6e7]) assert.ok(Math.abs(toTrue(toPicture(w)) / w - 1) < 1e-9, String(w));
  for (let k = 1; k < CHAIN.length; k++) {
    const step = Math.log10(toTrue(CHAIN_W[k]) / toTrue(CHAIN_W[k - 1])) / Math.log10(CHAIN_W[k] / CHAIN_W[k - 1]);
    assert.ok(step > 1 && step < 1.15, CHAIN[k].f);
  }
});
