/* The service worker. Not part of the game bundle: scripts/sw-plugin.js fills in the version and the
   precache list at build time and writes the result to dist/sw.js.
   - install: cache every built file under a cache named for this build. No skipWaiting here: a new build
     waits until the page asks (the "new version" toast), so a running game never swaps code under itself.
   - activate: drop older builds' caches, take control of open pages.
   - fetch: pages network-first (falling back to this build's cached page offline); this build's files
     cache-first; Google Fonts stale-while-revalidate; everything else (a Worker API, say) untouched. */
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const CACHE = 'goop-' + VERSION, FONTS = 'goop-fonts';

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE))); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('goop-') && k !== CACHE && k !== FONTS) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate') {
      e.respondWith(fetch(req).catch(() => caches.open(CACHE).then(c => c.match('index.html')).then(r => r || Response.error())));
      return;
    }
    e.respondWith(caches.open(CACHE).then(c => c.match(req, { ignoreSearch: true })).then(hit => hit || fetch(req)));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
