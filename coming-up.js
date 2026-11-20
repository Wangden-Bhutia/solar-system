// Coming up: the next real sky events from India (sky-events.js), each with where to look (My sky at that moment)
// and, where the arrangement in space explains it, the Solar System on that date. Opened from Explore.
import { upcoming } from './sky-events.js';

const fmtDay = ms =>
  new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function createComingUp({ onLook, onSpace, onOpen, onClose, now = () => Date.now() } = {}) {
  let root = null,
    list = null;
  function build() {
    root = document.createElement('section');
    root.id = 'comingup';
    root.className = 'explore comingup';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Coming up in the sky');
    root.tabIndex = -1;
    root.innerHTML =
      '<div class="ex-head"><div><p class="ex-kicker">Coming up</p><h2 class="ex-title">In the sky from India</h2><p class="ex-fact">Real events over the next year, with India times. Where to look turns My sky to the moment; See it in space shows why.</p></div><button type="button" class="ex-x" aria-label="Close Coming up"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><div class="ex-list cu-list"></div>';
    document.body.appendChild(root);
    list = root.querySelector('.cu-list');
    root.querySelector('.ex-x').onclick = () => close();
    root.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
    });
    list.onclick = e => {
      const b = e.target.closest?.('button[data-ev]');
      if (!b) return;
      const ev = upcoming(now()).find(x => x.id === b.dataset.ev);
      if (!ev) return;
      close(true);
      if (b.dataset.do === 'look') onLook?.(ev);
      else onSpace?.(ev);
    };
  }
  function paint() {
    const evs = upcoming(now());
    list.innerHTML = evs.length
      ? evs
          .map(
            e =>
              `<article class="cu-ev"><p class="cu-when"><span>${esc(fmtDay(e.at))}</span><em>${esc(e.kind)}</em></p><h3>${esc(e.title)}</h3><p class="cu-txt">${esc(e.text)}</p><p class="cu-look">${esc(e.when)}</p><div class="cu-acts"><button type="button" data-ev="${e.id}" data-do="look">Where to look</button>${e.space ? `<button type="button" data-ev="${e.id}" data-do="space">See it in space ↗</button>` : ''}</div></article>`
          )
          .join('')
      : '<p class="cu-txt">No more events listed yet. The list is checked and extended with each update.</p>';
  }
  function open() {
    if (!root) build();
    paint();
    root.hidden = false;
    document.body.classList.add('explore-on');
    onOpen?.();
    root.focus?.({ preventScroll: true });
  }
  // leaving: closed because a button sent you somewhere (the caller opens that)
  function close(leaving) {
    if (!root || root.hidden) return;
    root.hidden = true;
    document.body.classList.remove('explore-on');
    onClose?.(!!leaving);
  }
  return {
    open,
    close,
    get isOpen() {
      return !!root && !root.hidden;
    },
    events: () => upcoming(now())
  };
}
