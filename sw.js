// sw.js â€” MXD PWA v28
const VERSION = 'v29';
const CACHE_PREFIX = 'mxd';
const CACHE = `${CACHE_PREFIX}-${VERSION}`;

// ---- Precache (nháº¹) ----
// LÆ¯U Ã: KHÃ”NG thÃªm /assets/data/affiliates.json vÃ o precache
const ASSETS = [
  '/',                  // shell trang chá»§
  '/store.html',        // precache trang store (náº¿u cÃ³)
  '/assets/site.css',
  '/assets/mxd-affiliate.js',
  '/assets/analytics.js',
];

// Chuáº©n hoÃ¡ URL same-origin (bá» query) Ä‘á»ƒ á»•n Ä‘á»‹nh key cache
const normalize = (input) => {
  const u = typeof input === 'string'
    ? new URL(input, location.origin)
    : new URL(input.url);
  return u.origin === location.origin ? u.pathname : u.href;
};

// Trang offline ná»™i tuyáº¿n
const offlinePage = () => new Response(
  `<!doctype html><meta charset="utf-8">
   <title>MXD â€“ Offline</title>
   <main style="max-width:640px;margin:20vh auto;font:16px/1.6 system-ui;text-align:center">
     <h1>KhÃ´ng cÃ³ máº¡ng</h1>
     <p>Vui lÃ²ng káº¿t ná»‘i Internet Ä‘á»ƒ tiáº¿p tá»¥c.</p>
     <p><a href="/" rel="nofollow">Vá» trang chá»§</a> Â· <a href="/store.html">VÃ o cá»­a hÃ ng</a></p>
   </main>`,
  { headers: {'content-type':'text/html; charset=utf-8'} }
);

// ---- Install / Activate ----
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(ASSETS.map(u => c.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE)
          .map(k => caches.delete(k))
    );
    if ('navigationPreload' in self.registration) {
      try { await self.registration.navigationPreload.enable(); } catch {}
    }
    await self.clients.claim();
  })());
});

// Cho phÃ©p SKIP_WAITING thá»§ cÃ´ng
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// ---- Fetch ----
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // /sw-version â†’ xem phiÃªn báº£n
  if (url.pathname === '/sw-version') {
    e.respondWith(new Response(VERSION, { headers: {'content-type':'text/plain'} }));
    return;
  }

  // KhÃ´ng can thiá»‡p Analytics + Affiliate + MXH (trÃ¡nh áº£nh hÆ°á»Ÿng redirect/conversion)
  const BYPASS_HOSTS = new Set([
    // Analytics
    'www.googletagmanager.com','googletagmanager.com',
    'www.google-analytics.com','google-analytics.com',
    'analytics.google.com','g.doubleclick.net',
    // Affiliate / TMÄT
    'go.isclix.com',
    'shopee.vn','cf.shopee.vn','s.shopee.vn',
    'lazada.vn','s.lazada.vn','pages.lazada.vn',
    'tiki.vn','api.tiki.vn',
    // MXH
    'facebook.com','www.facebook.com','m.me','zalo.me'
  ]);
  if (BYPASS_HOSTS.has(url.hostname)) return;

  // Äáº¶C BIá»†T: JSON dá»¯ liá»‡u Ä‘á»™ng â†’ always network-first, khÃ´ng cache
  if (url.origin === location.origin &&
      url.pathname.startsWith('/assets/data/') &&
      url.pathname.endsWith('.json')) {
    e.respondWith(fetch(req, { cache: 'no-store' }).catch(() => caches.match(req)));
    return;
  }

  // Äiá»u hÆ°á»›ng HTML?
  const isHTMLNav = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  // 1) HTML â†’ network-first (+ preload); lá»—i máº¡ng â†’ cache theo trang, rá»“i '/', cuá»‘i cÃ¹ng offlinePage()
  if (isHTMLNav) {
    e.respondWith((async () => {
      try {
        const preload = await e.preloadResponse;
        if (preload) {
          if (preload.ok) {
            const key = normalize(req);
            caches.open(CACHE).then(c => c.put(key, preload.clone()));
          }
          return preload;
        }
        const res = await fetch(req, { cache: 'no-store' });
        if (res && res.ok) {
          const key = normalize(req);
          caches.open(CACHE).then(c => c.put(key, res.clone()));
        }
        return res;
      } catch {
        return (await caches.match(normalize(req), { ignoreSearch: true }))
            || (await caches.match('/', { ignoreSearch: true }))
            || offlinePage();
      }
    })());
    return;
  }

  // 2) Static same-origin â†’ stale-while-revalidate
  const isStatic =
    url.origin === location.origin && (
      url.pathname.startsWith('/assets/') ||
      /\.(css|js|webp|png|jpg|jpeg|svg|woff2)$/.test(url.pathname)
    );

  if (isStatic) {
    e.respondWith((async () => {
      const cached = await caches.match(req, { ignoreSearch: true });
      const revalidate = fetch(req).then(async (res) => {
        if (res && res.ok) {
          const c = await caches.open(CACHE);
          await c.put(req, res.clone());
          const normKey = normalize(req);
          if (normKey !== req.url) await c.put(normKey, res.clone());
        }
        return res;
      }).catch(() => null);
      return cached || (await revalidate) || new Response('', { status: 504 });
    })());
    return;
  }

  // 3) KhÃ¡c origin â†’ network-first; rá»›t máº¡ng â†’ cache (náº¿u cÃ³)
  e.respondWith((async () => {
    try { return await fetch(req); }
    catch {
      const hit = await caches.match(req, { ignoreSearch: true });
      return hit || new Response('', { status: 504 });
    }
  })());
});

