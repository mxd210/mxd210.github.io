/* /assets/js/render-products.js — Canonical card renderer (affiliates.json → grid)
   - Tạo .product-meta (ẩn) để giữ metadata theo chuẩn MXD210
   - Tạo <a class="buy"> với href GỐC (Shopee/Lazada...), data-merchant, data-sku
   - mxd-affiliate.js sẽ tự rewrite sang deep-link + gắn sub1..4
*/
(function () {
  const JSONS = ["/assets/data/affiliates.json", "/products.json"]; // fallback
  const IMG_DIR = "/assets/img/products/";
  const PLACEHOLDER = IMG_DIR + "placeholder.webp";

  const slugify = s => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const inferMerchant = url => /shopee\.vn/.test(url) ? "shopee" : (/lazada\.vn/.test(url) ? "lazada" : "");

  async function loadFirstAvailable(urls) {
    for (const u of urls) {
      try {
        const r = await fetch(u, { cache: "no-cache" });
        if (r.ok) return await r.json();
      } catch (e) {}
    }
    return [];
  }

  function normalize(rec) {
    // Chấp nhận nhiều key tên khác nhau từ các tool trước đây
    const url = rec.url || rec.link || rec.href || "";
    const name = rec.name || rec.title || "";
    const sku0 = rec.sku || rec.id || slugify(name);
    const sku = slugify(String(sku0 || ""));
    const price = rec.price || rec.data_price || rec.min_price || "";
    const img = rec.img || rec.image || (IMG_DIR + sku + ".webp");
    const merchant = (rec.merchant || inferMerchant(url) || "").toLowerCase();
    return { url, name, sku, price, img, merchant };
  }

  function priceLabel(v) {
    if (v == null || v === "") return "";
    const n = Number(String(v).replace(/[^\d.]/g, ""));
    if (!Number.isFinite(n)) return String(v);
    return n.toLocaleString("vi-VN") + "₫";
  }

  function cardHTML(item) {
    return `
      <div class="card" data-sku="${item.sku}">
        <img loading="lazy" src="${item.img}" onerror="this.src='${PLACEHOLDER}'" alt="${item.name}">
        <div class="body">
          <h3 class="name">${item.name}</h3>
          <div class="price">${priceLabel(item.price)}</div>

          <!-- Meta link (ẩn) theo chuẩn MXD210: ĐỨNG TRƯỚC các buy links -->
          <a class="product-meta" href="${item.url}"
             data-merchant="${item.merchant}"
             data-sku="${item.sku}"
             data-img="${item.img}"
             data-price="${item.price}"
             style="display:none">Meta</a>

          <a class="buy"
             href="${item.url}"
             data-merchant="${item.merchant}"
             data-sku="${item.sku}">Mua trên ${item.merchant ? item.merchant.charAt(0).toUpperCase()+item.merchant.slice(1) : "Shop"}</a>
        </div>
      </div>
    `;
  }

  async function renderProducts(selector = "#product-list", limit) {
    const wrap = document.querySelector(selector);
    if (!wrap) return;

    const data = await loadFirstAvailable(JSONS);
    const items = (Array.isArray(data) ? data : []).map(normalize).filter(x => x.url);

    if (!items.length) {
      const empty = document.getElementById("empty");
      if (empty) empty.style.display = "block";
      return;
    }

    const take = Number.isFinite(limit) ? items.slice(0, limit) : items;
    wrap.innerHTML = take.map(cardHTML).join("");

    // Kích hoạt scan affiliate (phòng khi DOMContentLoaded đã qua)
    if (window.mxdAffiliate && typeof window.mxdAffiliate.scan === "function") {
      window.mxdAffiliate.scan(wrap);
    }
  }

  window.MXD = Object.assign(window.MXD || {}, { renderProducts });
})();
