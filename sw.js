// Service Worker: macht Brewsaw offline nutzbar.
// Strategie: erst Netzwerk (damit Aktualisierungen sofort ankommen), sonst Cache.
const CACHE = 'brewsaw-v13';
const DATEIEN = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'js/app.js',
  'js/calc.js',
  'js/data.js',
  'js/store.js',
  'js/ui.js',
  'js/brautag.js',
  'js/bilder.js',
  'js/bibliothek.js',
  'js/bibliothek-diydog.js',
  'js/grainfather.js',
  'js/suche.js',
  'js/beerxml.js',
  'js/ki.js',
  'js/views/ki.js',
  'js/views/rezepte.js',
  'js/views/rezept.js',
  'js/views/sude.js',
  'js/views/sud.js',
  'js/views/brautag.js',
  'js/views/wasser.js',
  'js/views/lager.js',
  'js/views/einstellungen.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((antwort) => {
        if (antwort.ok) {
          const kopie = antwort.clone();
          caches.open(CACHE).then((c) => c.put(e.request, kopie));
        }
        return antwort;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))),
  );
});
