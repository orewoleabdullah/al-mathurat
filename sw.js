const CACHE_NAME = "al-mathurat-v3";
const APP_FILES = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./fonts/amiri-arabic.woff2",
  "./fonts/amiri-arabic-bold.woff2",
  "./fonts/inter-latin.woff2",
  "./fonts/newsreader-latin.woff2",
  "./js/app.js",
  "./js/ui.js",
  "./js/storage.js",
  "./js/counter.js",
  "./data/mathurat.json",
  "./manifest.webmanifest",
  "./icons/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(APP_FILES.map((path) => new URL(path, self.registration.scope)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate") return caches.match(new URL("./", self.registration.scope));
        return Response.error();
      })
  );
});
