const CACHE = 'faces-heels-v1.19.0-classic-wrestling-r2';
const CORE = [
  './index.html?v=1.19.0',
  './styles.css?v=1.19.0',
  './app.js?v=1.19.0',
  './solo-ai.js?v=1.19.0',
  './solo-ai.js',
  './match-engine.js',
  './combat-animation-map.js?v=1.19.0',
  './legendary-catalog.js?v=1.19.0',
  './turn-controller.js?v=1.19.0',
  './ground-defense.js?v=1.19.0',
  './reaction-selection.js?v=1.19.0',
  './hold-transitions.js?v=1.19.0',
  // ESM imports from the match engine are unversioned. Cache those exact URLs
  // as well so a previously installed PWA remains playable offline.
  './turn-controller.js',
  './ground-defense.js',
  './reaction-selection.js',
  './hold-transitions.js',
  './legendary-catalog.js',
  './moves.js',
  './flow-engine.js',
  './ui-art.js?v=1.19.0',
  './moves.js?v=1.19.0',
  './flow-engine.js?v=1.19.0',
  './match-engine.js?v=1.19.0',
  './sprite-stage.js?v=1.19.0',
  './iso-stage.js?v=1.19.0',
  './block-model.js?v=1.19.0',
  './mesh-renderer.js?v=1.19.0',
  './choreography.js?v=1.19.0',
  './motion-lab.html',
  './motion-lab.js?v=1.19.0',
  './manifest.webmanifest?v=1.19.0',
  './presentation.js?v=1.19.0',
  './progression.js?v=1.19.0',
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

// Source files import some dependencies without a version query. On the
// first offline launch, reuse the matching versioned precache entries rather
// than failing despite having the exact source file cached already.
async function cachedModuleResponse(req){
  const exact=await caches.match(req);
  if(exact)return exact;
  const url=new URL(req.url);
  if(/\.(?:js|css|json|webmanifest)$/.test(url.pathname)){
    url.searchParams.set('v','1.19.0');
    return caches.match(url.toString());
  }
  return undefined;
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const req = event.request;
  const url = new URL(req.url);

  // Always prefer the running Docker build for page navigations.
  if (req.mode === 'navigate') {
    const pageKey = url.pathname.endsWith('/motion-lab.html') ? './motion-lab.html' : './index.html?v=1.19.0';
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
  if (url.searchParams.get('v') === '1.19.0' || /\.(?:js|css|json|webmanifest)$/.test(url.pathname)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        return (await cachedModuleResponse(req)) || Response.error();
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
