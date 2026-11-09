import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('offline and install files exist and are deployed: service worker, manifest, icons', () => {
  const wf = fs.readFileSync('.github/workflows/pages.yml', 'utf8'), html = fs.readFileSync('index.html', 'utf8');
  for (const f of ['sw.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png']) { assert.ok(fs.existsSync(f), f); assert.match(wf, new RegExp(f.replace('.', '\\.')), `${f} is copied by the Pages build`); }
  assert.match(html, /<link rel="manifest" href="manifest\.webmanifest">/);
  const m = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8')); assert.equal(m.start_url, './'); assert.ok(m.icons.some(i => i.sizes === '512x512'));
  const sw = fs.readFileSync('sw.js', 'utf8'); assert.match(sw, /mode === 'navigate'/); assert.match(sw, /caches\.match\(req\)/);
});

test('every scale’s real scene can glide in and out (the ladder and the voyage rely on it, and test stand-ins could hide a gap)', () => {
  const api = { 'stars.js': ['zoomOut', 'zoomBackIn'], 'galaxy.js': ['zoomOut', 'zoomToSun'], 'local.js': ['zoomOut', 'zoomBackIn', 'overview'], 'cosmos.js': ['zoomOut', 'zoomBackIn', 'overview'] };
  for (const [file, names] of Object.entries(api)) { const src = fs.readFileSync(file, 'utf8'); for (const n of names) assert.match(src, new RegExp(`\\b${n}\\b\\s*[(,:]`), `${file} provides ${n}`); }
});
