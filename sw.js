// Service worker: игра работает без интернета и быстро запускается.
// Стратегия:
//  • index.html (сама игра) — из сети, но не дольше 4 с; иначе — сохранённая копия.
//  • картинки и движок — сразу из сохранённой копии (без похода в сеть при каждом запуске).
//  • v293: «умное обновление». У каждого файла — отпечаток содержимого (ASSET_HASH, его пишет tools/update_hashes.py).
//    Файл хранится в кэше под адресом с отпечатком (…?h=abcd1234). Новая версия игры докачивает ТОЛЬКО файлы,
//    у которых отпечаток поменялся, а не все 8 МБ, как раньше при каждой версии.
const CACHE = 'farm-v294';   // номер версии игры (для истории); сам кэш файлов — FILES, он не сбрасывается между версиями
const FILES = 'farm-files';
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
  './assets/animals/hens.webp',
  './assets/barn/barn.webp',
  './assets/barn/barn-wall.webp',
  './assets/barn/barn-floor.webp',
  './assets/house/house.webp',
  './assets/house/room.webp',
  ...['water', 'barley', 'cabbage', 'leek', 'herbs', 'eggs', 'stew'].map(k => `./assets/house/icons/${k}.webp`),
  ...[0, 1, 2, 3, 4, 5, 6].map(i => `./assets/house/steps/s${i}.webp`), './assets/house/recipe-wall.webp', './assets/house/shelf-plank.webp', './assets/house/shelf-empty.webp', ...['water', 'barley', 'cabbage', 'leek', 'herbs', 'eggs', 'stew'].map(k => `./assets/house/icons/${k}-ghost.webp`),
  './assets/cows/cow-pyatna.png',
  './assets/cows/cow-brown.png',
  './assets/cows/cow-ryzhaya.png',
  './assets/cows/cow-shokolad.png',
  './assets/cows/cow-seraya.png',
  './assets/cows/cow-palevaya.png',
  './assets/fence/fence.png',
  './assets/chars/zmey.webp',
  './assets/chars/horse.webp',
  './assets/props/stone-boulder.webp',
  ...['a1','a2','a3','a4','a5','a6','b1','b2','b3','b4','b5','b6'].map(k => `./assets/rocks/crag-${k}.webp`),
  ...['pond', 'rock-moss-flowers', 'rock-leaning-a', 'rock-leaning-b', 'rock-poppies-a', 'rock-poppies-b', 'rock-flat-daisies', 'rock-long', 'rock-twin',
      'pebbles-a', 'pebbles-b', 'bush-poppy', 'tuft-clover', 'tuft-cornflower', 'tuft-poppy']
    .map(k => `./assets/garden/${k}.webp`),
  ...['dom-deda', 'domik', 'ambar', 'drovnik', 'kuryatnik', 'korovnik', 'ketil-dom'].map(k => `./assets/houses/${k}.webp`),
  './assets/fields/wheat-plot.webp',
  './assets/fields/wheat-stubble.webp',
  './assets/fields/sheaf.webp',
  './assets/fields/sickle.webp',
  './assets/fields/stook.webp',
  './assets/fields/mouse.webp',
  './assets/river/water.webp',
  './assets/river/river-0.webp',
  './assets/river/river-1.webp',
  './assets/props/well.webp',
  './assets/props/crossing.webp', './assets/props/beam-top.png', './assets/props/beam-bottom.png',   // v280: переезд через ручей
  ...['mid', 'top', 'bot'].flatMap(k => [`./assets/river/stream-paint-${k}.webp`, `./assets/river/stream-water-${k}.webp`]),   // v279: рисованный ручей
  './assets/props/field-sign.webp',
  './assets/props/chop-block.webp',
  './assets/fields/beds.webp',
  ...['tree-1', 'tree-2', 'tree-3', 'tree-4', 'poplar-1', 'poplar-2', 'bush-1', 'bush-2', 'bush-3', 'bush-4',
      's2-oak-1', 's2-oak-2', 's2-grove-1', 's2-grove-2', 's2-branchy-2', 's2-branchy-3',
      's1-oak-1', 's1-oak-2', 's1-grove-1', 's1-grove-2'].map(k => `./assets/trees/${k}.webp`),
  ...['1a_el-2', '1b_el-1', '1b_el-2', '2a_young-3', '2a_young-5', '2b_young-2', '2b_young-4', '3a_pine-1', '3a_pine-2', '3b_pine-1', '3b_pine-2', '4a_larch-1', '4a_larch-2', '4b_larch-1', '4b_larch-2', '5a_stump-2', '5a_stump-4', '5b_stump-1', '5b_stump-3', '6a_boulder-1', '6a_boulder-2', '6a_boulder-3', '6b_boulder-1', '6b_boulder-3', '6b_boulder-4', '6b_boulder-5', '8a_bank-2', '8a_bank-3', '8a_bank-4', '8a_bank-6', '8b_bank-1', '8b_bank-3', '8b_bank-4', '8b_bank-6'].map(k => `./assets/forest/${k}.webp`),   // v260: опушка леса
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

