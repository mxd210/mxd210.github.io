// REPLACE WHOLE FILE: /assets/mxd-affiliate.js
// MXD Affiliate v2.1 — rewrite link sang isclix cho Shopee / Lazada / Tiki / TikTok

(() => {
  // === BASE isclix (đúng với bộ cậu vừa sửa) ===
  const AFF_BASE = {
    shopee: "https://go.isclix.com/deep_link/6803097511817356947/4751584435713464237?url=",
    lazada: "https://go.isclix.com/deep_link/6803097511817356947/5127144557053758578?url=",
    tiktok: "https://go.isclix.com/deep_link/6803097511817356947/6648523843406889655?url=",
    tiki:   "https://go.isclix.com/deep_link/6803097511817356947/4348614231480407268?url="
  };

  // Nhận diện sàn từ URL
  const MERCHANT_PATTERNS = {
    shopee: /(?:^https?:\/\/)?(?:\w+\.)?shopee\.vn/i,
    lazada: /(?:^https?:\/\/)?(?:\w+\.)?lazada\.vn/i,
    tiki:   /(?:^https?:\/\/)?(?:\w+\.)?tiki\.vn/i,
    tiktok: /(?:^https?:\/\/)?(?:\w+\.)?tiktok\.com/i
  };

  function detectMerchant(url) {
    if (!url) return null;
    for (const [name, re] of Object.entries(MERCHANT_PATTERNS)) {
      if (re.test(url)) return name;
    }
    return null;
  }

  // Chuẩn hoá URL gốc:
  // - bỏ khoảng trắng
  // - bỏ qua link đã là isclix
  // - tự thêm https:// nếu thiếu
  function normalizeOrigin(url) {
    if (!url) return null;
    let clean = url.trim();

    // Đã là link isclix thì thôi, không quấn lại
    if (/go\.isclix\.com\/deep_link/i.test(clean)) {
      return null;
    }

    if (clean === "#" || clean === "/") return null;

    if (!/^https?:\/\//i.test(clean)) {
      // Ví dụ: shopee.vn/...  -> https://shopee.vn/...
      clean = "https://" + clean.replace(/^\/+/, "");
    }

    return clean;
  }

  function buildAffiliateLink(originUrl, explicitMerchant) {
    const normalized = normalizeOrigin(originUrl);
    if (!normalized) return null;

    const merchant = (explicitMerchant || detectMerchant(normalized) || "").toLowerCase();
    const base = AFF_BASE[merchant];
    if (!base) return null;

    // isclix yêu cầu url= là URL đã encode
    return base + encodeURIComponent(normalized);
  }

  // Quét & rewrite link trong 1 vùng (hoặc cả document)
  function rewriteAnchors(root) {
    const scope = root || document;

    const anchors = scope.querySelectorAll(
      [
        "a[data-merchant]",
        "a[data-origin-url]",
        "a[data-origin]",
        "a[data-affiliate]",
        'a[href*="shopee.vn"]',
        'a[href*="lazada.vn"]',
        'a[href*="tiki.vn"]',
        'a[href*="tiktok.com"]'
      ].join(",")
    );

    anchors.forEach(a => {
      if (a.dataset.noAff === "1") return;

      let origin =
        a.dataset.originUrl ||
        a.getAttribute("data-origin-url") ||
        a.dataset.origin ||
        a.getAttribute("data-origin") ||
        a.getAttribute("data-href") ||
        a.href;

      const merchant = a.dataset.merchant;
      const aff = buildAffiliateLink(origin, merchant);
      if (!aff) return;

      a.href = aff;

      // Thêm rel cho an toàn & SEO
      const rel = (a.getAttribute("rel") || "").split(/\s+/);
      ["nofollow", "noopener", "noreferrer"].forEach(token => {
        if (!rel.includes(token)) rel.push(token);
      });
      a.setAttribute("rel", rel.join(" ").trim());
    });
  }

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  onReady(() => {
    // Lần đầu: quét toàn trang
    rewriteAnchors(document);

    // Nếu sau này JS khác render thêm sản phẩm thì observer sẽ quét tiếp
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) {
            rewriteAnchors(node);
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
