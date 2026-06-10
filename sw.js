const CACHE = 'vmtips-v3';
const PRECACHE = ['manifest.json', 'icon.svg'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ));
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    // Network-first för HTML — alltid färsk kod
    if (e.request.destination === 'document') {
        e.respondWith(
            fetch(e.request)
                .then(res => {
                    if (res.status === 200) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
                    return res;
                })
                .catch(() => caches.match(e.request))
        );
        return;
    }
    // Cache-first för övriga resurser
    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;
            return fetch(e.request).then(res => {
                if (e.request.method === 'GET' && res.status === 200)
                    caches.open(CACHE).then(c => c.put(e.request, res.clone()));
                return res;
            });
        })
    );
});
