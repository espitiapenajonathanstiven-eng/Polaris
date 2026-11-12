/* Polaris - service worker
   index.html se pide primero a internet (así los cambios llegan solos) y, si no hay conexión, se usa la copia guardada.
   Todo lo demás (iconos, manifest) se sirve desde la copia guardada para que la app abra sin internet. */
const CACHE = 'polaris-cache-v6';
const ASSETS = ['./', './index.html', './manifest.json', './icono.png', './polaris-icon-192.png', './polaris-icon-512.png', './polaris-icon-maskable.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return Promise.all(ASSETS.map(function (u) { return c.add(u).catch(function () {}); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  var isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
  if (isPage) {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
          return res;
        })
        .catch(function () {
          return caches.match('./index.html').then(function (r) { return r || caches.match('./'); });
        })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
