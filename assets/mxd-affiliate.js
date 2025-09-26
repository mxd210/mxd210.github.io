// /assets/mxd-affiliate.js — canonical rewrite (Shopee/Lazada).
// Yêu cầu: GA4 (assets/analytics.js) phải load TRƯỚC file này (defer).
(function () {
  // Tránh nạp lại nhiều lần
  if (window.mxdAffiliate && typeof window.mxdAffiliate.scan === "function") return;

  // === Templates AccessTrade (giữ nguyên ID của bạn) ===
  const TPL = {
    shopee: (url, s1 = "", s2 = "", s3 = "", s4 = "") =>
      `https://go.isclix.com/deep_link/6803097511817356947/4751584435713464237?url=${encodeURIComponent(url)}&sub1=${encodeURIComponent(s1)}&sub2=${encodeURIComponent(s2)}&sub3=${encodeURIComponent(s3)}&sub4=${encodeURIComponent(s4)}`,
    lazada: (url, s1 = "", s2 = "", s3 = "", s4 = "") =>
      `https://go.isclix.com/deep_link/6803097511817356947/4751584435713464237?url=${encodeURIComponent(url)}&sub1=${encodeURIComponent(s1)}&sub2=${encodeURIComponent(s2)}&sub3=${encodeURIComponent(s3)}&sub4=${encodeURIComponent(s4)}`
  };

  // === Helpers chung ===
  const qs = new URLSearchParams(location.search);
  const getMeta = (n) => document.querySelector(`meta[name="${n}"]`)?.content || "";
  const PAGE = location.pathname.includes("/store") ? "store" : (location.pathname.includes("/g") ? "g" : "page");
  const CAMPAIGN = getMeta("at:sub4") || "mxd210";
  const isDeep = (u) => /(^https?:\/\/)?([^/]*\.)?isclix\.com/i.test(u || "");
  const slugify = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  function getMerchant(u, dataAttr) {
    let m = (dataAttr || "").toLowerCase();
    if (m) return m;
    try {
      const h = new URL(u, location.href).hostname;
      if (h.includes("shopee")) return "shopee";
      if (h.includes("lazada")) return "lazada";
    } catch (_) {}
    return "";
  }

  function buildSubs(a, sku, merchant) {
    return {
      sub1: a.dataset.sub1 || qs.get("sub1") || getMeta("at:sub1") || sku || "",
      sub2: a.dataset.sub2 || qs.get("sub2") || getMeta("at:sub2") || merchant || "",
      sub3: a.dataset.sub3 || qs.get("sub3") || getMeta("at:sub3") || PAGE,
      sub4: a.dataset.sub4 || qs.get("sub4") || getMeta("at:sub4") || CAMPAIGN
    };
  }

  function ensureSubsInDeep(u, subs) {
    try {
      const U = new URL(u, location.href);
      if (!/isclix\.com/i.test(U.hostname)) return u;
      const p = U.searchParams;
      ["sub1", "sub2", "sub3", "sub4"].forEach((k) => { if (!p.get(k)) p.set(k, subs[k]); });
      U.search = p.toString();
      return U.toString();
    } catch {
      return u;
    }
  }

  function rewrite(a) {
    const origin = a.getAttribute("href") || "";
    if (!origin || !/^https?:\/\//i.test(origin) || isDeep(origin)) return; // bỏ qua rỗng/relative/đã deep

    const merchant = getMerchant(origin, a.dataset.merchant);
    if (!merchant || !TPL[merchant]) return;

    // SKU: ưu tiên data-sku, sau đó lấy từ phần tử cha hoặc text
    let sku = a.dataset.sku || a.closest("[data-sku]")?.dataset.sku || "";
    if (!sku) sku = slugify(a.textContent);

    const { sub1, sub2, sub3, sub4 } = buildSubs(a, sku, merchant);
    const deep = TPL[merchant](origin, sub1, sub2, sub3, sub4);

    a.href = deep;
    a.rel = "nofollow sponsored noopener";
    if (!a.target) a.target = "_blank";

    // Dev overlay: ?dev=1 sẽ hiển thị link final ngay dưới nút
    if (qs.get("dev") === "1") {
      if (!document.getElementById("dev-aff-style")) {
        const s = document.createElement("style");
        s.id = "dev-aff-style";
        s.textContent = `.dev-aff{font:12px/1.4 ui-monospace,monospace;word-break:break-all;color:#4b5563;margin:.25rem 0 .75rem}`;
        document.head.appendChild(s);
      }
      const box = document.createElement("div");
      box.className = "dev-aff";
      box.textContent = deep;
      a.insertAdjacentElement("afterend", box);
    }
  }

  function scan(scope = document) {
    // CHỈ rewrite a.buy; KHÔNG đụng a.product-meta theo chuẩn MXD210
    scope.querySelectorAll('a.buy[href^="http"]').forEach(rewrite);
  }

  // Bắt thẻ thêm động
  const mo = new MutationObserver((muts) =>
    muts.forEach((m) =>
      m.addedNodes.forEach((n) => {
        if (n.nodeType === 1) scan(n);
      })
    )
  );
  mo.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener("DOMContentLoaded", () => scan());

  // Fallback tuyệt đối: ÉP rewrite NGAY LÚC CLICK (kể cả scan chưa kịp)
  document.addEventListener(
    "click",
    function (e) {
      const a = e.target.closest("a.buy");
      if (!a) return;

      const hrefNow = a.getAttribute("href") || "";
      if (!/^https?:\/\//i.test(hrefNow)) return;

      // merchant & sku
      const merchant = getMerchant(hrefNow, a.dataset.merchant);
      if (!merchant || !TPL[merchant]) return;

      let sku = a.dataset.sku || a.closest("[data-sku]")?.dataset.sku || slugify(a.textContent);
      const subs = buildSubs(a, sku, merchant);

      const deep = isDeep(hrefNow)
        ? ensureSubsInDeep(hrefNow, subs) // đã deep thì bồi sub thiếu
        : TPL[merchant](hrefNow, subs.sub1, subs.sub2, subs.sub3, subs.sub4);

      if (deep !== hrefNow) {
        e.preventDefault();
        a.href = deep;
        a.rel = "nofollow sponsored noopener";
        if (!a.target) a.target = "_blank";
        location.href = deep;
      }
    },
    true
  );

  // Public API
  window.mxdAffiliate = { scan };
})();
