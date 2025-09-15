// /assets/mxd-affiliate.js
(() => {
  // Các domain affiliate/hãng bán lẻ mà ta muốn xử lý
  const MERCHANTS = {
    "shopee.vn": true,
    "lazada.vn": true,
    "s.lazada.vn": true,
    "tiki.vn": true,
    "go.isclix.com": true // Accesstrade deep link
  };

  const REQUIRED_REL = "nofollow sponsored noreferrer noopener";

  // gtag shim: không làm vỡ trang nếu GA chưa load
  const gtagSafe = window.gtag || function () {
    (window.dataLayer = window.dataLayer || []).push(arguments);
  };

  // Gắn thuộc tính & bind event GA cho 1 thẻ <a>
  function decorateAnchor(a) {
    try {
      const u = new URL(a.href);
      const host = u.hostname.replace(/^www\./, "");
      if (!MERCHANTS[host]) return;

      // Bổ sung rel/target an toàn
      const rel = new Set((a.getAttribute("rel") || "").split(/\s+/).filter(Boolean));
      REQUIRED_REL.split(" ").forEach(t => rel.add(t));
      a.setAttribute("rel", Array.from(rel).join(" "));
      if (!a.getAttribute("target")) a.setAttribute("target", "_blank");

      // Gắn event GA4 (mỗi thẻ chỉ bind 1 lần)
      if (!a.dataset.affBound) {
        a.addEventListener(
          "click",
          () => {
            gtagSafe("event", "affiliate_click", {
              merchant: host,
              link_url: a.href,
              page_location: location.href,
              page_title: document.title,
              event_label: host
            });
          },
          { capture: true, passive: true }
        );
        a.dataset.affBound = "1";
      }

      // Nếu sau này cần thêm tham số affiliate/utm cho từng merchant,
      // bổ sung tại đây trước khi set a.href (để giữ nguyên click tracking).
      // Ví dụ (minh hoạ):
      // if (host === "lazada.vn") { u.searchParams.set("utm_source","mxd210"); a.href = u.toString(); }

    } catch (_) {
      /* lờ lỗi URL không hợp lệ */
    }
  }

  // Quét ban đầu
  document.querySelectorAll('a[href^="http"]').forEach(decorateAnchor);

  // Tự động bind cho anchor được thêm động về sau (SPA, lazy load…)
  const mo = new MutationObserver(muts => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue; // không phải Element
        if (n.matches && n.matches('a[href^="http"]')) decorateAnchor(n);
        if (n.querySelectorAll) n.querySelectorAll('a[href^="http"]').forEach(decorateAnchor);
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
