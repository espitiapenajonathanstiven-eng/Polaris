/* Polaris – service worker: la app abre y lee sin internet (los lectores ya vienen dentro de index.html) */
var CACHE = 'polaris-cache-v4';
var APP = ['./', './index.html', './manifest.json', './icono.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(APP.map(function (u) { return c.add(u).catch(function () {}); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  /* con internet trae la versión nueva; sin internet usa la guardada */
  e.respondWith(
    fetch(r).then(function (res) {
      if (res && res.status === 200) {
        var cp = res.clone();
        caches.open(CACHE).then(function (c) { c.put(r, cp); });
      }
      return res;
    }).catch(function () {
      return caches.match(r).then(function (hit) { return hit || caches.match('./index.html'); });
    })
  );
});
