// Service worker: fa funzionare l'app anche senza rete.
// Quando modifichi index.html, aumenta il numero di versione qui sotto.
const VERSIONE = "turni-v1";
const FILE_APP = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png"
];
const LIBRERIE_PDF = [
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js"
];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSIONE);
    await cache.addAll(FILE_APP);
    // le librerie PDF: se non si scaricano adesso, verranno salvate al primo uso
    await Promise.all(LIBRERIE_PDF.map(u => cache.add(new Request(u, { mode: "no-cors" })).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSIONE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  // Pagina: prima la rete (così vedi subito gli aggiornamenti), se manca la rete usa la copia salvata
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const r = await fetch(req);
        (await caches.open(VERSIONE)).put("./index.html", r.clone());
        return r;
      } catch {
        return (await caches.match("./index.html")) || (await caches.match("./"));
      }
    })());
    return;
  }

  // Tutto il resto (icone, librerie PDF): prima la copia salvata, poi la rete
  e.respondWith((async () => {
    const salvato = await caches.match(req);
    if (salvato) return salvato;
    const r = await fetch(req);
    if (r && (r.ok || r.type === "opaque")) (await caches.open(VERSIONE)).put(req, r.clone());
    return r;
  })());
});
