// REPLACE WHOLE FILE: /assets/mxd-affiliate.js
// MXD-AFF v2025-11-08
// Chuẩn MXD: GA4 (/assets/analytics.js) phải load TRƯỚC file này (defer)
//
// Tính năng:
// - Origin-only rewrite: href gốc -> deeplink AccessTrade theo merchant (Shopee/Lazada/Tiki/TikTok)
// - Tương thích deeplink sẵn có (isclix...): nếu <meta name="mxd-allow-aff-deeplink" content="true"> thì bồi sub1..sub4;
//   ngược lại cố rút origin từ param (url|deeplink|u) để tạo deeplink mới (tránh double-hop).
// - Bỏ qua a.buy[data-no-aff="1"]
// - Idempotent & click-fallback: đảm bảo rewrite kể cả khi scan chưa kịp
// - Debug overlay: ?dev=1 hoặc <meta name="mxd-aff-debug" content="true">
// - Public API: window.mxdAffiliate.scan(scope?), window.mxdAffiliate.rewriteOne(a)

(function () {
  if (window.mxdAffiliate && typeof window.mxdAffiliate.scan === "function") return;

  // ====== Cấu hình & Flags ======
  const qs     = new URLSearchParams(location.search);
  const getMeta= (n) => document.querySelector(`meta[name="${n}"]`)?.content || "";
  const PAGE   = location.pathname.includes("/store") ? "store" : (location.pathname.includes("/g") ? "g" : "page");

  const AFF_DEBUG            = qs.get("dev") === "1" || /^true$/i.test(getMeta("mxd-aff-debug"));
  const ALLOW_AFF_DEEPLINK   = /^true$/i.test(getMeta("mxd-allow-aff-deeplink")); // default: false
  const CAMPAIGN             = getMeta("at:sub4") || "mxd210";

  // Chỉ coi là "deeplink" với host isclix (AccessTrade). Tránh bắt nhầm.
  const DEEP_HOSTS = ["isclix.com", "go.isclix.com"];

  // ====== Templates AccessTrade (ID của mxd210 – giữ nguyên) ======
  const TPL = {
    shopee: (url, s1 = "", s2 = "", s3 = "", s4 = "") =>
      `https://go.isclix.com/deep_link/6803097511817356947/4751584435713464237?url=${encodeURIComponent(url)}&sub1=${encodeURIComponent(s1)}&sub2=${encodeURIComponent(s2)}&sub3=${encodeURIComponent(s3)}&sub4=${encodeURIComponent(s4)}`,
    lazada: (url, s1 = "", s2 = "", s3 = "", s4 = "") =>
      `https://go.isclix.com/deep_link/6803097511817356947/4751584435713464237?url=${encodeURIComponent(url)}&sub1=${encodeURIComponent(s1)}&sub2=${encodeURIComponent(s2)}&sub3=${encodeURIComponent(s3)}&sub4=${encodeURIComponent(s4)}`,
    tiki: (url, s1 = "", s2 = "", s3 = "", s4 = "") =>
      `https://go.isclix.com/deep_link/6803097511817356947/4751584435713464237?url=${encodeURIComponent(url)}&sub1=${encodeURIComponent(s1)}&sub2=${encodeURIComponent(s2)}&sub3=${encodeURIComponent(s3)}&sub4=${encodeURIComponent(s4)}`,
    tiktok: (url, s1 = "", s2 = "", s3 = "", s4 = "") =>
      `https://go.isclix.com/deep_link/6803097511817356947/4751584435713464237?url=${encodeURIComponent(url)}&sub1=${encodeURIComponent(s1)}&sub2=${encodeURIComponent(s2)}&sub3=${encodeURIComponent(s3)}&sub4=${encodeURIComponent(s4)}`
  };

  // ====== Helpers ======
  const isDeep = (u) => {
    try {
      const h = new URL(u, location.href).hostname;
      return DEEP_HOSTS.some(d => h.endsWith(d) || h.includes(d));
    } catch { return false; }
  };

  const slugify = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  function getMerchant(u, dataAttr) {
    let m = (dataAttr || "").toLowerCase();
    if (m) return m;
    try {
      const h = new URL(u, location.href).hostname.toLowerCase();
      // Shopee
      if (h.includes("shopee")) return "shopee";
      // Lazada: đủ mọi biến thể (lzd.co, s.lazada.vn, lazada.vn/sg/…)
      if (h === "lzd.co" || h.endsWith(".lzd.co") || h.includes("lazada")) return "lazada";
      // Tiki
      if (h.includes("tiki")) return "tiki";
      // TikTok shop
      if (h.includes("tiktok")) return "tiktok";
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
      if (!isDeep(U.toString())) return u;
      const p = U.searchParams;
      ["sub1","sub2","sub3","sub4"].forEach(k => { if (!p.get(k) && subs[k]) p.set(k, subs[k]); });
      U.search = p.toString();
      return U.toString();
    } catch { return u; }
  }

  function extractOriginFromDeep(u='') {
    try {
      const x = new URL(u, location.href);
      // Nhiều hệ thống dùng url=, deeplink=, u=
      const inner = x.searchParams.get('url') || x.searchParams.get('deeplink') || x.searchParams.get('u');
      return inner ? decodeURIComponent(inner) : '';
    } catch { return ''; }
  }

  function applyAttrs(a) {
    a.rel = "nofollow sponsored noopener";
    if (!a.target) a.target = "_blank";
  }

  function debugOverlay(a, deepUrl) {
    if (!AFF_DEBUG) return;
    if (!document.getElementById("dev-aff-style")) {
      const s = document.createElement("style");
      s.id = "dev-aff-style";
      s.textContent = `.dev-aff{font:12px/1.4 ui-monospace,monospace;word-break:break-all;color:#4b5563;margin:.25rem 0 .75rem}`;
      document.head.appendChild(s);
    }
    const box = document.createElement("div");
    box.className = "dev-aff";
    box.textContent = deepUrl;
    a.insertAdjacentElement("afterend", box);
  }

  // ====== Core rewrite ======
  function rewriteOne(a) {
    if (!a || a.dataset.noAff === '1') return;

    let hrefNow = a.getAttribute("href") || "";
    if (!hrefNow || !/^https?:\/\//i.test(hrefNow)) return;

    const merchant = getMerchant(hrefNow, a.dataset.merchant);
    if (!merchant || !TPL[merchant]) return;

    let sku  = a.dataset.sku || a.closest("[data-sku]")?.dataset.sku || slugify(a.textContent);
    const subs = buildSubs(a, sku, merchant);

    let finalUrl = hrefNow;

    if (isDeep(hrefNow)) {
      if (ALLOW_AFF_DEEPLINK) {
        finalUrl = ensureSubsInDeep(hrefNow, subs);
      } else {
        const origin = extractOriginFromDeep(hrefNow);
        if (origin) finalUrl = TPL[merchant](origin, subs.sub1, subs.sub2, subs.sub3, subs.sub4);
        else finalUrl = ensureSubsInDeep(hrefNow, subs);
      }
    } else {
      finalUrl = TPL[merchant](hrefNow, subs.sub1, subs.sub2, subs.sub3, subs.sub4);
    }

    if (finalUrl !== hrefNow) a.href = finalUrl;
    applyAttrs(a);
    debugOverlay(a, finalUrl);
  }

  function scan(scope = document) {
    scope.querySelectorAll('a.buy[href^="http"], a.buy-btn[href^="http"]').forEach(rewriteOne);
  }

  const mo = new MutationObserver((muts) => {
    muts.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) scan(n); }));
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener("DOMContentLoaded", () => scan());

  // Click fallback
  document.addEventListener("click", function (e) {
    const a = e.target.closest && e.target.closest("a.buy, a.buy-btn");
    if (!a) return;

    let hrefNow = a.getAttribute("href") || "";
    if (!/^https?:\/\//i.test(hrefNow) || a.dataset.noAff === '1') return;

    const before = hrefNow;
    rewriteOne(a);
    const after = a.getAttribute("href") || before;

    if (after !== before) {
      e.preventDefault();
      location.href = after;
    }
  }, true);

  window.mxdAffiliate = { scan, rewriteOne };
})();
