// ═══════════════════════════════════════════════════════
//  sw.js  —  StockSense Service Worker
//  Offline support + fast loading via cache
// ═══════════════════════════════════════════════════════

const CACHE_NAME   = "stocksense-v1";
const CACHE_STATIC = "stocksense-static-v1";

// Files to cache for offline use
const STATIC_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./config.js",
  "./app.js",
  "./api.js",
  "./gemini.js",
  "./technical.js",
  "./halal.js",
  "./charts.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  // CDN files
  "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css",
  "https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js",
];

// ── Install: cache static files ──
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => {
      return Promise.allSettled(
        STATIC_FILES.map(url => cache.add(url).catch(e => console.warn("Cache miss:", url, e)))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: remove old caches ──
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_STATIC && k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for static, network-first for APIs ──
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // API calls — always network, never cache (live data chahiye)
  const isAPICall = [
    "twelvedata.com",
    "alphavantage.co",
    "gnews.io",
    "googleapis.com",
    "generativelanguage",
  ].some(domain => url.hostname.includes(domain));

  if (isAPICall) {
    // Network only for live data
    event.respondWith(fetch(event.request).catch(() => {
      return new Response(JSON.stringify({ error: "Offline — Network nahi hai" }), {
        headers: { "Content-Type": "application/json" }
      });
    }));
    return;
  }

  // Static assets — cache first, fallback to network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache new static files
        if (response.ok && event.request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_STATIC).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback for HTML
        if (event.request.destination === "document") {
          return caches.match("./index.html");
        }
      });
    })
  );
});
