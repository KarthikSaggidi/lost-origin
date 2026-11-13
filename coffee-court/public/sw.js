const CACHE = "lost-origin-shell-v11";
self.addEventListener("install", (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll([
          "/",
          "/favicon.svg",
          "/manifest.webmanifest",
          "/lost-origin-logo.svg",
        ]),
      )
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("message", (event) => {
  if (event.data?.type === "CACHE_ASSETS")
    event.waitUntil(
      caches.open(CACHE).then((cache) =>
        Promise.allSettled(
          event.data.urls
            .filter((url) => {
              const u = new URL(url, self.location.origin);
              return (
                u.origin === self.location.origin &&
                !u.pathname.startsWith("/api/") &&
                !u.pathname.includes("signin")
              );
            })
            .map((url) => cache.add(url)),
        ),
      ),
    );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.includes("signin") ||
    url.pathname.includes("signout")
  )
    return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/")));
    return;
  }
  if (/\.(js|css|jpg|png|svg|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              void caches
                .open(CACHE)
                .then((cache) => cache.put(event.request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
