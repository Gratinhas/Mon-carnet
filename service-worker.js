// Service worker pour "Mon Carnet" — permet le lancement et l'utilisation
// de l'application hors-ligne une fois qu'elle a été ouverte au moins une
// fois avec une connexion internet.

const CACHE_NAME = 'carnet-cache-v1';
const APP_SHELL = [
  './',
  './carnet.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {}) // ne bloque pas l'installation si un fichier est manquant
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // On ne gère que les fichiers de l'application elle-même. Les requêtes
  // vers d'autres origines (polices Google, traduction automatique,
  // connexion Google Drive...) passent normalement, ce qui laisse ces
  // fonctionnalités se dégrader proprement quand il n'y a pas de réseau,
  // sans jamais bloquer le chargement de l'application.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached);
      // Sert immédiatement la version en cache si elle existe (rapide et
      // fonctionne hors-ligne), tout en rafraîchissant le cache en arrière-plan
      // dès qu'une connexion est disponible.
      return cached || networkFetch;
    })
  );
});
