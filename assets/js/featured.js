// Render featured products from assets/data/featured.json
(async function(){
  const el = document.getElementById('featured-products'); if (!el) return;
  try{
    const r = await fetch('/assets/data/featured.json', { cache:'no-cache' });
    const data = await r.json();
    el.innerHTML = `<div class="grid grid-cols-2 md:grid-cols-5 gap-3"></div>`;
    const grid = el.firstElementChild;
    for (const it of data){
      const href = `/g.html?sku=${encodeURIComponent(it.sku)}`;
      const card = document.createElement('a');
      card.className = 'block rounded-2xl shadow p-3 hover:shadow-lg transition-all no-underline';
      card.href = href;
      card.innerHTML = `
        <img src="${it.img}" alt="${it.name}" loading="lazy" style="aspect-ratio:1/1; object-fit:cover; width:100%; border-radius:1rem;">
        <div class="mt-2 text-sm font-medium line-clamp-2">${it.name}</div>
        <div class="mt-1 text-base font-bold" data-price="${it.price}">${(it.price||0).toLocaleString('vi-VN')}₫</div>
      `;
      grid.appendChild(card);
    }
  }catch(e){ console.warn('featured.js error', e); }
})();