// 怼怼皮 - Service Worker
const CACHE_NAME = 'duiduipi-v3';
const urlsToCache = [
  '.',
  'index.html',
  'manifest.json',
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting(); // 新 SW 立即接管
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) { return response; }
      return fetch(event.request).then(function(networkResponse) {
        // Cache new GET requests dynamically
        if (event.request.method === 'GET' && networkResponse.ok) {
          var cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, cloned);
          });
        }
        return networkResponse;
      }).catch(function() {
        // Only return HTML fallback for GET requests
        if (event.request.method === 'GET') {
          return caches.match('index.html');
        }
        // POST etc — return error JSON, not HTML
        return new Response(JSON.stringify({ error: '网络连接失败' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      });
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(name) {
          if (name !== CACHE_NAME) { return caches.delete(name); }
        })
      );
    })
  );
  self.clients.claim(); // 立即控制所有页面
});
