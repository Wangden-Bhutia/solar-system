// The quiet finale: after the tour's last stop, still words over the whole universe. Any zoom or tap on the scene lets it go.
// Built here, shown by lab.js after the tour's last stop; "Save picture" saves the next frame drawn, with the caption.
import { FINALE } from './here.js';

export function createFinale({ doc, onHome, canvas }) {
  let el = null,
    saveNext = false;
  function show() {
    if (!el) {
      el = doc.createElement('section');
      el.id = 'finale';
      el.className = 'finale';
      el.setAttribute('aria-label', 'The end of the tour');
      el.hidden = true;
      el.innerHTML = `<h2>${FINALE.title}</h2>${FINALE.lines.map(t => `<p>${t}</p>`).join('')}<div class="finale-actions"><button type="button" id="finale-home" class="primary">${FINALE.home}</button><button type="button" id="finale-save">${FINALE.save}</button></div>`;
      doc.body.appendChild(el);
      el.querySelector('#finale-home').onclick = () => {
        hide();
        onHome();
      };
      el.querySelector('#finale-save').onclick = () => {
        saveNext = true;
      };
    }
    el.hidden = false;
    doc.body.classList.add('finale-on');
    globalThis.requestAnimationFrame?.(() => el.classList.add('in'));
    if (!globalThis.requestAnimationFrame) el.classList.add('in');
    el.querySelector('#finale-home').focus?.({ preventScroll: true });
  }
  function hide() {
    if (!el || el.hidden) return;
    el.classList.remove('in');
    el.hidden = true;
    doc.body.classList.remove('finale-on');
  }
  // Saved from the frame just drawn (the canvas is only readable straight after a render), with the caption on a dark strip.
  function save() {
    saveNext = false;
    const src = canvas(),
      w = src.width,
      h = src.height,
      c = doc.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d');
    x.drawImage(src, 0, 0);
    const pad = Math.round(w * 0.05),
      fs = Math.max(14, Math.round(w * 0.034)),
      lh = Math.round(fs * 1.35),
      max = w - 2 * pad;
    x.font = `${fs}px system-ui,sans-serif`;
    const rows = [];
    let cur = '';
    for (const word of FINALE.lines[0].split(' ')) {
      const t = cur ? cur + ' ' + word : word;
      if (x.measureText(t).width > max && cur) {
        rows.push(cur);
        cur = word;
      } else cur = t;
    }
    rows.push(cur);
    const strip = pad * 0.6 + rows.length * lh + lh * 1.4;
    x.fillStyle = 'rgba(2,4,12,.74)';
    x.fillRect(0, h - strip, w, strip);
    x.fillStyle = '#f1ead8';
    x.textBaseline = 'top';
    rows.forEach((r, i) => x.fillText(r, pad, h - strip + pad * 0.4 + i * lh));
    x.fillStyle = '#b9c4dc';
    x.font = `${Math.round(fs * 0.72)}px system-ui,sans-serif`;
    x.fillText(FINALE.caption, pad, h - lh * 1.1, max);
    c.toBlob(b => {
      if (!b) return;
      const a = doc.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = 'a-mote-in-a-sunbeam.png';
      doc.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, 'image/png');
  }
  return {
    show,
    hide,
    get shown() {
      return !!el && !el.hidden;
    },
    /* call straight after a render: the canvas is only readable then */
    afterFrame() {
      if (saveNext) save();
    }
  };
}
