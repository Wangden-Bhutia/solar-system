// Powers of Ten: one guided glide from Earth out to the edge of the observable universe, a stop at roughly each
// power of ten of distance, each with a short sourced caption. It drives the app's own zoom (lab.js passes it a
// travel function that plays the same eased Z glide as the scale ladder); there is no second camera.
// Every number in a caption is in a stop's `facts` with its source (docs/sources.md, "Powers of Ten tour"); the
// caption's "you are here" line is read from the scale readout itself (hud.js), so it always agrees with it.
// Pure controller + DOM it is handed (document, storage); no THREE import.
import { SHELLS } from './cosmos-data.js';

export const SOURCES = {
  nssdcEarth: { label: 'NASA NSSDCA Earth fact sheet', url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html' },
  iauAu: { label: 'IAU 2012 Resolution B2 (the au)', url: 'https://iauarchive.eso.org/static/resolutions/IAU2012_English.pdf' },
  siC: { label: 'BIPM SI Brochure (speed of light)', url: 'https://www.bipm.org/en/publications/si-brochure' },
  nssdcNeptune: { label: 'NASA NSSDCA Neptune fact sheet', url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/neptunefact.html' },
  burlaga2019: { label: 'Burlaga et al. 2019, Nature Astronomy 3, 1007', url: 'https://doi.org/10.1038/s41550-019-0920-y' },
  jplVoyager: { label: 'NASA JPL: Voyager 2 at the boundary of interstellar space', url: 'https://www.jpl.nasa.gov/news/voyager-2-illuminates-boundary-of-interstellar-space/' },
  nasaOort: { label: 'NASA Science: Oort Cloud facts', url: 'https://science.nasa.gov/solar-system/oort-cloud/facts/' },
  svsLightYear: { label: 'NASA Goddard: Light-year (Proxima Centauri)', url: 'https://svs.gsfc.nasa.gov/vis/a010000/a014100/a014142/script_32675_00.html' },
  zucker2022: { label: 'Zucker et al. 2022, Nature 601, 334', url: 'https://doi.org/10.1038/s41586-021-04286-5' },
  cfaBubble: { label: 'Center for Astrophysics: the 1,000-light-year bubble', url: 'https://www.cfa.harvard.edu/news/1000-light-year-wide-bubble-surrounding-earth-source-all-nearby-young-stars' },
  reid2019: { label: 'Reid et al. 2019, ApJ 885, 131', url: 'https://doi.org/10.3847/1538-4357/ab4a11' },
  nasaMilkyWay: { label: 'NASA Science: our Milky Way galaxy', url: 'https://science.nasa.gov/universe/exoplanets/our-milky-way-galaxy-how-big-is-space/' },
  gravity2022: { label: 'GRAVITY Collaboration 2022, A&A 657, L12', url: 'https://doi.org/10.1051/0004-6361/202142465' },
  nasaM31: { label: 'NASA Science: Messier 31 (Andromeda)', url: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-31/' },
  tully2014: { label: 'Tully et al. 2014, Nature 513, 71', url: 'https://doi.org/10.1038/nature13674' },
  uhLaniakea: { label: 'University of Hawaiʻi: Laniakea', url: 'https://www.hawaii.edu/news/2014/09/03/uh-scientist-maps-supercluster-of-galaxies-names-it-laniakea/' },
  planck2018: { label: 'Planck 2018 results VI, A&A 641, A6', url: 'https://doi.org/10.1051/0004-6361/201833910' },
  davis2004: { label: 'Davis & Lineweaver 2004, PASA 21, 97', url: 'https://doi.org/10.1071/AS03040' },
};

const lookbackGly = (Math.round(SHELLS[0].gly * 10) / 10).toFixed(1); // 5.5: computed from Planck 2018 (cosmos-data.js)

// at: where the stop is. {focus} a world in the Solar System; {fit} the app's own Solar System framing of the inner
// planets or of all of them; {fitAU} a circle that many au across fits the screen; {ly} a camera distance from the
// Sun (light-years); {overview} the observable universe's own framing. Every {ly} lies outside the seams.
// short: the one line shown in the collapsed bar (its key fact). facts: each `says` appears in the text verbatim and
// every digit in the text and in `short` belongs to one; `computed` shows the sum. names: proper names with digits.
export const TOUR_STOPS = [
  { id: 'earth', level: 'solar', at: { focus: 'Earth' }, title: 'Earth, our home',
    short: 'Earth is 12,756 km wide at the equator.',
    text: 'Earth is 12,756 km wide at the equator. Hold on: each stop from here takes you much farther out.',
    facts: [{ says: '12,756 km', src: ['nssdcEarth'] }] },
  { id: 'inner', level: 'solar', at: { fit: 'inner' }, title: 'The inner planets',
    short: 'Sunlight takes about 8 minutes 19 seconds to reach us.',
    text: 'Earth circles the Sun 1 au away: 149,597,870,700 metres. Sunlight takes about 8 minutes 19 seconds to reach us.',
    facts: [{ says: '1 au', src: ['iauAu'] }, { says: '149,597,870,700 metres', src: ['iauAu'] },
      { says: '8 minutes 19 seconds', src: ['iauAu', 'siC'], computed: '149,597,870,700 m ÷ 299,792,458 m/s = 499.0 s' }],
    model: 'Planet distances in this view are compressed so they fit on a screen (the readout marks them ≈).' },
  { id: 'planets', level: 'solar', at: { fit: 'all' }, title: 'All eight planets',
    short: 'Neptune orbits 30.07 au from the Sun on average.',
    text: 'Neptune, the farthest planet, orbits 30.07 au from the Sun on average. Sunlight takes about 4 hours 10 minutes to get there.',
    facts: [{ says: '30.07 au', src: ['nssdcNeptune'] },
      { says: '4 hours 10 minutes', src: ['nssdcNeptune', 'iauAu', 'siC'], computed: '30.07 × 499.0 s = 15,005 s' }],
    model: 'Planet distances in this view are compressed so they fit on a screen (the readout marks them ≈).' },
  { id: 'heliosphere', level: 'solar', at: { fitAU: 121.6 }, title: 'The edge of the solar wind',
    short: 'Voyager 1 left the Sun’s bubble in 2012 at 121.6 au.',
    text: 'The Sun’s wind blows a bubble, the heliosphere. Voyager 1 crossed its edge in 2012 at 121.6 au, Voyager 2 in 2018 at about 119 au.',
    facts: [{ says: '2012', src: ['burlaga2019', 'jplVoyager'] }, { says: '121.6 au', src: ['burlaga2019'] },
      { says: '2018', src: ['burlaga2019', 'jplVoyager'] }, { says: '119 au', src: ['burlaga2019'] }], names: ['Voyager 1', 'Voyager 2'],
    illustration: 'The bubble is drawn as simple spheres at those distances: an illustration, not its measured shape.' },
  { id: 'oort', level: 'solar', at: { ly: 0.07 }, title: 'The Oort cloud',
    short: 'An icy shell thought to reach 10,000 to 100,000 au.',
    text: 'A vast shell of icy bodies is thought to start 2,000 to 5,000 au from the Sun and end 10,000 to 100,000 au out. It has never been seen directly; long-period comets are thought to come from it.',
    facts: [{ says: '2,000 to 5,000 au', src: ['nasaOort'] }, { says: '10,000 to 100,000 au', src: ['nasaOort'] }], refs: ['nasaOort'],
    illustration: 'The cloud is an illustration of a theorised region: no Oort cloud object has been observed out there.' },
  { id: 'proxima', level: 'stars', at: { ly: 20 }, title: 'The nearest stars',
    short: 'Proxima Centauri, the nearest star: 4.25 light-years.',
    text: 'The nearest star to our Solar System is Proxima Centauri, about 4.25 light-years away: its light takes more than four years to reach us.',
    facts: [{ says: '4.25 light-years', src: ['svsLightYear'], computed: '4.2465 ly, rounded' }] },
  { id: 'bubble', level: 'stars', at: { ly: 150 }, title: 'The Local Bubble',
    short: 'We sit in a hollow about 1,000 light-years wide.',
    text: 'The Sun sits inside a hollow about 1,000 light-years wide, blown by supernovae that began exploding about 14 million years ago.',
    facts: [{ says: '1,000 light-years', src: ['zucker2022', 'cfaBubble'] }, { says: '14 million years', src: ['zucker2022', 'cfaBubble'] }],
    illustration: 'The globe drawn for the bubble is an illustration: its real edge is irregular.' },
  { id: 'arm', level: 'galaxy', at: { ly: 12000 }, title: 'Our spiral arm',
    short: 'The Sun lies in the Local Arm of the Milky Way.',
    text: 'The Sun lies in the Local Arm, a short arm of the Milky Way mapped by radio telescopes measuring the distances of young, star-forming regions.',
    facts: [], refs: ['reid2019'], illustration: 'The arms are drawn from a model fitted to those measurements; far from the Sun they are extrapolated.' },
  { id: 'milkyway', level: 'galaxy', at: { ly: 240000 }, title: 'The Milky Way',
    short: 'Our galaxy is about 100,000 light-years across.',
    text: 'Our galaxy is about 100,000 light-years across. The Sun is about 27,000 light-years from Sagittarius A*, the black hole at its centre.',
    facts: [{ says: '100,000 light-years', src: ['nasaMilkyWay'] }, { says: '27,000 light-years', src: ['gravity2022'], computed: '8,277 pc × 3.2616 ly/pc = 26,996 ly' }],
    illustration: 'No one has photographed the Milky Way from outside: this is a model built from measurements.' },
  { id: 'localgroup', level: 'local', at: { ly: 9.5e6 }, title: 'The Local Group',
    short: 'Andromeda is about 2.5 million light-years away.',
    text: 'The Andromeda Galaxy, the nearest major galaxy to ours, is about 2.5 million light-years away.',
    facts: [{ says: '2.5 million light-years', src: ['nasaM31'] }] },
  { id: 'laniakea', level: 'super', at: { ly: 7.5e8 }, title: 'Laniakea',
    short: 'Our supercluster: about 500 million light-years across.',
    text: 'The Milky Way is on the outskirts of Laniakea, a supercluster about 500 million light-years across with some 100,000 galaxies.',
    facts: [{ says: '500 million light-years', src: ['uhLaniakea', 'tully2014'] }, { says: '100,000 galaxies', src: ['tully2014', 'uhLaniakea'] }] },
  { id: 'lookback', level: 'universe', at: { ly: 2e10 }, title: 'Looking back in time',
    short: 'Far away is long ago: we see far galaxies as they were.',
    text: `Light takes time to reach us, so far away is long ago. Light from galaxies now about ${lookbackGly} billion light-years away set out 4.6 billion years ago, as the Sun was forming.`,
    facts: [{ says: `${lookbackGly} billion light-years`, src: ['planck2018'], computed: 'distance now for a 4.6-billion-year light travel time, flat ΛCDM with Planck 2018 parameters (cosmos-data.js)' },
      { says: '4.6 billion years', src: ['nasaOort'] }],
    illustration: 'The web of galaxies is an illustration of its large-scale pattern, not a map of real galaxies.' },
  { id: 'edge', level: 'universe', at: { overview: true }, title: 'The observable universe',
    short: 'The edge is about 46 billion light-years away.',
    text: 'Everything we could ever have seen: light has had 13.787 billion years to travel, and the space it crossed has grown, so the edge is now about 46 billion light-years away in every direction.',
    facts: [{ says: '13.787 billion years', src: ['planck2018'] }, { says: '46 billion light-years', src: ['davis2004'] }],
    illustration: 'This viewpoint is outside the observable universe so you can see all of it at once: no one could stand here.' },
];

// A stop's sources, in order: those behind its numbers, then any behind its words (refs).
export const sourcesOf = s => [...new Set([...s.facts.flatMap(f => f.src), ...(s.refs || [])])];

export const TOUR_KEY = 'solar.tour.v1';
export const DWELL_S = 8; // seconds on a stop before the tour moves on (while playing)

// deps: travel(stop, done) moves the view to a stop (glide, or a cut with reduced motion), halt() stops a move in
// progress where it is, readout() → [line, line] the scale readout's distance and width lines right now,
// onStart() (optional) before it begins (another guided story ends), onExit() (optional) once the tour has ended.
export function createTour(deps, stops = TOUR_STOPS) {
  const t = { active: false, index: -1, paused: false, moving: false, arrived: false, dwell: 0, dwellS: DWELL_S, finished: false, visits: [] };
  let gen = 0;
  const changed = () => deps.onChange?.(t);
  function goTo(i) {
    i = Math.max(0, Math.min(stops.length - 1, i));
    if (t.moving) deps.halt?.();
    const g = ++gen; t.index = i; t.moving = true; t.arrived = false; t.dwell = 0; t.finished = false; changed();
    deps.travel(stops[i], () => { if (g !== gen || !t.active) return; t.moving = false; t.arrived = true; t.visits.push(stops[i].id); changed(); });
  }
  Object.assign(t, {
    stops,
    start(i = 0) { deps.onStart?.(); t.active = true; t.paused = false; t.visits = []; goTo(i); },
    next() { if (!t.active) return; t.paused = false; if (t.index < stops.length - 1) goTo(t.index + 1); },
    prev() { if (!t.active) return; t.paused = false; if (t.index > 0) goTo(t.index - 1); else goTo(0); },
    pause() { if (!t.active || t.paused) return; t.paused = true; if (t.moving) { gen++; deps.halt?.(); t.moving = false; } changed(); },
    // Resume: back to the stop (if the glide was cut short or the view was moved meanwhile), then on.
    resume() { if (!t.active) return; t.paused = false; if (t.finished) { t.start(0); return; } if (t.arrived && !t.moved) { changed(); return; } t.moved = false; goTo(t.index); },
    toggle() { if (t.paused || t.finished) t.resume(); else t.pause(); },
    // A touch, pinch or wheel on the scene: the person takes over; the tour waits, paused, until Resume.
    interrupt() { if (!t.active) return; t.moved = true; t.pause(); },
    exit() { if (!t.active) return; gen++; if (t.moving) deps.halt?.(); t.active = false; t.moving = false; t.paused = false; t.index = -1; changed(); deps.onExit?.(); },
    tick(dt) {
      if (!t.active || t.paused || t.moving || !t.arrived || t.finished) return;
      t.dwell += dt; if (t.dwell < t.dwellS) return;
      if (t.index < stops.length - 1) goTo(t.index + 1); else { t.finished = true; changed(); }
    },
    // "You are here" for the caption: the readout's own words, so caption and readout always agree.
    here() { const r = deps.readout?.(); return r && r[0] ? `You are ${r[0]} · ${r[1].replace(/^View /, 'view ')}` : ''; },
  });
  return t;
}

// The tour's own controls: a top-bar chip to start it, a slim caption bar at the bottom and a one-time hint for
// first visits (remembered under TOUR_KEY). Built here so index.html stays as it is.
// The bar is compact so the scene stays in view: stop number, title and one short line (the stop's key fact), with
// icon buttons ‹ ❚❚/▶ › i ✕. Tapping the text or "i" opens the rest (the full caption, the illustration or model
// note, the sources) and the next stop closes it again. The scale readout (hud.js) stays visible just above the bar
// (lab.js sets --tour-h): it is the one distance readout, so the caption does not repeat it.
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ICON = {
  prev: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9M11 3.5v9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.2v9.6L12.8 8z" fill="currentColor"/></svg>',
  again: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8a4.5 4.5 0 1 0 1.4-3.3M4.5 2v3h3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  info: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 7.2v4M8 4.6v.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  exit: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
};
export function mountTour(doc, tour, { storage, afterNode } = {}) {
  const el = (tag, props = {}, html = '') => { const e = doc.createElement(tag); for (const [k, v] of Object.entries(props)) e.setAttribute(k, v); if (html) e.innerHTML = html; return e; };
  const chip = el('button', { id: 'tour-start', class: 'chip', type: 'button', 'aria-label': 'Powers of Ten tour: glide from Earth to the edge of the observable universe' },
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M3 11.5 6.5 8 3 4.5l1-1L8.5 8 4 12.5zm5 0L11.5 8 8 4.5l1-1L13.5 8 9 12.5z"/></svg>Tour');
  if (afterNode?.parentNode) afterNode.parentNode.insertBefore(chip, afterNode.nextSibling);
  const card = el('section', { id: 'tour', class: 'tour', 'aria-label': 'Powers of Ten tour', 'data-open': 'false' });
  card.hidden = true;
  card.innerHTML = '<button id="tour-sum" class="tour-sum" type="button" aria-expanded="false" aria-controls="tour-more">'
    + '<span class="tour-head"><span id="tour-kicker" class="tour-kicker"></span> <span id="tour-title" class="tour-title"></span></span>'
    + '<span id="tour-short" class="tour-short" aria-live="polite"></span></button>'
    + '<div id="tour-more" class="tour-more" hidden><p id="tour-text"></p><p id="tour-note" class="tour-note" hidden></p><p id="tour-sources" class="tour-sources"></p></div>'
    + `<div class="tour-nav"><button id="tour-prev" type="button" aria-label="Previous stop">${ICON.prev}</button>`
    + `<button id="tour-play" type="button" aria-label="Pause the tour">${ICON.pause}</button>`
    + `<button id="tour-next" type="button" aria-label="Next stop">${ICON.next}</button>`
    + `<button id="tour-info" type="button" aria-expanded="false" aria-controls="tour-more" aria-label="More about this stop, with sources">${ICON.info}</button>`
    + `<button id="tour-exit" type="button" aria-label="End the tour and explore from here">${ICON.exit}</button></div>`;
  const hint = el('div', { id: 'tour-hint', class: 'tour-hint', role: 'note' },
    '<button id="tour-hint-go" type="button">New here? Take the one-tap tour from Earth to the edge of the universe ›</button><button id="tour-hint-x" type="button" aria-label="Dismiss">✕</button>');
  let seen = false; try { seen = !!JSON.parse(storage?.getItem(TOUR_KEY) || 'null')?.seen; } catch { seen = false; }
  hint.hidden = seen;
  doc.body.append(card, hint);
  // One time only: the hint shows on the first visit (until dismissed or the tour starts) and never again after.
  const store = () => { try { storage?.setItem(TOUR_KEY, JSON.stringify({ seen: true })); } catch { /* private mode: shows again next visit */ } };
  if (!seen) store();
  const q = id => card.querySelector('#' + id);
  const remember = () => { seen = true; hint.hidden = true; store(); };
  let shownStop = -1, open = false, playIcon = '';
  // The bar's height, for the scale readout to sit just above it (style.css: body.touring .hud).
  const measure = () => { const h = card.hidden ? 0 : Math.round(card.getBoundingClientRect?.().height || card.offsetHeight || 0); const v = `${h}px`; if (doc.body.style.getPropertyValue('--tour-h') !== v) doc.body.style.setProperty('--tour-h', v); };
  function setOpen(v) {
    open = !!v; card.dataset.open = String(open); q('tour-more').hidden = !open;
    for (const id of ['tour-sum', 'tour-info']) q(id).setAttribute('aria-expanded', String(open));
    q('tour-info').setAttribute('aria-label', open ? 'Show less' : 'More about this stop, with sources'); measure();
  }
  function paint() {
    const on = tour.active; card.hidden = !on; doc.body.classList.toggle('touring', on); chip.setAttribute('aria-pressed', String(on));
    if (on) hint.hidden = true;
    if (!on) { shownStop = -1; setOpen(false); return; }
    const s = tour.stops[tour.index], n = tour.stops.length;
    if (shownStop !== tour.index) {
      shownStop = tour.index;
      q('tour-kicker').textContent = `${tour.index + 1}/${n}`; q('tour-kicker').setAttribute('aria-label', `Powers of Ten, stop ${tour.index + 1} of ${n}:`);
      q('tour-title').textContent = s.title; q('tour-short').textContent = s.short; q('tour-text').textContent = s.text;
      const note = s.illustration || s.model || ''; q('tour-note').hidden = !note; q('tour-note').textContent = note;
      const keys = sourcesOf(s);
      q('tour-sources').innerHTML = (keys.length > 1 ? 'Sources: ' : 'Source: ') + keys.map(k => `<a href="${esc(SOURCES[k].url)}" target="_blank" rel="noopener">${esc(SOURCES[k].label)}</a>`).join(' · ')
        + ` <button type="button" class="tour-all" data-sources="src-tour-${esc(s.id)}">All sources ›</button>`; // lab.js opens the Sources screen
      setOpen(false); // each stop starts collapsed
    }
    q('tour-prev').disabled = tour.index === 0;
    q('tour-next').disabled = tour.index === n - 1;
    const mode = tour.finished ? 'again' : tour.paused ? 'play' : 'pause';
    if (playIcon !== mode) { playIcon = mode; q('tour-play').innerHTML = ICON[mode]; q('tour-play').setAttribute('aria-label', mode === 'again' ? 'Start the tour again' : mode === 'play' ? 'Resume the tour' : 'Pause the tour'); }
    card.dataset.state = tour.moving ? 'moving' : tour.paused ? 'paused' : tour.finished ? 'finished' : 'here';
    measure();
  }
  function frame() { if (tour.active) measure(); }
  chip.onclick = () => { remember(); if (tour.active) tour.exit(); else tour.start(0); };
  hint.querySelector('#tour-hint-go').onclick = () => { remember(); tour.start(0); };
  hint.querySelector('#tour-hint-x').onclick = remember;
  q('tour-sum').onclick = () => setOpen(!open);
  q('tour-info').onclick = () => setOpen(!open);
  q('tour-prev').onclick = () => tour.prev();
  q('tour-next').onclick = () => tour.next();
  q('tour-play').onclick = () => tour.toggle();
  q('tour-exit').onclick = () => tour.exit();
  doc.addEventListener('keydown', e => { if (e.key === 'Escape' && tour.active && !card.hidden) { if (open) setOpen(false); else tour.exit(); } });
  return { card, chip, hint, paint, frame, remember, setOpen, get open() { return open; }, get seen() { return seen; } };
}
