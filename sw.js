// Polaris - service worker
// Para forzar una actualización en los celulares, sube el número (v3, v4...)
const CACHE = 'polaris-cache-v2';
const ARCHIVOS = ['./', './index.html', './manifest.json', './icono.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Primero internet (así siempre llega la versión nueva); sin internet, usa la copia guardada
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const mismoOrigen = new URL(req.url).origin === self.location.origin;
  e.respondWith(
    fetch(req, mismoOrigen ? { cache: 'no-cache' } : undefined)
      .then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put(req, copia));
        }
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
