// /assets/mxd-affiliate.js — MXD-AFF v2025-10-11
// Chuẩn: GA4 (/assets/analytics.js) phải load TRƯỚC file này (defer)
// Tính năng:
// - Origin-only rewrite: href gốc -> deeplink theo merchant (Shopee/Lazada/Tiki/TikTok)
// - Compat deeplink cũ: nếu href hiện tại đã là deeplink (isclix...) => chỉ bồi sub1..sub4
//   *Nếu meta <mxd-allow-aff-deeplink content="false|"> (mặc định) => cố gắng rút origin từ param url= rồi tạo deeplink mới từ origin
// - Idempotent: không double-rewrite; click-fallback đảm bảo rewrite kể cả khi scan chưa kịp
// - Debug overlay: ?dev=1 hoặc <meta name="mxd-aff-debug" content="true"> để hiện deeplink dưới nút
// - Bỏ qua khi a.buy có data-no-aff="1"
// - Public API: window.mxdAffiliate.scan(scope?), window.mxdAffiliate.rewriteOne(a)

(function () {
  // Tránh nạp lại nhiều lần
  if (window.mxdAffiliate && typeof window.mxdAffiliate.scan === "function") return;

  // ====== Cấu hình & Flags ======
  const qs = new URLSearchParams(location.search);
  const getMeta = (n) => document.querySelector(`meta[name="${n}"]`)?.content || "";
  const PAGE = location.pathname.includes("/store") ? "store" : (location.pathname.includes("/g") ? "g" : "page");

  const AFF_DEBUG = qs.get("dev") === "1" || /^true$/i.test(getMeta("mxd-aff-debug"));
  const ALLOW_AFF_DEEPLINK = /^true$/i.test(getMeta("mxd-allow-aff-deeplink")); // default: false
  const CAMPAIGN = getMeta("at:sub4") || "mxd210";

  // Domains deeplink (AccessTrade, v.v.)
  const DEEP_HOSTS = ['isclix.com', 'go.isclix.com', 'deeplink', 'deep_link'];

  // ====== Templates AccessTrade (giữ nguyên ID của bạn) ======
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
    try { const h = new URL(u, location.href).hostname; return DEEP_HOSTS.some(d => h.includes(d)); }
    catch { return false; }
  };
  const slugify = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  function getMerchant(u, dataAttr) {
    let m = (dataAttr || "").toLowerCase();
    if (m) return m;
    try {
      const h = new URL(u, location.href).hostname;
      if (h.includes("shopee")) return "shopee";
      if (h.includes("lazada")) return "lazada";
      if (h.includes("tiki")) return "tiki";
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
      // Các nhà mạng thường dùng ?url= hoặc ?deeplink=
      const inner = x.searchParams.get('url') || x.searchParams.get('deeplink');
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
    if (!hrefNow || !/^https?:\/\//i.test(hrefNow)) return; // bỏ qua rỗng/relative

    const merchant = getMerchant(hrefNow, a.dataset.merchant);
    if (!merchant || !TPL[merchant]) return;

    // SKU: ưu tiên data-sku, sau đó node cha hoặc text
    let sku = a.dataset.sku || a.closest("[data-sku]")?.dataset.sku || slugify(a.textContent);
    const subs = buildSubs(a, sku, merchant);

    let finalUrl = hrefNow;

    if (isDeep(hrefNow)) {
      // Đã là deeplink:
      if (ALLOW_AFF_DEEPLINK) {
        // Giữ deeplink, chỉ bồi sub thiếu
        finalUrl = ensureSubsInDeep(hrefNow, subs);
      } else {
        // Cố gắng rút origin từ param để tạo deeplink mới từ origin
        const origin = extractOriginFromDeep(hrefNow);
        if (origin) {
          finalUrl = TPL[merchant](origin, subs.sub1, subs.sub2, subs.sub3, subs.sub4);
        } else {
          // Không rút được -> tối thiểu bồi sub để không mất tracking
          finalUrl = ensureSubsInDeep(hrefNow, subs);
        }
      }
    } else {
      // Chưa deep -> tạo deeplink từ origin
      finalUrl = TPL[merchant](hrefNow, subs.sub1, subs.sub2, subs.sub3, subs.sub4);
    }

    if (finalUrl !== hrefNow) a.href = finalUrl;
    applyAttrs(a);
    debugOverlay(a, finalUrl);
  }

  function scan(scope = document) {
    scope.querySelectorAll('a.buy[href^="http"]').forEach(rewriteOne);
  }

  // Quan sát DOM động
  const mo = new MutationObserver((muts) => {
    muts.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) scan(n); }));
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener("DOMContentLoaded", () => scan());

  // Fallback: ÉP rewrite ngay lúc click (kể cả scan chưa kịp)
  document.addEventListener("click", function (e) {
    const a = e.target.closest("a.buy");
    if (!a) return;

    let hrefNow = a.getAttribute("href") || "";
    if (!/^https?:\/\//i.test(hrefNow) || a.dataset.noAff === '1') return;

    const before = hrefNow;
    rewriteOne(a); // sẽ cập nhật a.href nếu cần
    const after = a.getAttribute("href") || before;

    if (after !== before) {
      e.preventDefault();
      location.href = after;
    }
  }, true);

  // Public API
  window.mxdAffiliate = { scan, rewriteOne };
})();
