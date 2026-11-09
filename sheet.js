// Bottom-sheet state machine (pure; no DOM). closed → peek → half → full.
export const SHEETS = ['closed', 'peek', 'half', 'full'];
const isExperiment = s => s.view === 'try' && !!s.experiment;
// The sheet height a view opens at: worlds peek; labs and comparisons open half-way
// so the scene stays visible while controls are usable.
export const openHeight = s => (s.view === 'explore' ? 'peek' : 'half');
export function swipe(s, dir) {
  const i = SHEETS.indexOf(s.sheet);
  if (dir === 'up') return { sheet: SHEETS[Math.min(SHEETS.length - 1, i + 1)] };
  if (dir !== 'down') throw Error('swipe direction must be up or down');
  // Labs/compare never shrink below half: leaving half returns to the world card.
  if (s.view !== 'explore' && s.sheet === 'half') return { view: 'explore', experiment: null, sheet: 'peek' };
  if (isExperiment(s) && s.sheet === 'full') return { sheet: 'half' };
  return { sheet: SHEETS[Math.max(0, i - 1)] };
}
// Tapping empty space: close the world card. Labs are not dismissed by stray taps.
export function emptyTap(s) { return isExperiment(s) ? null : { sheet: 'closed' }; }
// Gesture classification for a vertical drag on the sheet grip/header.
export function classifyDrag(dy, ms = 300) {
  if (Math.abs(dy) < 36 && !(Math.abs(dy) >= 18 && ms < 180)) return null;
  return dy < 0 ? 'up' : 'down';
}
// Visible scene region not covered by the sheet, in canvas pixels.
export function visibleRegion(width, height, sheetRect) {
  if (!sheetRect || sheetRect.height <= 0 || sheetRect.top >= height) return { width, height };
  const dockedRight = sheetRect.left + sheetRect.width >= width - 2 && sheetRect.left >= width * 0.35;
  if (dockedRight) return { width: Math.max(160, Math.min(width, sheetRect.left)), height };
  return { width, height: Math.max(140, Math.min(height, sheetRect.top)) };
}
