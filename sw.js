const CACHE = "mxd-v2";

// Tự tính base path cho GitHub Pages (vd: "" hoặc "/ten-repo")
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const A = p => `${BASE}${p}`;

// Tập file cần có sẵn trong cache ngay khi cài
const ASSETS = [
  A("/"),
  A("/offline.html"),
  A("/assets/site.css"),
  A("/assets/mxd-affiliate.js")
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Xoá cache cũ khi kích hoạt SW mới
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Chiến lược:
// - Với điều hướng (HTML pages): network-first → nếu lỗi → offline.html
// - Với tài nguyên tĩnh/ảnh/js/css: cache-first + ghi đệm động
self.addEventListener("fetch", e => {
  const req = e.request;

  // 1) Điều hướng trang (HTML)
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(resp => {
        // Lưu đệm bản copy để tăng cơ hội xem lại
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return resp;
      }).catch(() => caches.match(A("/offline.html")))
    );
    return;
  }

  // 2) Tài nguyên khác (CSS/JS/IMG…): cache-first + ghi đệm động
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return resp;
      });
    })
  );
});
