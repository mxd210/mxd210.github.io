// /assets/mxd-affiliate.js — Canonical v2025-11-20
(function () {
  const AFF_BASE = {
    shopee: "https://go.isclix.com/deep_link/6803097511817356947/4751584435713464237/4751584435713464237?url=",
    lazada: "https://go.isclix.com/deep_link/6803097511817356947/5127144557053758578?url=",
    tiktok: "https://go.isclix.com/deep_link/6803097511817356947/6648523843406889655?url=",
    tiki:   "https://go.isclix.com/deep_link/6803097511817356947/4348614231480407268?url="
  };

  function detectMerchant(url) {
    try {
      if (!url) return "";
      const u = new URL(url.startsWith("http") ? url : "https://" + url);
      const h = u.hostname.toLowerCase();
      if (h.includes("shopee")) return "shopee";
      if (h.includes("lazada")) return "lazada";
      if (h.includes("tiki")) return "tiki";
      if (h.includes("tiktok")) return "tiktok";
      return "";
    } catch { return ""; }
  }

  function normalizeOrigin(url) {
    url = (url || "").trim();
    if (!url) return "";
    if (url.includes("go.isclix.com")) return url; // đã là deeplink

    if (!/^https?:\/\//i.test(url)) {
      const starts = ["shopee.vn", "www.shopee.vn", "lazada.vn", "www.lazada.vn", "tiki.vn", "www.tiki.vn", "tiktok.com", "www.tiktok.com"];
      if (starts.some(s => url.startsWith(s))) url = "https://" + url.replace(/^https?:\/\//i, "");
    }
    return url;
  }

  async function loadMap() {
    try {
      const r = await fetch("/assets/data/affiliates.json", { cache: "no-store" });
      if (!r.ok) return {};
      const j = await r.json();
      const arr = Array.isArray(j) ? j : (j.items || []);
      const map = {};
      arr.forEach(p => {
        if (p && p.sku) map[String(p.sku).toLowerCase()] = p;
      });
      return map;
    } catch { return {}; }
  }

  async function scan() {
    const btns = Array.from(document.querySelectorAll("a.buy[data-merchant], a.buy[data-sku]"));
    if (!btns.length) return;

    const map = await loadMap();

    btns.forEach(btn => {
      try {
        const sku = String(btn.dataset.sku || "").toLowerCase();
        const product = (sku && map[sku]) || null;

        let origin = product?.origin || product?.origin_url || btn.getAttribute("href") || "";
        origin = normalizeOrigin(origin);

        if (origin.includes("go.isclix.com")) { btn.href = origin; return; }

        let merchant = (btn.dataset.merchant || product?.merchant || detectMerchant(origin) || "").toLowerCase();

        // Nếu vẫn không suy ra merchant mà cũng không có origin → giữ nguyên (tránh 404)
        if (!merchant && !origin) { btn.href = "#"; return; }

        // Ưu tiên deeplink có sẵn
        let deeplink = (product && product.deeplink) || "";

        // Tự wrap deeplink nếu chưa có
        if (!deeplink && origin && AFF_BASE[merchant]) {
          deeplink = AFF_BASE[merchant] + encodeURIComponent(origin);
        }

        btn.href = deeplink || origin || "#";
        if (merchant) btn.dataset.merchant = merchant;
      } catch (e) {
        console.error("mxd-affiliate: error on a button", e);
      }
    });
  }

  // Expose để trang gọi lại khi render động
  window.mxdAffiliate = window.mxdAffiliate || {};
  window.mxdAffiliate.scan = scan;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan, { once: true });
  } else {
    scan();
  }
})();
