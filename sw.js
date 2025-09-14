// sw.js — MXD PWA (user site: mxd210.github.io)
const CACHE = 'mxd-v2-20250914'; // ❗ mỗi lần đổi ASSETS/logic, tăng version
const ASSETS = [
  '/',                 // pre-cache trang chủ
  '/index.html',
  '/assets/site.css',
  '/assets/mxd-affiliate.js',
  // có thể thêm: '/store.html', icon/ảnh/logo/manifest...
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS))
  );
  self.skipWaiting(); // kích hoạt bản mới ngay khi cài
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim(); // kiểm soát tất cả tab ngay
});

self.addEventListener('fetch', (e) => {
  // Chỉ xử lý GET
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Không can thiệp Analytics/Tag Manager để số liệu chuẩn
  if (url.hostname.includes('googletagmanager.com') ||
      url.hostname.includes('google-analytics.com')) {
    return; // để trình duyệt tự fetch
  }

  // Chiến lược cho HTML (điều hướng): NETWORK-FIRST để không dính bản cũ sau commit
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then((resp) => {
        // Lưu bản mới vào cache (nếu hợp lệ)
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return resp;
      }).catch(async () => {
        // offline → trả bản cache nếu có, không thì trả trang chủ
        return (await caches.match(e.request)) || caches.match('/');
      })
    );
    return;
  }

  // Với tài nguyên tĩnh: CACHE-FIRST + backfill khi cache miss
  if (e.request.method === 'GET') {
    // Chỉ cache same-origin để tránh rác từ domain khác
    const sameOrigin = url.origin === self.location.origin;

    e.respondWith(
      caches.match(e.request).then((hit) => {
        if (hit) return hit;
        return fetch(e.request).then((resp) => {
          // Chỉ cache response OK và có thể lưu
          const ok = resp && resp.status === 200 && (resp.type === 'basic' || resp.type === 'cors');
          if (ok && sameOrigin) {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return resp;
        }).catch(() => {
          // offline + không có cache → thôi, để lỗi tự nhiên (hoặc bạn có thể trả fallback ảnh/css tuỳ ý)
          return caches.match(e.request); // cố nốt lần nữa
        });
      })
    );
  }
});
