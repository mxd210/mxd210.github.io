// REPLACE WHOLE FILE: /assets/live-price.js
// MXD Live Price v1.0.0 — gọi worker mxd-price-proxy và cập nhật giá trên lưới

(() => {
  // Worker của bạn:
  const PRICE_API = window.MXD_PRICE_API || "https://mxd6686.workers.dev";

  // Lấy tối đa 20 thẻ product-card đầu tiên để cập nhật
  const cards = Array.from(document.querySelectorAll(".product-card"));
  if (!cards.length) return;

  const items = cards.slice(0, 20).map(c => {
    const a = c.querySelector(".actions a.buy, .actions a.buy-btn");
    const sku = c.getAttribute("data-sku") || "";
    const merchant = (a?.dataset.merchant || "").toLowerCase();
    const url = a?.href || "";
    const priceEl = c.querySelector(".price");
    const listed = parsePrice(priceEl?.textContent);
    return { el: c, priceEl, url, merchant, listed, sku };
  }).filter(x => x.url && x.merchant);

  if (!items.length) return;

  const payload = items.map(x => ({ url: x.url, merchant: x.merchant }));

  fetch(`${PRICE_API}/v1/batch`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then(r => r.json())
    .then(data => {
      const arr = Array.isArray(data.items) ? data.items : [];
      arr.forEach((res, i) => {
        const it = items[i];
        if (!it || !res || !res.ok || !isFinite(+res.price_now)) return;

        const now = +res.price_now;
        if (it.priceEl) it.priceEl.textContent = fmt(now);

        // Đánh dấu deal nếu giá hiện tại thấp hơn giá niêm yết trong JSON
        if (it.listed && now < it.listed) {
          if (!it.el.querySelector(".badge-deal")) {
            const b = document.createElement("span");
            b.className = "badge badge-deal";
            b.textContent = `- ${Math.round(100 - (now / it.listed) * 100)}%`;
            const nameEl = it.el.querySelector(".name");
            if (nameEl) nameEl.appendChild(b);
          }
        }
      });
    })
    .catch(() => { /* im lặng nếu lỗi để không làm vỡ UI */ });

  function parsePrice(t) {
    if (!t) return null;
    const s = String(t).replace(/[^\d]/g, "");
    const n = parseInt(s || "0", 10);
    return isFinite(n) && n > 0 ? n : null;
  }
  function fmt(n) { return new Intl.NumberFormat("vi-VN").format(n) + "₫"; }
})();
