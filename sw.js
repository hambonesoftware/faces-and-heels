const CACHE = 'faces-heels-v1.7.0-neon-showdown';
const CORE = [
  './index.html?v=1.7.0',
  './styles.css?v=1.7.0',
  './app.js?v=1.7.0',
  './ui-art.js?v=1.7.0',
  './moves.js?v=1.7.0',
  './flow-engine.js?v=1.7.0',
  './match-engine.js?v=1.7.0',
  './sprite-stage.js?v=1.7.0',
  './iso-stage.js?v=1.7.0',
  './block-model.js?v=1.7.0',
  './mesh-renderer.js?v=1.7.0',
  './choreography.js?v=1.7.0',
  './motion-lab.html',
  './motion-lab.js?v=1.7.0',
  './manifest.webmanifest?v=1.7.0',
  './presentation.js?v=1.7.0',
  './progression.js?v=1.7.0',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/sprites/generated/manifest.json',
  './assets/sprites/generated/stone_body_slam.png',
  './assets/sprites/generated/stone_body_slam_taken.png',
  './assets/sprites/generated/stone_clothesline.png',
  './assets/sprites/generated/stone_clothesline_hit.png',
  './assets/sprites/generated/stone_dragon_screw.png',
  './assets/sprites/generated/stone_dragon_screw_taken.png',
  './assets/sprites/generated/stone_forearm.png',
  './assets/sprites/generated/stone_forearm_hit.png',
  './assets/sprites/generated/stone_headlock.png',
  './assets/sprites/generated/stone_headlock_taken.png',
  './assets/sprites/generated/stone_idle.png',
  './assets/sprites/generated/stone_kickout.png',
  './assets/sprites/generated/stone_pin.png',
  './assets/sprites/generated/stone_prone.png',
  './assets/sprites/generated/stone_suplex.png',
  './assets/sprites/generated/stone_suplex_taken.png',
  './assets/sprites/generated/viper_body_slam.png',
  './assets/sprites/generated/viper_body_slam_taken.png',
  './assets/sprites/generated/viper_clothesline.png',
  './assets/sprites/generated/viper_clothesline_hit.png',
  './assets/sprites/generated/viper_dragon_screw.png',
  './assets/sprites/generated/viper_dragon_screw_taken.png',
  './assets/sprites/generated/viper_forearm.png',
  './assets/sprites/generated/viper_forearm_hit.png',
  './assets/sprites/generated/viper_headlock.png',
  './assets/sprites/generated/viper_headlock_taken.png',
  './assets/sprites/generated/viper_idle.png',
  './assets/sprites/generated/viper_kickout.png',
  './assets/sprites/generated/viper_pin.png',
  './assets/sprites/generated/viper_prone.png',
  './assets/sprites/generated/viper_suplex.png',
  './assets/sprites/generated/viper_suplex_taken.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('faces-heels-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const req = event.request;
  const url = new URL(req.url);

  // Always prefer the running Docker build for page navigations.
  if (req.mode === 'navigate') {
    const pageKey = url.pathname.endsWith('/motion-lab.html') ? './motion-lab.html' : './index.html?v=1.7.0';
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(CACHE);
        cache.put(pageKey, fresh.clone());
        return fresh;
      } catch (e) {
        return (await caches.match(pageKey)) || Response.error();
      }
    })());
    return;
  }

  // Versioned code files should come from network first during development.
  if (url.searchParams.get('v') === '1.7.0' || /\.(?:js|css|json|webmanifest)$/.test(url.pathname)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        return (await caches.match(req)) || Response.error();
      }
    })());
    return;
  }

  // Large sprite/image assets can remain cache-first once the new cache owns them.
  event.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    try {
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE);
      cache.put(req, fresh.clone());
      return fresh;
    } catch (e) {
      return Response.error();
    }
  })());
});
