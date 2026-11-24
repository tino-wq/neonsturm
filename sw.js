// NEONSTURM offline cache: the game loads from here when there is no internet.
const CACHE = 'neonsturm-v1';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate') {
      // online: newest version (and refresh the cache); offline: cached game
      e.respondWith(
        fetch(req)
          .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return res; })
          .catch(() => caches.match('./index.html'))
      );
      return;
    }
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    // fonts: use the cached copy if there is one, refresh it in the background
    e.respondWith(
      caches.open(CACHE).then(c => c.match(req).then(hit => {
        const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit || Response.error());
        return hit || net;
      }))
    );
  }
});
