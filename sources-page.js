// The Sources screen: every claim the app shows with its sources, and what is real versus illustration.
// Drawn from sources.js (the app's own data), so it cannot drift from the cards, labs, tour and adventure.
// A full-screen sheet over the scene: opening it changes nothing underneath, and closing it (✕, Esc) returns focus to
// whatever opened it, so the person is back exactly where they were. Built on first open; no THREE import.
import { claimGroups, illustrations, REFS, CHECKED_ON } from './sources.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const refLink = k => { const r = REFS[k]; if (!r) throw Error(`unknown source ${k}`); return `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.label)}</a>`; };
export const refLinks = keys => keys.map(refLink).join(' · ');
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

export function sourcesHTML() {
  const groups = claimGroups(), ill = illustrations();
  const nav = [...groups.map(g => [g.id, g.title]), ['illustrations', 'Real or illustration?']]
    .map(([id, t]) => `<button type="button" class="src-jump" data-jump="src-${id}">${esc(t)}</button>`).join('');
  const body = groups.map(g => `<section class="src-group" id="src-${g.id}" data-group="${g.id}"><h2>${esc(g.title)}</h2>${g.sections.map(s =>
    `<details class="src-sec" id="src-${s.id}"><summary>${esc(s.title)} <span class="src-n">${plural(s.claims.length, 'fact')}</span></summary><ul>${s.claims.map(c =>
      `<li><p>${esc(c.text)}</p>${c.note ? `<p class="src-note">${esc(c.note)}</p>` : ''}<p class="src-links">${refLinks(c.src)}</p></li>`).join('')}</ul></details>`).join('')}</section>`).join('');
  const real = `<section class="src-group" id="src-illustrations" data-group="illustrations"><h2>Real or illustration?</h2><p class="src-intro">What each view draws true to life and what it changes so you can see it.</p><ul class="src-ill">${ill.map(i =>
    `<li><p class="src-where">${esc(i.where)}</p><p><b>Illustration:</b> ${esc(i.shown)}</p><p><b>Real:</b> ${esc(i.real)}</p><p class="src-links">${refLinks(i.src)}</p></li>`).join('')}</ul></section>`;
  return `<header class="src-head"><h1 id="sources-title">Sources</h1><button type="button" id="sources-close" class="icon" aria-label="Close sources">✕</button></header>`
    + `<div class="src-scroll" id="sources-scroll"><p class="src-intro">Every fact the app shows, where it appears and where it comes from. Checked ${esc(CHECKED_ON)}. Links open in a new tab. Wikipedia pages are marked as such: they summarise the published papers they cite.</p>`
    + `<nav class="src-nav" aria-label="Jump to">${nav}</nav>${body}${real}</div>`;
}

export function mountSources(doc, { onOpen, onClose } = {}) {
  const el = doc.createElement('section');
  el.id = 'sources-page'; el.className = 'sources-page'; el.hidden = true;
  for (const [k, v] of Object.entries({ role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sources-title', 'data-label-exclude': '' })) el.setAttribute(k, v);
  doc.body.append(el);
  let built = false, opener = null;
  const q = id => el.querySelector('#' + id);
  function build() {
    if (built) return; built = true; el.innerHTML = sourcesHTML();
    q('sources-close').onclick = () => api.close();
    for (const b of el.querySelectorAll('[data-jump]')) b.onclick = () => api.show(b.dataset.jump);
  }
  const api = {
    el, get isOpen() { return !el.hidden; },
    // anchor: a group or section id (e.g. 'src-world-Mars', 'src-tour-oort'); a section is opened and scrolled to.
    show(anchor) {
      const t = anchor && q(anchor); if (!t) return false;
      if (t.tagName === 'DETAILS') t.open = true;
      t.scrollIntoView?.({ block: 'start' }); return true;
    },
    open(anchor, from) {
      build(); opener = from || doc.activeElement || null;
      if (el.hidden) { el.hidden = false; doc.body.classList.add('sources-open'); onOpen?.(); }
      if (!api.show(anchor)) { const s = q('sources-scroll'); if (s) s.scrollTop = 0; }
      q('sources-close').focus?.();
    },
    close() {
      if (el.hidden) return; el.hidden = true; doc.body.classList.remove('sources-open'); onClose?.();
      try { opener?.focus?.(); } catch { /* opener gone */ } opener = null;
    },
  };
  doc.addEventListener('keydown', e => { if (e.key === 'Escape' && !el.hidden) { e.stopImmediatePropagation?.(); api.close(); } }, true);
  return api;
}
