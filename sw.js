// sw.js — MXD PWA v5
const VERSION = 'v5';
const CACHE_PREFIX = 'mxd';
const CACHE = `${CACHE_PREFIX}-${VERSION}`;

// Liệt kê file tĩnh cốt lõi. DÙNG ĐƯỜNG DẪN KHÔNG query.
// (Fetcher sẽ tự chuẩn hóa để khớp cả khi HTML dùng ?v=1)
const ASSETS = [
  '/',                   // shell trang chủ
  '/offline.html',       // trang offline riêng (nhớ tạo file)
  '/assets/site.css',
  '/assets/mxd-affiliate.js',
  '/assets/analytics.js'
];

// Chuẩn hoá URL: bỏ query cho tài nguyên same-origin để tránh lệch key
const normalize = (input) => {
  const u = typeof input === 'string' ? new URL(input, location.origin) : new URL(input.url);
  return u.origin === location.origin ? u.pathname : u.href;
};

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting()) // kích hoạt SW mới ngay
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Cho phép client gửi message để skipWaiting thủ công (tuỳ chọn)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;

  // Endpoint debug nhanh: /sw-version trả về version
  if (new URL(req.url).pathname === '/sw-version') {
    e.respondWith(new Response(VERSION, { headers: {'content-type': 'text/plain'} }));
    return;
  }

  // Chỉ xử lý GET
  if (req.method !== 'GET') return;

  // Điều hướng trang: network-first, rớt mạng → offline.html
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          // lưu shell '/' để có khung khi offline
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }

  const url = new URL(req.url);

  // Tài nguyên cùng origin: stale-while-revalidate + normalize key
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then((cached) => {
        // thử thêm khóa đã chuẩn hoá (bỏ query)
        const tryNormalized = cached ? Promise.resolve(cached) : caches.match(normalize(req));

        return tryNormalized.then((hit) => {
          const fetchPromise = fetch(req)
            .then((res) => {
              const cpy = res.clone();
              caches.open(CACHE).then((c) => {
                c.put(req, cpy);
                // Lưu thêm bản normalized nếu khác key
                const normKey = normalize(req);
                if (normKey !== req.url) c.put(normKey, res.clone());
              });
              return res;
            })
            .catch(() => null);

          return hit || fetchPromise || caches.match('/offline.html');
        });
      })
    );
    return;
  }

  // Ngoài domain: network-first, rớt → trả cache (nếu có)
  e.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
