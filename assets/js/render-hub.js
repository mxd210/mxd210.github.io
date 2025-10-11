// /assets/js/render-hub.js — MXD hub renderer (alias-aware, robust fetch)
(function(){
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const slug = s => String(s||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-+/g,'-').replace(/(^-|-$)/g,'');

  const norm = s => (window.MXD?.normalizeCategory ? MXD.normalizeCategory(s) : (s||''));
  const isActive = v => v===true || v==='true' || v==='active' || v==='published' || v===1 || v==='1';

  // --- FETCH with fallbacks & clear errors ---
  async function fetchAffiliates(){
    const hereDir = location.pathname.replace(/[^/]+$/,''); // e.g. /store/
    const candidates = [
      '/affiliates.json',
      hereDir + 'affiliates.json',
      '/store/affiliates.json',
      '/assets/affiliates.json'
    ];
    for (const url of candidates){
      try{
        const r = await fetch(url, { cache: 'no-store' });
        const ct = (r.headers.get('content-type')||'').toLowerCase();
        if (r.ok && ct.includes('json')) {
          console.log('[MXD hub] using', url);
          return await r.json();
        }
        // If it looks like HTML (404 page), skip to next
      }catch(e){
        // ignore and try next candidate
      }
    }
    throw new Error('AFFILIATES_JSON_NOT_FOUND');
  }

  function dedupBySku(list){
    const seen = new Set();
    return list.filter(p => p && p.sku && !seen.has(p.sku) && seen.add(p.sku));
  }

  function renderList(grid, list){
    grid.innerHTML = list.map(p => {
      const href = p.deeplink || p.origin || '#';
      const img  = p.img || p.image || `/assets/img/products/${p.sku}.webp`;
      return `
        <article class="product">
          <a class="product-meta"
             href="${href}"
             data-sku="${p.sku}"
             data-merchant="${p.merchant||''}"
             data-category="${p.category||''}"
             data-price="${p.price||''}"
             data-img="${img}">
            ${p.name}
          </a>
          <a class="buy" href="${href}" data-merchant="${p.merchant||''}">Mua</a>
        </article>
      `;
    }).join('');
  }

  function buildBase(all, hub){
    const aliasMap = (window.MXD && (MXD._CATEGORY_ALIASES || window.MXD_CATEGORY_ALIAS)) || {};
    const aliases  = aliasMap[hub] || [hub];
    return dedupBySku(all).filter(p => aliases.includes(norm(p.category)) && isActive(p.status));
  }

  function filterByTab(base, tabSlug){
    if (tabSlug === 'all') return base;
    return base.filter(p => {
      const pc = slug(p.category);
      if (pc.startsWith(tabSlug) || pc.includes(tabSlug)) return true;
      const nt = slug([p.name, ...(Array.isArray(p.tags) ? p.tags : [])].join(' '));
      return nt.includes(tabSlug);
    });
  }

  async function boot(){
    const grid = $('.product-grid[data-grid]');
    if (!grid) return;

    const hub = slug(grid.dataset.hub || grid.dataset.category || '');
    if (!hub) return;

    try{
      const all  = await fetchAffiliates();
      const base = buildBase(all, hub);

      renderList(grid, base);

      const tabs = $('[data-tabs]');
      if (tabs) {
        tabs.addEventListener('click', ev => {
          const btn = ev.target.closest('[data-tab]');
          if (!btn) return;
          $$('.tab', tabs).forEach(b => b.classList.toggle('active', b === btn));
          const tabSlug = slug(btn.dataset.tab || 'all');
          renderList(grid, filterByTab(base, tabSlug));
        });
      }

      console.log('[MXD hub]', hub, 'items:', base.length);
    }catch(e){
      console.error('[MXD hub] Không tải được affiliates.json', e);
      grid.innerHTML = `<p class="muted">Không tải được danh sách sản phẩm (affiliates.json). Kiểm tra đường dẫn & publish file JSON ở <code>/affiliates.json</code> hoặc một path fallback.</p>`;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
