// One narrator for the guided stories (the tour, the journey inward, the cosmic year): their ♫ button turns reading
// on, and each step is then read in the recorded voice as you reach it (narration.js names the clips). The stories
// that move on by themselves wait while a line is being read (busy). A ♫ tap is the opt-in: if Voice was switched off
// in the menu, the tap switches it back on. Messages go to the note beside the ♫ that was tapped.
export const MESSAGES = {
  loading: 'Loading voice…',
  offline: 'The voice needs a connection the first time it plays.',
  retry: 'Tap ♫ to try again.'
};
export function createNarrator({ player, has, voiceOn, setVoiceOn }) {
  let on = false,
    busy = false,
    said = null,
    note = null,
    button = null;
  const show = msg => {
    if (note) note.textContent = msg || '';
  };
  const paintButton = () => {
    if (!button) return;
    button.setAttribute('aria-pressed', String(on));
    button.classList.toggle('on', on);
    button.setAttribute('aria-label', on ? 'Stop reading aloud' : 'Read aloud');
  };
  const n = {
    get on() {
      return on;
    },
    get busy() {
      return busy;
    },
    // A story binds its ♫ button and the note beside it while it is open.
    bind(btn, noteEl) {
      button = btn;
      note = noteEl;
      paintButton();
      show('');
    },
    toggle(firstId) {
      if (on) return n.off();
      on = true;
      if (!voiceOn()) setVoiceOn(true);
      player.unlock();
      paintButton();
      said = null;
      if (firstId) n.read(firstId);
    },
    // Read this step (once; arriving at the same step again does not repeat it).
    read(id) {
      if (!on || !id || id === said || !has(id)) return;
      said = id;
      busy = true;
      const me = id;
      Promise.resolve(player.say(id)).finally(() => {
        if (said === me) busy = false;
      });
    },
    state(s) {
      show(MESSAGES[s] || '');
      if (s === 'offline' || s === 'retry') busy = false;
    },
    stop() {
      said = null;
      busy = false;
      player.stop();
    },
    off() {
      on = false;
      n.stop();
      paintButton();
      show('');
    },
    // A story closed: reading stops and its button is let go.
    release() {
      n.off();
      button = null;
      note = null;
    }
  };
  return n;
}
