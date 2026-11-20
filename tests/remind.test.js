// Remind me: each Coming up event as a calendar file with a 30-minute alert, written at deploy (tools/ics.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { eventICS, writeICS, icsText, fold, remindAt } from '../tools/ics.mjs';
import { precacheList } from '../tools/stamp.mjs';
import { SKY_EVENTS } from '../sky-events.js';

const unfold = s => s.replace(/\r\n /g, '');
const field = (ics, k) =>
  unfold(ics)
    .split('\r\n')
    .find(l => l.startsWith(k + ':'))
    ?.slice(k.length + 1);
const stamp = ms =>
  new Date(ms)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

test('every event becomes a valid calendar file: CRLF lines of at most 75 octets, one event, an alert 30 minutes before', () => {
  const uids = new Set();
  for (const e of SKY_EVENTS) {
    const ics = eventICS(e, Date.UTC(2026, 10, 20));
    assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n') && ics.endsWith('END:VCALENDAR\r\n'), e.id);
    for (const l of ics.slice(0, -2).split('\r\n')) assert.ok(new TextEncoder().encode(l).length <= 75, `${e.id}: ${l}`);
    assert.doesNotMatch(ics.replace(/\r\n/g, ''), /[\r\n]/, `${e.id}: no bare line breaks`);
    assert.equal(ics.match(/BEGIN:VEVENT/g).length, 1);
    assert.equal(field(ics, 'DTSTART'), stamp(remindAt(e)), `${e.id}: starts at the time to look`);
    assert.ok(field(ics, 'DTEND') > field(ics, 'DTSTART'));
    assert.match(ics, /BEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:-PT30M\r\n/);
    assert.equal(field(ics, 'SUMMARY'), icsText(e.title));
    assert.ok(field(ics, 'DESCRIPTION').includes(icsText(e.when)) && field(ics, 'DESCRIPTION').includes('IST'), e.id);
    const uid = field(ics, 'UID');
    assert.ok(!uids.has(uid), uid);
    uids.add(uid);
  }
});

test('text is escaped and long lines folded without splitting a character', () => {
  assert.equal(icsText('a, b; c\\d\ne'), 'a\\, b\\; c\\\\d\\ne');
  const long = 'DESCRIPTION:' + 'Explore → Coming up · '.repeat(12),
    f = fold(long);
  assert.equal(unfold(f), long);
  for (const l of f.split('\r\n')) assert.ok(new TextEncoder().encode(l).length <= 75);
});

test('each card’s date and its "when" line name the same day as the time to look (India time)', () => {
  for (const e of SKY_EVENTS.filter(e => e.look)) {
    const d = new Date(e.look.at + 5.5 * 3600000),
      day = d.getUTCDate(),
      mon = d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
    assert.ok(new RegExp(`\\b${day}\\b`).test(e.when) && e.when.includes(mon), `${e.id}: ${day} ${mon} vs "${e.when}"`);
  }
});

test('the deploy writes one file per event into ics/, kept out of the offline download', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ics-'));
  fs.writeFileSync(path.join(dir, 'index.html'), '');
  assert.equal(writeICS(dir, Date.UTC(2026, 10, 20)), SKY_EVENTS.length);
  for (const e of SKY_EVENTS) assert.ok(fs.existsSync(path.join(dir, 'ics', `${e.id}.ics`)), e.id);
  assert.ok(!precacheList(dir, 'v').some(f => f.endsWith('.ics')));
  const wf = fs.readFileSync('.github/workflows/pages.yml', 'utf8');
  assert.ok(wf.indexOf('node tools/ics.mjs _site') > 0 && wf.indexOf('node tools/ics.mjs _site') < wf.indexOf('node tools/stamp.mjs'));
  const card = fs.readFileSync('coming-up.js', 'utf8');
  assert.match(card, /href="ics\/\$\{e\.id\}\.ics"/, 'each card links its file');
});
