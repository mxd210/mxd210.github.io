/*
 * MXD-DEDUPE v2025-10-14
 * Mục tiêu: gỡ trùng các block "Sản phẩm nổi bật" / hàng chip / quick-nav trên store.html (và cả index nếu bị).
 * Cách dùng (chọn 1 trong 2):
 *  A) Dán inline đoạn <script> này ngay TRƯỚC </body> của store.html.
 *  B) Lưu file này thành /assets/js/mxd-dedupe.js rồi include:
 *       <script defer src="/assets/js/mxd-dedupe.js?v=2025-10-14"></script>
 * Ghi chú: Có guard để chỉ chạy 1 lần; không đụng GA4/affiliate.
 */
(function(){
  if (window.__MXD_DEDUPE_RUN__) return; // guard
  window.__MXD_DEDUPE_RUN__ = true;

  const lower = s => (s||'').toString().trim().toLowerCase();

  // 1) DEDUPE QUICK-NAV (nếu có nhiều ul.quick-nav)
  const qnavs = document.querySelectorAll('.quick-nav');
  if (qnavs.length > 1) [...qnavs].slice(1).forEach(el => el.remove());

  // 2) DEDUPE HÀNG CHIP/FILTER (các class hay dùng)
  const chipRows = document.querySelectorAll('.chip-row, .pill-row, .filter-row');
  if (chipRows.length > 1) [...chipRows].slice(1).forEach(el => el.remove());

  // 3) DEDUPE SECTION THEO TIÊU ĐỀ (h2/h3)
  const labels = [
    'sản phẩm nổi bật',
    'máy móc xây dựng',
    'thời trang',
    'ưu đãi hôm nay',
    'đề xuất cho bạn'
  ];
  const seen = new Set();
  document.querySelectorAll('section, .strip, .block').forEach(sec => {
    const h = sec.querySelector('h2, h3, header h2, header h3');
    if (!h) return;
    const key = lower(h.textContent);
    if (labels.includes(key)){
      if (seen.has(key)) { sec.remove(); return; }
      seen.add(key);
    }
  });

  // 4) DEDUPE CONTAINER ID PHỔ BIẾN
  const conts = document.querySelectorAll('#featured, #featured-products, .section-featured');
  if (conts.length > 1) [...conts].slice(1).forEach(el => el.remove());
  
window.MXD_FEATURED_INIT = (window.MXD_FEATURED_INIT||0) + 1;
if (window.MXD_FEATURED_INIT > 1) return; // ngăn render lần 2

  // 5) (TÙY CHỌN) nếu renderer nào đó bị gọi 2 lần → giữ 1 lần
  //    Thêm guard sau đây vào file render tương ứng để ngăn render lặp:
  //    window.MXD_FEATURED_INIT = (window.MXD_FEATURED_INIT||0)+1; if (window.MXD_FEATURED_INIT>1) return;
})();
