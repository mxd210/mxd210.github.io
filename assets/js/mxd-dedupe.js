/* MXD-DEDUPE SAFE MODE v2025-10-14
 * Mục tiêu: chỉ gỡ TRÙNG, KHÔNG xoá nhầm.
 * - Chỉ đụng vào: dải danh mục (category bar), block "Sản phẩm nổi bật / Máy móc xây dựng / Thời trang",
 *   và floating contacts. Giữ lại đúng 1, ưu tiên phần có nhiều link nhất.
 * - Không dùng fuzzy rộng; chỉ so heading trực tiếp để tránh xoá nhầm card sản phẩm.
 */
(function(){
  'use strict';
  if (window.__MXD_DEDUPE_SAFE__) return; // guard
  window.__MXD_DEDUPE_SAFE__ = true;

  const norm = s => (s||'')
    .toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ').trim();

  function keepOne(nodeList){
    const list = Array.from(nodeList);
    if (list.length <= 1) return 0;
    // chọn phần có nhiều link nhất, nếu hoà thì lấy phần nằm trên (offsetTop nhỏ hơn)
    const keep = list.sort((a,b)=> (b.querySelectorAll('a').length - a.querySelectorAll('a').length) || (a.offsetTop - b.offsetTop))[0];
    list.forEach(el => { if (el !== keep) el.remove(); });
    return list.length - 1;
  }

  // 1) CATEGORY BAR (dải danh mục ở đầu trang Cửa hàng)
  keepOne(document.querySelectorAll('#categories-bar, .quick-nav, .categories-strip'));

  // 2) CÁC BLOCK THEO HEADING CHÍNH XÁC (chỉ h2/h3 trực tiếp của section)
  const labels = ['san pham noi bat','may moc xay dung','thoi trang'];
  const groups = new Map();
  document.querySelectorAll('section').forEach(sec => {
    const h = sec.querySelector(':scope>h2, :scope>header>h2, :scope>h3, :scope>header>h3');
    if (!h) return;
    const key = norm(h.textContent);
    if (!labels.includes(key)) return;
    const arr = groups.get(key) || [];
    arr.push(sec); groups.set(key, arr);
  });
  groups.forEach(nodes => keepOne(nodes));

  // 3) FLOATING CONTACTS — giữ 1
  keepOne(document.querySelectorAll('#floating-contacts, .floating-contacts, .fc'));
})();
