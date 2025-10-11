/* MXD render-hub v2025-10-11 +compat-deeplink
 * Đọc affiliates.json + category-alias.json, render lưới cho hub.
 * Thêm tương thích: nếu origin là deeplink -> tự tách origin gốc.
 */
(function () {
  const AFF_PATH = '/assets/data/affiliates.json';
  const ALIAS_PATH = '/assets/data/category-alias.json';
  const DEEP_HOSTS = ['go.isclix.com', 'deeplink', 'deep_link'];

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const money = n => Number(n || 0).toLocaleString('vi-VN');

  async function loadJSON(url, fallback = null) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      return fallback;
    }
  }

  function isDeeplink(u='') {
    try { const x = new URL(u); return DEEP_HOSTS.some(h => x.hostname.includes(h) || u.includes(h)); }
    catch { return false; }
  }
  function extractOriginFromDeep(u='') {
    try {
      const x = new URL(u);
      const inner = x.searchParams.get('url') || x.searchParams.get('deeplink');
      return inner ? decodeURIComponent(inner) : u;
    } catch { return u; }
  }
  function cleanAff(arr) {
    return (arr||[]).map(p => {
      if (!p) return p;
      const out = { ...p };
      if (out.origin && isDeeplink(out.origin)) {
        out.origin = extractOriginFromDeep(out.origin);
      }
      // chuẩn hoá status (tương thích legacy true/false)
      if (out.status === true) out.status = 'active';
      else if (out.status === false) out.status = 'archived';
      return out;
    });
  }

  function buildCard(p) {
    const img = p.image || `/assets/img/products/${p.sku}.webp`;
    return `
<article class="product" data-sku="${p.sku}">
  <a class="thumb" href="/g.html?sku=${encodeURIComponent(p.sku)}" title="${escapeHtml(p.name)}">
    <img src="${img}" alt="${escapeHtml(p.name)} — MXD" loading="lazy" width="320" height="320">
  </a>
  <div class="info">
    <h3 class="name"><a href="/g.html?sku=${encodeURIComponent(p.sku)}">${escapeHtml(p.name)}</a></h3>
    <div class="price">${money(p.price)} đ</div>
    <div class="actions">
      <a class="buy" data-merchant="${p.merchant || ''}" href="${p.origin}" rel="noopener">Mua</a>
      <a class="more" href="/g.html?sku=${encodeURIComponent(p.sku)}">Chi tiết</a>
    </div>
  </div>
</article>`.trim();
  }

  function escapeHtml(s='') {
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  async function initHub(hubEl) {
    const hub = hubEl.dataset.hub; // ví dụ: "thoi-trang"
    const grid = $('[data-grid]', hubEl);
    const tabs = $$('[data-tab]', hubEl);

    const alias = await loadJSON(ALIAS_PATH, { 'thoi-trang': ['thoi-trang-nam','thoi-trang-nu','thoi-trang-tre-em','thu-dong'] });
    const affRaw = await loadJSON(AFF_PATH, []);
    const aff = cleanAff(affRaw);

    function filterBy(catSlugs) {
      const catSet = new Set(catSlugs);
      return aff.filter(p =>
        p && p.status !== 'archived' &&
        p.status !== 'draft' &&
        p.category && catSet.has(p.category));
    }

    function render(catSlugs) {
      const items = filterBy(catSlugs);
      grid.innerHTML = items.length ? items.map(buildCard).join('\n')
        : `<p class="muted">Chưa có sản phẩm hiển thị cho mục này.</p>`;
    }

    // Tab events
    tabs.forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        tabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.tab; // all | slug
        if (mode === 'all') render(alias[hub] || []);
        else render([mode]);
      });
    });

    // Mặc định: 'all'
    ( $('[data-tab].active', hubEl) || $('[data-tab="all"]', hubEl) )?.click();
  }

  function boot() { $$('[data-hub]').forEach(initHub); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
