import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { stampJs, stampHtml, stampSite } from '../tools/stamp.mjs';

test('stamps static, side-effect and dynamic relative imports; leaves bare and absolute ones alone', () => {
  const src = `import * as THREE from './vendor/three.module.min.js';\nimport { a } from "../data.js";\nimport './side.js';\nconst m = import('./lazy.js');\nimport x from 'three';\nimport y from 'https://cdn.example/z.js';`;
  const out = stampJs(src, 'abc123');
  assert.match(out, /'\.\/vendor\/three\.module\.min\.js\?v=abc123'/);
  assert.match(out, /"\.\.\/data\.js\?v=abc123"/);
  assert.match(out, /import '\.\/side\.js\?v=abc123'/);
  assert.match(out, /import\('\.\/lazy\.js\?v=abc123'\)/);
  assert.match(out, /from 'three';/);
  assert.match(out, /'https:\/\/cdn\.example\/z\.js'/);
  assert.equal(stampJs(out, 'abc123'), out, 'already-stamped specifiers are left as they are');
});

test('stamps local stylesheet and module script in HTML only', () => {
  const html = `<link rel="stylesheet" href="style.css"><link rel="icon" href="data:image/svg+xml,x.css"><script type="module" src="lab.js"></script><script src="https://x.org/a.js"></script>`;
  const out = stampHtml(html, 'v1');
  assert.match(out, /href="style\.css\?v=v1"/); assert.match(out, /src="lab\.js\?v=v1"/);
  assert.match(out, /data:image\/svg\+xml,x\.css"/); assert.match(out, /"https:\/\/x\.org\/a\.js"/);
});

test('the real site: every module (vendor included) and index.html resolve to one stamped URL each', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'site-'));
  for (const f of ['index.html', ...fs.readdirSync('.').filter(f => f.endsWith('.js'))]) fs.copyFileSync(f, path.join(dir, f));
  fs.cpSync('vendor', path.join(dir, 'vendor'), { recursive: true }); fs.cpSync('voice', path.join(dir, 'voice'), { recursive: true });
  stampSite(dir, 'deadbeef');
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert.match(html, /style\.css\?v=deadbeef/); assert.match(html, /lab\.js\?v=deadbeef/);
  const specs = [];
  for (const f of [...fs.readdirSync(dir).filter(f => f.endsWith('.js')).map(f => path.join(dir, f)), path.join(dir, 'vendor/OrbitControls.js')]) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/\bfrom\s*['"](\.{1,2}\/[^'"]+)['"]/g)) specs.push(m[1]);
  }
  assert.ok(specs.length > 10);
  for (const s of specs) assert.match(s, /\?v=deadbeef$/, s);
  assert.throws(() => stampSite(dir, 'a b'), /plain token/);
});
