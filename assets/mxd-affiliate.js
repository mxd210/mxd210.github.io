// /assets/mxd-affiliates.js
(() => {
  // AccessTrade deep-link base của mxd210
  const BASE = {
    // Shopee cần bản 3-đoạn để tránh 404
    shopee: "https://go.isclix.com/deep_link/6803097511817356947/4751584435713464237/4751584435713464237?url=",
    lazada: "https://go.isclix.com/deep_link/6803097511817356947/5127144557053758578?url=",
    tiktok: "https://go.isclix.com/deep_link/6803097511817356947/6648523843406889655?url=",
    tiki:   "https://go.isclix.com/deep_link/6803097511817356947/4348614231480407268?url="
  };

  const SUB4 = (window.MXD_SUB4 || document.documentElement.dataset.sub4 || "mxd210").trim();
  const isIsclix = (href) => /^https?:\/\/(go\.)?isclix\.com\/deep_link/.test(href);

  // Bỏ query/hash “bẩn” (sp_atk, xptdk...) để tránh 404 tại sàn
  function sanitizeOrigin(merchant, urlStr){
    try{
      const u = new URL(urlStr);
      if (["shopee","lazada","tiki","tiktok"].includes(merchant)) {
        u.search = ""; // giữ nguyên path, bỏ toàn bộ query
        u.hash = "";
      }
      return u.toString();
    }catch(e){ return urlStr; }
  }

  function makeDeepLink(merchant, origin){
    const base = BASE[(merchant||"").toLowerCase()];
    if (!base) return null;
    let o = origin || "";
    if (!/^https?:\/\//.test(o) || isIsclix(o)) return null;
    o = sanitizeOrigin(merchant.toLowerCase(), o);
    return base + encodeURIComponent(o) + "&sub4=" + encodeURIComponent(SUB4);
  }

  function wireCard(meta){
    const merchant = (meta.dataset.merchant || "").toLowerCase();
    const origin   = meta.getAttribute("href") || meta.dataset.origin || meta.dataset.url || "";
    const deeplink = makeDeepLink(merchant, origin);
    if (!deeplink) return;

    const root = meta.closest("[data-sku]") || meta.closest(".product-card") || document;
    root.querySelectorAll("a.buy").forEach(a => {
      a.href = deeplink;
      a.target = "_blank";
      a.rel = "nofollow noopener";
      a.dataset.deeplink = "1";
    });
  }

  function scan(){
    document.querySelectorAll("a.product-meta").forEach(wireCard);

    // Fallback cho nút mua đứng 1 mình
    document.querySelectorAll("a.buy[data-merchant]").forEach(a => {
      if (isIsclix(a.href)) return;
      const origin = a.getAttribute("href") || a.dataset.origin || a.dataset.url || "";
      const dl = makeDeepLink(a.dataset.merchant, origin);
      if (dl) {
        a.href = dl; a.target = "_blank"; a.rel = "nofollow noopener"; a.dataset.deeplink = "1";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", scan);
  new MutationObserver(scan).observe(document.documentElement, {subtree:true, childList:true});
  window.MXD_AFF_OK = true;
})();
