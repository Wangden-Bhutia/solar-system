// The journey inward: from Earth to one carbon atom, by powers of ten. Pure data and formatting (no three.js),
// so tests can check it. Sizes are widths of view in metres; every fact is tied to a source (docs/sources.md).
// The zoom coordinate is Z = ln(width of view in metres), the same idea as the outward zoom (zoom-ladder.js).

const wiki = t => ({ label: 'Wikipedia: ' + t, url: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(t.replace(/ /g, '_')) });

// w: the width of view (m) a glide to this step rests at. here: the "You are here" line. text: one fact.
export const RUNGS = [
  { id: 'earth', w: 1.6e7, label: 'Earth', here: 'You are here: Earth', text: 'Earth, about 12,700 km across. Somewhere on it, a city.', src: [wiki('Earth')] },
  { id: 'city', w: 2.4e4, label: 'City', here: 'You are here: a city', text: 'A city seen from far above: rooftops, roads, a river, and green spaces between them.', src: [] },
  { id: 'park', w: 300, label: 'Park', here: 'You are here: a park', text: 'A park in the middle of the city. Someone is lying on the grass.', src: [] },
  { id: 'girl', w: 1.1, label: 'Girl', here: 'You are here: a girl on the grass', text: 'A little girl lying on the grass, looking up at the sky. Everything from here down is inside her.', src: [] },
  { id: 'hand', w: 0.16, label: 'Hand', here: 'You are here: her hand', text: 'Her hand, about 6 cm across. Now keep going: smaller than anything you can see.', src: [] },
  { id: 'skin', w: 0.045, label: 'Skin', here: 'You are here: the back of her hand', text: 'Skin is folded into tiny crossing creases that let it stretch when her hand bends.', src: [wiki('Human skin')] },
  { id: 'creases', w: 3e-3, label: 'Creases', here: 'You are here: her skin, close up', text: 'Each little patch between the creases is a fraction of a millimetre wide. A fine hair grows here.', src: [wiki('Vellus hair')] },
  { id: 'flakes', w: 3e-4, label: 'Dead cells', here: 'You are here: the skin’s outer layer', text: 'The surface is made of flat, dead cells, each about 0.03 mm wide, stacked like overlapping tiles. They are shed and replaced all the time.', src: [wiki('Stratum corneum')] },
  { id: 'cell', w: 4e-5, label: 'Cell', here: 'You are here: a living skin cell', text: 'Beneath them are living cells, each about 0.01 mm across. Your body is made of about 30 trillion cells.', note: 'colours are illustration: real cells are almost transparent', src: [wiki('Keratinocyte'), wiki('Cell (biology)')] },
  { id: 'nucleus', w: 9e-6, label: 'Nucleus', here: 'You are here: the cell’s nucleus', text: 'The nucleus, about 6 µm wide (six thousandths of a millimetre), holds the cell’s DNA.', src: [wiki('Cell nucleus')] },
  { id: 'spools', w: 1.2e-7, label: 'DNA spools', here: 'You are here: DNA on its spools', text: 'DNA is wound round protein spools called histones. Stretched out, the DNA in one cell would be about 2 metres long.', src: [wiki('Nucleosome'), wiki('DNA')] },
  { id: 'helix', w: 7e-9, label: 'Double helix', here: 'You are here: the double helix', text: 'The double helix: a twisted ladder of atoms, 2 nm wide. The order of its rungs, the bases, spells out the genetic code.', note: 'atoms in the usual chemists’ colours: carbon grey, oxygen red, nitrogen blue, phosphorus orange', src: [wiki('Nucleic acid double helix')] },
  { id: 'atom', w: 9e-10, label: 'Atom', here: 'You are here: one carbon atom', text: 'One carbon atom, about 0.3 nm across. Its electrons are a cloud of where they are likely to be, not tiny planets. The nucleus at the centre is about 60,000 times smaller: almost all of an atom is empty space.', note: 'smaller still: the nucleus, and what it is made of', src: [wiki('Carbon'), wiki('Atomic orbital'), wiki('Atomic nucleus')] },
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
