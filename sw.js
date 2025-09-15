// sw.js — MXD PWA v14
const VERSION = 'v14';
const CACHE_PREFIX = 'mxd';
const CACHE = `${CACHE_PREFIX}-${VERSION}`;

const ASSETS = [
  '/',                   // shell trang chủ
  '/offline.html',       // trang offline riêng
  '/assets/site.css',
  '/assets/mxd-affiliate.js',
  '/assets/analytics.js',
  // '/assets/img/hero.webp',
  // '/assets/og-home.jpg',
];

// Chuẩn hoá URL same-origin (bỏ query) để ổn định key cache
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
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE)
          .map((k) => caches.delete(k))
    );
    // Bật Navigation Preload (tăng tốc lần đầu)
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch {}
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Endpoint debug: /sw-version → trả version
  if (url.pathname === '/sw-version') {
    e.respondWith(new Response(VERSION, { headers: {'content-type':'text/plain'} }));
    return;
  }

  // Không can thiệp các request Analytics
  const GA_HOSTS = new Set([
    'www.googletagmanager.com',
    'googletagmanager.com',
    'www.google-analytics.com',
    'google-analytics.com',
    'analytics.google.com',
    'g.doubleclick.net'
  ]);
  if (GA_HOSTS.has(url.hostname)) return;

  // Điều hướng HTML?
  const isHTMLNav = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  // 1) HTML navigate → network-first (+ navigation preload); rớt mạng → cache theo trang, rồi '/', rồi offline.html
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
        const res = await fetch(req);
        if (res && res.ok) {
          const key = normalize(req);
          caches.open(CACHE).then(c => c.put(key, res.clone()));
        }
        return res;
      } catch {
        return (await caches.match(normalize(req)))
            || (await caches.match('/'))
            || (await caches.match('/offline.html'));
      }
    })());
    return;
  }

  // 2) Same-origin static → stale-while-revalidate + normalize key
  const isStatic =
    url.origin === location.origin && (
      url.pathname.startsWith('/assets/') ||
      url.pathname.endsWith('.css')   ||
      url.pathname.endsWith('.js')    ||
      url.pathname.endsWith('.webp')  ||
      url.pathname.endsWith('.png')   ||
      url.pathname.endsWith('.jpg')   ||
      url.pathname.endsWith('.jpeg')  ||
      url.pathname.endsWith('.svg')   ||
      url.pathname.endsWith('.woff2')
    );

  if (isStatic) {
    e.respondWith(
      caches.match(req).then((cached) => {
        const tryNormalized = cached ? Promise.resolve(cached) : caches.match(normalize(req));
        return tryNormalized.then((hit) => {
          const fetching = fetch(req).then((res) => {
            if (res && res.ok) {
              const clone1 = res.clone();
              caches.open(CACHE).then((c) => {
                c.put(req, clone1);
                const normKey = normalize(req);
                if (normKey !== req.url) c.put(normKey, res.clone());
              });
            }
            return res;
          }).catch(() => null);
          return hit || fetching || caches.match('/offline.html');
        });
      })
    );
    return;
  }

  // 3) Khác origin → network-first; rớt mạng → cache nếu có
  e.respondWith(fetch(req).catch(() => caches.match(req)));
});
