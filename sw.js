+ // sw.js — MXD PWA v10
+ const VERSION = 'v10';
const CACHE_PREFIX = 'mxd';
const CACHE = `${CACHE_PREFIX}-${VERSION}`;

// File tĩnh cốt lõi (KHÔNG query). Có thể thêm/bớt tuỳ thực tế.
const ASSETS = [
  '/',                   // shell trang chủ
  '/offline.html',       // trang offline riêng
  '/assets/site.css',
  '/assets/mxd-affiliate.js',
  '/assets/analytics.js',
  // Tuỳ chọn: precache ảnh "above-the-fold" (chỉ bật nếu file đã tồn tại)
  // '/assets/img/hero.webp',
  // '/assets/og-home.jpg',
];

// Domain Analytics: bỏ qua để không chặn GA/gtag
const GA_HOSTS = ['www.google-analytics.com','www.googletagmanager.com'];

// Chuẩn hoá URL: bỏ query cho same-origin để tránh lệch key cache
const normalize = (input) => {
  const u = typeof input === 'string'
    ? new URL(input, location.origin)
    : new URL(input.url);
  return u.origin === location.origin ? u.pathname : u.href;
};

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Xoá cache cũ
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE)
          .map((k) => caches.delete(k))
    );
    // Bật navigation preload (tăng tốc lần tải đầu)
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch {}
    }
    await self.clients.claim();
  })());
});

// Cho phép client gửi message để skipWaiting thủ công
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Endpoint debug nhanh: /sw-version → trả version
  if (url.pathname === '/sw-version') {
    e.respondWith(new Response(VERSION, { headers: {'content-type':'text/plain'} }));
    return;
  }

  // Chỉ xử lý GET
  if (req.method !== 'GET') return;

  // Không can thiệp GA/gtag để Analytics hoạt động chuẩn
  if (GA_HOSTS.includes(url.hostname)) return;

  // 1) Điều hướng HTML → network-first + preload; rớt mạng → shell hoặc offline
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        // dùng navigation preload nếu sẵn
        const preload = await e.preloadResponse;
        if (preload) {
          caches.open(CACHE).then((c) => c.put('/', preload.clone()));
          return preload;
        }
        const res = await fetch(req);
        caches.open(CACHE).then((c) => c.put('/', res.clone()));
        return res;
      } catch {
        return (await caches.match('/')) || (await caches.match('/offline.html'));
      }
    })());
    return;
  }

  // 2) Same-origin static → stale-while-revalidate + normalize key
  const isStatic = (
    url.origin === location.origin &&
    (
      url.pathname.startsWith('/assets/') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js')  ||
      url.pathname.endsWith('.webp')||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.jpeg')||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.woff2')
    )
  );

  if (isStatic) {
    e.respondWith(
      caches.match(req).then((cached) => {
        const tryNormalized = cached ? Promise.resolve(cached) : caches.match(normalize(req));
        return tryNormalized.then((hit) => {
          const fetching = fetch(req).then((res) => {
            const cpy = res.clone();
            caches.open(CACHE).then((c) => {
              c.put(req, cpy);
              const normKey = normalize(req);
              if (normKey !== req.url) c.put(normKey, res.clone());
            });
            return res;
          }).catch(() => null);
          return hit || fetching || caches.match('/offline.html');
        });
      })
    );
    return;
  }

  // 3) Khác origin → network-first; rớt mạng → dùng cache nếu có
  e.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
