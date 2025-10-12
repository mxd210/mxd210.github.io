/* MXD render-products — v2025-10-12a
   - OSOT: /assets/data/affiliates.json; fallback: /products.json -> /affiliates.json
   - Hỗ trợ lọc: data-category + data-alias + data-tags (ví dụ: data-tags="featured,hot")
   - Ảnh: /assets/img/products/<sku>.webp
   - Nút mua: data-merchant (shopee|lazada|tiki|tiktok)
*/
(function (ns) {
  async function loadData() {
    const sources = ["/assets/data/affiliates.json", "/products.json", "/affiliates.json"];
    for (const u of sources) {
      try { const r = await fetch(u, { cache: "no-store" }); if (r.ok) return await r.json(); } catch {}
    }
    return [];
  }

  const slugify = (s) => (s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");

  function toTags(v){
    if (!v) return [];
    if (Array.isArray(v)) return v.map(x=>String(x).toLowerCase().trim()).filter(Boolean);
    return String(v).split(",").map(x=>x.toLowerCase().trim()).filter(Boolean);
  }

  function normalize(rec) {
    const name = rec.name || rec.title || "";
    const sku  = slugify(String(rec.sku || rec.id || name || ""));
    const price = rec.price ?? rec.data_price ?? rec.min_price ?? "";
    const origin = rec.origin || "";
    const deeplink = rec.deeplink || "";
    const url = origin || deeplink || rec.url || rec.link || rec.href || "";
    const merchant = (rec.merchant ||
      (/shopee\.vn/i.test(url) ? "shopee" :
       /lazada\.vn/i.test(url) ? "lazada" :
       /tiki\.vn/i.test(url)   ? "tiki"    :
       /(tiktok|tiktokcdn)\./i.test(url) ? "tiktok" : "")
    ).toLowerCase();
    const image = rec.image || rec.img || `/assets/img/products/${sku}.webp`;
    const category = (rec.category || "").toLowerCase();
    const tags = toTags(rec.tags || rec.tag || rec.labels || rec.label);
    const desc = rec.description || rec.desc || "";
    return { name, sku, price, url, merchant, image, category, tags, desc };
  }

  const priceText = (v)=>{
    if (v==null || v==="") return "";
    const n = Number(String(v).replace(/[^\d.]/g,""));
    return Number.isFinite(n) ? n.toLocaleString("vi-VN")+"₫" : String(v);
  };

  function inCategory(item, category, aliases){
    if (!category) return true;
    const c = (item.category||"").toLowerCase();
    return c===category || aliases.includes(c);
  }
  function hasAnyTag(item, tagsAny){
    if (!tagsAny.length) return true;
    const s = new Set((item.tags||[]).map(x=>x.toLowerCase()));
    return tagsAny.some(t=>s.has(t));
  }

  ns.renderProducts = async function renderProducts(targetSel="#product-grid", limit) {
    const host = document.querySelector(targetSel);
    if (!host) return;

    const category = (host.getAttribute("data-category")||"").toLowerCase().trim();
    const aliases  = (host.getAttribute("data-alias")||"").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
    const tagsAny  = (host.getAttribute("data-tags") || "").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);

    const raw = await loadData();
    const rows = Array.isArray(raw) ? raw : [];
    const items = rows.map(normalize).filter(x =>
      x.url && inCategory(x, category, aliases) && hasAnyTag(x, tagsAny)
    );

    if (!items.length){
      host.innerHTML = `<div class="empty"><p class="muted">Chưa có sản phẩm cho danh mục này. Hãy nạp dữ liệu vào <code>/assets/data/affiliates.json</code>.</p></div>`;
      return;
    }

    const qs  = new URLSearchParams(location.search);
    const lim = qs.has("limit") ? Number(qs.get("limit")) : (Number.isFinite(limit)?limit:undefined);
    const take= Number.isFinite(lim) ? items.slice(0, lim) : items;

    host.innerHTML = take.map(x=>{
      const detail = `/g.html?sku=${encodeURIComponent(x.sku)}`;
      return `
<article class="product-card" data-sku="${x.sku}">
  <a class="thumb" href="${detail}">
    <img loading="lazy" src="${x.image}" alt="${x.name} — MXD" width="320" height="320">
  </a>
  <h3 class="name"><a href="${detail}">${x.name}</a></h3>
  <div class="price">${priceText(x.price)}</div>
  <div class="actions">
    <a class="buy" href="${x.url}" data-merchant="${x.merchant}" rel="nofollow">Mua trên ${x.merchant ? x.merchant.charAt(0).toUpperCase()+x.merchant.slice(1) : "cửa hàng"}</a>
  </div>
</article>`;
    }).join("");

    if (window.mxdAffiliate?.scan) window.mxdAffiliate.scan(host);
  };
})( (window.MXD = window.MXD || {}) );
