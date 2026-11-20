// The journey inward: from Earth to one carbon atom and into it, by powers of ten. Pure data and formatting (no three.js),
// so tests can check it. Sizes are real widths of view in metres; every fact is tied to a source (docs/sources.md).
// The zoom coordinate is Z = ln(width of view in metres), the same idea as the outward zoom (zoom-ladder.js).

const wiki = t => ({ label: 'Wikipedia: ' + t, url: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(t.replace(/ /g, '_')) });

// The pictures from one leaf up to 3,600 km (AI-made up to the town, real satellite imagery above it). Each one sits inside the
// next: s = how wide the inner picture is as a fraction of this one, c = where its centre is (fractions across and down).
// The leaf picture is 12 cm wide and centred on the origin.
export const CHAIN = [
  { f: 'inward-01', s: 1, c: [0.5, 0.5] },
  { f: 'inward-02', s: 0.34, c: [0.4984, 0.4960] }, { f: 'inward-03', s: 0.295, c: [0.5, 0.5064] }, { f: 'inward-04', s: 0.30, c: [0.5, 0.5] },
  { f: 'inward-05', s: 0.335, c: [0.4785, 0.4864] }, { f: 'inward-06', s: 0.40, c: [0.5120, 0.5175] }, { f: 'inward-07', s: 0.42, c: [0.5024, 0.4912] },
  { f: 'inward-08', s: 0.395, c: [0.4976, 0.4912] }, { f: 'inward-09', s: 0.395, c: [0.5104, 0.4944] }, { f: 'inward-10', s: 0.335, c: [0.5, 0.5] },
  { f: 'inward-11', s: 1 / 3, c: [0.5, 0.5] }, { f: 'inward-12', s: 1 / 3, c: [0.5, 0.5] }, { f: 'inward-13', s: 1 / 3, c: [0.5, 0.5] }, { f: 'inward-14', s: 0.3, c: [0.5, 0.5] },
  { f: 'inward-15', s: 0.3, c: [0.5, 0.5] }, { f: 'inward-16', s: 1 / 3, c: [0.5, 0.5] },
];
export const LEAF_W = 0.12, TOP_W = 3.6e6; /* the leaf picture's real width, and the top satellite picture's */
// The pictures fit each other exactly, but the made-up ones drifted in scale as they were made (each zoom-out came out a
// little wider than asked). So the 3D scene is built in "picture metres" that equal real metres at the leaf and below,
// and the difference (about 3 times by 3,600 km) is spread evenly, in powers of ten, between the leaf and the top picture.
// Every width the reader sees (the readout, the steps) is a real one.
export const CHAIN_W = (() => { const out = [LEAF_W]; for (let k = 1; k < CHAIN.length; k++) out.push(out[k - 1] / CHAIN[k].s); return out; })(); /* picture metres */
const LA = Math.log(LEAF_W), LB = Math.log(CHAIN_W.at(-1)), LK = Math.log(TOP_W / CHAIN_W.at(-1));
export function toTrue(wp) { const l = Math.log(wp); return Math.exp(l + LK * Math.min(1, Math.max(0, (l - LA) / (LB - LA)))); }
export function toPicture(wt) { const l = Math.log(wt); if (l <= LA) return wt; if (l >= LB + LK) return Math.exp(l - LK); return Math.exp((l + LK * LA / (LB - LA)) / (1 + LK / (LB - LA))); }

