// Service worker: игра работает без интернета и быстро запускается.
// Стратегия:
//  • index.html (сама игра) — из сети, но не дольше 4 с; иначе — сохранённая копия.
//  • картинки и движок — сразу из сохранённой копии (без похода в сеть при каждом запуске).
//    Когда выходит новая версия (меняется CACHE), новый service worker при установке
//    обновляет все файлы — неизменённые браузер не скачивает заново (сверяет и получает «не изменился»).
const CACHE = 'farm-v88';
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
  './assets/cows/cow-pyatna.png',
  './assets/cows/cow-brown.png',
  './assets/cows/cow-ryzhaya.png',
  './assets/cows/cow-shokolad.png',
  './assets/cows/cow-seraya.png',
  './assets/fence/fence.png',
  ...['pond', 'iro', 'rock-moss-flowers', 'rock-leaning-a', 'rock-leaning-b', 'rock-poppies-a', 'rock-poppies-b', 'rock-flat-daisies', 'rock-long', 'rock-twin',
      'pebbles-a', 'pebbles-b', 'bush-poppy', 'tuft-clover', 'tuft-cornflower', 'tuft-poppy', 's2-branchy-2', 's2-branchy-3', 's1-oak-1', 's1-grove-1']
    .map(k => `./assets/garden/${k}.webp`),
  './assets/chars/kale.png',
  ...['dom-deda', 'domik', 'ambar', 'drovnik'].map(k => `./assets/houses/${k}.webp`),
  './assets/fields/wheat-plot.webp',
  './assets/fields/beds.webp',
  ...['tree-1', 'tree-2', 'tree-3', 'tree-4', 'poplar-1', 'poplar-2', 'bush-1', 'bush-2', 'bush-3', 'bush-4',
      's2-oak-1', 's2-oak-2', 's2-grove-1', 's2-grove-2', 's2-branchy-2', 's2-branchy-3',
      's1-oak-1', 's1-oak-2', 's1-grove-1', 's1-grove-2'].map(k => `./assets/trees/${k}.webp`),
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  // cache: 'no-cache' — сверяем с сайтом: изменённые файлы скачиваются, остальные берутся из кэша браузера
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'no-cache' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isPage = req => req.mode === 'navigate' || /\/(index\.html)?$/.test(new URL(req.url).pathname);

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;            // чужие файлы (шрифты) — как обычно
  e.respondWith(caches.open(CACHE).then(async cache => {
    if (isPage(req)) {
      // сама игра: свежая из сети, но если сеть медленная — через 4 с берём сохранённую
      const net = fetch(url.pathname, { cache: 'no-cache' }).then(res => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      });
      const cached = await cache.match(req, { ignoreSearch: true });
      if (!cached) return net;
      const slow = new Promise(r => setTimeout(() => r(cached), 4000));
      return Promise.race([net.catch(() => cached), slow]);
    }
    // картинки, движок и прочее: сначала сохранённая копия, если её нет — из сети (и сохраняем)
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  }));
});
