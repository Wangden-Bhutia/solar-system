import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
// A stray unclosed block silently swallows every rule after it; check braces balance and that the
// rules for the space levels sit at the top level.
test('style.css is well-formed: braces balance, no block left open, space-mode rules are top-level', () => {
  const css = fs.readFileSync('style.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  let depth = 0, min = 0; for (const ch of css) { if (ch === '{') depth++; else if (ch === '}') { depth--; min = Math.min(min, depth); } }
  assert.equal(depth, 0, 'every { has a }'); assert.equal(min, 0, 'no } without a {');
  const depthAt = sel => { const i = css.indexOf(sel); assert.ok(i >= 0, sel); let d = 0; for (const ch of css.slice(0, i)) { if (ch === '{') d++; else if (ch === '}') d--; } return d; };
  for (const sel of ['body.space-mode #labels .lbl:not(.space)', '#ladder{', '#edge-hint{', '#fade{']) assert.equal(depthAt(sel), 0, `${sel} is not inside another block`);
});
