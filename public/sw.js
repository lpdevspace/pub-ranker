// ─────────────────────────────────────────────────────────────────────────────
// Pub Ranker — Service Worker
// Strategy overview:
//   • App shell (index.html + hashed assets)  → Cache-first (precache)
//   • /assets/**  (JS/CSS chunks from Vite)   → Cache-first (stale-while-revalidate)
//   • Google Fonts / Fontshare                → Cache-first, 1-year TTL
//   • Firebase REST / Firestore API calls     → Network-first (live data)
//   • OpenWeatherMap / OSM tiles              → Stale-while-revalidate
//   • Everything else                         → Network-first, offline fallback
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_VERSION = 'v1';
const APP_SHELL_CACHE   = `pub-ranker-shell-${CACHE_VERSION}`;
const ASSET_CACHE       = `pub-ranker-assets-${CACHE_VERSION}`;
const FONT_CACHE        = `pub-ranker-fonts-${CACHE_VERSION}`;
const RUNTIME_CACHE     = `pub-ranker-runtime-${CACHE_VERSION}`;
const IMAGE_CACHE       = `pub-ranker-images-${CACHE_VERSION}`;

const ALL_CACHES = [
  APP_SHELL_CACHE,
  ASSET_CACHE,
  FONT_CACHE,
  RUNTIME_CACHE,
  IMAGE_CACHE,
];

// App shell resources — always available offline
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/favicon.svg',
  '/icons.svg',
];

// ── Install: precache the app shell ─────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) =>
      cache.addAll(APP_SHELL_URLS)
    ).then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ───────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !ALL_CACHES.includes(key))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Cache-first: serve from cache, fall back to network and cache the response. */
async function cacheFirst(request, cacheName, { ttlSeconds } = {}) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    // Check TTL if provided
    if (ttlSeconds) {
      const dateHeader = cached.headers.get('sw-cached-at');
      if (dateHeader) {
        const age = (Date.now() - Number(dateHeader)) / 1000;
        if (age > ttlSeconds) {
          // Stale — fetch fresh in background but return stale now
          fetchAndCache(request, cacheName).catch(() => {});
          return cached;
        }
      }
    }
    return cached;
  }

  return fetchAndCache(request, cacheName);
}

/** Fetch, stamp with a cached-at header, and store in cache. */
async function fetchAndCache(request, cacheName) {
  const cache = await caches.open(cacheName);
  const networkResponse = await fetch(request);

  if (networkResponse.ok) {
    // Clone and inject timestamp header for TTL tracking
    const headers = new Headers(networkResponse.headers);
    headers.set('sw-cached-at', String(Date.now()));
    const timestamped = new Response(await networkResponse.clone().arrayBuffer(), {
      status: networkResponse.status,
      statusText: networkResponse.statusText,
      headers,
    });
    cache.put(request, timestamped);
  }

  return networkResponse;
}

/** Network-first: try network, fall back to cache, then offline page. */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;

    // For navigation requests, serve the offline fallback
    if (request.mode === 'navigate') {
      const offlineCache = await caches.open(APP_SHELL_CACHE);
      return offlineCache.match('/offline.html') || new Response('Offline', { status: 503 });
    }

    return new Response('Network error', { status: 503 });
  }
}

/** Stale-while-revalidate: serve from cache immediately, update in background. */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Revalidate in background regardless
  const networkFetch = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached || networkFetch;
}

// ── Fetch routing ─────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and chrome-extension requests
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;
  // Skip Firebase WebSocket (Firestore realtime)
  if (url.protocol === 'wss:') return;

  // ── 1. Vite hashed assets (/assets/xxx.hash.js|css) — cache-first ──────────
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  // ── 2. App shell (navigations + local static files) ──────────────────────
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, APP_SHELL_CACHE));
    return;
  }

  // ── 3. Fonts — cache-first with 1-year TTL ────────────────────────────────
  if (
    url.hostname === 'cdn.fontshare.com' ||
    url.hostname === 'api.fontshare.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    url.hostname === 'fonts.googleapis.com'
  ) {
    event.respondWith(cacheFirst(request, FONT_CACHE, { ttlSeconds: 365 * 24 * 3600 }));
    return;
  }

  // ── 4. Firebase / Firestore / Auth — network-first (must stay live) ───────
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('firebasestorage') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('securetoken.google')
  ) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  // ── 5. Map tiles (OpenStreetMap) — stale-while-revalidate ─────────────────
  if (
    url.hostname.includes('tile.openstreetmap.org') ||
    url.hostname.includes('openweathermap.org')
  ) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  // ── 6. Google Maps API scripts — network-first ────────────────────────────
  if (url.hostname.includes('maps.googleapis.com')) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  // ── 7. Google profile images / pub photos — stale-while-revalidate ────────
  if (
    url.hostname.includes('googleusercontent.com') ||
    url.hostname.includes('ggpht.com') ||
    url.hostname.includes('gstatic.com')
  ) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  // ── 8. Same-origin requests (favicon, icons, etc.) — network-first ────────
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request, APP_SHELL_CACHE));
    return;
  }

  // ── 9. Everything else — network-first with runtime cache ─────────────────
  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});

// ── Background sync (optional future extension point) ───────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
