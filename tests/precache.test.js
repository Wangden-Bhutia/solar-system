import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { precacheList, writePrecache } from '../tools/stamp.mjs';

test('the deploy writes a list of every file for Install / Save for offline: stamped scripts and styles, the page, assets; never sw.js or voice clips', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'site-'));
  for (const f of ['index.html', 'lab.js', 'style.css', 'sw.js', 'textures/earth.webp', 'voice/a.mp3', '.nojekyll', 'textures/LICENSE.txt']) { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), 'x'); }
  assert.deepEqual(precacheList(dir, 'abc'), ['./', 'lab.js?v=abc', 'style.css?v=abc', 'textures/earth.webp']);
  assert.equal(writePrecache(dir, 'abc'), 4);
  const j = JSON.parse(fs.readFileSync(path.join(dir, 'precache.json'), 'utf8')); assert.equal(j.version, 'abc'); assert.equal(j.bytes, 4, 'bytes = what Save for offline downloads (the listed files only)');
});
