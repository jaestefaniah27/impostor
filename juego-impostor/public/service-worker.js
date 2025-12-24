const CACHE_NAME = 'impostor-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/js/data.js',
  '/js/game.js',
  '/js/ui.js',
  '/manifest.json'
];

// 1. INSTALACIÓN: Guardamos los archivos estáticos
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. ACTIVACIÓN: Limpiamos cachés viejas si actualizamos la versión
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
});

// 3. FETCH: Interceptamos las peticiones
self.addEventListener('fetch', (e) => {
  // Estrategia: Network First (intenta internet, si no hay, usa caché)
  // Ideal para APIs dinámicas como /api/stats o /api/history
  e.respondWith(
    fetch(e.request)
      .catch(() => {
        return caches.match(e.request);
      })
  );
});