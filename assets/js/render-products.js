// /assets/js/render-products.js — render grid from /assets/data/affiliates.json
window.MXD = window.MXD || {};
(function(ns){
  async function loadAFF(){
    try{
      const r = await fetch('/assets/data/affiliates.json', {cache:'no-store'});
      return await r.json();
    }catch(e){
      try{
        const r = await fetch('/products.json', {cache:'no-store'});
        return await r.json();
      }catch{return []}
    }
  }
  function format(price){ if(!price) return 'Liên hệ'; return new Intl.NumberFormat('vi-VN').format(Number(price||0))+' đ'; }
  function tplCard(p){
    return `
    <article class="card">
      <div class="thumb"><img src="${p.image}" alt="${p.name}" loading="lazy" decoding="async"></div>
      <div class="body">
        <h3 class="name"><a href="/g.html?sku=${p.sku}">${p.name}</a></h3>
        <div class="price">${format(p.price)}</div>
        <div class="actions">
          <a class="product-meta" href="${p.origin}" data-merchant="${p.merchant}" data-sku="${p.sku}" data-img="${p.image}" data-price="${p.price}">${p.name}</a>
          <a class="buy" href="${p.origin}" data-merchant="${p.merchant}">Mua</a>
          <a class="more" href="/g.html?sku=${p.sku}" style="display:inline-block;margin-top:6px">Xem chi tiết</a>
        </div>
      </div>
    </article>`;
  }
  ns.renderProducts = async function mount(selector='#product-list', limit){
    const root = document.querySelector(selector);
    if(!root) return;
    root.innerHTML = '';
    const data = await loadAFF();
    const list = Array.isArray(data) ? data : (Array.isArray(data.items)?data.items:[]);
    const items = list.filter(x=> (x.status||'active')!=='archived');
    const cut = Number.isFinite(limit) ? items.slice(0, limit) : items;
    root.innerHTML = cut.map(tplCard).join('');
    // trigger affiliate rewrite
    if(window.mxdAffiliate && typeof window.mxdAffiliate.scan === 'function'){
      window.mxdAffiliate.scan(root);
    }
  };
})(window.MXD);