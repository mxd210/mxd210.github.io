// /assets/mxd-affiliate.js
(() => {
  const BASE = {
    shopee: "https://go.isclix.com/deep_link/6803097511817356947/4751584435713464237/4751584435713464237?url=",
    lazada: "https://go.isclix.com/deep_link/6803097511817356947/5127144557053758578?url=",
    tiktok: "https://go.isclix.com/deep_link/6803097511817356947/6648523843406889655?url=",
    tiki:   "https://go.isclix.com/deep_link/6803097511817356947/4348614231480407268?url="
  };
  const SUB4 = (window.MXD_SUB4 || document.documentElement.dataset.sub4 || "mxd210").trim();
  const isIsclix = (h)=>/^https?:\/\/(go\.)?isclix\.com\/deep_link/.test(h);
  function sanitize(merchant, urlStr){ try{ const u=new URL(urlStr); u.search=""; u.hash=""; return u.toString(); }catch{ return urlStr; } }
  function mk(merchant, origin){
    const base = BASE[(merchant||"").toLowerCase()];
    if(!base) return null; if(!origin || !/^https?:\/\//.test(origin) || isIsclix(origin)) return null;
    return base + encodeURIComponent(sanitize(merchant, origin)) + "&sub4=" + encodeURIComponent(SUB4);
  }
  function rewriteIn(root, m, o){
    const dl = mk(m,o); if(!dl) return;
    root.querySelectorAll("a.buy, a.buy-btn, #p-buy").forEach(a=>{
      a.href=dl; a.target="_blank"; a.rel="nofollow noopener sponsored"; a.dataset.deeplink="1";
    });
  }
  function fromCard(card){
    const meta = card.querySelector("a.product-meta");
    const btn  = card.querySelector("a.buy, a.buy-btn, #p-buy");
    const m=(card.dataset.merchant||meta?.dataset.merchant||btn?.dataset.merchant||"").toLowerCase();
    const o=card.dataset.origin||meta?.getAttribute("href")||btn?.dataset.origin||btn?.getAttribute("href")||"";
    rewriteIn(card,m,o);
  }
  function scan(){
    document.querySelectorAll(".product-card,[data-sku],article.product#product").forEach(fromCard);
    document.querySelectorAll("a.buy[data-merchant],a.buy-btn[data-merchant],#p-buy[data-merchant]").forEach(a=>{
      const o=a.dataset.origin||a.getAttribute("href")||""; rewriteIn(document,(a.dataset.merchant||"").toLowerCase(),o);
    });
  }
  document.addEventListener("DOMContentLoaded", scan);
  new MutationObserver(scan).observe(document.documentElement,{subtree:true,childList:true});
  window.MXD_AFF_OK = true;
  window.MXD_AFF_SCAN = scan;   // <<< THÊM DÒNG NÀY
})();
