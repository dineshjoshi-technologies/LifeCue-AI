/* eslint-disable no-restricted-globals */
// LifeCue AI — minimal offline service worker.
// Strategy: cache-first for static assets, network-first for navigation, network-first for /api/*.

const CACHE = "lifecue-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never intercept FCM SW or API
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname === "/firebase-messaging-sw.js") return;

  // Navigation requests: network-first, fallback to cached "/"
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/").then((r) => r || new Response("Offline", { status: 503 })))
    );
    return;
  }

  // Static: cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            if (res && res.status === 200 && res.type === "basic") {
              const clone = res.clone();
              caches.open(CACHE).then((c) => c.put(req, clone));
            }
            return res;
          })
          .catch(() => cached);
      })
    );
  }
});
