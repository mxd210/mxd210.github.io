<script>
// MXD renderer v3 — chống trống kể cả thiếu ảnh/placeholder
(async()=>{
  const MXD = window.MXD = window.MXD || {};

  const FALLBACK_PIXEL =
    'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA='; // 1x1 pixel

  async function loadAffs() {
    const srcs = [
      '/assets/data/affiliates.checked.json',
      '/assets/data/affiliates.json',
      '/products.json'
    ];
    for (const src of srcs) {
      try {
        const r = await fetch(src, { cache: 'no-store' });
        if (!r.ok) continue;
        const t = await r.text();
        if (!t.trim()) continue;
        try {
          const j = JSON.parse(t);
          const arr = Array.isArray(j) ? j
                    : Array.isArray(j.items) ? j.items
                    : Array.isArray(j.affiliates) ? j.affiliates
                    : Array.isArray(j.products) ? j.products
                    : (j && typeof j === 'object') ? Object.values(j) : [];
          if (arr.length) return arr;
        } catch (_) { /* bỏ qua parse lỗi, thử nguồn khác */ }
      } catch {}
    }
    return [];
  }

  function m(v, d=''){ return (v==null ? d : v); }
  function guessMerchant(u=''){
    try { const h = new URL(u, location.origin).hostname;
      if (h.includes('shopee')) return 'shopee';
      if (h.includes('lazada')) return 'lazada';
      if (h.includes('tiki'))   return 'tiki';
      if (h.includes('tik') && h.includes('tok')) return 'tiktok';
    } catch {}
    return '';
  }
  function fmtVND(n){ const x=Number(n); return isFinite(x)?(new Intl.NumberFormat('vi-VN').format(x)+' đ'):''; }

  function toItem(x){
    const sku   = m(x.sku || x.p_sku || x.id, '');
    const name  = m(x.name || x.title || sku, sku);
    const price = (typeof x.price==='number') ? x.price :
                  Number(String(m(x.price,'')).replace(/[^\d]/g,'')) || 0;
    const img   = m(x.image || x.img, `/assets/img/products/${sku}.webp`);
    const link  = m(x.link || x.url || x.origin, '');
    const links = Array.isArray(x.links) && x.links.length
      ? x.links.map(l=> typeof l==='string' ? {href:l, merchant:guessMerchant(l)}
                                           : {href:m(l.href,''), merchant:m(l.merchant, guessMerchant(l.href||''))})
               .filter(l=>l.href)
      : (link ? [{href:link, merchant:guessMerchant(link)}] : []);
    const merchant = m(x.merchant, (links[0]?.merchant || guessMerchant(link)));
    return { sku, name, price, img, links, merchant };
  }

  function cardHTML(p){
    const first = p.links[0];
    // onerror: thử placeholder, nếu cũng 404 thì dùng 1x1 pixel
    const onerr = `if(!this._f1){this._f1=1;this.src='/assets/img/products/placeholder.webp';}
                   else{this.onerror=null;this.src='${FALLBACK_PIXEL}';}`;
    return `
    <article class="card">
      <a class="thumb" href="/g.html?sku=${encodeURIComponent(p.sku)}">
        <img loading="lazy" src="${p.img}" alt="${p.name}" onerror="${onerr}">
      </a>
      <div class="body">
        <h3 class="name"><a href="/g.html?sku=${encodeURIComponent(p.sku)}">${p.name}</a></h3>
        ${p.price ? `<div class="price" data-price="${p.price}">${fmtVND(p.price)}</div>` : ''}
        ${first ? `<a class="buy" href="${first.href}" data-merchant="${first.merchant||''}" target="_blank" rel="nofollow sponsored noopener">Mua ngay</a>` : ''}
      </div>
    </article>`;
  }

  MXD.renderProducts = async function(selector, limit){
    const el = document.querySelector(selector);
    if (!el) return;
    // skeleton nhẹ (không chặn render thật)
    el.innerHTML = Array.from({length:8}).map(()=>`
      <article class="card">
        <div class="skeleton" style="aspect-ratio:4/3"></div>
        <div class="body">
          <div class="skeleton" style="height:18px;width:70%"></div>
          <div class="skeleton" style="height:16px;width:40%;margin-top:8px"></div>
          <div class="skeleton" style="height:34px;width:120px;margin-top:12px;border-radius:10px"></div>
        </div>
      </article>`).join('');

    const raw = await loadAffs();
    const items = raw.map(toItem).filter(it => it.sku); // luôn có SKU
    const list = (typeof limit === 'number') ? items.slice(0, limit) : items;

    if (!list.length){
      el.innerHTML = `<p class="muted">Chưa có sản phẩm. Thêm <code>/assets/data/affiliates.json</code> hoặc <code>/products.json</code>.</p>`;
      return;
    }
    el.innerHTML = list.map(cardHTML).join('');

    // Cho affiliate script scan lại nếu có
    if (window.mxdAffiliate?.scan) window.mxdAffiliate.scan();
  };
})();
</script>
