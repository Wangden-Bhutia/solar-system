// The cosmic year screen: step through 18 moments of the 13.8 billion years, each on its date in one calendar year.
// A bar shows where each falls in the year (nearly everything happens in the last weeks). Data and maths: cosmic-calendar.js.
import { EVENTS, YEAR_SECONDS, AGE_YEARS, yearSeconds, eventDate, spanOnCalendar, agoText } from './cosmic-calendar.js';

export function createCosmicYear({ onGo } = {}) {
  let root, bar, marker, kick, ttl, when, txt, srcs, goBtn, prev, next, ageRow, ageIn, ageOut, dots, i = 0;
  function build() {
    root = document.createElement('section'); root.id = 'cyear'; root.className = 'cyear'; root.hidden = true; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'The cosmic year');
    root.innerHTML = `<div class="cy-top"><button type="button" class="cy-x" aria-label="Close the cosmic year">✕</button><div><strong>The cosmic year</strong><span>13.8 billion years as one calendar year. 1 January is the Big Bang; midnight on 31 December is now.</span></div></div>
 <div class="cy-main"><p class="cy-kick"></p><h2 class="cy-title"></h2><p class="cy-when"></p><p class="cy-text"></p>
 <label class="cy-age" hidden>How old are you? <input type="number" inputmode="numeric" min="0" max="120" value="80" aria-label="Your age in years"> <span class="cy-ageout"></span></label>
 <p class="cy-src"></p><button type="button" class="cy-go" hidden>Show it in space ↗</button></div>
 <div class="cy-barwrap" aria-hidden="true"><div class="cy-bar"><i class="cy-marker"></i></div><div class="cy-months"><span>J</span><span>F</span><span>M</span><span>A</span><span>M</span><span>J</span><span>J</span><span>A</span><span>S</span><span>O</span><span>N</span><span>D</span></div></div>
 <div class="cy-nav"><button type="button" class="cy-prev">‹ Earlier</button><span class="cy-dots" aria-live="polite"></span><button type="button" class="cy-next primary">Later ›</button></div>
 <p class="cy-note">Dates are worked out from each event’s age, and ages differ between sources. Carl Sagan first told the story this way, in 1977, with 15 billion years.</p>`;
    document.body.appendChild(root);
    const q = s => root.querySelector(s); bar = q('.cy-bar'); marker = q('.cy-marker'); kick = q('.cy-kick'); ttl = q('.cy-title'); when = q('.cy-when'); txt = q('.cy-text'); srcs = q('.cy-src'); goBtn = q('.cy-go'); prev = q('.cy-prev'); next = q('.cy-next'); ageRow = q('.cy-age'); ageIn = ageRow.querySelector('input'); ageOut = q('.cy-ageout'); dots = q('.cy-dots');
    for (const [k, e] of EVENTS.entries()) { const t = document.createElement('i'); t.className = 'cy-tick'; t.style.left = (yearSeconds(e.ago) / YEAR_SECONDS * 100) + '%'; t.dataset.k = k; bar.insertBefore(t, marker); }
    q('.cy-x').onclick = close; prev.onclick = () => show(i - 1); next.onclick = () => show(i + 1);
    goBtn.onclick = () => { const l = EVENTS[i].level; close(); if (l) onGo?.(l); };
    ageIn.oninput = paintAge;
    root.addEventListener('keydown', e => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight' && e.target !== ageIn) show(i + 1); else if (e.key === 'ArrowLeft' && e.target !== ageIn) show(i - 1); });
    let x0 = null; root.addEventListener('pointerdown', e => { x0 = e.target.closest('button,input') ? null : e.clientX; }); root.addEventListener('pointerup', e => { if (x0 != null && Math.abs(e.clientX - x0) > 60) show(i + (e.clientX < x0 ? 1 : -1)); x0 = null; });
  }
  const paintAge = () => { const y = Math.max(0, Math.min(120, Number(ageIn.value) || 0)); ageOut.textContent = `A life of ${y} years lasts ${spanOnCalendar(y)} of this year. All of written history: ${spanOnCalendar(5000)}.`; };
  function show(k) {
    i = Math.max(0, Math.min(EVENTS.length - 1, k)); const e = EVENTS[i], d = eventDate(e);
    kick.textContent = d.label; ttl.textContent = e.title; when.textContent = (e.note && e.ago > 1e9 - 1 && e.id === 'cmb' ? e.note : agoText(e.ago)) + (e.note && e.id !== 'cmb' ? ' · ' + e.note : ''); txt.textContent = e.text;
    srcs.innerHTML = 'Sources: ' + e.src.map(s => `<a href="${s.url}" target="_blank" rel="noopener">${s.label.replace('Wikipedia: ', '')}</a>`).join(', ');
    goBtn.hidden = !e.level; ageRow.hidden = e.id !== 'now'; if (e.id === 'now') paintAge();
    marker.style.left = (yearSeconds(e.ago) / YEAR_SECONDS * 100) + '%'; for (const t of bar.querySelectorAll('.cy-tick')) t.classList.toggle('on', Number(t.dataset.k) === i);
    prev.disabled = i === 0; next.disabled = i === EVENTS.length - 1; dots.textContent = `${i + 1} of ${EVENTS.length}`;
  }
  function open() { if (!root) build(); root.hidden = false; document.body.classList.add('cyear-on'); show(0); root.querySelector('.cy-next').focus?.({ preventScroll: true }); }
  function close() { if (!root || root.hidden) return; root.hidden = true; document.body.classList.remove('cyear-on'); }
  return { open, close, show, get isOpen() { return !!root && !root.hidden; }, get index() { return i; } };
}
