// sw.js
const CACHE = "mxd-v4"; // bump version để re-cache

// Tự tính base path cho GitHub Pages (vd: "" hoặc "/ten-repo")
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const A = p => `${BASE}${p}`;

// Precache các tài nguyên quan trọng
const ASSETS = [
  A("/"),
  A("/index.html"),
  A("/store.html"),
  A("/blog.html"),
  A("/tu-van.html"),
  A("/lien-he.html"),
  A("/offline.html"),

  // Data & static
  A("/products.json"),
  A("/assets/css/styles.css"),        // ✅ đúng đường dẫn CSS
  A("/assets/js/floating-contact.js"),
  A("/mxd-affiliate.js"),             // ✅ đúng vị trí file affiliate (gốc site)
  A("/logo.png")                      // nếu có
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Chiến lược:
// - Điều hướng (HTML): network-first → nếu lỗi → thử cache trang cũ → offline.html
// - Static (CSS/JS/IMG/JSON): cache-first + ghi đệm động
self.addEventListener("fetch", e => {
  const req = e.request;

  // Bỏ qua non-GET cho an toàn
  if (req.method !== "GET") return;

  // 1) Điều hướng (HTML)
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(resp => {
        // Lưu đệm bản copy để lần sau offline còn xem lại
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return resp;
      }).catch(async () => {
        // Thử trang đã cache trước khi rơi về offline.html
        const cached = await caches.match(req);
        return cached || caches.match(A("/offline.html"));
      })
    );
    return;
  }

  // 2) Tài nguyên tĩnh: cache-first + ghi đệm động
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return resp;
      }).catch(() => {
        // Tùy chọn: có thể trả về gì đó nếu cần (vd: ảnh placeholder)
      });
    })
  );
});
