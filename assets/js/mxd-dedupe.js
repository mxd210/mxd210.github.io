/* MXD-DEDUPE STORE FINAL v2025-10-14
 * Một file, một việc: gỡ TRÙNG trên store.html, không đụng phần lưới sản phẩm.
 * Gỡ các thứ sau, theo thứ tự ưu tiên:
 *   1) Dải danh mục (category strip) – giữ bản nằm trên cùng.
 *   2) Các block có heading: "Sản phẩm nổi bật" | "Máy móc xây dựng" | "Thời trang" – giữ bản đầu.
 *   3) Floating contacts – giữ 1.
 * Có observer theo dõi DOM; nếu script khác chèn muộn, nó tự dọn tiếp.
 */
(function(){
  'use strict';
  if (window.__MXD_DEDUPE_STORE__) return; window.__MXD_DEDUPE_STORE__ = true;

  // ===== helpers =====
  const norm = s => (s||'').toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'') // bỏ dấu
    .replace(/\s+/g,' ').trim();

  const SLUGS = ['san-pham-noi-bat','may-moc-xay-dung','thoi-trang','thoi-trang-nam','thoi-trang-nu'];
  const LABELS = ['san pham noi bat','may moc xay dung','thoi trang'];

  const byTop = (a,b)=> (a?.offsetTop||0) - (b?.offsetTop||0);

  function keepFirst(nodes){
    const arr = Array.from(nodes).sort(byTop);
    if (arr.length <= 1) return 0;
    arr.slice(1).forEach(n=> n && n.remove());
    return arr.length-1;
  }

  // Strip danh mục: container có >=3 link trỏ tới các slug trên
  function findCategoryStrips(){
    const candidates = Array.from(document.querySelectorAll('section,div,ul,nav'));
    return candidates.filter(el=>{
      const links = Array.from(el.querySelectorAll('a[href]'));
      if (links.length < 3) return false;
      const hit = new Set();
      for (const a of links){
        const href = (a.getAttribute('href')||'').toLowerCase();
        for (const s of SLUGS){ if (href.includes(s)) { hit.add(s); break; } }
      }
      return hit.size >= 2; // đủ bằng chứng là 1 hàng danh mục
    }).sort(byTop);
  }

  // Block theo heading
  function findHeadingBlocks(){
    const map = new Map(); // key -> [elements]
    document.querySelectorAll('h1,h2,h3').forEach(h=>{
      const t = norm(h.textContent);
      if (!LABELS.includes(t)) return;
      const sec = h.closest('section') || h.parentElement;
      if (!sec) return;
      const arr = map.get(t) || []; arr.push(sec); map.set(t, arr);
    });
    return map; // Map<label, nodes[]>
  }

  function dedupe(){
    // 1) Category strips
    const strips = findCategoryStrips();
    if (strips.length>1) keepFirst(strips);

    // 2) Heading blocks
    const groups = findHeadingBlocks();
    groups.forEach(nodes=>{ if (nodes.length>1) keepFirst(nodes); });

    // 3) Floating contacts
    keepFirst(document.querySelectorAll('#floating-contacts, .floating-contacts, .fc'));
  }

  function run(){ dedupe(); setTimeout(dedupe,300); setTimeout(dedupe,1000); }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', run, { once:true });
  } else { run(); }

  // Theo dõi DOM: script khác chèn muộn → dọn tiếp
  const mo = new MutationObserver(list=>{
    for (const rec of list){ if (rec.addedNodes && rec.addedNodes.length){ dedupe(); break; } }
  });
  mo.observe(document.documentElement,{childList:true,subtree:true});
})();
