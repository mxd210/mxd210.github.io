<!-- /assets/mxd-store.v2.js -->
<script>
document.addEventListener('DOMContentLoaded', () => {
  initMXDCategoryPage().catch(err => {
    console.error('MXD STORE v2 error:', err);
  });
});

async function initMXDCategoryPage() {
  const root = document.querySelector('[data-mxd-category-page]');
  if (!root) return; // trang không phải trang mục

  const categorySlug = (root.dataset.category || '').trim();
  const limit = parseInt(root.dataset.limit || '60', 10);
  const featuredFirst = root.dataset.featuredFirst === 'true';

  const grid = root.querySelector('.product-grid');
  const countLabel = root.querySelector('[data-category-count]');

  if (!grid) return;

  grid.innerHTML = '<div class="mxd-loading">Đang tải sản phẩm…</div>';

  // 1) Load AFF
  const res = await fetch('/assets/data/affiliates.json', { cache: 'no-store' });
  if (!res.ok) {
    grid.innerHTML = '<p class="mxd-error">Không tải được dữ liệu sản phẩm.</p>';
    return;
  }

  let data = await res.json();
  if (!Array.isArray(data)) data = [];

  // 2) Lọc theo status + category
  let products = data.filter(p => (p.status || 'active') !== 'archived');

  if (categorySlug) {
    products = products.filter(p => (p.category || '') === categorySlug);
  }

  // 3) Sắp xếp
  if (featuredFirst) {
    products.sort((a, b) => {
      const fa = a.featured ? 1 : 0;
      const fb = b.featured ? 1 : 0;
      if (fb !== fa) return fb - fa; // featured lên trước
      const ta = new Date(a.updated_at || 0).getTime();
      const tb = new Date(b.updated_at || 0).getTime();
      return tb - ta; // mới lên trên
    });
  } else {
    products.sort((a, b) => {
      const ta = new Date(a.updated_at || 0).getTime();
      const tb = new Date(b.updated_at || 0).getTime();
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
  const brand = escapeHTML(p.brand || '');
  const merchant = escapeHTML(p.merchant || '');
  const origin = p.origin || '#';
  const img = p.image || `/assets/img/products/${sku}.webp`;
  const shortDesc = escapeHTML((p.short_desc || p.description || p.name || '').trim());
  const detailHref = `/g.html?sku=${encodeURIComponent(p.sku || '')}`;
  const price = formatVND(p.price);

  return `
  <article class="product-card" data-sku="${sku}">
    <div class="product-thumb">
      <a href="${detailHref}">
        <img src="${img}"
             alt="${name}"
             loading="lazy"
             onerror="this.onerror=null;this.src='/assets/img/products/placeholder.webp';"/>
        <div class="product-hover">
          <p>${shortDesc}</p>
        </div>
      </a>
    </div>
    <div class="product-body">
      <h3 class="product-title">
        <a href="${detailHref}">${name}</a>
      </h3>
      <div class="product-meta">
        ${brand ? `<span class="product-brand">${brand}</span>` : ''}
      </div>
      <div class="product-price">
        ${price ? `<span class="price">${price}</span>` : ''}
      </div>
      <div class="product-actions">
        <a class="btn-buy"
           href="${origin}"
           data-merchant="${merchant}"
           data-sku="${sku}">
          Mua ngay
        </a>
      </div>
    </div>
  </article>
  `;
}

function formatVND(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('vi-VN') + '₫';
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
</script>
