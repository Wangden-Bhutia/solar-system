// Write the narration lines for the tour, journeys, journey inward and cosmic year into voice/lines.json, from the
// on-screen text (narration.js says how each is spoken). The world-card, lab and adventure lines already there are kept.
// Then run tools/build-voice.py to record only the clips whose text changed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOUR_STOPS } from '../tour.js';
import { JOURNEYS } from '../learn.js';
import { RUNGS, END } from '../inward-data.js';
import { EVENTS } from '../cosmic-calendar.js';
import { say, spoken, tourClip, journeyClip, inwardClip, INWARD_END_CLIP, cosmicClip } from '../narration.js';

export function narrationLines() {
  const out = {};
  for (const s of TOUR_STOPS) out[tourClip(s)] = say(s.title, s.text);
  for (const j of JOURNEYS) j.steps.forEach((st, i) => (out[journeyClip(j.id, i)] = say(st.title, st.text)));
  for (const r of RUNGS) out[inwardClip(r.id)] = spoken(r.text);
  out[INWARD_END_CLIP] = say(END.title, END.lines.join(' '));
  for (const e of EVENTS) out[cosmicClip(e.id)] = say(e.title, e.text);
  return out;
}
export const NARRATION_PREFIXES = /^(tour|jr|in|cy)_/;

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'voice', 'lines.json');
  const lines = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const k of Object.keys(lines)) if (NARRATION_PREFIXES.test(k)) delete lines[k];
  const add = narrationLines();
  fs.writeFileSync(file, JSON.stringify({ ...lines, ...add }, null, 1) + '\n');
  console.log(`${Object.keys(add).length} narration lines written; ${Object.keys(lines).length} card, lab and adventure lines kept`);
}
