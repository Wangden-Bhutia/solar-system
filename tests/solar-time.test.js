// The Solar System's clock lives in the time bar, like the Stars' and the Milky Way's: folded, the chip reads the
// date and says when the clock is paused; open, it holds play, speed, the date and Now. (The real app, in linkedom.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { bootApp, FIXED_NOW } from './integration-harness.js';

test('Solar time bar: the chip reads the date, says paused, and opens to play, speed, date and Now', async () => {
  const a = await bootApp();
  a.step(3);
  const g = a.$('gtime');
  assert.equal(g.hidden, false, 'shown on the Solar System');
  assert.equal(g.dataset.clock, 'solar');
  assert.ok(g.classList.contains('folded'), 'starts folded into the chip');
  for (const id of ['play', 'speed', 'simdate', 'simnow']) assert.ok(g.querySelector('#' + id), `${id} is in the time bar`);
  const word = () => a.$('gchip-text').textContent;
  assert.match(word(), /^\d{1,2} [A-Z][a-z]{2} \d{4}$/, 'the chip reads the date');
  assert.ok(!a.$('gopen').classList.contains('paused'));
  assert.ok(!a.$('gopen').classList.contains('new'), 'no attention pulse on the first screen');
  // Pause: the chip says so (See it in space pauses the clock too, so the scene never just looks stuck).
  a.$('play').onclick();
  a.step(1);
  assert.ok(a.$('gopen').classList.contains('paused'));
  assert.match(a.$('gopen').getAttribute('aria-label'), /paused/);
  a.app.setPlaying(true);
  a.step(1);
  assert.ok(!a.$('gopen').classList.contains('paused'));
  // Open and fold.
  a.$('gopen').onclick();
  assert.ok(!g.classList.contains('folded'));
  g.querySelector('[data-fold]').onclick();
  assert.ok(g.classList.contains('folded'));
  // The date follows the clock; a picked date is set and the field lets go of focus, so it keeps following.
  a.app.setSolarDate(Date.UTC(2027, 1, 19, 12));
  a.step(1);
  assert.equal(word(), '19 Feb 2027');
  assert.equal(a.$('simdate').value, '2027-02-19');
  let blurred = false;
  a.$('simdate').blur = () => (blurred = true);
  a.$('simdate').value = '2028-12-31';
  a.$('simdate').onchange();
  a.step(1);
  assert.equal(word(), '31 Dec 2028');
  assert.ok(blurred, 'the field gives up focus after a pick');
  a.$('simnow').onclick();
  a.step(1);
  assert.equal(new Date(a.app.solarDate()).getUTCDate(), new Date(FIXED_NOW).getUTCDate(), 'Now returns to today');
  assert.deepEqual(a.errors, []);
});

test('the first-visit tour hint goes once Explore has been opened, and stays gone', async () => {
  const a = await bootApp();
  assert.equal(a.$('tour-hint').hidden, false, 'shown on a first visit');
  a.$('journeys').onclick();
  assert.equal(a.$('tour-hint').hidden, true, 'found their own way in');
  const b = await bootApp({ stored: a.storage });
  assert.equal(b.$('tour-hint').hidden, true, 'and not back next time');
});
