// /assets/mxd-store.v2.js
// MXD STORE v2 — render danh mục từ affiliates.json + hover mô tả

document.addEventListener('DOMContentLoaded', () => {
  initMXDCategoryPage().catch(err => {
    console.error('MXD STORE v2 error:', err);
  });
});

async function initMXDCategoryPage() {
  const root = document.querySelector('[data-mxd-category-page]');
  if (!root) return; // Không phải trang danh mục → thoát

  const categorySlug = (root.dataset.category || '').trim();
  const limit = parseInt(root.dataset.limit || '60', 10);
  const featuredFirst = root.dataset.featuredFirst === 'true';

  const grid = root.querySelector('.product-grid');
  const countLabel = root.querySelector('[data-category-count]');

  if (!grid) return;

  grid.innerHTML = '<div class="mxd-loading">Đang tải sản phẩm…</div>';

  // 1) Load AFF JSON
  const res = await fetch('/assets/data/affiliates.json', { cache: 'no-store' });
  if (!res.ok) {
    grid.innerHTML = '<p class="mxd-error">Không tải được dữ liệu sản phẩm.</p>';
    return;
  }

  let data;
  try {
    data = await res.json();
  } catch (e) {
    console.error('AFF JSON parse error:', e);
    grid.innerHTML = '<p class="mxd-error">Dữ liệu sản phẩm không hợp lệ.</p>';
    return;
  }

  if (!Array.isArray(data)) data = [];

  // 2) Lọc status + category
  let products = data.filter(p => {
    const status = (p.status || 'active').toString().toLowerCase();
    if (['archived', 'hidden', 'draft'].includes(status)) return false;
    return true;
  });

  if (categorySlug) {
    products = products.filter(p => {
      const cat =
        p.category ||
        p.category_slug ||
        p.cat ||
        '';
      return cat === categorySlug;
    });
  }

  // 3) Sắp xếp
  if (featuredFirst) {
    products.sort((a, b) => {
      const fa = a.featured ? 1 : 0;
      const fb = b.featured ? 1 : 0;
      if (fb !== fa) return fb - fa; // featured trước
      const ta = getTime(a.updated_at);
      const tb = getTime(b.updated_at);
      return tb - ta; // mới trước
    });
  } else {
    products.sort((a, b) => {
      const ta = getTime(a.updated_at);
      const tb = getTime(b.updated_at);
      return tb - ta;
    });
  }

  if (limit && products.length > limit) {
    products = products.slice(0, limit);
  }

  // 4) Render
  if (products.length === 0) {
    grid.innerHTML = '<p class="mxd-empty">Danh mục này hiện chưa có sản phẩm nào.</p>';
  } else {
    grid.innerHTML = products.map(renderMXDProductCard).join('');
  }

  if (countLabel) {
    countLabel.textContent = `${products.length} sản phẩm`;
  }
}

function renderMXDProductCard(p) {
  const name = escapeHTML(p.name || '');
  const sku = escapeHTML(p.sku || '');
  const merchantRaw = (p.merchant || '').toString().toLowerCase();
  const originRaw = (p.origin || p.origin_url || '').toString().trim();

  // Luôn để origin là link gốc; mxd-affiliate.js sẽ tự rewrite → isclix
  const origin = originRaw || '#';

  const merchant = merchantRaw || detectMerchant(origin);
  const imgSrc = p.image || `/assets/img/products/${encodeURIComponent(p.sku || 'placeholder')}.webp`;

  const shortDesc = escapeHTML(
    (p.short_desc || p.description || p.name || '').toString().trim()
  );

  const detailHref = `/g.html?sku=${encodeURIComponent(p.sku || '')}`;
  const priceValue = getPrice(p);
  const priceText = priceValue != null ? formatVND(priceValue) : '';

  return `
  <article class="product-card" data-sku="${sku}">
    <a href="${detailHref}">
      <div class="thumb">
        <img
          src="${imgSrc}"
          alt="${name}"
          loading="lazy"
          onerror="this.onerror=null;this.src='/assets/img/products/placeholder.webp';"
        />
        <div class="product-hover">
          <p>${shortDesc}</p>
        </div>
      </div>
    </a>

    <div class="body">
      <div class="product-title title">
        <a href="${detailHref}">${name}</a>
      </div>

      <div class="price">
        ${priceText ? escapeHTML(priceText) : ''}
      </div>

      <div class="actions">
        <a class="buy btn-buy"
           href="${escapeAttr(origin)}"
           data-merchant="${escapeAttr(merchant)}"
           data-sku="${sku}">
          Mua ngay
        </a>
      </div>
    </div>
  </article>
  `;
}

/* ===== Helpers ===== */

function getTime(val) {
  if (!val) return 0;
  const t = new Date(val).getTime();
  return Number.isFinite(t) ? t : 0;
}

function getPrice(p) {
  // Hỗ trợ cả price, price_vnd, price_vnd_int
  const v = p.price ?? p.price_vnd ?? p.price_vnd_int;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatVND(value) {
  return Number(value).toLocaleString('vi-VN') + '₫';
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  return escapeHTML(str).replace(/`/g, '&#96;');
}

function detectMerchant(url) {
  try {
    if (!url) return '';
    const u = new URL(url.startsWith('http') ? url : 'https://' + url);
    const host = u.hostname.toLowerCase();
    if (host.includes('shopee')) return 'shopee';
    if (host.includes('lazada')) return 'lazada';
    if (host.includes('tiki')) return 'tiki';
    if (host.includes('tiktok')) return 'tiktok';
    return '';
  } catch {
    return '';
  }
}
