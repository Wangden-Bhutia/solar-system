// Remind me: each sky event as a calendar file (iCalendar, RFC 5545), with an alert 30 minutes before the time to look.
// Written at deploy into the site's ics/ folder (node tools/ics.mjs _site), so a card's Remind me is a plain link:
// iPhone Safari offers Add to Calendar, Android downloads the file and opens it in the calendar. Nothing is sent anywhere.
import fs from 'node:fs';
import path from 'node:path';
import { SKY_EVENTS } from '../sky-events.js';
export const APP_URL = 'https://wangden-bhutia.github.io/solar-system/';
const HOUR = 3600000;

// RFC 5545: escape \ ; , and newlines in text values; fold lines longer than 75 octets with CRLF + space.
export const icsText = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
export function fold(line) {
  const enc = new TextEncoder(),
    out = [];
  let cur = '',
    n = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length,
      max = out.length ? 74 : 75; // continuation lines start with a space
    if (n + b > max) {
      out.push(cur);
      cur = '';
      n = 0;
    }
    cur += ch;
    n += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}
const stamp = ms =>
  new Date(ms)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

// How long to keep the calendar slot: a meteor shower or an eclipse is watched for a while; a planet is a glance.
const lengthOf = e => (e.kind === 'Meteors' ? 2 : e.kind === 'Eclipse' ? 1.5 : 1) * HOUR;
export const remindAt = e => e.look?.at ?? e.at;

export function eventICS(e, now = Date.now()) {
  const start = remindAt(e),
    istTime = new Date(start).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
  const desc =
    `${e.when}. ${e.text}\n\n` +
    `The time is for India (${istTime} IST). In A Mote in a Sunbeam, Explore → Coming up → Where to look turns the sky view to it from where you are.\n${APP_URL}`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//A Mote in a Sunbeam//Coming up//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.id}@wangden-bhutia.github.io`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(start + lengthOf(e))}`,
    `SUMMARY:${icsText(e.title)}`,
    `DESCRIPTION:${icsText(desc)}`,
    `URL:${APP_URL}`,
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:-PT30M',
    `DESCRIPTION:${icsText(`${e.title}: ${e.when}`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function writeICS(dir, now = Date.now(), list = SKY_EVENTS) {
  const out = path.join(dir, 'ics');
  fs.mkdirSync(out, { recursive: true });
  for (const e of list) fs.writeFileSync(path.join(out, `${e.id}.ics`), eventICS(e, now));
  return list.length;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir) {
    console.error('usage: node tools/ics.mjs <site-dir>');
    process.exit(2);
  }
  console.log(`wrote ${writeICS(dir)} calendar files to ${dir}/ics`);
}
