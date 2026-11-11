import test from 'node:test';
import assert from 'node:assert/strict';
import { HERE, HERE_MORE, hereLine, hereMore, FINALE } from '../here.js';
import { COSMOS_FACTS } from '../cosmos-data.js';

test('every scale has a "you are here" line, and nothing else does', () => {
  assert.deepEqual(Object.keys(HERE).sort(), ['galaxy', 'local', 'solar', 'stars', 'super', 'universe']);
  for (const k of Object.keys(HERE)) assert.match(hereLine(k), /^You are here: /);
  assert.equal(hereLine('nowhere'), '');
  // the always-on line stays short (one line on a phone); the second sentence waits behind a tap
  for (const k of Object.keys(HERE)) assert.ok(hereLine(k).length <= 48, `${k}: ${hereLine(k).length} characters`);
  for (const k of Object.keys(HERE_MORE)) assert.ok(HERE[k] && hereMore(k).length > 0, k);
  assert.equal(hereMore('solar'), '');
  assert.match(HERE_MORE.galaxy, /100\u2013\u2060400\u00a0billion/, 'the range never breaks across lines');
});
test('figures match the sourced facts', () => {
  assert.ok(HERE_MORE.super.includes(COSMOS_FACTS.laniakeaGalaxies));
  assert.ok(HERE_MORE.universe.includes(COSMOS_FACTS.galaxies));
  assert.match(HERE_MORE.stars, /4\.2 light-years/);
  assert.ok(FINALE.lines.join(' ').includes(COSMOS_FACTS.edge));
  assert.match(HERE_MORE.galaxy, /27,000 light-years/);
});
test('the finale is short, has no question, and two actions', () => {
  assert.ok(FINALE.lines.length >= 3 && FINALE.lines.length <= 5);
  assert.ok(!FINALE.lines.join(' ').includes('?'));
  assert.ok(FINALE.home && FINALE.save && FINALE.caption);
});
