// Service Worker para Control Financiero PWA
const CACHE_NAME = 'control-financiero-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg'
];

// Instalación del service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activación del service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Estrategia: Network First, fallback to Cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si la respuesta es válida, la clonamos y la guardamos en cache
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Si falla la red, intentamos obtener del cache
        return caches.match(event.request);
      })
  );
});
