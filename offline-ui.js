// Install and offline, the menu's Offline row.
// "Install app" uses the browser's own install prompt where it offers one (Android, desktop Chrome/Edge); on
// iPhone and iPad the note explains Share → Add to Home Screen. Installing, or "Save for offline", stores the
// whole app on the device (sw.js saveAll), so it opens fast and works with no signal. An installed app
// refreshes its saved copy on each launch (only changed files are downloaded).
// $: getElementById; win: the page's global object (passed in so tests can supply their own).
export function mountOffline({ $, win }) {
  let installEvent = null,
    offline = null;
  const nav = win.navigator || {},
    sw = win.isSecureContext && nav.serviceWorker;
  const standalone = () => !!win.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true;
  const appleTouch =
    /iphone|ipad|ipod/i.test(nav.userAgent || '') || (/macintosh/i.test(nav.userAgent || '') && (nav.maxTouchPoints || 0) > 1);
  const savedBefore = () => {
    try {
      return win.localStorage.getItem('offline-saved');
    } catch {
      return null;
    }
  };
  function saveOffline() {
    if (!sw) return;
    offline = { done: 0, total: 0 };
    paintOffline();
    sw.ready.then(reg => reg.active?.postMessage({ saveAll: true }));
  }
  // What Save for offline downloads: precache.json's total, written in here (and in index.html) by tools/stamp.mjs at deploy.
  const OFFLINE_SIZE = 'about 9.1 MB';
  function paintOffline() {
    $('install').hidden = !installEvent;
    $('save-offline').hidden = !sw;
    $('save-offline').disabled = !!offline && !offline.finished && !offline.error;
    const note = offline?.error
      ? 'Couldn’t save just now. Check the connection and try again.'
      : offline && !offline.finished
        ? `Saving… ${offline.done} of ${offline.total || '…'} files`
        : offline?.finished
          ? offline.failed
            ? `Saved, except ${offline.failed} files. Try again with a better connection.`
            : 'Saved ✓ The whole app is on this device and opens even with no signal.'
          : savedBefore()
            ? 'Saved for offline ✓ New versions are saved as you use them.'
            : !sw
              ? 'Offline use needs the secure (https) version of the site.'
              : appleTouch && !standalone()
                ? 'To install on iPhone or iPad: tap Share, then “Add to Home Screen”. Or save for offline here.'
                : `Keeps the whole app (${OFFLINE_SIZE}) on this device so it opens fast, even with no signal.`;
    $('offline-note').textContent = note;
    $('save-offline').textContent = (offline?.finished && !offline.failed) || savedBefore() ? 'Save again' : 'Save for offline';
  }
  win.addEventListener?.('beforeinstallprompt', e => {
    e.preventDefault();
    installEvent = e;
    paintOffline();
  });
  win.addEventListener?.('appinstalled', () => {
    installEvent = null;
    saveOffline();
  });
  if (sw)
    sw.addEventListener('message', e => {
      const m = e.data?.offline;
      if (!m) return;
      offline = m;
      if (m.finished && !m.failed) {
        try {
          win.localStorage.setItem('offline-saved', m.version || '1');
        } catch {}
      }
      paintOffline();
    });
  $('install').onclick = async () => {
    if (!installEvent) return;
    const e = installEvent;
    e.prompt();
    const r = await e.userChoice.catch(() => ({}));
    installEvent = null;
    if (r.outcome === 'accepted') saveOffline();
    paintOffline();
  };
  $('save-offline').onclick = saveOffline;
  paintOffline();
  if (sw && standalone() && typeof win.setTimeout === 'function') win.setTimeout(saveOffline, 4000);
  // Offline: cache what has been loaded, so the app opens again without a connection (sw.js).
  if (win.isSecureContext && 'serviceWorker' in nav)
    nav.serviceWorker
      .register('sw.js')
      .then(() => nav.serviceWorker.ready)
      .then(reg =>
        win.setTimeout(
          () =>
            reg.active?.postMessage({
              cache: [win.location.href.split('#')[0], ...win.performance.getEntriesByType('resource').map(e => e.name)]
            }),
          3000
        )
      )
      .catch(() => {});
}
