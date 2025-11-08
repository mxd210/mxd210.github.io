// MXD-AFF v2025-11-08d — per-merchant AccessTrade (mxd210)
// Yêu cầu: GA4 (/assets/analytics.js) phải load TRƯỚC file này (defer)

(function () {
  // Cho phép tắt nhanh để debug: https://.../?skip-aff=1
  const qs = new URLSearchParams(location.search);
  const SKIP_AFF = qs.has("skip-aff");
  if (SKIP_AFF) {
    window.mxdAffiliate = { scan(){}, rewriteOne(){} };
    return;
  }

  if (window.mxdAffiliate && typeof window.mxdAffiliate.scan === "function") return;

  // ====== Cấu hình mxd210 (PUB & Campaign theo từng sàn) ======
  const PUB_ID = "6803097511817356947";
  const CAMPAIGN = {
    shopee: "4751584435713464237",
    lazada: "5127144557053758578",
    tiktok: "6648523843406889655",
    tiki:   "4348614231480407268"
  };

  // Cho phép override qua meta nếu cần:
  // <meta name="at:campaign:shopee" content="..."> ...
  ["shopee","lazada","tiki","tiktok"].forEach(m=>{
    const v = document.querySelector(`meta[name="at:campaign:${m}"]`)?.content?.trim();
    if (v) CAMPAIGN[m] = v;
  });

  const getMeta = (n) => document.querySelector(`meta[name="${n}"]`)?.content || "";
  const PAGE    = location.pathname.includes("/store") ? "store" : (location.pathname.includes("/g") ? "g" : "page");
  const AFF_DEBUG = qs.get("dev") === "1" || /^true$/i.test(getMeta("mxd-aff-debug"));
  const ALLOW_AFF_DEEPLINK = /^true$/i.test(getMeta("mxd-allow-aff-deeplink")); // default: false
  const CAMPAIGN_TAG = getMeta("at:sub4") || "mxd210";

  const DEEP_HOSTS = ["go.isclix.com", "isclix.com"];

  // Builder: deep_link/<PUB_ID>/<CAMPAIGN_ID>?url=<origin>&sub1..sub4
  const makeTpl = (campId) => (url, s1="", s2="", s3="", s4="") =>
    `https://go.isclix.com/deep_link/${PUB_ID}/${campId}?url=${encodeURIComponent(url)}&sub1=${encodeURIComponent(s1)}&sub2=${encodeURIComponent(s2)}&sub3=${encodeURIComponent(s3)}&sub4=${encodeURIComponent(s4)}`;

  const TPL = {
    shopee: makeTpl(CAMPAIGN.shopee),
    lazada: makeTpl(CAMPAIGN.lazada),
    tiki:   makeTpl(CAMPAIGN.tiki),
    tiktok: makeTpl(CAMPAIGN.tiktok)
  };

  const isDeep = (u) => {
    try { const h = new URL(u, location.href).hostname.toLowerCase(); return DEEP_HOSTS.some(d => h === d || h.endsWith("."+d)); }
    catch { return false; }
  };

  const slugify = (s) => (s || "")
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d')
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  // Nhận diện sàn từ hostname hoặc data-merchant
  function getMerchant(u, dataAttr) {
    let m = (dataAttr || "").toLowerCase();
    if (m) return m;
    try {
      const h = new URL(u, location.href).hostname.toLowerCase();
      if (h.includes("shopee") || h.endsWith("shp.ee")) return "shopee";     // shopee.vn, s.shopee.vn, shp.ee...
      if (h === "lzd.co" || h.endsWith(".lzd.co") || h.includes("lazada")) return "lazada";
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
      sub4: a.dataset.sub4 || qs.get("sub4") || getMeta("at:sub4") || CAMPAIGN_TAG
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
      const inner = x.searchParams.get('url') || x.searchParams.get('deeplink') || x.searchParams.get('u');
      return inner ? decodeURIComponent(inner) : '';
    } catch { return ''; }
  }

  function applyAttrs(a) {
    a.rel = "nofollow sponsored noopener";
    if (!a.target) a.target = "_blank";
  }

  function debugOverlay(a, msg) {
    if (!AFF_DEBUG) return;
    if (!document.getElementById("dev-aff-style")) {
      const s = document.createElement("style");
      s.id = "dev-aff-style";
      s.textContent = `.dev-aff{font:12px/1.4 ui-monospace,monospace;word-break:break-all;color:#4b5563;margin:.25rem 0 .75rem}`;
      document.head.appendChild(s);
    }
    const box = document.createElement("div");
    box.className = "dev-aff";
    box.textContent = msg;
    a.insertAdjacentElement("afterend", box);
  }

  function rewriteOne(a) {
    try{
      if (!a || a.dataset.noAff === '1') return;

      const hrefNow = a.getAttribute("href") || "";
      if (!hrefNow || !/^https?:\/\//i.test(hrefNow)) return;

      const merchant = getMerchant(hrefNow, a.dataset.merchant);
      if (!merchant || !TPL[merchant]) return; // Không biết sàn → bỏ qua an toàn

      const sku   = a.dataset.sku || a.closest("[data-sku]")?.dataset.sku || slugify(a.textContent);
      const subs  = buildSubs(a, sku, merchant);
      let finalUrl = hrefNow;

      if (isDeep(hrefNow)) {
        if (ALLOW_AFF_DEEPLINK) {
          finalUrl = ensureSubsInDeep(hrefNow, subs);
        } else {
          const origin = extractOriginFromDeep(hrefNow);
          finalUrl = origin ? TPL[merchant](origin, subs.sub1, subs.sub2, subs.sub3, subs.sub4)
                            : ensureSubsInDeep(hrefNow, subs);
        }
      } else {
        finalUrl = TPL[merchant](hrefNow, subs.sub1, subs.sub2, subs.sub3, subs.sub4);
      }

      if (finalUrl !== hrefNow) a.href = finalUrl;
      applyAttrs(a);
      debugOverlay(a, `[AFF] ${merchant} → ${finalUrl}`);
    }catch(_){ /* an toàn: không làm gì để tránh chặn click */ }
  }

  // Chỉ quét trong các vùng sản phẩm để tránh ảnh hưởng link khác
  function scan(scope = document) {
    scope.querySelectorAll('a.buy[href^="http"], a.buy-btn[href^="http"], [data-merchant][href^="http"]').forEach(rewriteOne);
  }

  const mo = new MutationObserver((muts) => {
    muts.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) scan(n); }));
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener("DOMContentLoaded", () => scan());

  // Click fallback: chỉ rewrite, KHÔNG preventDefault — để không chặn điều hướng
  document.addEventListener("click", function (e) {
    const a = e.target.closest?.("a.buy, a.buy-btn, a[data-merchant]");
    if (!a) return;
    rewriteOne(a);
    // Không e.preventDefault: để trình duyệt xử lý điều hướng bình thường
  }, false);

  window.mxdAffiliate = { scan, rewriteOne };
})();
// Auto-load Buy script cho toàn site (chỉ nạp 1 lần)
(() => {
  if (!window.__mxd_buy_loaded) {
    const s = document.createElement('script');
    s.defer = true;
    s.src = '/assets/mxd-buy.js?v=1';
    document.head.appendChild(s);
    window.__mxd_buy_loaded = true;
  }
})();
