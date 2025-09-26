/* /assets/js/render-products.js — Canonical (origin+deeplink aware) */
(function () {
  const JSONS = ["/assets/data/affiliates.json", "/products.json"];
  const IMG_DIR = "/assets/img/products/";
  const PLACEHOLDER = IMG_DIR + "placeholder.webp";

  const slugify = s => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const isIsclix = u => /(^https?:\/\/)?([^/]*\.)?isclix\.com/i.test(u||"");
  const innerFromIsclix = u => { try {
      const U = new URL(u, location.href);
      if (!/isclix\.com/i.test(U.hostname)) return "";
      const inner = U.searchParams.get("url");
      return inner ? decodeURIComponent(inner) : "";
    } catch { return ""; } };
  const inferMerchant = url => /shopee\.vn/i.test(url||"") ? "shopee"
                         : /lazada\.vn/i.test(url||"") ? "lazada" : "";

  async function loadFirst(urls) {
    for (const u of urls) {
      try { const r = await fetch(u, { cache: "no-cache" }); if (r.ok) return await r.json(); } catch {}
    }
    return [];
  }

  function normalize(rec) {
    const origin   = rec.origin || "";
    const deeplink = rec.deeplink || "";
    const alt      = rec.url || rec.link || rec.href || "";
    const href     = origin || deeplink || alt || "";

    const baseForMerchant = origin || (isIsclix(href) ? innerFromIsclix(href) : href);

    const name = rec.name || rec.title || "";
    const sku0 = rec.sku || rec.id || slugify(name);
    const sku  = slugify(String(sku0 || ""));
    const price = rec.price ?? rec.data_price ?? rec.min_price ?? "";
    const img   = rec.image || rec.img || (IMG_DIR + sku + ".webp");
    const merchant = (rec.merchant || inferMerchant(baseForMerchant) || "").toLowerCase();

    return { name, sku, price, img, merchant, href, origin, deeplink };
  }

  function priceLabel(v) {
    if (v == null || v === "") return "";
    const n = Number(String(v).replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n.toLocaleString("vi-VN") + "₫" : String(v);
  }

  function cardHTML(x) {
    const mTitle = x.merchant ? x.merchant[0].toUpperCase()+x.merchant.slice(1) : "Shop";
    return `
      <div class="card" data-sku="${x.sku}">
        <img loading="lazy" src="${x.img}" onerror="this.src='${PLACEHOLDER}'" alt="${x.name}">
        <div class="body">
          <h3 class="name">${x.name}</h3>
          <div class="price">${priceLabel(x.price)}</div>

          <!-- Meta link (ẩn) để giữ metadata -->
          <a class="product-meta" href="${x.origin || x.href}"
             data-merchant="${x.merchant}" data-sku="${x.sku}"
             data-img="${x.img}" data-price="${x.price}"
             style="display:none">Meta</a>

          <a class="buy" href="${x.href}" data-merchant="${x.merchant}" data-sku="${x.sku}">
            Mua trên ${mTitle}
          </a>
        </div>
      </div>
    `;
  }

  async function renderProducts(selector = "#product-list", limit) {
    const wrap = document.querySelector(selector);
    if (!wrap) return;

    const raw = await loadFirst(JSONS);
    const rows = Array.isArray(raw) ? raw : [];
    const items = rows.map(normalize).filter(x => x.href); // chỉ cần có link là render

    if (!items.length) {
      const empty = document.getElementById("empty");
      if (empty) empty.style.display = "block";
      return;
    }

    const qs = new URLSearchParams(location.search);
    const lim = qs.has("limit") ? Number(qs.get("limit")) : (Number.isFinite(limit) ? limit : undefined);
    const take = Number.isFinite(lim) ? items.slice(0, lim) : items;

    wrap.innerHTML = take.map(cardHTML).join("");

    // Kích hoạt affiliate rewrite (nếu load sau DOMContentLoaded)
    if (window.mxdAffiliate?.scan) window.mxdAffiliate.scan(wrap);
  }

  window.MXD = Object.assign(window.MXD || {}, { renderProducts });
})();
