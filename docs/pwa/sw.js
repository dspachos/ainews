'use strict';

/* Service worker for the AI News Digest PWA. Scope is ./pwa/ only, so the
   digest site is never intercepted. Bump VERSION when shell files change;
   old caches are deleted on activate. */

const VERSION = 'v1';
const SHELL_CACHE = `ainews-shell-${VERSION}`;
const DATA_CACHE = `ainews-data-${VERSION}`;
const KEEP = [SHELL_CACHE, DATA_CACHE];

const SHELL_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

/* The data index is precached at install, so the first offline visit after
   installation still has the last known editions. */
const DATA_ASSETS = ['../data.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL_CACHE);
      await shell.addAll(SHELL_ASSETS);
      const data = await caches.open(DATA_CACHE);
      await data.addAll(DATA_ASSETS);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(networkFirstShell(req));
    return;
  }
  if (url.pathname.endsWith('/data.json')) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }
  event.respondWith(cacheFirstShell(req));
});

async function networkFirstShell(req) {
  try {
    const res = await fetch(req);
    const cache = await caches.open(SHELL_CACHE);
    cache.put('./index.html', res.clone());
    return res;
  } catch {
    const cached = await caches.match('./index.html');
    if (cached) return cached;
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(DATA_CACHE);
  const cached = await cache.match(req);
  const fresh = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  if (cached) return cached;
  const res = await fresh;
  if (res) return res;
  return new Response('{"error":"offline"}', {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function cacheFirstShell(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok) {
    const cache = await caches.open(SHELL_CACHE);
    cache.put(req, res.clone());
  }
  return res;
}