// ---- отпечатки файлов (tools/update_hashes.py) ----
const ASSET_HASH = {"assets/animals/hens.webp":"d1403020","assets/barn/barn-floor.webp":"6fd5b561","assets/barn/barn-wall.webp":"31c3a3fc","assets/barn/barn.webp":"20f6d492","assets/chars/horse.webp":"91f01a2c","assets/chars/iro.png":"b1f0ce32","assets/chars/kale.png":"ef9a4ca0","assets/chars/zmey.webp":"32cff47a","assets/cows/cow-brown.png":"f1eba949","assets/cows/cow-palevaya.png":"90d3e633","assets/cows/cow-pyatna.png":"8f1f7408","assets/cows/cow-ryzhaya.png":"9a8bd2f2","assets/cows/cow-seraya.png":"cbd6be76","assets/cows/cow-shokolad.png":"9052c7d1","assets/cows/cow-white.png":"4208e067","assets/fence/fence.png":"482a4ab6","assets/fields/beds.webp":"622810f6","assets/fields/mouse.webp":"e2f278f2","assets/fields/sheaf.webp":"d9eba813","assets/fields/sickle.webp":"dd51aaa7","assets/fields/stook.webp":"f4ea512e","assets/fields/wheat-plot.webp":"220f0382","assets/fields/wheat-stubble.webp":"155b9e7c","assets/forest/1a_el-2.webp":"d0ecdd15","assets/forest/1b_el-1.webp":"4e8bd44c","assets/forest/1b_el-2.webp":"47ecccb5","assets/forest/2a_young-3.webp":"af767986","assets/forest/2a_young-5.webp":"e64f7f10","assets/forest/2b_young-2.webp":"915665fd","assets/forest/2b_young-4.webp":"a5b2aeae","assets/forest/3a_pine-1.webp":"7aa783b1","assets/forest/3a_pine-2.webp":"66f8295b","assets/forest/3b_pine-1.webp":"28f66833","assets/forest/3b_pine-2.webp":"fc64cec4","assets/forest/4a_larch-1.webp":"99bbe8a8","assets/forest/4a_larch-2.webp":"c173e450","assets/forest/4b_larch-1.webp":"7ab49f46","assets/forest/4b_larch-2.webp":"0c2fa1ea","assets/forest/5a_stump-2.webp":"552998c5","assets/forest/5a_stump-4.webp":"0a228307","assets/forest/5b_stump-1.webp":"87e81281","assets/forest/5b_stump-3.webp":"52d17c8d","assets/forest/6a_boulder-1.webp":"383fdd62","assets/forest/6a_boulder-2.webp":"2138d7b3","assets/forest/6a_boulder-3.webp":"e9760c17","assets/forest/6b_boulder-1.webp":"3c617116","assets/forest/6b_boulder-3.webp":"a23ba857","assets/forest/6b_boulder-4.webp":"c05e9fd4","assets/forest/6b_boulder-5.webp":"389fcccb","assets/forest/8a_bank-2.webp":"3f9003b1","assets/forest/8a_bank-3.webp":"def287bc","assets/forest/8a_bank-4.webp":"2d568018","assets/forest/8a_bank-6.webp":"ffb7dacd","assets/forest/8b_bank-1.webp":"439ad00c","assets/forest/8b_bank-3.webp":"a1a2db18","assets/forest/8b_bank-4.webp":"ca47d279","assets/forest/8b_bank-6.webp":"9e1c2535","assets/garden/bush-poppy.webp":"0ef74e18","assets/garden/iro.webp":"e1261a96","assets/garden/pebbles-a.webp":"08ff8f1b","assets/garden/pebbles-b.webp":"9c7c14cf","assets/garden/pond.webp":"2a1389cb","assets/garden/rock-flat-daisies.webp":"5a6e43a1","assets/garden/rock-leaning-a.webp":"cfc050fe","assets/garden/rock-leaning-b.webp":"c6f4c1b8","assets/garden/rock-long.webp":"9c92e329","assets/garden/rock-moss-flowers.webp":"77c3d3ad","assets/garden/rock-poppies-a.webp":"3475267f","assets/garden/rock-poppies-b.webp":"5e1bafcf","assets/garden/rock-twin.webp":"a77540e3","assets/garden/tuft-clover.webp":"921fdc04","assets/garden/tuft-cornflower.webp":"b972d6ed","assets/garden/tuft-poppy.webp":"4d04d819","assets/ground/grass.jpg":"88377ad5","assets/house/house.webp":"c7c71063","assets/house/icons/barley-ghost.webp":"ddebd556","assets/house/icons/barley.webp":"01377581","assets/house/icons/cabbage-ghost.webp":"05444949","assets/house/icons/cabbage.webp":"2c2b9225","assets/house/icons/eggs-ghost.webp":"efc9ccd4","assets/house/icons/eggs.webp":"e78fa32b","assets/house/icons/herbs-ghost.webp":"88379733","assets/house/icons/herbs.webp":"c2464622","assets/house/icons/leek-ghost.webp":"a25fb9e3","assets/house/icons/leek.webp":"d88385e9","assets/house/icons/stew-ghost.webp":"29d97203","assets/house/icons/stew.webp":"7339acd0","assets/house/icons/water-ghost.webp":"3f4611a4","assets/house/icons/water.webp":"5c39a0e4","assets/house/recipe-wall.webp":"a9b15ead","assets/house/room.webp":"0fede3c8","assets/house/shelf-empty.webp":"7dff13eb","assets/house/shelf-plank.webp":"11b6366e","assets/house/steps/s0.webp":"e770567f","assets/house/steps/s1.webp":"a88c77f0","assets/house/steps/s2.webp":"752361ce","assets/house/steps/s3.webp":"642e3028","assets/house/steps/s4.webp":"a079ebb0","assets/house/steps/s5.webp":"76bf9d3c","assets/house/steps/s6.webp":"cf53069c","assets/houses/ambar.webp":"bc4a99ac","assets/houses/dlinnyj-dom.webp":"1ba7ca59","assets/houses/dom-deda.webp":"7555c710","assets/houses/domik.webp":"e6aba167","assets/houses/drovnik.webp":"fc7e89c9","assets/houses/ketil-dom.webp":"f3974bdf","assets/houses/korovnik.webp":"38120a36","assets/houses/kuryatnik.webp":"5596437a","assets/music/chase2.mp3":"da7267dd","assets/music/day.mp3":"8686af77","assets/music/evening.mp3":"8bdc2ab9","assets/music/minigame.mp3":"dfd239c1","assets/paths/dirt.jpg":"fc18d3b2","assets/paths/path-mask.png":"04b3af03","assets/paths/path-rim.png":"5f045027","assets/props/beam-bottom.png":"ceb1ce4c","assets/props/beam-top.png":"10aa1b55","assets/props/bridge-front.webp":"113e6c03","assets/props/bridge.webp":"a651c058","assets/props/chop-block.webp":"482be41e","assets/props/crossing.webp":"7e3e9aa1","assets/props/field-sign.webp":"cfa0cd37","assets/props/stone-boulder.webp":"359b9d5e","assets/props/well.webp":"f97f8974","assets/river/river-0.webp":"906e734e","assets/river/river-1.webp":"b8b268e1","assets/river/stream-paint-bot.webp":"92fc5d78","assets/river/stream-paint-mid.webp":"b0ab36be","assets/river/stream-paint-top.webp":"391170eb","assets/river/stream-water-bot.webp":"20c53774","assets/river/stream-water-mid.webp":"5b4ecfa1","assets/river/stream-water-top.webp":"0b1755c8","assets/river/water.webp":"2caa0be4","assets/rocks/crag-a1.webp":"5004a480","assets/rocks/crag-a2.webp":"7d3da2f5","assets/rocks/crag-a3.webp":"577b8f93","assets/rocks/crag-a4.webp":"40b6e632","assets/rocks/crag-a5.webp":"a2bf17ec","assets/rocks/crag-a6.webp":"45d61844","assets/rocks/crag-b1.webp":"b0a55520","assets/rocks/crag-b2.webp":"636ed38e","assets/rocks/crag-b3.webp":"6257df6c","assets/rocks/crag-b4.webp":"62122a9c","assets/rocks/crag-b5.webp":"1d5b2d7e","assets/rocks/crag-b6.webp":"369d62bc","assets/trees/bush-1.webp":"dbbf4a0b","assets/trees/bush-2.webp":"3443ea88","assets/trees/bush-3.webp":"49dc7e10","assets/trees/bush-4.webp":"70682cd4","assets/trees/poplar-1.webp":"9f9daf91","assets/trees/poplar-2.webp":"f15ae701","assets/trees/s1-grove-1.webp":"41988a4a","assets/trees/s1-grove-2.webp":"ad1826e8","assets/trees/s1-oak-1.webp":"ceadc004","assets/trees/s1-oak-2.webp":"ac601b33","assets/trees/s2-branchy-2.webp":"3567035d","assets/trees/s2-branchy-3.webp":"bd30274d","assets/trees/s2-grove-1.webp":"0f287691","assets/trees/s2-grove-2.webp":"b7538bd3","assets/trees/s2-oak-1.webp":"88219ab3","assets/trees/s2-oak-2.webp":"45123d53","assets/trees/tree-1.webp":"761ba995","assets/trees/tree-2.webp":"2ef5ab2c","assets/trees/tree-3.webp":"f56c379c","assets/trees/tree-4.webp":"0f76ffd2","icons/apple-touch-icon.png":"a1d54b7f","icons/icon-192.png":"ed5e3cfd","icons/icon-512.png":"83cfad1a","lib/phaser.min.js":"73d8b3a7","manifest.webmanifest":"fdccc92a"}; // @@HASHES@@
const BASE = new URL('./', self.location).href;                       // …/farm-game/
const rel = u => new URL(u, BASE).href.slice(BASE.length).split('?')[0].split('#')[0];   // 'assets/…/x.webp'
const keyOf = path => ASSET_HASH[path] ? BASE + path + '?h=' + ASSET_HASH[path] : null;

