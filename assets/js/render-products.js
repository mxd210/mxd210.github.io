/* MXD Render v2025-11-08 — Home/Product grid renderer
- Nguồn dữ liệu ưu tiên: window.MXD_RENDER.source (mặc định /assets/data/affiliates.json)
- Fallback: /affiliates.json, /assets/data/products.json, /products.json
- Card gọn cho mobile, hiển thị tên + giá; nút "Mua ngay" tô màu theo sàn qua data-merchant
- Tương thích CSS patch (card/thumb/body/name/price/buy)
- Gắn data-sku để /g.html lấy chi tiết; gọi mxdAffiliate.scan() sau khi render
*/

(function () {
  // Tạo namespace MXD nếu chưa có
  window.MXD = window.MXD || {};

  // ===== Helpers =====
  const money = (n) => (n != null && isFinite(+n)) ? new Intl.NumberFormat('vi-VN').format(+n) + '₫' : '';
  const esc = (s) => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const norm = (v) => String(v || '').toLowerCase().trim();
  const strip = (s) => norm(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const slug = (v) => strip(v).replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const imgOf = (p) => p.image || (p.sku ? `/assets/img/products/${String(p.sku).toLowerCase()}.webp` : '/assets/img/products/placeholder.webp');
  const originHref = (p) => p.deeplink || p.origin_url || p.origin || p.url || p.link || '';
  const merchantOf = (p) => {
    if (p.merchant) return String(p.merchant).toLowerCase();
    try {
      const u = new URL(originHref(p), location.href);
      const h = u.hostname.toLowerCase();
      if (h.includes('shopee') || h.endsWith('shp.ee')) return 'shopee';
      if (h.includes('lazada') || h.endsWith('lzd.co')) return 'lazada';
      if (h.includes('tiki')) return 'tiki';
      if (h.includes('tiktok')) return 'tiktok';
    } catch {}
    return '';
  };

  // Tải dữ liệu từ danh sách nguồn, trả về array sản phẩm
  async function loadData() {
    const primary = window.MXD_RENDER?.source || '/assets/data/affiliates.json';
    const sources = [
      primary,
      '/affiliates.json',
      '/assets/data/products.json',
      '/products.json'
    ];
    for (const src of sources) {
      try {
        const r = await fetch(src, { cache: 'no-store' });
        if (!r.ok) continue;
        const j = await r.json();
        if (Array.isArray(j) && j.length) return j;
        if (j && Array.isArray(j.items) && j.items.length) return j.items;
      } catch (_) {}
    }
    return [];
  }

  // Tạo card HTML (hợp chuẩn CSS patch)
  function cardHTML(p) {
    const sku = norm(p.sku || slug(p.name || ''));
    const name = p.name || p.title || sku || 'Sản phẩm';
    const img = imgOf(p);
    const price = p.price != null && isFinite(+p.price) ? money(+p.price) : '';
    const buy = originHref(p);
    const mer = merchantOf(p); // '' | 'shopee' | 'lazada' | 'tiki' | 'tiktok'
    const priceHTML = price ? `<div class="price" data-price="${esc(String(p.price))}">${price}</div>` : '';

    // Nếu không có link mua, ẩn nút (chỉ cho xem chi tiết)
    const actionsHTML = buy ? `
      <div class="actions">
        <a class="buy" href="${esc(buy)}" data-merchant="${esc(mer)}" data-sku="${esc(sku)}"
           target="_blank" rel="nofollow sponsored noopener">Mua ngay</a>
      </div>` : '';

    // Một số nguồn có images:[...]
    const imgSrc = Array.isArray(p.images) && p.images.length ? p.images[0] : img;

    return `
      <article class="card" data-sku="${esc(sku)}">
        <a class="thumb" href="/g.html?sku=${encodeURIComponent(sku)}" aria-label="Xem chi tiết ${esc(name)}">
          <img loading="lazy" decoding="async"
               src="${esc(imgSrc)}"
               alt="${esc(name)} — MXD"
               onerror="this.onerror=null;this.src='/assets/img/products/placeholder.webp'">
        </a>
        <div class="body">
          <h3 class="name"><a href="/g.html?sku=${encodeURIComponent(sku)}">${esc(name)}</a></h3>
          ${priceHTML}
          ${actionsHTML}
        </div>
      </article>`;
  }

  // Hiển thị skeleton nhanh trong mount
  function showSkeleton(mount, n = 8) {
    mount.innerHTML = Array.from({ length: n }).map(() => `
      <article class="card">
        <div class="thumb"><div class="skeleton" style="width:100%;height:100%"></div></div>
        <div class="body">
          <div class="skeleton" style="height:18px"></div>
          <div class="skeleton" style="height:16px;width:40%;margin-top:8px"></div>
        </div>
      </article>
    `).join('');
  }

  // ===== Public: MXD.renderProducts =====
  MXD.renderProducts = async function (mountSelector = '#product-list') {
    try {
      const mount = document.querySelector(mountSelector);
      if (!mount) return;
      showSkeleton(mount, 6);

      let items = await loadData();
      if (!Array.isArray(items) || !items.length) {
        const empty = document.getElementById('empty');
        if (empty) empty.style.display = 'block';
        mount.innerHTML = '';
        return;
      }

      // Giới hạn số lượng
      const LIMIT = window.MXD_RENDER?.limit || 30;
      items = items.slice(0, LIMIT);

      // Render
      mount.innerHTML = items.map(cardHTML).join('');

      // Gọi affiliate scan để rewrite nút mua
      if (window.mxdAffiliate?.scan) window.mxdAffiliate.scan(mount);
    } catch (e) {
      try {
        const empty = document.getElementById('empty');
        if (empty) empty.style.display = 'block';
      } catch {}
    }
  };

  // Tự động chạy nếu trang đã load và có mount-point
  document.addEventListener('DOMContentLoaded', () => {
    const autoMount = document.querySelector('#product-list');
    if (autoMount) {
      // Nếu index đã gọi MXD.renderProducts trước đó thì không gọi lại.
      // Ở đây ta chỉ gọi khi chưa có nội dung thực tế (skeleton hoặc rỗng).
      if (!autoMount.children.length || autoMount.querySelector('.skeleton')) {
        window.MXD.renderProducts('#product-list');
      }
    }
  });
})();
