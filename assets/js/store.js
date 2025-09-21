// Minimal store renderer from affiliates.json
(async function(){
  const el = document.getElementById('store-grid'); if (!el) return;
  try{
    const r = await fetch('/assets/data/affiliates.json', { cache:'no-cache' });
    const data = await r.json();
    el.innerHTML = `<div class="grid grid-cols-2 md:grid-cols-4 gap-3"></div>`;
    const grid = el.firstElementChild;
    for (const it of data){
      const href = `/g.html?sku=${encodeURIComponent(it.sku)}`;
      const img = `/assets/img/products/${it.sku}.webp`;
      const a = document.createElement('a');
      a.className = 'block rounded-2xl shadow p-3 hover:shadow-lg transition-all no-underline';
      a.href = href;
      a.innerHTML = `
        <img src="${img}" alt="${it.name}" loading="lazy" style="aspect-ratio:1/1; object-fit:cover; width:100%; border-radius:1rem;">
        <div class="mt-2 text-sm font-medium line-clamp-2">${it.name}</div>
        <div class="mt-1 text-base font-bold" data-price="${it.price}">${(it.price||0).toLocaleString('vi-VN')}₫</div>
      `;
      grid.appendChild(a);
    }
  }catch(e){ console.warn('store.js error', e); }
})();