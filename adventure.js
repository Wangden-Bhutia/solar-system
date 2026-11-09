// Small deterministic mission state, independent of rendering/audio for repeatable tests.
export const STOPS = [
  { target: 'Earth', title: 'Our home', pic: '🌍', prompt: 'trip_earth', fact: 'trip_earth_found', hint: 'Show me Earth', next: 'Visit the Moon →' },
  { target: 'Moon', title: 'Our Moon', pic: '🌙', prompt: 'trip_moon', fact: 'trip_moon_found', hint: 'Visit Moon', next: 'Meet our neighbours →' },
  { target: 'Mars', title: 'A red neighbour', pic: '🔴', prompt: 'trip_mars', fact: 'trip_mars_found', hint: 'Show me Mars', next: 'One more discovery →' },
  { target: 'Saturn', title: 'A ringed world', pic: '🪐', prompt: 'trip_saturn', fact: 'trip_saturn_found', hint: 'Show me Saturn', next: 'Finish adventure ⭐' },
];
export function createAdventure() {
  let index = -1, found = false;
  return {
    get current() { return STOPS[index] || null; },
    get index() { return index; }, get found() { return found; },
    start() { index = 0; found = false; },
    stop() { index = -1; found = false; },
    answer(name) { if (!STOPS[index] || found || name !== STOPS[index].target) return false; found = true; return true; },
    next() { if (!found) return false; index++; found = false; if (index === STOPS.length) index = -1; return true; },
  };
}
