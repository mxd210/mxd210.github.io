/* MXD-DEDUPE v2025-10-14 — BẢN CUỐI
 * Gỡ trùng các block "Sản phẩm nổi bật" / hàng chip / quick-nav trên store.html & index.html.
 *   - Chạy nhiều nhịp (0ms/300ms/1s/3s/7s) để bắt kịp renderer async.
 *   - So khớp fuzzy theo heading (bỏ dấu, bỏ ký tự đặc biệt) → bắt cả biến thể “— MXD”.
 *   - So khớp theo chữ ký liên kết của hàng danh mục (nếu 2 hàng giống hệt → giữ 1).
 *   - Có MutationObserver: khi script khác chèn DOM, tự dọn ngay.
 * Một file, một lần. Không đụng GA4/affiliate.
 */
(function(){
  'use strict';
  if (window.__MXD_DEDUPE_FINAL__) return; // guard toàn cục
  window.__MXD_DEDUPE_FINAL__ = true;

  // ===== helpers =====
  const N = (s)=> (s||'')
    .toString()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'') // bỏ dấu tiếng Việt
    .replace(/[\s–—-]+/g,' ')                          // gộp khoảng trắng & gạch dài
    .replace(/[^\p{L}\p{N}\s]/gu,'')                 // bỏ ký tự đặc biệt
    .trim();

  const LABELS = [
    'san pham noi bat',
    'may moc xay dung',
    'thoi trang',
    'uu dai hom nay',
    'de xuat cho ban'
  ];
  const CAT_KEYS = [
    'san-pham-noi-bat','may-moc-xay-dung','thoi-trang',
    'thoi-trang-nam','thoi-trang-nu','thoi-trang-tre-em'
  ];

  function signatureOfCategoryRow(el){
    // Tạo chữ ký từ tập hợp link-href + text chuẩn hoá để phát hiện 2 hàng giống nhau
    const links = Array.from(el.querySelectorAll('a[href]'));
    const cats = links
      .map(a => ({h: (a.getAttribute('href')||'').toLowerCase(), t: N(a.textContent)}))
      .filter(x => CAT_KEYS.some(k => x.h.includes(k)) || LABELS.some(l => x.t.includes(l)))
      .map(x => (x.h||'') + '|' + (x.t||''));
    if (cats.length < 2) return null; // không đủ đặc trưng để xem là hàng danh mục
    return Array.from(new Set(cats)).sort().join('||');
  }

  function dedupeOnce(){
    // 1) DEDUPE theo selector cố định
    const sels = [
      '.quick-nav', '.chip-row', '.pill-row', '.filter-row',
      '#featured', '#featured-products', '.section-featured',
      '#categories-bar', '.categories-strip'
    ];
    sels.forEach(sel => {
      const nodes = Array.from(document.querySelectorAll(sel));
      if (nodes.length > 1) nodes.slice(1).forEach(n => n.remove());
    });

    // 2) DEDUPE theo heading (fuzzy)
    const seen = new Set();
    document.querySelectorAll('section, .strip, .block').forEach(sec => {
      const h = sec.querySelector('h1, h2, h3, header h1, header h2, header h3');
      if (!h) return;
      const t = N(h.textContent);
      const hit = LABELS.find(l => t.includes(l));
      if (!hit) return;
      if (seen.has(hit)) { sec.remove(); return; }
      seen.add(hit);
      sec.dataset.mxdKeep = '1';
    });

    // 3) DEDUPE theo chữ ký hàng danh mục (khi có 2 hàng giống nhau)
    const candidates = Array.from(document.querySelectorAll('section,div,ul')).filter(el => signatureOfCategoryRow(el));
    const map = new Map();
    candidates.forEach(el => {
      const sig = signatureOfCategoryRow(el);
      if (!sig) return;
      if (map.has(sig)) { el.remove(); } else { map.set(sig, el); }
    });
  }

  // chạy nhiều nhịp để bắt render muộn
  function runMany(){
    dedupeOnce();
    setTimeout(dedupeOnce, 300);
    setTimeout(dedupeOnce, 1000);
    setTimeout(dedupeOnce, 3000);
    setTimeout(dedupeOnce, 7000);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', runMany, { once: true });
  } else { runMany(); }

  // Quan sát DOM: khi có node mới → dọn tiếp
  const mo = new MutationObserver(list => {
    for (const rec of list){ if (rec.addedNodes && rec.addedNodes.length){ dedupeOnce(); break; } }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // hook thủ công nếu muốn gọi trong console
  window.MXD = window.MXD || {}; window.MXD.dedupe = dedupeOnce;
})();
