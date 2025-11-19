<!-- FILE:/assets/js/mxd-store.js -->

// MXD STORE GRID v2025-11-20
// Đọc /assets/data/affiliates.json, filter theo danh mục, render card + hover mô tả.
// Config qua window.MXD_STORE trước khi load file này.

(function(){
  const CFG = window.MXD_STORE || {};
  const SOURCE = CFG.source || "/assets/data/affiliates.json";
  const categorySlug = (CFG.category || "").toLowerCase();
  const container = document.querySelector(CFG.container || "#product-grid");
  const emptyEl = document.querySelector(CFG.emptySelector || "#empty");
  const limit = CFG.limit || 120;

  if (!container) return;

  const money = n => {
    const num = Number(n);
    return Number.isFinite(num)
      ? new Intl.NumberFormat("vi-VN").format(num) + "₫"
      : "";
  };

  const esc = s => String(s || "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[c]));

  const getShort = p => p.short_desc || p.seo_description || p.name || p.sku || "";

  function render(list){
    if (!list.length){
      if (emptyEl) emptyEl.style.display = "block";
      container.innerHTML = "";
      return;
    }
    const slice = list.slice(0, limit);
    container.innerHTML = slice.map(p => {
      const sku = (p.sku || "").toLowerCase();
      const name = p.name || sku || "Sản phẩm";
      const origin = p.origin || p.origin_url || p.url || p.link || "#";
      const merchant = (p.merchant || "").toLowerCase();
      const img = p.image || `/assets/img/products/${sku}.webp`;
      const priceHtml = Number.isFinite(+p.price)
        ? `<div class="price">${money(+p.price)}</div>` : "";
      const short = getShort(p);
      const shortTrim = short.length > 140 ? short.slice(0, 137) + "…" : short;
      const detailUrl = `/g.html?sku=${encodeURIComponent(sku)}`;

      return `
        <article class="product-card">
          <a class="product-meta sr-only"
             href="${esc(origin)}"
             data-merchant="${esc(merchant)}"
             data-sku="${esc(sku)}"
             data-img="/assets/img/products/${esc(sku)}.webp"
             ${Number.isFinite(+p.price) ? `data-price="${+p.price}"` : ""}>
            ${esc(name)}
          </a>

          <a href="${detailUrl}" class="thumb-link" aria-label="Xem chi tiết ${esc(name)}">
            <img loading="lazy" decoding="async"
                 src="${esc(img)}"
                 alt="${esc(name)}"
                 onerror="this.onerror=null;this.src='/assets/img/products/placeholder.webp'">
          </a>

          <div class="body">
            <h3 class="name">
              <a href="${detailUrl}">${esc(name)}</a>
            </h3>
            ${priceHtml}
            ${shortTrim ? `<p class="card-desc">${esc(shortTrim)}</p>` : ""}

            <div class="actions">
              <a class="buy"
                 href="${esc(origin)}"
                 data-merchant="${esc(merchant)}"
                 target="_blank"
                 rel="nofollow sponsored noopener">
                Mua ngay
              </a>
              <a class="info-btn" href="${detailUrl}">Thông tin</a>
            </div>
          </div>
        </article>
      `;
    }).join("");

    // Cho affiliate script xử lý deeplink
    try {
      if (window.mxdAffiliate && typeof window.mxdAffiliate.scan === "function") {
        window.mxdAffiliate.scan();
      }
    } catch(e) {
      console.warn("[MXD STORE] mxdAffiliate.scan error:", e);
    }
  }

  fetch(SOURCE, { cache:"no-store" })
    .then(r => r.ok ? r.json() : [])
    .then(all => {
      let arr = Array.isArray(all) ? all : (all.items || []);
      arr = arr.filter(p => p && (p.status || "active") !== "archived");

      if (categorySlug){
        arr = arr.filter(p =>
          (p.category || "").toLowerCase() === categorySlug
        );
      }

      // Sort: ưu tiên updated_at mới nhất, sau đó theo name
      arr.sort((a,b)=>{
        const ta = Date.parse(a.updated_at || "") || 0;
        const tb = Date.parse(b.updated_at || "") || 0;
        if (tb !== ta) return tb - ta;
        const na = (a.name || "").localeCompare(b.name || "", "vi");
        return na;
      });

      render(arr);
    })
    .catch(err => {
      console.error("[MXD STORE] load AFF error:", err);
      if (emptyEl) emptyEl.style.display = "block";
      container.innerHTML = "";
    });
})();