// w: the width of view (m) a glide to this step rests at. here: the "You are here" line. text: one fact.
export const RUNGS = [
  { id: 'earth', w: 1.6e7, label: 'Earth', here: 'You are here: Earth', text: 'Earth, about 12,700 km across. We will drop onto a single tree.', src: [wiki('Earth')] },
  { id: 'land', w: 1.2e5, label: 'Countryside', here: 'You are here: the countryside', text: 'Countryside from space: dark forest and a patchwork of fields.', note: 'satellite imagery: Sentinel-2 cloudless, EOX', src: [] },
  { id: 'town', w: toTrue(CHAIN_W[9]) * 0.8, label: 'Town', here: 'You are here: a small town', text: 'A small town among its fields, with a park at its heart.', src: [] },
  { id: 'park', w: toTrue(CHAIN_W[6]) * 0.6, label: 'Park', here: 'You are here: a park', text: 'In the park, one round tree stands alone on the lawn. That is where we are going.', src: [] },
  { id: 'tree', w: toTrue(CHAIN_W[4]) * 0.8, label: 'Tree', here: 'You are here: a linden tree', text: 'A linden tree from above. Its crown carries tens of thousands of leaves.', src: [wiki('Tilia')] },
  { id: 'leaf', w: 0.1, label: 'Leaf', here: 'You are here: one leaf', text: 'One linden leaf, about 8 cm wide: a small factory that makes food from sunlight.', src: [wiki('Tilia cordata')] },
  { id: 'veins', w: 5e-3, label: 'Veins', here: 'You are here: the leaf, close up', text: 'Veins carry water in and sugar out. Between them the leaf is only about 0.2 mm thick.', src: [wiki('Leaf')] },
  { id: 'surface', w: 4e-4, label: 'Stomata', here: 'You are here: the leaf’s surface', text: 'Tiny mouths called stomata, about 0.03 mm long, open in the leaf’s skin to let carbon dioxide in.', src: [wiki('Stoma')] },
  { id: 'cell', w: 4e-5, label: 'Cell', here: 'You are here: a leaf cell', text: 'A leaf cell, about 0.05 mm long, is packed with green chloroplasts. They turn light, water and carbon dioxide into sugar.', src: [wiki('Chloroplast'), wiki('Palisade cell')] },
  { id: 'nucleus', w: 9e-6, label: 'Nucleus', here: 'You are here: the cell’s nucleus', text: 'The nucleus, about 6 µm wide, keeps the cell’s DNA.', src: [wiki('Cell nucleus')] },
  { id: 'spools', w: 1.2e-7, label: 'DNA spools', here: 'You are here: DNA on its spools', text: 'DNA winds round tiny protein spools. Stretched out, the DNA in one cell would be about 2 metres long.', src: [wiki('Nucleosome'), wiki('DNA')] },
  { id: 'helix', w: 7e-9, label: 'Double helix', here: 'You are here: the double helix', text: 'DNA is a twisted ladder, 2 nm wide. The order of its rungs spells the genetic code.', note: 'carbon grey, oxygen red, nitrogen blue, phosphorus orange', src: [wiki('Nucleic acid double helix')] },
  { id: 'atom', w: 4.5e-10, label: 'Atom', here: 'You are here: one carbon atom', text: 'One carbon atom, about 0.3 nm across: a cloud of electrons around a nucleus 60,000 times smaller. Not long ago it floated in the air as carbon dioxide.', note: 'the ring marks the nucleus, far too small to see; the faint clouds are its neighbours in the DNA', src: [wiki('Carbon fixation'), wiki('Carbon'), wiki('Atomic orbital'), wiki('Atomic nucleus')] },
  { id: 'inner', w: 6e-11, label: 'Inner electrons', here: 'You are here: deep inside the atom', text: 'The bright cloud is carbon’s two innermost electrons; the faint haze is its other four. A cloud shows where an electron is likely to be.', src: [wiki('Atomic orbital'), wiki('Electron shell')] },
  { id: 'core', w: 1.2e-14, label: 'Nucleus', here: 'You are here: the atom’s nucleus', text: 'Six protons and six neutrons, pressed together. If the atom were a stadium, the nucleus would be a pea in the middle, yet it holds almost all the atom’s mass.', note: 'protons drawn warm, neutrons cool', src: [wiki('Atomic nucleus'), wiki('Carbon-12')] },
  { id: 'proton', w: 2.4e-15, label: 'Proton', here: 'You are here: inside a proton', text: 'Three quarks, held by gluons: the strong force, the strongest there is. Pairs of quarks flicker in and out. Almost all of a proton’s mass is the energy of this motion, not the quarks themselves.', note: 'an illustration: no one can photograph a proton', src: [wiki('Proton'), wiki('Quark'), wiki('Gluon'), wiki('Strong interaction')] },
];
// The zoom's range: a little beyond Earth's width (zooming out further returns to the app) down to END_W, where the end
// screen says why the journey stops there.
export const END_W = 1e-18, W_MAX = 3.2e7, W_MIN = 8e-19;
// The end of the journey: as small as any experiment can see.
export const END = {
  title: 'As far as we can see',
  lines: [
    'No experiment has ever found a size for a quark. They look like points.',
    'Below this, our instruments cannot reach. Any picture would be a guess.',
    'Like the edge of the universe, this is the edge of what we can see, not the edge of what there is.',
  ],
  home: 'Go home', again: 'Back to Earth',
};
export const Z_MAX = Math.log(W_MAX), Z_MIN = Math.log(W_MIN);
// The step the view is in: the nearest, measured in powers of ten.
export function rungAt(w) {
  let best = RUNGS[0], d = Infinity;
  for (const r of RUNGS) { const k = Math.abs(Math.log10(w / r.w)); if (k < d) { d = k; best = r; } }
  return best;
}
const sig = (x, n = 2) => Number(x.toPrecision(n)).toLocaleString('en-US', { maximumFractionDigits: 6 }); /* n significant figures */
// A width in metres, with units rolling over: km, m, cm, mm, µm, nm, pm, fm.
export function formatMetres(m) {
  if (!(m > 0)) return '0';
  if (m >= 1000) return `${sig(m / 1000)} km`;
  if (m >= 1) return `${sig(m)} m`;
  if (m >= 0.01) return `${sig(m * 100)} cm`;
  if (m >= 1e-3) return `${sig(m * 1e3)} mm`;
  if (m >= 1e-6) return `${sig(m * 1e6)} µm`;
  if (m >= 1e-10) return `${sig(m * 1e9)} nm`; /* an atom is 0.3 nm */
  if (m >= 1e-12) return `${sig(m * 1e12)} pm`;
  return `${sig(m * 1e15)} fm`;
}
// How the view compares with a person (taken as 1.6 m tall): "about 500 times smaller than you".
/* two significant figures: 'about' means about */
const words = n => n >= 1e18 ? `${sig(n / 1e18)} billion billion` : n >= 1e15 ? `${sig(n / 1e15)} million billion` : n >= 1e12 ? `${sig(n / 1e12)} trillion` : n >= 1e9 ? `${sig(n / 1e9)} billion` : n >= 1e6 ? `${sig(n / 1e6)} million` : n >= 1e4 ? `${sig(n / 1e3)} thousand` : sig(n);
export function compareWithYou(m, you = 1.6) {
  const r = m / you;
  if (r > 0.5 && r < 2) return 'about your own height';
  return r >= 2 ? `about ${words(r)} times bigger than you` : `about ${words(1 / r)} times smaller than you`;
}
export const SOURCES = RUNGS.flatMap(r => r.src);
