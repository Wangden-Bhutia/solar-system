import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FINALE } from '../here.js';
import { END, RUNGS } from '../inward-data.js';

test('the tour and the journey inward point to each other at their ends', () => {
  assert.match(FINALE.other, /other way/i);
  assert.match(END.other, /other way/i);
  const finale = fs.readFileSync('finale.js', 'utf8'),
    inward = fs.readFileSync('inward.js', 'utf8'),
    lab = fs.readFileSync('lab.js', 'utf8');
  assert.match(finale, /id="finale-other"[^`]*\$\{FINALE\.other\}/);
  assert.match(inward, /class="finale-other iw-other">\$\{END\.other\}/);
  assert.match(
    lab,
    /onOther:\s*\(\)\s*=>\s*backToEarth\(\(\)\s*=>\s*openInward\(entryView\(\)\)\)/,
    'home to Earth first, then into the atom'
  );
  assert.match(lab, /onOutward:\s*\(\)\s*=>\s*tourRef\?\.start\(0\)/);
  assert.match(
    lab,
    /homeBtn\.onclick = \(\) => backToEarth\(\);/,
    'the Back to Earth button never passes its click event as the follow-up'
  );
});

test('Explore lists the journey inward first among the Journeys, with its real step count on the title line', () => {
  const lab = fs.readFileSync('lab.js', 'utf8');
  assert.match(
    lab,
    /'<p class="xsec">Journeys<\/p>' \+\s*card\(\s*'inward',\s*'Journey inward',[^)]*`\$\{INWARD_STEPS\.length\} stops`\s*\)/
  );
  assert.equal(RUNGS.length, 16);
});
