import test from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS, AGE_YEARS, YEAR_SECONDS, yearSeconds, calendarAt, eventDate, spanOnCalendar, agoText } from '../cosmic-calendar.js';
import { AGE } from '../cosmos-data.js';

const ev = id => EVENTS.find(e => e.id === id);
test('the age used agrees with the app’s own cosmology, and the year has 365 days', () => {
  assert.ok(Math.abs(AGE_YEARS / 1e9 - AGE) < 0.05, `${AGE}`); assert.equal(YEAR_SECONDS, 31536000);
});
test('known anchors from Wikipedia’s Cosmic calendar come out the same', () => {
  assert.equal(eventDate(ev('bang')).label, '1 Jan, 00:00');
  assert.equal(eventDate(ev('cmb')).label, '1 Jan, 00:14');
  assert.equal(eventDate(ev('disk')).date, '13 May');
  assert.equal(eventDate(ev('dinos')).date, '25 Dec');
  assert.equal(eventDate(ev('impact')).date, '30 Dec');
  assert.equal(eventDate(ev('humans')).label, '31 Dec, 23:52');
  assert.equal(eventDate(ev('farming')).label, '31 Dec, 23:59:32');
  assert.equal(eventDate(ev('now')).label, '31 Dec, midnight');
});
test('events run in order from the Big Bang to now, each with a source and plain text', () => {
  for (let i = 1; i < EVENTS.length; i++) assert.ok(EVENTS[i].ago < EVENTS[i - 1].ago, EVENTS[i].id);
  for (const e of EVENTS) { assert.ok(e.src.length >= 1 && e.src.every(s => /^https:\/\/en\.wikipedia\.org\/wiki\//.test(s.url)), e.id); assert.ok(e.title && e.text.length > 20); }
  const secs = EVENTS.map(e => yearSeconds(e.ago)); assert.ok(secs[0] === 0 && Math.abs(secs.at(-1) - YEAR_SECONDS) < 1e-6);
});
test('the app’s earliest galaxy lands in the first fortnight of January', () => {
  const d = eventDate(ev('galaxy')); assert.equal(d.month, 'Jan'); assert.ok(d.day >= 5 && d.day <= 10, d.label);
});
test('calendarAt handles month edges and the end of the year', () => {
  assert.equal(calendarAt(31 * 86400).date, '1 Feb'); assert.equal(calendarAt(31 * 86400 - 1).date, '31 Jan');
  assert.equal(calendarAt(YEAR_SECONDS).label, '31 Dec, midnight'); assert.equal(calendarAt(YEAR_SECONDS - 86400 * 0.5).label, '31 Dec, 12:00');
});
test('spans are put on the calendar: a long life is a fraction of a second, written history about ten seconds', () => {
  assert.equal(spanOnCalendar(80), '0.18 seconds'); assert.equal(spanOnCalendar(5000), '11 seconds'); assert.equal(spanOnCalendar(0.5e6), '19 minutes');
  assert.equal(agoText(AGE_YEARS), '13.79 billion years ago'.replace('13.79', String(+(AGE_YEARS / 1e9).toPrecision(4)))); assert.equal(agoText(12000), '12,000 years ago'); assert.equal(agoText(0), 'today');
});
