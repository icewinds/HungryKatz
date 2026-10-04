// Offline support: precache the app shell, then network-first with cache fallback.
// BUMP CACHE when you deploy so players get the new files.
const CACHE = 'hungrykatz-v45';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/game.js',
  './js/config.js',
  './js/art.js',
  './js/player.js',
  './js/npc.js',
  './js/npcSpawner.js',
  './js/inventory.js',
  './js/foodStation.js',
  './js/upgrades.js',
  './js/gameManager.js',
  './js/highScores.js',
  './js/audio.js',
  './js/ui.js',
  './js/storage.js',
  './js/pathing.js',
  './js/characters.js',
  './js/daily.js',
  './js/scene.js',
  './js/achievements.js',
  './js/icons.js',
  './assets/fonts/fredoka-latin.woff2',
  './assets/fonts/lilita-one-latin.woff2',
  './assets/fonts/fredoka-latin-ext.woff2',
  './assets/ui/icon-192.png',
  './assets/ui/icon-512.png',
  './assets/ui/icon-maskable-512.png',
];

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
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

  // Network first (always fresh), cache as offline fallback.
  e.respondWith(
    fetch(req).then(async res => {
      if (res.ok || res.type === 'opaque') {
        const c = await caches.open(CACHE);
        await c.put(req, res.clone());
      }
      return res;
    }).catch(async () =>
      (await caches.match(req, { ignoreSearch: req.mode === 'navigate' })) ||
      (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
  );
});
