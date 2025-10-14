/* FILE:/sw.js */
/* MXD-CHECK v2025-10-06 [sw]
- VERSION bump mỗi lần sửa (định dạng YYYY-MM-DD-<tag>)
- HTML: network-first (+ navigationPreload); fallback offlinePage
- Assets same-origin: stale-while-revalidate; tránh precache 404
- Bỏ qua sitemap .xml, robots.txt để bot luôn lấy from network
- BYPASS analytics/affiliate domains; không can thiệp
- JSON động (/assets/data/*.json, /products.json): network-first (no-store)
- /sw-version phục vụ kiểm tra phiên bản
FIND: MXD-CHECK v2025-10-06 [sw]
*/

// sw.js — MXD PWA (2025-10-08)
const VERSION = '2025-10-14-06'; // BUMP


const CACHE_PREFIX = 'mxd';
const CACHE = `${CACHE_PREFIX}-${VERSION}`;

// ---- Precache (nhẹ) ----
const ASSETS = [
  '/', '/index.html', '/store.html', '/g.html',
  // Tool đúng chuẩn MXD hiện dùng:
  '/tools/mxd-importerv1.html',
  // CSS & JS nền tảng:
  '/assets/site.css',
  '/assets/js/render-products.js',
  // Affiliate & GA4:
  '/assets/mxd-affiliate.js',
  '/assets/analytics.js',
  // Ảnh placeholder
  '/assets/img/products/placeholder.webp'
];

// Chuẩn hoá URL same-origin (bỏ query) để ổn định key cache
const normalize = (input) => {
  const u = typeof input === 'string'
    ? new URL(input, self.location.origin)
    : new URL(input.url, self.location.origin);
  return u.origin === self.location.origin ? u.pathname : u.href;
};

// Offline page gọn
const offlinePage = () => new Response(
  `<!doctype html><meta charset="utf-8"><title>MXD – Offline</title>
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
    await Promise.all(ASSETS.map(u => c.add(u).catch(() => {}))); // bỏ qua asset lỗi (tránh fail toàn bộ)
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE).map(k => caches.delete(k))
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

// === Runtime cache ảnh qua Worker (/img) — TTL 1 ngày (SWR) ===
const ONE_DAY = 24 * 60 * 60 * 1000;
function imgCacheKey(u) {
  const raw = new URL(u);
  const qs = new URLSearchParams(raw.search);
  const target = qs.get('url') || '';
  return `${raw.origin}${raw.pathname}?url=${target}`;
}
async function cachePutWithStamp(cache, keyReq, res) {
  const buf = await res.clone().arrayBuffer();        // clone TRƯỚC khi đọc
  const headers = new Headers(res.headers);
  headers.set('x-sw-cached-at', Date.now().toString());
  const stamped = new Response(buf, { status: res.status, statusText: res.statusText, headers });
  await cache.put(keyReq, stamped.clone());
  return stamped;
}

// ==== Domains bỏ qua (analytics / affiliate / mxh) ====
const BYPASS_HOSTS = new Set([
  'www.googletagmanager.com','googletagmanager.com',
  'www.google-analytics.com','google-analytics.com',
  'analytics.google.com','g.doubleclick.net',
  'go.isclix.com',
  'shopee.vn','cf.shopee.vn','s.shopee.vn',
  'lazada.vn','s.lazada.vn','pages.lazada.vn',
  'tiki.vn','api.tiki.vn',
  'facebook.com','www.facebook.com','m.me','zalo.me'
]);

const isDynamicJSON = (u) =>
  (u.origin === self.location.origin) && (
    (u.pathname.startsWith('/assets/data/') && u.pathname.endsWith('.json')) ||
    u.pathname === '/products.json'
  );

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // ✅ BỎ QUA sitemap & robots: để trình duyệt/bot lấy trực tiếp từ network
  if (url.pathname.endsWith('.xml') || url.pathname === '/robots.txt') {
    return; // không respondWith => SW không can thiệp
  }

  // Phiên bản nhanh để kiểm tra
  if (url.pathname === '/sw-version') {
    event.respondWith(new Response(VERSION, { headers: {'content-type':'text/plain'} }));
    return;
  }

  // bypass ngoại lệ
  if (BYPASS_HOSTS.has(url.hostname)) return;

  // Ảnh qua Worker *.workers.dev/*/img → TTL 1d
  const isWorkerImg = /workers\.dev$/i.test(url.hostname) && url.pathname.endsWith('/img');
  if (isWorkerImg) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const key = imgCacheKey(req.url);
      const keyReq = new Request(key, { method: 'GET', mode: 'no-cors' });

      const cached = await cache.match(keyReq);
      if (cached) {
        const ts = parseInt(cached.headers.get('x-sw-cached-at') || '0', 10);
        const fresh = ts && (Date.now() - ts) < ONE_DAY;
        if (fresh) return cached;
        event.waitUntil((async () => {
          try {
            const net = await fetch(req, { cache: 'no-store' });
            if (net && net.ok) await cachePutWithStamp(cache, keyReq, net);
          } catch {}
        })());
        return cached;
      }
      try {
        const net = await fetch(req, { cache: 'no-store' });
        if (net && net.ok) return await cachePutWithStamp(cache, keyReq, net);
        return net;
      } catch {
        return new Response('', { status: 504 });
      }
    })());
    return;
  }

  // JSON động → network-first (no-store)
  if (isDynamicJSON(url)) {
    event.respondWith(fetch(req, { cache: 'no-store' }).catch(() => caches.match(req)));
    return;
  }

  // HTML (điều hướng) → network-first + preload
  const isHTMLNav = req.mode === 'navigate' ||
                    (req.headers.get('accept') || '').includes('text/html');
  if (isHTMLNav) {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) {
          const copy = preload.clone(); // clone TRƯỚC khi trả về để tránh "body used"
          event.waitUntil(caches.open(CACHE).then(c => c.put(normalize(req), copy)));
          return preload;
        }
        const res = await fetch(req, { cache: 'no-store' });
        if (res && res.ok) {
          const copy = res.clone();
          event.waitUntil(caches.open(CACHE).then(c => c.put(normalize(req), copy)));
        }
        return res;
      } catch {
        return (await caches.match(normalize(req), { ignoreSearch: true })) ||
               (await caches.match('/', { ignoreSearch: true })) ||
               offlinePage();
      }
    })());
    return;
  }

  // Assets tĩnh same-origin → stale-while-revalidate
  const isStatic =
    url.origin === self.location.origin && (
      url.pathname.startsWith('/assets/') ||
      /\.(css|js|webp|png|jpg|jpeg|svg|woff2)$/.test(url.pathname)
    );
  if (isStatic) {
    event.respondWith((async () => {
      const cached = await caches.match(req, { ignoreSearch: true });
      const revalidate = fetch(req).then(async (res) => {
        if (res && res.ok) {
          const c = await caches.open(CACHE);
          const copy1 = res.clone();
          await c.put(req, copy1);
          const normKey = normalize(req);
          if (normKey !== req.url) {
            const copy2 = res.clone();
            await c.put(normKey, copy2);
          }
        }
        return res;
      }).catch(() => null);
      return cached || (await revalidate) || new Response('', { status: 504 });
    })());
    return;
  }

  // Khác origin → network-first; offline → cache (nếu có)
  event.respondWith((async () => {
    try { return await fetch(req); }
    catch {
      const hit = await caches.match(req, { ignoreSearch: true });
      return hit || new Response('', { status: 504 });
    }
  })());
});
/* /FILE */
