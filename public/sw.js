const CACHE_NAME = "husaini-mohallah-v2";
const APP_SHELL = ["/", "/manifest.webmanifest", "/favicon.svg", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Static, cacheable build output — hashed JS/CSS bundles, fonts, images.
function isStaticAsset(url) {
  return /\.(js|css|woff2?|ttf|svg|png|jpg|jpeg|webp|ico)$/i.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only manage same-origin GET requests. Cross-origin calls (Supabase REST
  // API, storage, fonts CDN) must always hit the network — caching those
  // here would silently serve stale community data or third-party assets.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // SPA navigations: try the network first (fresh app shell + latest deploy),
  // fall back to the cached shell so the app still opens offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  // Static build assets: stale-while-revalidate — respond from cache
  // instantly when available, refresh the cache in the background.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(req).then((cached) => {
          const network = fetch(req)
            .then((response) => {
              if (response && response.ok) cache.put(req, response.clone());
              return response;
            })
            .catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }

  // Everything else same-origin: network-first with cache fallback.
  event.respondWith(
    fetch(req)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return response;
      })
      .catch(() => caches.match(req))
  );
});
