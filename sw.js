// Offline support. After one visit with a connection, the app opens without one.
// - The page itself: network first (so a new deploy shows at once), the cached copy when offline.
// - Versioned files (modules and styles carry ?v=<commit>, voice clips ?h=<hash>): cache first. A new deploy
//   gives them a new URL, so a cached copy is never stale; older stamps of the same file are dropped.
// - Unversioned files (textures, icons, data files): the cached copy at once, and a check in the background
//   that saves a newer copy when the file has changed, so a redrawn picture reaches people on their next visit.
const CACHE = 'our-solar-system';
const put = async (req, res) => {
  const cache = await caches.open(CACHE),
    url = new URL(req.url);
  for (const k of await cache.keys()) {
    const u = new URL(k.url);
    if (u.pathname === url.pathname && u.search !== url.search) await cache.delete(k);
  }
  await cache.put(req, res);
};
self.addEventListener('install', () => self.skipWaiting());
// On the very first visit the page loads before this worker starts, so the page sends the list of what it loaded.
self.addEventListener('message', e => {
  if (e.data?.saveAll) {
    e.waitUntil(saveAll(e.source).catch(() => e.source?.postMessage({ offline: { error: true } })));
    return;
  }
  const urls = e.data?.cache;
  if (!Array.isArray(urls)) return;
  e.waitUntil(
    Promise.all(
      urls
        .filter(u => new URL(u).origin === self.location.origin)
        .map(async u => {
          if (await caches.match(u)) return;
          try {
            const res = await fetch(u);
            if (res.ok) await put(new Request(u), res);
          } catch {}
        })
    )
  );
});
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
// "Install" / "Save for offline": store every file of this deploy (precache.json, written at deploy), reporting progress.
async function saveAll(client) {
  const list = await (await fetch('precache.json', { cache: 'no-store' })).json(),
    base = new URL('./', self.location).href;
  let done = 0,
    failed = 0;
  const total = list.files.length,
    say = m => client?.postMessage({ offline: m });
  say({ done, total, bytes: list.bytes });
  const queue = [...list.files];
  const worker = async () => {
    for (let f; (f = queue.shift()); ) {
      const url = new URL(f, base).href;
      try {
        if (!(await caches.match(url))) {
          const res = await fetch(url);
          if (res.ok) await put(new Request(url), res);
          else failed++;
        }
      } catch {
        failed++;
      }
      done++;
      if (done % 4 === 0 || done === total) say({ done, total, bytes: list.bytes });
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  say({ done, total, bytes: list.bytes, finished: true, failed, version: list.version });
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) put(req, res.clone());
          return res;
        })
        .catch(
          async () =>
            (await caches.match(req, { ignoreSearch: true })) ||
            (await caches.match(new URL('./', self.location).href, { ignoreSearch: true })) ||
            Response.error()
        )
    );
    return;
  }
  const fresh = () =>
    fetch(req).then(res => {
      if (res.ok && res.status === 200) put(req, res.clone());
      return res;
    });
  if (/[?&][vh]=/.test(new URL(req.url).search)) {
    e.respondWith(caches.match(req).then(hit => hit || fresh()));
    return;
  }
  e.respondWith(
    caches.match(req).then(hit => {
      if (!hit) return fresh();
      e.waitUntil(fresh().catch(() => {}));
      return hit;
    })
  );
});
