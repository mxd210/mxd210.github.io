// sw.js — MXD PWA v28
const VERSION = 'v28';
const CACHE_PREFIX = 'mxd';
const CACHE = `${CACHE_PREFIX}-${VERSION}`;

// ---- Precache (nhẹ) ----
// LƯU Ý: KHÔNG thêm /assets/data/affiliates.json vào precache
const ASSETS = [
  '/',                  // shell trang chủ
  '/store.html',        // precache trang store (nếu có)
  '/assets/site.css',
  '/assets/mxd-affiliate.js',
  '/assets/analytics.js',
];

// Chuẩn hoá URL same-origin (bỏ query) để ổn định key cache
const normalize = (input) => {
  const u = typeof input === 'string'
    ? new URL(input, location.origin)
    : new URL(input.url);
  return u.origin === location.origin ? u.pathname : u.href;
};

// Trang offline nội tuyến
const offlinePage = () => new Response(
  `<!doctype html><meta charset="utf-8">
   <title>MXD – Offline</title>
   <main style="max-width:640px;margin:20vh auto;font:16px/1.6 system-ui;text-align:center">
     <h1>Không có mạng</h1>
     <p>Vui lòng kết nối Internet để tiếp tục.</p>
     <p><a href="/" rel="nofollow">Về trang chủ</a> · <a href="/store.html">Vào cửa hàng</a></p>
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

// Cho phép SKIP_WAITING thủ công
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// ---- Fetch ----
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // /sw-version → xem phiên bản
  if (url.pathname === '/sw-version') {
    e.respondWith(new Response(VERSION, { headers: {'content-type':'text/plain'} }));
    return;
  }

  // Không can thiệp Analytics + Affiliate + MXH (tránh ảnh hưởng redirect/conversion)
  const BYPASS_HOSTS = new Set([
    // Analytics
    'www.googletagmanager.com','googletagmanager.com',
    'www.google-analytics.com','google-analytics.com',
    'analytics.google.com','g.doubleclick.net',
    // Affiliate / TMĐT
    'go.isclix.com',
    'shopee.vn','cf.shopee.vn','s.shopee.vn',
    'lazada.vn','s.lazada.vn','pages.lazada.vn',
    'tiki.vn','api.tiki.vn',
    // MXH
    'facebook.com','www.facebook.com','m.me','zalo.me'
  ]);
  if (BYPASS_HOSTS.has(url.hostname)) return;

  // ĐẶC BIỆT: JSON dữ liệu động → always network-first, không cache
  if (url.origin === location.origin &&
      url.pathname.startsWith('/assets/data/') &&
      url.pathname.endsWith('.json')) {
    e.respondWith(fetch(req, { cache: 'no-store' }).catch(() => caches.match(req)));
    return;
  }

  // Điều hướng HTML?
  const isHTMLNav = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  // 1) HTML → network-first (+ preload); lỗi mạng → cache theo trang, rồi '/', cuối cùng offlinePage()
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

  // 2) Static same-origin → stale-while-revalidate
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

  // 3) Khác origin → network-first; rớt mạng → cache (nếu có)
  e.respondWith((async () => {
    try { return await fetch(req); }
    catch {
      const hit = await caches.match(req, { ignoreSearch: true });
      return hit || new Response('', { status: 504 });
    }
  })());
});
