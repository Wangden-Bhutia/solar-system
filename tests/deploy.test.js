import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { precacheList } from '../tools/stamp.mjs';

test('the deploy runs the whole test suite first, and only deploys main', () => {
  const wf = fs.readFileSync('.github/workflows/pages.yml', 'utf8');
  assert.match(
    wf,
    /\n  test:\n[\s\S]*?run: npm ci\n[\s\S]*?- run: npm run format:check[\s\S]*?- run: npm test/,
    'a test job runs npm test'
  );
  assert.match(wf, /\n  deploy:\n    needs: test\n/, 'the deploy waits for the tests');
  assert.match(wf, /if: github\.ref == 'refs\/heads\/main'/, 'pull requests run the tests but never deploy');
  assert.match(wf, /group: pages-\$\{\{ github\.ref \}\}/, 'a pull request never cancels a deploy of main');
});

test('unversioned files (textures, data) are refreshed in the background; versioned ones stay cache-first', () => {
  const sw = fs.readFileSync('sw.js', 'utf8');
  assert.match(sw, /\[\?&\]\[vh\]=/, 'versioned URLs (?v= or ?h=) are told apart');
  assert.match(sw, /e\.waitUntil\(fresh\(\)/, 'a cached unversioned file is re-checked after it is served');
});

test('a shared link shows a description and a picture; the picture is deployed but not part of the offline download', () => {
  const html = fs.readFileSync('index.html', 'utf8'),
    wf = fs.readFileSync('.github/workflows/pages.yml', 'utf8');
  for (const re of [
    /<meta name="description" content="[^"]{60,160}">/,
    /<meta property="og:title" content="[^"]+">/,
    /<meta property="og:description" content="[^"]+">/,
    /<meta property="og:image" content="https:\/\/[^"]+\/og-image\.jpg">/,
    /<meta name="twitter:card" content="summary_large_image">/
  ])
    assert.match(html, re);
  assert.ok(fs.existsSync('og-image.jpg'));
  assert.match(wf, /\bog-image\.jpg\b/);
  const dir = fs.mkdtempSync('/tmp/og-');
  fs.writeFileSync(dir + '/og-image.jpg', 'x');
  fs.writeFileSync(dir + '/index.html', 'x');
  assert.deepEqual(precacheList(dir, 'v1'), ['./']);
});
