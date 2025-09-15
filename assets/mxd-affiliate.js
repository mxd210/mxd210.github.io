// /assets/mxd-affiliate.js
(() => {
  // Domain affiliate cần track
  const MERCHANTS = {
    "shopee.vn": true,
    "lazada.vn": true,
    "s.lazada.vn": true,
    "tiki.vn": true,
    "go.isclix.com": true // Accesstrade deep link
  };

  const REQUIRED_REL = "nofollow sponsored noreferrer noopener";
  const gtagSafe = window.gtag || function(){ (window.dataLayer = window.dataLayer || []).push(arguments); };
  const isMod = (e) => e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1;

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

      if (a.dataset.affBound) return;
      a.addEventListener("click", (e) => {
        const href = a.href;

        // Nếu mở cùng tab & không dùng phím bổ trợ → giữ điều hướng 1 nhịp để gửi event
        const sameTab = (a.target === "_self" || !a.target) && !isMod(e);
        if (sameTab) {
          e.preventDefault();
          let done = false;
          const go = () => { if (!done) { done = true; location.href = href; } };
          const t = setTimeout(go, 700);

          gtagSafe("event", "affiliate_click", {
            merchant: host,
            link_url: href,
            page_location: location.href,
            page_title: document.title,
            event_label: host,
            debug_mode: true,
            event_callback: () => { clearTimeout(t); go(); }
          });
        } else {
          // Mở tab mới hoặc dùng phím bổ trợ → chỉ bắn event
          gtagSafe("event", "affiliate_click", {
            merchant: host,
            link_url: href,
            page_location: location.href,
            page_title: document.title,
            event_label: host,
            debug_mode: true
          });
        }
      }, { capture: true, passive: false });

      a.dataset.affBound = "1";
    } catch (_) { /* ignore bad URL */ }
  }

  // Quét ban đầu
  document.querySelectorAll('a[href^="http"]').forEach(decorateAnchor);

  // Tự bind cho link thêm động (SPA, lazyload…)
  new MutationObserver(muts => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.matches && n.matches('a[href^="http"]')) decorateAnchor(n);
        if (n.querySelectorAll) n.querySelectorAll('a[href^="http"]').forEach(decorateAnchor);
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
