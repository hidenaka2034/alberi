// Alberi - Service Worker
// Versione: 1.0

const CACHE = 'alberi-v1';

// Install: cache the main page
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(['./index.html', './']);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
    })
  );
  self.clients.claim();
});

// Serve from cache when offline
self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(r) {
      return r || fetch(e.request);
    })
  );
});

// Periodic background sync - check watering once per day
self.addEventListener('periodicsync', function(e) {
  if(e.tag === 'watering-check') {
    e.waitUntil(checkAndNotify());
  }
});

async function checkAndNotify() {
  // Read tree data from all open clients
  const clients = await self.clients.matchAll();
  if(clients.length > 0) {
    // App is open - let the app handle it
    return;
  }

  // App is closed - read from cache/IndexedDB
  // We use a simple approach: post message to trigger check when app opens
  // For now, show a reminder notification
  const today = new Date();
  const month = today.getMonth() + 1;
  if(month < 5 || month > 10) return; // only May-Oct

  // Try to get data from localStorage via a client message
  // Show generic reminder if no client is open
  const lang = 'it'; // default

  self.registration.showNotification(
    lang === 'en' ? '💧 Check your trees' : '💧 Controlla i tuoi alberi',
    {
      body: lang === 'en'
        ? 'Open the app to check if any trees need watering today.'
        : 'Apri l\'app per verificare se ci sono alberi da annaffiare oggi.',
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌳</text></svg>',
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💧</text></svg>',
      tag: 'watering-reminder',
      renotify: false,
      requireInteraction: false,
      actions: [
        { action: 'open', title: lang === 'en' ? 'Open app' : 'Apri app' }
      ]
    }
  );
}

// Handle notification click
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({type:'window'}).then(function(clients) {
      if(clients.length > 0) {
        return clients[0].focus();
      }
      return self.clients.openWindow('./');
    })
  );
});

// Message from app: send precise notification with overdue trees
self.addEventListener('message', function(e) {
  if(e.data && e.data.type === 'WATERING_ALERT') {
    var data = e.data;
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌳</text></svg>',
      tag: 'watering-overdue',
      renotify: true,
    });
  }
});
