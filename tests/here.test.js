import test from 'node:test';
import assert from 'node:assert/strict';
import { HERE, hereLine, FINALE } from '../here.js';
import { COSMOS_FACTS } from '../cosmos-data.js';

test('every scale has a "you are here" line, and nothing else does', () => {
  assert.deepEqual(Object.keys(HERE).sort(), ['galaxy', 'local', 'solar', 'stars', 'super', 'universe']);
  for (const k of Object.keys(HERE)) assert.match(hereLine(k), /^You are here: /);
  assert.equal(hereLine('nowhere'), '');
});
test('figures match the sourced facts', () => {
  assert.ok(HERE.super.includes(COSMOS_FACTS.laniakeaGalaxies));
  assert.ok(HERE.universe.includes(COSMOS_FACTS.galaxies));
  assert.ok(FINALE.lines.join(' ').includes(COSMOS_FACTS.edge));
  assert.match(HERE.galaxy, /27,000 light-years/);
});
test('the finale is short, has no question, and two actions', () => {
  assert.ok(FINALE.lines.length >= 3 && FINALE.lines.length <= 5);
  assert.ok(!FINALE.lines.join(' ').includes('?'));
  assert.ok(FINALE.home && FINALE.save && FINALE.caption);
});
