// Service Worker para GBR OS — cache offline + background sync
const CACHE_NAME = "gbr-os-v2";
const STATIC_ASSETS = ["/", "/chamado", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API calls: network-first, fallback to cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Static pages: stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
        return response;
      });
      return cached || fetchPromise;
    })
  );
});

// Background sync for offline OS creation
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-chamado") {
    event.waitUntil(syncPendingChamados());
  }
});

async function syncPendingChamados() {
  // Read pending chamados from IndexedDB and POST them
  try {
    const db = await openIDB();
    const tx = db.transaction("pending_chamados", "readwrite");
    const store = tx.objectStore("pending_chamados");
    const all = await store.getAll();
    for (const chamado of all) {
      try {
        const res = await fetch("/api/public/os", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(chamado),
        });
        if (res.ok) {
          store.delete(chamado.id);
        }
      } catch {}
    }
  } catch {}
}

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("gbr_os_offline", 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("pending_chamados", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
