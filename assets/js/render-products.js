// MXD renderer v4 — ưu tiên Google Sheet CSV → rồi affiliates.json → rồi products.json
(function(){
  const MXD = window.MXD = window.MXD || {};
  const FALLBACK_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';

  const CFG = (window.MXD_CFG||{});
  const SHEET_CSV = CFG.SHEET_CSV || "";
  const IMG_PROXY = CFG.IMG_PROXY || "";

  // --- helpers ---
  const m = (v,d='') => (v==null?d:v);
  const toNum = (v) => Number(String(v||'').replace(/[^\d]/g,''))||0;
  const guessMerchant = (u='')=>{
    try{ const h=new URL(u,location.origin).hostname;
      if(h.includes('shopee')) return 'shopee';
      if(h.includes('lazada')) return 'lazada';
      if(h.includes('tiki'))   return 'tiki';
      if(h.includes('tik')&&h.includes('tok')) return 'tiktok';
    }catch{} return '';
  };
  const slug = (s='')=>{
    return s.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80);
  };

  const csvSplit = (line)=> line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map(s=>s.replace(/^"(.*)"$/,'$1').replace(/""/g,'"'));
  function parseCSV(text){
    const rows = text.split(/\r?\n/).filter(l=>l.trim());
    if(!rows.length) return [];
    const head = csvSplit(rows[0]).map(h=>h.trim().toLowerCase());
    return rows.slice(1).map(r=>{
      const c = csvSplit(r); const o={};
      head.forEach((h,i)=> o[h]= (c[i]||'').trim());
      return o;
    });
  }

  // --- data loaders ---
  async function loadSheet(){
    if(!SHEET_CSV) return [];
    try{
      const r = await fetch(SHEET_CSV, {cache:'no-store', mode:'cors'});
      if(!r.ok) return [];
      const text = await r.text();
      const rows = parseCSV(text);
      return rows.map(x=>{
        const origin = m(x.origin||x.url||x.link,'');
        const name   = m(x.name||x.title,'');
        let sku      = m(x.sku,'');
        if(!sku && name) sku = slug(name);
        const imgRaw = m(x.image||x.img,'');
        const img    = imgRaw
          ? (IMG_PROXY ? `${IMG_PROXY}?url=${encodeURIComponent(imgRaw)}` : imgRaw)
          : `/assets/img/products/${sku}.webp`;
        return {
          sku,
          name: name || sku,
          price: toNum(x.price),
          links: origin ? [{href: origin, merchant: m(x.merchant, guessMerchant(origin))}] : [],
          merchant: m(x.merchant, guessMerchant(origin)),
          img
        };
      }).filter(i=>i.sku);
    }catch{ return []; }
  }

  async function loadJSON(src){
    try{
      const r = await fetch(src, {cache:'no-store'});
      if(!r.ok) return [];
      const t = await r.text(); if(!t.trim()) return [];
      const j = JSON.parse(t);
      const arr = Array.isArray(j) ? j
              : Array.isArray(j.items) ? j.items
              : Array.isArray(j.affiliates) ? j.affiliates
              : Array.isArray(j.products) ? j.products
              : (j && typeof j==='object') ? Object.values(j) : [];
      return arr;
    }catch{ return []; }
  }

  function normalizeItem(x){
    const origin = m(x.origin||x.url||x.link,'');
    const links  = Array.isArray(x.links)&&x.links.length
      ? x.links.map(l=> typeof l==='string' ? {href:l, merchant:guessMerchant(l)} :
          {href:m(l.href,''), merchant:m(l.merchant, guessMerchant(l.href||''))}).filter(l=>l.href)
      : (origin ? [{href:origin, merchant:guessMerchant(origin)}] : []);
    const sku   = m(x.sku||x.p_sku||x.id,'');
    const name  = m(x.name||x.title||sku, sku);
    const price = typeof x.price==='number' ? x.price : toNum(x.price);
    let img     = m(x.image||x.img, `/assets/img/products/${sku}.webp`);
    if(/^https?:\/\//i.test(img) && IMG_PROXY) img = `${IMG_PROXY}?url=${encodeURIComponent(img)}`;
    const merchant = m(x.merchant, (links[0]?.merchant || guessMerchant(origin)));
    return { sku, name, price, img, links, merchant };
  }

  async function loadAll(){
    const fromSheet = await loadSheet();
    const fromAff   = await loadJSON('/assets/data/affiliates.json');
    const fromProd  = await loadJSON('/products.json');
    // Sheet ưu tiên → merge JSON cũ → dedupe theo sku (giữ bản đầu)
    const merged = [...fromSheet, ...fromAff, ...fromProd].map(normalizeItem);
    const seen = new Set(); const out=[];
    for(const it of merged){ if(!it.sku || seen.has(it.sku)) continue; seen.add(it.sku); out.push(it); }
    return out;
  }

  // --- UI ---
  function cardHTML(p){
    const first = p.links[0];
    const onerr = `if(!this._f1){this._f1=1;this.src='/assets/img/products/${p.sku}.webp';}
                   else{this.onerror=null;this.src='${FALLBACK_PIXEL}';}`;
    return `
    <article class="card">
      <a class="thumb" href="/g.html?sku=${encodeURIComponent(p.sku)}">
        <img loading="lazy" src="${p.img}" alt="${p.name}" onerror="${onerr}">
      </a>
      <div class="body">
        <h3 class="name"><a href="/g.html?sku=${encodeURIComponent(p.sku)}">${p.name}</a></h3>
        ${p.price ? `<div class="price" data-price="${p.price}">${new Intl.NumberFormat('vi-VN').format(p.price)} đ</div>` : ''}
        <div class="actions">
          ${first ? `<a class="buy" href="${first.href}" data-merchant="${first.merchant||''}" target="_blank" rel="nofollow sponsored noopener">Mua ngay</a>` : ''}
        </div>
      </div>
    </article>`;
  }

  MXD.renderProducts = async function(selector, limit){
    const el = document.querySelector(selector);
    if(!el) return;
    // skeleton
    el.innerHTML = Array.from({length:8}).map(()=>`
      <article class="card">
        <div class="skeleton" style="aspect-ratio:1"></div>
        <div class="body">
          <div class="skeleton" style="height:18px;width:70%"></div>
          <div class="skeleton" style="height:16px;width:40%;margin-top:8px"></div>
          <div class="skeleton" style="height:34px;width:120px;margin-top:12px;border-radius:10px"></div>
        </div>
      </article>`).join('');

    const items = await loadAll();
    const list = (typeof limit==='number') ? items.slice(0,limit) : items;
    if(!list.length){
      el.innerHTML = `<p class="muted">Chưa có sản phẩm. Điền Sheet hoặc thêm <code>/assets/data/affiliates.json</code>.</p>`;
      return;
    }
    el.innerHTML = list.map(cardHTML).join('');
    if(window.mxdAffiliate?.scan) window.mxdAffiliate.scan();
  };
})();
