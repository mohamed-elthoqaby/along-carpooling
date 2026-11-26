const CACHE_NAME = "along-v4";
const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/maplibre-gl-worker.mjs",
  "/maplibre-gl-shared.mjs",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Immediately bypass non-GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Immediately bypass ALL cross-origin requests (OpenFreeMap vector tiles, glyphs, sprites, OSRM)
  if (url.origin !== self.location.origin) return;

  // Immediately bypass API routes and Next.js internal/HMR assets
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) {
    return;
  }

  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
