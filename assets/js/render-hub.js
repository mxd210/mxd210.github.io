// /assets/js/render-hub.js — MXD hub renderer (robust, alias-aware, fallback, status-flex)
(function(){
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const deaccent = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const slug = s => deaccent(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-+/g,'-').replace(/(^-|-$)/g,'');

  const norm = s => (window.MXD?.normalizeCategory ? MXD.normalizeCategory(s) : (s||''));
  const isActive = v => v===true || v==='true' || v==='active' || v==='published' || v===1 || v==='1';

  async function fetchAffiliates(){
    const r = await fetch('/affiliates.json', { cache: 'no-store' });
    return r.json();
  }

  function dedupBySku(list){
    const seen = new Set();
    return list.filter(p => p && p.sku && !seen.has(p.sku) && seen.add(p.sku));
  }

  function renderList(grid, list){
    grid.innerHTML = list.map(p => {
      const href = p.deeplink || p.origin || '#';
      const img  = p.img || p.image || `/assets/img/products/${p.sku}.webp`;
      const price = (p.price!=null && p.price!=='') ? Number(p.price).toLocaleString('vi-VN')+'₫' : '';
      return `
        <article class="product">
          <a class="thumb" href="${href}" rel="nofollow noopener">
            <img loading="lazy" src="${img}" alt="${p.name}"/>
          </a>
          <h3 class="name"><a href="${href}" rel="nofollow noopener">${p.name}</a></h3>
          ${price ? `<div class="price">${price}</div>` : ``}
          <div class="meta"
               data-sku="${p.sku}"
               data-merchant="${p.merchant||''}"
               data-category="${p.category||''}"></div>
          <a class="buy" href="${href}" rel="nofollow noopener">Mua</a>
        </article>
      `;
    }).join('');
  }

  function buildBase(all, hub){
    const aliasMap = (window.MXD && (MXD._CATEGORY_ALIASES || window.MXD_CATEGORY_ALIAS)) || {};
    const aliases  = (aliasMap[hub] || [hub]).map(slug);
    const normCat  = s => slug(norm(s));

    function inAlias(p){
      const nc = normCat(p.category);
      if (aliases.includes(nc)) return true;               // khớp alias chuẩn
      const sc = slug(p.category||'');
      if (sc.startsWith(hub) || sc.includes(hub)) return true; // fallback theo slug thô
      if (typeof MXD?.guessCategoryByText === 'function'){
        const g = MXD.guessCategoryByText(p.name, p.tags||[]);
        if (slug(g) === hub) return true;                  // heuristic từ name/tags
      }
      return false;
    }

    return dedupBySku(all).filter(p => inAlias(p) && isActive(p.status));
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

    const all  = await fetchAffiliates();
    const base = buildBase(all, hub);

    renderList(grid, base); // Tất cả

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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
