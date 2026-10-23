/* Polaris – service worker: la app y los lectores funcionan sin internet */
var CACHE = 'polaris-cache-v3';
var APP = ['./', './index.html', './manifest.json', './icono.png'];
var CDN = 'https://cdnjs.cloudflare.com/ajax/libs/';
var LIBS = [
  CDN + 'jszip/3.10.1/jszip.min.js',
  CDN + 'epub.js/0.3.93/epub.min.js',
  CDN + 'pdf.js/3.11.174/pdf.min.js',
  CDN + 'pdf.js/3.11.174/pdf.worker.min.js',
  CDN + 'mammoth/1.6.0/mammoth.browser.min.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      /* cada archivo por separado: si uno falla, los demás igual se guardan */
      return Promise.all(APP.concat(LIBS).map(function (u) {
        return c.add(u).catch(function () {});
      }));
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
  if (r.method !== 'GET') return;
  var url = new URL(r.url);

  /* Librerías del lector: primero lo guardado (sin internet), si no hay, red y se guarda */
  if (url.href.indexOf(CDN) === 0) {
    e.respondWith(
      caches.match(r).then(function (hit) {
        return hit || fetch(r).then(function (res) {
          if (res && res.status === 200) {
            var cp = res.clone();
            caches.open(CACHE).then(function (c) { c.put(r, cp); });
          }
          return res;
        });
      })
    );
    return;
  }

  /* La app: con internet trae la versión nueva; sin internet usa la guardada */
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(r).then(function (res) {
        if (res && res.status === 200) {
          var cp = res.clone();
          caches.open(CACHE).then(function (c) { c.put(r, cp); });
        }
        return res;
      }).catch(function () {
        return caches.match(r).then(function (hit) {
          return hit || caches.match('./index.html');
        });
      })
    );
  }
});
