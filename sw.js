// NEXORA — minimal service worker
// Caches the app shell (HTML/CSS/JS/icons) so the app opens instantly and
// still shows something if the connection drops. Product/category data
// always comes fresh from Supabase — this never caches API responses.

const CACHE_NAME = "nexora-shell-v1";
const SHELL_FILES = [
  "index.html",
  "category.html",
  "product.html",
  "cart.html",
  "account.html",
  "profile.html",
  "settings.html",
  "faq.html",
  "shipping-returns.html",
  "terms.html",
  "privacy.html",
  "css/style.css",
  "css/account.css",
  "js/config.js",
  "js/supabaseClient.js",
  "js/cart.js",
  "js/main.js",
  "manifest.json",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Never cache Supabase API/auth/storage calls — always live data.
  if (url.hostname.includes("supabase.co")) return;
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          if (res && res.ok && url.origin === location.origin) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
