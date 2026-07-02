// Titrate - Service Worker v2.1
const CACHE_NAME = 'titrate-v4';
const ASSETS = [
    '/Titrate/',
    '/Titrate/index.html',
    '/Titrate/app.js',
    '/Titrate/data.json',
    '/Titrate/manifest.json',
    '/Titrate/icon-192.svg',
    '/Titrate/icon-512.svg'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(ns => Promise.all(ns.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
    e.respondWith(caches.match(e.request).then(c => {
        if (c) return c;
        return fetch(e.request).then(r => {
            if (r && r.status === 200 && e.request.method === 'GET') {
                const clone = r.clone();
                caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
            }
            return r;
        }).catch(() => new Response(
            '<html><body style="background:#0a1f1f;color:#80cbc4;font-family:sans-serif;text-align:center;padding:3rem;"><h1>Titrate</h1><p>You are offline.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
        ));
    }));
});
