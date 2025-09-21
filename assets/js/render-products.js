<script>
async function MXD_loadAffs() {
  const sources = [
    '/assets/data/affiliates.checked.json',
    '/assets/data/affiliates.json',
    '/products.json'
  ];
  for (const src of sources) {
    try {
      const r = await fetch(src, { cache: 'no-store' });
      if (r.ok) return await r.json();
    } catch(e){}
  }
  return [];
}

function MXD_cardHTML(item) {
  const img = `/assets/img/products/${item.sku}.webp`;
  const price = (item.price||0).toLocaleString('vi-VN') + ' đ';
  const sku = encodeURIComponent(item.sku);
  return `
  <article class="card">
    <a class="thumb" href="/g.html?sku=${sku}">
      <img loading="lazy" src="${img}" alt="${item.name}"
           onerror="this.onerror=null;this.src='/assets/img/products/placeholder.webp'">
    </a>
    <h3 class="name"><a href="/g.html?sku=${sku}">${item.name}</a></h3>
    <div class="price" data-price="${item.price||0}">${price}</div>
    <a class="buy" href="${item.origin}" data-merchant="${item.merchant||'shopee'}">Mua ngay</a>
  </article>`;
}

window.MXD = window.MXD || {};
MXD.renderProducts = async function(sel, limit){
  const el = document.querySelector(sel);
  if (!el) return;
  const data = (await MXD_loadAffs()) || [];
  if (!data.length) {
    el.innerHTML = '<p class="muted">Chưa có sản phẩm. Hãy thêm /assets/data/affiliates.json.</p>';
    return;
  }
  const list = typeof limit === 'number' ? data.slice(0, limit) : data;
  el.innerHTML = list.map(MXD_cardHTML).join('');
};
</script>
