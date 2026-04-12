// ══════════════════════════════════════════════════════════════
// MAILONE — Service Worker
// Gère les notifications push en arrière-plan
// Placez ce fichier à la RACINE de mailone-site/
// ══════════════════════════════════════════════════════════════

const CACHE_NAME = 'mailone-v1';

// ── INSTALLATION ─────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installé');
  self.skipWaiting();
});

// ── ACTIVATION ───────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activé');
  event.waitUntil(clients.claim());
});

// ── RÉCEPTION D'UNE NOTIFICATION PUSH ────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body:    data.body    || 'Nouveau mail important',
    icon:    data.icon    || '/icon-192.png',
    badge:   data.badge   || '/icon-72.png',
    tag:     data.tag     || 'mailone-notif',
    data:    data.data    || {},
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open',    title: '📬 Voir le mail' },
      { action: 'dismiss', title: 'Ignorer'          },
    ],
    requireInteraction: data.urgent || false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'MailOne', options)
  );
});

// ── CLIC SUR LA NOTIFICATION ──────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  // Ouvrir ou focus l'app MailOne
  const urlToOpen = event.notification.data?.url || '/app.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Si l'app est déjà ouverte → focus
        for (const client of windowClients) {
          if (client.url.includes('app.html') && 'focus' in client) {
            return client.focus();
          }
        }
        // Sinon → ouvrir un nouvel onglet
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
