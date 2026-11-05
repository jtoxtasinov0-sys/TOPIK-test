// HanUstoz service worker: ilova tez ochilishi va internet uzilganda ham ishlashi uchun.
// - /_next/static, rasmlar va ikonkalar: keshdan (o'zgarmaydi)
// - Gemini rasmlari (/api/image): alohida keshda, yangi versiyada ham o'chirilmaydi — har deploydan keyin qayta yuklanmaydi
// - sahifalar: avval internetdan, bo'lmasa keshdan, u ham bo'lmasa — «Internet yo'q» sahifasi
// - API so'rovlari (AI, login, sinxron): keshlanmaydi
// Yangi versiya: VERSION ni oshiring — eski kesh o'chiriladi (IMAGES dan tashqari).

const VERSION = "hq-v6";
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const IMAGES = "hq-images-v1";
const MAX_PAGES = 40;
const MAX_STATIC = 300;
const MAX_IMAGES = 700;

const OFFLINE_HTML = `<!doctype html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Internet yo'q · HanUstoz</title><style>
body{margin:0;min-height:100dvh;display:grid;place-items:center;font-family:system-ui,-apple-system,sans-serif;background:#f4f1ff;color:#160f3b;text-align:center;padding:24px}
.c{max-width:360px}.i{width:96px;height:96px;border-radius:22px;margin:0 auto 18px;display:block}
button{margin-top:18px;border:0;border-radius:999px;padding:12px 22px;font-weight:700;font-size:16px;color:#fff;background:linear-gradient(135deg,#8b3dff,#3a86ff)}
p{color:#5b5677;line-height:1.5}</style></head><body><div class="c"><img class="i" src="/brand/logo-mark.svg" alt="HanUstoz"><h1>Internet yo'q</h1>
<p>Ulanishni tekshiring. Oldin ochilgan sahifalar (darslar, so'zlar, testlar) internetsiz ham ishlaydi.</p>
<button onclick="location.reload()">Qayta urinish</button></div></body></html>`;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(PAGES)
      .then((c) => c.addAll(["/", "/brand/logo-mark.svg"]))
      .catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (!key.startsWith(VERSION) && key !== IMAGES) await caches.delete(key);
      await self.clients.claim();
    })()
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

function isStatic(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/api/app-icon" ||
    /\.(?:svg|png|jpg|jpeg|webp|ico|woff2?)$/.test(url.pathname)
  );
}

async function cacheFirst(request, name, max) {
  const cache = await caches.open(name);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  // Zaxira ikonka va xatolar keshlanmaydi — keyin haqiqiy rasm olinadi
  if (res.ok && !res.headers.get("X-Icon-Fallback")) {
    cache.put(request, res.clone()).then(() => trim(name, max)).catch(() => {});
  }
  return res;
}

async function networkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(request);
    if (res.ok && res.type === "basic") {
      cache.put(request, res.clone()).then(() => trim(PAGES, MAX_PAGES)).catch(() => {});
    }
    return res;
  } catch {
    // Boshqa sahifaning HTML'ini bermaymiz (Next yo'nalishi chalkashadi) — faqat aynan shu sahifa yoki «Internet yo'q»
    const hit = await cache.match(request, { ignoreSearch: true });
    return hit || new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/api/image") {
    event.respondWith(cacheFirst(request, IMAGES, MAX_IMAGES));
    return;
  }
  if (isStatic(url)) {
    event.respondWith(cacheFirst(request, STATIC, MAX_STATIC));
    return;
  }
  if (request.mode === "navigate" && !url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
  }
});
