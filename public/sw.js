// Service Worker para PWA Inspector

const CACHE_NAME = 'inspector-pwa-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  console.log('🔧 Service Worker: Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('✅ Cache abierto');
      return cache.addAll(urlsToCache).catch(err => {
        console.warn('⚠️ Algunos recursos no pudieron cachearse:', err);
      });
    })
  );
  
  // Activar inmediatamente
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker: Activando...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Tomar el control de todas las páginas inmediatamente
  return self.clients.claim();
});

// Estrategia de fetch: Network First, fallback to Cache
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // No cachear solicitudes no-GET
  if (request.method !== 'GET') {
    return;
  }

  // Para mapas (OpenStreetMap), usar cache con actualización de fondo
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.match(request).then(response => {
        const fetchPromise = fetch(request).then(response => {
          // Actualizar cache en background
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        }).catch(() => response); // Si falla, usar cached

        return response || fetchPromise;
      })
    );
    return;
  }

  // Para otros recursos, usar Network First
  event.respondWith(
    fetch(request)
      .then(response => {
        // Cachear respuestas exitosas
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Si no hay conexión, intentar desde cache
        return caches.match(request).then(response => {
          if (response) {
            return response;
          }
          
          // Fallback para páginas
          if (request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Escuchar mensajes desde la aplicación
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push notifications (opcional, para futuras mejoras)
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Mensaje de Inspector',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'inspector-notification',
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification('Inspectores de Tránsito', options)
  );
});

// Notificación de actualización
self.addEventListener('controllerchange', () => {
  console.log('✅ Nuevo Service Worker activo');
});
