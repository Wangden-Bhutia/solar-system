// Tap-unlocked Web Audio; no autoplay on load or on returning from another app.
export function createVoicePlayer({ lines, durations, onState = () => {} }) {
  let ctx, source, finish, token = 0;
  const cache = new Map();
  const state = value => onState(value);
  function unlock() {
    try {
      if (!ctx || ctx.state === 'closed') ctx = new AudioContext();
      if (ctx.state !== 'running') ctx.resume().catch(() => state('retry'));
      // A silent buffer on the gesture helps mobile browsers unlock output.
      const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050);
      s.connect(ctx.destination); s.start();
    } catch { /* Web Speech is still available on some devices. */ }
  }
  function stop() {
    token++; try { source?.stop(); } catch {} source = null;
    finish?.(); finish = null;
    if ('speechSynthesis' in globalThis) speechSynthesis.cancel();
    state('idle');
  }
  async function clip(id) {
    if (!ctx) return null;
    if (!cache.has(id)) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      cache.set(id, fetch(`voice/${id}.mp3`, { signal: controller.signal })
        .then(r => { if (!r.ok) throw Error('clip unavailable'); return r.arrayBuffer(); })
        .then(b => ctx.decodeAudioData(b)).catch(() => { cache.delete(id); return null; })
        .finally(() => clearTimeout(timeout)));
    }
    return cache.get(id);
  }
  function fallback(text, me) {
    return new Promise(resolve => {
      if (!('speechSynthesis' in globalThis)) { state('retry'); return resolve(); }
      const u = new SpeechSynthesisUtterance(text); u.rate = 0.85; u.pitch = 0.9;
      const vs = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
      const male = /male|george|daniel|david|james|arthur|oliver|guy|ryan|thomas|alex|fred|rishi|aaron/i;
      u.voice = vs.find(v => male.test(v.name) && !/female/i.test(v.name)) || vs[0] || null;
      let timer;
      const done = () => { clearTimeout(timer); if (finish === done) finish = null; resolve(); };
      finish = done;
      u.onend = done; u.onerror = () => { if (me === token) state('retry'); done(); };
      timer = setTimeout(() => { if (me === token) { speechSynthesis.cancel(); state('retry'); } done(); }, 2000 + text.length * 140);
      try { speechSynthesis.speak(u); } catch { state('retry'); done(); }
    });
  }
  async function say(ids, muted = false) {
    stop(); const me = token; ids = [].concat(ids);
    if (muted) return;
    const text = ids.map(id => lines[id]).join(' ');
    state('loading');
    const buffers = await Promise.all(ids.map(clip));
    if (me !== token) return;
    if (!ctx || ctx.state !== 'running' || buffers.some(b => !b)) {
      state('speaking'); await fallback(text, me);
    } else {
      state('speaking');
      for (let i = 0; i < buffers.length && me === token; i++) {
        await new Promise(resolve => {
          const s = ctx.createBufferSource(); s.buffer = buffers[i]; s.connect(ctx.destination);
          let timer;
          const done = () => { clearTimeout(timer); if (finish === done) finish = null; resolve(); };
          finish = done; s.onended = done; source = s;
          // Some mobile interruptions don't deliver onended. Never leave controls waiting forever.
          timer = setTimeout(() => { if (me === token) { try { s.stop(); } catch {} state('retry'); } done(); }, ((durations[ids[i]] || s.buffer.duration || 10) + 3) * 1000);
          try { s.start(); } catch { state('retry'); done(); }
        });
      }
    }
    if (me === token) state('idle');
  }
  return { unlock, stop, say, get context() { return ctx; } };
}
