// Service worker: позволяет игре работать без интернета.
// Стратегия: сразу отдаём сохранённую копию, а в фоне скачиваем свежую версию.
// Поэтому обновление игры у игрока появляется со второго запуска.
const CACHE = 'farm-v8';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './lib/phaser.min.js',
  './assets/ground/grass.jpg',
  './assets/paths/dirt.jpg',
  './assets/paths/path-mask.png',
  './assets/paths/path-rim.png',
  ...['tree-1', 'tree-2', 'tree-3', 'tree-4', 'poplar-1', 'poplar-2', 'bush-1', 'bush-2', 'bush-3', 'bush-4']
    .map(k => `./assets/trees/${k}.png`),
  ...['s2-oak-1', 's2-oak-2', 's2-grove-1', 's2-grove-2', 's2-branchy-2', 's2-branchy-3',
      's1-oak-1', 's1-oak-2', 's1-grove-1', 's1-grove-2'].map(k => `./assets/trees/${k}.webp`),
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request, { ignoreSearch: true });
      const fresh = fetch(e.request)
        .then(res => {
          if (res && (res.ok || res.type === 'opaque')) cache.put(e.request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || fresh;
    })
  );
});