self.addEventListener('install', e => {
  // скачиваем только файлы, которых ещё нет в кэше с ТЕМ ЖЕ отпечатком (неизменённые остаются от прошлых версий)
  e.waitUntil(caches.open(FILES).then(async c => {
    await Promise.all(CORE.map(async u => {
      const path = rel(u), key = keyOf(path);
      if (!key) {   // страница и прочее без отпечатка — как раньше
        const res = await fetch(BASE + path + '?v=' + CACHE, { cache: 'no-store' }); if (res.ok) await c.put(BASE + path, res); return;
      }
      if (await c.match(key)) return;
      const res = await fetch(key, { cache: 'no-store' });
      if (!res.ok) throw new Error(path + ' ' + res.status);
      await c.put(key, res);
    }));
    await self.skipWaiting();
  }));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== FILES) await caches.delete(k);   // старые кэши «по версиям» (farm-vN)
    const c = await caches.open(FILES);
    for (const req of await c.keys()) {   // убираем устаревшие копии файлов (отпечаток уже другой)
      const u = new URL(req.url), h = u.searchParams.get('h');
      if (h && ASSET_HASH[rel(req.url)] !== h) await c.delete(req);
    }
    await self.clients.claim();
  })());
});

const isPage = req => req.mode === 'navigate' || /\/(index\.html)?$/.test(new URL(req.url).pathname);

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;            // чужие файлы (шрифты) — как обычно
  e.respondWith(caches.open(FILES).then(async cache => {
    if (isPage(req)) {
      // сама игра: свежая из сети, но если сеть медленная — через 4 с берём сохранённую
      const net = fetch(url.pathname, { cache: 'no-cache' }).then(res => {
        if (res.ok) cache.put(BASE + 'index.html', res.clone());
        return res;
      });
      const cached = await cache.match(BASE + 'index.html');
      if (!cached) return net;
      const slow = new Promise(r => setTimeout(() => r(cached), 4000));
      return Promise.race([net.catch(() => cached), slow]);
    }
    const path = rel(req.url);
    // нужный отпечаток: из адреса (игра просит …?h=) или из списка этого service worker (картинки из CSS, музыка)
    const h = url.searchParams.get('h') || ASSET_HASH[path];
    if (h) {
      const key = BASE + path + '?h=' + h;
      const hit = await cache.match(key); if (hit) return hit;
      try {
        const res = await fetch(key, { cache: 'no-store' });
        if (res.ok) { cache.put(key, res.clone()); return res; }
      } catch (err) {}
      // сеть подвела — любая сохранённая копия этого файла лучше зелёной сетки
      const old = await cache.match(BASE + path, { ignoreSearch: true }); if (old) return old;
      return fetch(req);
    }
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  }));
});
