const CACHE = "louvores-cifras-v3";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./louvores.json",
  "./cifras.json",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

async function networkFirst(req) {
  try {
    const fresh = await fetch(req);
    const cache = await caches.open(CACHE);
    cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await caches.match(req);
    return cached || caches.match("./index.html");
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;

  try {
    const fresh = await fetch(req);
    const cache = await caches.open(CACHE);
    cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    // fallback "não explode" (útil no dev local)
    return new Response("", { status: 204 });
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // só GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // só mesmo domínio
  if (url.origin !== location.origin) return;

  // ✅ ignora favicon (Live Server costuma falhar/estranhar isso)
  if (url.pathname.endsWith("/favicon.ico")) return;

  // HTML: sempre tenta rede primeiro
  const isHTML =
    req.mode === "navigate" ||
    url.pathname.endsWith("/index.html") ||
    url.pathname === "/" ||
    url.pathname.endsWith("/");

  event.respondWith(isHTML ? networkFirst(req) : cacheFirst(req));
});
