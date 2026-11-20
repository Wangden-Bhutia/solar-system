import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('each scale button is announced with the words it shows, on a phone (short) and wider screens (full)', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const buttons = [...html.matchAll(/<button data-level="(\w+)"[^>]*aria-label="([^"]+)"><span class="full">([^<]+)<\/span><span class="short"[^>]*>([^<]+)<\/span>/g)];
  assert.equal(buttons.length, 6);
  for (const [, level, label, full, short] of buttons) for (const shown of [full, short]) assert.ok(label.toLowerCase().includes(shown.toLowerCase()), `${level}: "${label}" includes "${shown}"`);
});

test('My Sky: each chip is a button inside a list item, not a button with the list-item role', () => {
  const src = fs.readFileSync('my-sky.js', 'utf8');
  assert.doesNotMatch(src, /b\.setAttribute\('role', 'listitem'\)/);
  assert.match(src, /li\.setAttribute\('role', 'listitem'\);[^\n]*li\.appendChild\(b\)/);
});
