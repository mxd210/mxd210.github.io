/* MXD Buy v1.0 — Drop-in, không phá layout cũ.
   Tự tìm nút mua và gắn link affiliate cho Shopee/Lazada/Tiki/TikTok.
   Cách dùng: chỉ cần nhúng <script defer src="/assets/mxd-buy.js?v=1"></script> trước </body>.
*/

(() => {
  // ====== Cấu hình AccessTrade (mxd210) ======
  const PUB_ID = "6803097511817356947";
  const CAMPAIGN = {
    shopee: "4751584435713464237",
    lazada: "5127144557053758578",
    tiktok:  "6648523843406889655",
    tiki:    "4348614231480407268"
  };
  const SUB4_DEFAULT = "mxd210";           // nhận diện nguồn web
  const USE_WORKER   = false;              // đặt true nếu muốn dùng Worker /aff
  const WORKER_AFF   = "https://mxd210.mxd6686.workers.dev"; // nếu USE_WORKER=true

  // ====== Tiện ích ======
  const q = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const cleanQuery = (raw, keep=[]) => {
    try {
      const u = new URL(raw);
      [...u.searchParams.keys()].forEach(k => { if (!keep.includes(k)) u.searchParams.delete(k); });
      return u.origin + u.pathname + (u.searchParams.toString() ? `?${u.searchParams}` : "");
    } catch { return raw; }
  };

  const normalize = (merchant, url) => {
    if (!url) return url;
    url = url.trim();
    if (merchant === "shopee") {
      // bỏ sp_atk, xptdk, extraParams... giữ đường dẫn gốc
      return cleanQuery(url);
    }
    if (merchant === "lazada") {
      // bỏ clickTrackInfo, spm, rn, channelLpJumpArgs...
      return cleanQuery(url);
    }
    if (merchant === "tiki") {
      return cleanQuery(url);
    }
    if (merchant === "tiktok") {
      // chấp nhận vt.tiktok.com hoặc product link, encode nguyên trạng
      return url;
    }
    return url;
  };

  const makeIsclix = (merchant, dest, sub1="", sub4=SUB4_DEFAULT) => {
    const camp = CAMPAIGN[merchant];
    if (!camp) return dest; // fallback
    const base = `https://go.isclix.com/deep_link/${PUB_ID}/${camp}`;
    const url  = encodeURIComponent(dest);
    const s1   = sub1 ? `&sub1=${encodeURIComponent(sub1)}` : "";
    const s4   = sub4 ? `&sub4=${encodeURIComponent(sub4)}` : "";
    return `${base}?url=${url}${s1}${s4}`;
  };

  const makeLink = async (merchant, rawUrl, sub1, sub4) => {
    const dest = normalize(merchant, rawUrl);
    if (!dest) return null;

    if (USE_WORKER && WORKER_AFF) {
      try {
        const r = await fetch(`${WORKER_AFF}/aff?merchant=${merchant}&url=${encodeURIComponent(dest)}&sub1=${encodeURIComponent(sub1||"")}&sub4=${encodeURIComponent(sub4||SUB4_DEFAULT)}`, {headers:{'x-mxd':'buy-v1'}});
        const j = await r.json().catch(()=>null);
        if (j && j.url) return j.url;
      } catch {}
    }
    return makeIsclix(merchant, dest, sub1, sub4);
  };

  const enhanceNode = async (el) => {
    // Ưu tiên data-*, fallback theo class
    const merchant =
      el.dataset.merchant ||
      (el.classList.contains("btn-shopee") ? "shopee" :
       el.classList.contains("btn-lazada") ? "lazada" :
       el.classList.contains("btn-tiki")   ? "tiki"   :
       el.classList.contains("btn-tiktok") ? "tiktok" : "");

    if (!merchant) return;

    const rawUrl = el.dataset.url || el.getAttribute("data-href") || el.getAttribute("href");
    if (!rawUrl) return;

    const sub1 = el.dataset.sku || el.dataset.sub1 || "";
    const sub4 = el.dataset.sub4 || SUB4_DEFAULT;

    const aff = await makeLink(merchant, rawUrl, sub1, sub4);
    if (!aff) return;

    if (el.tagName === "A") {
      el.href = aff;
      el.target = "_blank";
      el.rel = "nofollow sponsored noopener";
    } else {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        window.open(aff, "_blank", "noopener");
      }, {passive:false});
    }
    el.dataset.ready = "1";
  };

  const scan = () => {
    // Hỗ trợ nhiều kiểu markup sẵn có
    const sels = [
      'a[data-merchant][data-url]',
      'button[data-merchant][data-url]',
      'a.btn-shopee[data-url],button.btn-shopee[data-url]',
      'a.btn-lazada[data-url],button.btn-lazada[data-url]',
      'a.btn-tiki[data-url],button.btn-tiki[data-url]',
      'a.btn-tiktok[data-url],button.btn-tiktok[data-url]',
      // fallback: thẻ <a> có data-merchant, href là link gốc (tool cũ)
      'a[data-merchant][href^="http"]'
    ];
    const nodes = sels.flatMap(s => q(s)).filter(el => !el.dataset.ready);
    nodes.forEach(enhanceNode);
  };

  // Lần đầu + khi DOM thay đổi (lưới sản phẩm nạp động)
  document.addEventListener("DOMContentLoaded", scan);
  const mo = new MutationObserver(() => scan());
  mo.observe(document.documentElement, {childList:true,subtree:true});
})();
