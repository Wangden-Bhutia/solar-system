// The journey inward: from Earth to one carbon atom, by powers of ten. Pure data and formatting (no three.js),
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
  { id: 'earth', w: 1.6e7, label: 'Earth', here: 'You are here: Earth', text: 'Earth, about 12,700 km across. We are heading for southern Germany.', src: [wiki('Earth')] },
  { id: 'land', w: 1.2e5, label: 'Countryside', here: 'You are here: southern Germany', text: 'Farmland and forest north-east of Munich, seen from space. The river Isar winds through it, and the Alps rise to the south.', note: 'real satellite imagery (Sentinel-2 cloudless by EOX)', src: [] },
  { id: 'town', w: toTrue(CHAIN_W[9]) * 0.8, label: 'Town', here: 'You are here: a small town', text: 'A small market town among the fields, with a park near its middle.', note: 'from here down to the leaf, AI-made pictures', src: [] },
  { id: 'park', w: toTrue(CHAIN_W[6]) * 0.6, label: 'Park', here: 'You are here: a park', text: 'A park with a big round tree in the middle of a lawn. Someone is lying in its shade.', src: [] },
  { id: 'tree', w: toTrue(CHAIN_W[4]) * 0.8, label: 'Tree', here: 'You are here: a linden tree', text: 'A linden tree, seen from above. Its crown holds tens of thousands of leaves.', src: [wiki('Tilia')] },
  { id: 'leaf', w: 0.1, label: 'Leaf', here: 'You are here: one leaf', text: 'One heart-shaped linden leaf, about 8 cm wide. Now keep going: smaller than anything you can see.', src: [wiki('Tilia cordata')] },
  { id: 'veins', w: 5e-3, label: 'Veins', here: 'You are here: the leaf, close up', text: 'A net of veins carries water in and sugar out. Between them the leaf is only a few cells thick, about 0.2 mm.', src: [wiki('Leaf')] },
  { id: 'surface', w: 4e-4, label: 'Stomata', here: 'You are here: the leaf’s surface', text: 'The leaf’s skin is a jigsaw of flat cells with tiny mouths, stomata, each about 0.03 mm long. They open to let carbon dioxide in.', src: [wiki('Stoma')] },
  { id: 'cell', w: 4e-5, label: 'Cell', here: 'You are here: a leaf cell', text: 'Inside, each cell is packed with green chloroplasts, which turn sunlight, water and carbon dioxide into sugar. A leaf cell is about 0.05 mm long.', note: 'colours are illustration', src: [wiki('Chloroplast'), wiki('Palisade cell')] },
  { id: 'nucleus', w: 9e-6, label: 'Nucleus', here: 'You are here: the cell’s nucleus', text: 'The nucleus, about 6 µm wide (six thousandths of a millimetre), holds the cell’s DNA.', src: [wiki('Cell nucleus')] },
  { id: 'spools', w: 1.2e-7, label: 'DNA spools', here: 'You are here: DNA on its spools', text: 'DNA is wound round protein spools called histones. Stretched out, the DNA in one cell would be about 2 metres long.', src: [wiki('Nucleosome'), wiki('DNA')] },
  { id: 'helix', w: 7e-9, label: 'Double helix', here: 'You are here: the double helix', text: 'The double helix: a twisted ladder of atoms, 2 nm wide. The order of its rungs, the bases, spells out the genetic code.', note: 'atoms in the usual chemists’ colours: carbon grey, oxygen red, nitrogen blue, phosphorus orange', src: [wiki('Nucleic acid double helix')] },
  { id: 'atom', w: 9e-10, label: 'Atom', here: 'You are here: one carbon atom', text: 'One carbon atom, about 0.3 nm across. Not long ago it floated in the air: the leaf took it in as carbon dioxide. Its electrons are a cloud; the nucleus is 60,000 times smaller.', note: 'smaller still: the nucleus, and what it is made of', src: [wiki('Carbon fixation'), wiki('Carbon'), wiki('Atomic orbital'), wiki('Atomic nucleus')] },
];
// The zoom's range: a little beyond Earth's width (zooming out further returns to the app) down to just inside the atom.
export const W_MAX = 3.2e7, W_MIN = 5e-10;
export const Z_MAX = Math.log(W_MAX), Z_MIN = Math.log(W_MIN);
// The step the view is in: the nearest, measured in powers of ten.
export function rungAt(w) {
  let best = RUNGS[0], d = Infinity;
  for (const r of RUNGS) { const k = Math.abs(Math.log10(w / r.w)); if (k < d) { d = k; best = r; } }
  return best;
}
const sig = (x, n = 2) => Number(x.toPrecision(n)).toLocaleString('en-US', { maximumFractionDigits: 6 }); /* n significant figures */
// A width in metres, with units rolling over: km, m, cm, mm, µm, nm.
export function formatMetres(m) {
  if (!(m > 0)) return '0';
  if (m >= 1000) return `${sig(m / 1000)} km`;
  if (m >= 1) return `${sig(m)} m`;
  if (m >= 0.01) return `${sig(m * 100)} cm`;
  if (m >= 1e-3) return `${sig(m * 1e3)} mm`;
  if (m >= 1e-6) return `${sig(m * 1e6)} µm`;
  return `${sig(m * 1e9)} nm`;
}
// How the view compares with a person (taken as 1.6 m tall): "about 500 times smaller than you".
/* two significant figures: 'about' means about */
const words = n => n >= 1e9 ? `${sig(n / 1e9)} billion` : n >= 1e6 ? `${sig(n / 1e6)} million` : n >= 1e4 ? `${sig(n / 1e3)} thousand` : sig(n);
export function compareWithYou(m, you = 1.6) {
  const r = m / you;
  if (r > 0.5 && r < 2) return 'about your own height';
  return r >= 2 ? `about ${words(r)} times bigger than you` : `about ${words(1 / r)} times smaller than you`;
}
export const SOURCES = RUNGS.flatMap(r => r.src);
