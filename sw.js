// Service worker: позволяет игре работать без интернета.
// Стратегия: если есть интернет — всегда берём свежую версию (в обход кэша браузера)
// и заодно обновляем сохранённую копию; без интернета — играем из сохранённой копии.
const CACHE = 'farm-v36';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './lib/phaser.min.js',
  './assets/ground/grass.jpg',
  './assets/paths/dirt.jpg',
  './assets/paths/path-mask.png',
  './assets/paths/path-rim.png',
  './assets/cows/cow-white.png',
  './assets/fence/fence.png',
  './assets/chars/iro.png',
  './assets/chars/kale.png',
  './assets/fields/wheat-plot.webp',
  './assets/fields/beds.webp',
  ...['tree-1', 'tree-2', 'tree-3', 'tree-4', 'poplar-1', 'poplar-2', 'bush-1', 'bush-2', 'bush-3', 'bush-4']
    .map(k => `./assets/trees/${k}.png`),
  ...['s2-oak-1', 's2-oak-2', 's2-grove-1', 's2-grove-2', 's2-branchy-2', 's2-branchy-3',
      's1-oak-1', 's1-oak-2', 's1-grove-1', 's1-grove-2'].map(k => `./assets/trees/${k}.webp`),
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  // cache: 'reload' — скачиваем файлы заново, а не из кэша браузера
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
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
  const sameSite = new URL(e.request.url).origin === location.origin;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      try {
        // сначала сеть (для своих файлов — в обход кэша браузера), сохранённая копия — запасной вариант
        const res = await fetch(sameSite ? e.request.url : e.request, sameSite ? { cache: 'no-cache' } : undefined);
        if (res && (res.ok || res.type === 'opaque')) cache.put(e.request, res.clone());
        return res;
      } catch (err) {
        const cached = await cache.match(e.request, { ignoreSearch: true });
        if (cached) return cached;
        throw err;
      }
    })
  );
});
