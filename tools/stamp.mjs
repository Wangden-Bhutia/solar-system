// Cache-busting for the Pages build. GitHub Pages lets browsers cache files for ~10 minutes,
// so right after a deploy a phone can load the new index.html with the old style.css and
// old modules. This appends ?v=<version> to every relative CSS/JS reference so a page only
// ever loads files from its own deploy.
//
// Every relative module specifier gets the same suffix (including inside vendor/), so a module
// imported from two places still resolves to one URL and loads once.
//
// Usage: node tools/stamp.mjs <site-dir> <version>
import fs from 'node:fs';
import path from 'node:path';

const REL = String.raw`\.{1,2}/[^'"?#\s]+`;

export function stampJs(src, v) {
  // static imports/exports: from './x.js'   side-effect imports: import './x.js'   dynamic: import('./x.js')
  return src.replace(new RegExp(String.raw`(\bfrom\s*|\bimport\s*\(?\s*)(['"])(${REL}\.m?js)\2`, 'g'),
    (_, pre, q, spec) => `${pre}${q}${spec}?v=${v}${q}`);
}

export function stampHtml(src, v) {
  return src.replace(/(<(?:script|link)\b[^>]*\b(?:src|href)=)(["'])(?!https?:|data:|\/\/)([^"'?#]+\.(?:m?js|css))\2/g,
    (_, pre, q, url) => `${pre}${q}${url}?v=${v}${q}`);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

export function stampSite(dir, v) {
  if (!/^[\w.-]+$/.test(v)) throw Error('version must be a plain token');
  const changed = [];
  for (const f of walk(dir)) {
    const ext = path.extname(f);
    if (ext !== '.js' && ext !== '.mjs' && ext !== '.html') continue;
    const src = fs.readFileSync(f, 'utf8');
    const out = ext === '.html' ? stampHtml(src, v) : stampJs(src, v);
    if (out !== src) { fs.writeFileSync(f, out); changed.push(path.relative(dir, f)); }
  }
  return changed;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir, v] = process.argv.slice(2);
  if (!dir || !v) { console.error('usage: node tools/stamp.mjs <site-dir> <version>'); process.exit(2); }
  const changed = stampSite(dir, v);
  console.log(`stamped ${changed.length} files with ?v=${v}: ${changed.join(', ')}`);
}
