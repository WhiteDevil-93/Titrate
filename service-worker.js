// Titrate - Service Worker for offline access
const CACHE_NAME = 'titrate-v1';
const ASSETS = [
    '/Titrate/',
    '/Titrate/index.html',
    '/Titrate/app.js',
    '/Titrate/data.json',
    '/Titrate/manifest.json',
    '/Titrate/icon-192.png',
    '/Titrate/icon-512.png'
];

// Install: cache all assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Titrate] Caching assets...');
                return cache.addAll(ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch(err => console.error('[Titrate] Cache failed:', err))
    );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => {
                        console.log('[Titrate] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: serve from cache, fall back to network
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(cached => {
            // Return cached version immediately
            if (cached) return cached;
            
            // Otherwise fetch from network
            return fetch(event.request).then(response => {
                // Cache successful GET requests for future offline use
                if (response && response.status === 200 && event.request.method === 'GET') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            }).catch(() => {
                // If both cache and network fail, return offline fallback
                return new Response(
                    '<html><body style="background:#0a1f1f;color:#80cbc4;font-family:sans-serif;text-align:center;padding:3rem;">' +
                    '<h1>Titrate</h1><p>You are offline.</p><p>Please connect to the internet to load the app.</p></body></html>',
                    { headers: { 'Content-Type': 'text/html' } }
                );
            });
        })
    );
});
