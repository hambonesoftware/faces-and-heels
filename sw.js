const CACHE = 'faces-heels-v1.5.0-iso-action-figures';
const V='1.5.0';
const CORE = [
  `./index.html?v=${V}`,`./styles.css?v=${V}`,`./app.js?v=${V}`,`./moves.js?v=${V}`,
  `./flow-engine.js?v=${V}`,`./match-engine.js?v=${V}`,`./sprite-stage.js?v=${V}`,`./iso-stage.js?v=${V}`,
  `./manifest.webmanifest?v=${V}`,`./presentation.js?v=${V}`,`./progression.js?v=${V}`,
  './assets/icons/icon-192.png','./assets/icons/icon-512.png','./assets/sprites/generated/manifest.json',
  './assets/sprites/generated/stone_body_slam.png','./assets/sprites/generated/stone_body_slam_taken.png',
  './assets/sprites/generated/stone_clothesline.png','./assets/sprites/generated/stone_clothesline_hit.png',
  './assets/sprites/generated/stone_dragon_screw.png','./assets/sprites/generated/stone_dragon_screw_taken.png',
  './assets/sprites/generated/stone_forearm.png','./assets/sprites/generated/stone_forearm_hit.png',
  './assets/sprites/generated/stone_headlock.png','./assets/sprites/generated/stone_headlock_taken.png',
  './assets/sprites/generated/stone_idle.png','./assets/sprites/generated/stone_kickout.png','./assets/sprites/generated/stone_pin.png','./assets/sprites/generated/stone_prone.png','./assets/sprites/generated/stone_suplex.png','./assets/sprites/generated/stone_suplex_taken.png',
  './assets/sprites/generated/viper_body_slam.png','./assets/sprites/generated/viper_body_slam_taken.png',
  './assets/sprites/generated/viper_clothesline.png','./assets/sprites/generated/viper_clothesline_hit.png',
  './assets/sprites/generated/viper_dragon_screw.png','./assets/sprites/generated/viper_dragon_screw_taken.png',
  './assets/sprites/generated/viper_forearm.png','./assets/sprites/generated/viper_forearm_hit.png',
  './assets/sprites/generated/viper_headlock.png','./assets/sprites/generated/viper_headlock_taken.png',
  './assets/sprites/generated/viper_idle.png','./assets/sprites/generated/viper_kickout.png','./assets/sprites/generated/viper_pin.png','./assets/sprites/generated/viper_prone.png','./assets/sprites/generated/viper_suplex.png','./assets/sprites/generated/viper_suplex_taken.png'
];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)));});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim();})());});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const req=event.request,url=new URL(req.url);if(req.mode==='navigate'){event.respondWith((async()=>{try{const fresh=await fetch(req,{cache:'no-store'});const c=await caches.open(CACHE);c.put(`./index.html?v=${V}`,fresh.clone());return fresh;}catch{return (await caches.match(`./index.html?v=${V}`))||Response.error();}})());return;}if(url.searchParams.get('v')===V||/\.(?:js|css|json|webmanifest)$/.test(url.pathname)){event.respondWith((async()=>{try{const fresh=await fetch(req,{cache:'no-store'});const c=await caches.open(CACHE);c.put(req,fresh.clone());return fresh;}catch{return (await caches.match(req))||Response.error();}})());return;}event.respondWith((async()=>{const hit=await caches.match(req);if(hit)return hit;try{const fresh=await fetch(req);const c=await caches.open(CACHE);c.put(req,fresh.clone());return fresh;}catch{return Response.error();}})());});
