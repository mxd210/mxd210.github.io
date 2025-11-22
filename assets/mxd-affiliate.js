// REPLACE WHOLE FILE: /assets/mxd-affiliate.js
// MXD-AFFILIATE v2025-11-22 — universal scanner (index, store, danh mục, blog)

// Cấu hình base isclix cho MXD210
const MXD_AFF_BASE = {
  shopee: 'https://go.isclix.com/deep_link/6803097511817356947/4751584435713464237?url=',
  lazada: 'https://go.isclix.com/deep_link/6803097511817356947/5127144557053758578?url=',
  tiki:   'https://go.isclix.com/deep_link/6803097511817356947/4348614231480407268?url=',
  tiktok: 'https://go.isclix.com/deep_link/6803097511817356947/6648523843406889655?url='
};

(function(global){
  'use strict';

  function normalizeUrl(raw){
    if (!raw) return '';
    let u = String(raw).trim();
    if (!u) return '';
    // bỏ javascript: mailto:, tel:
    if (/^(javascript:|mailto:|tel:)/i.test(u)) return '';
    try{
      // hỗ trợ link tương đối / domain trần
      if (!/^https?:\/\//i.test(u)){
        if (u.startsWith('//')) {
          u = 'https:' + u;
        } else {
          u = 'https://' + u.replace(/^\/+/, '');
        }
      }
      return u;
    }catch(e){
      return '';
    }
  }

  function guessMerchantFromUrl(url, hint){
    let m = (hint || '').toString().toLowerCase().trim();
    if (!m && url){
      if (/shopee\.vn/i.test(url))      m = 'shopee';
      else if (/lazada\.vn/i.test(url)) m = 'lazada';
      else if (/tiki\.vn/i.test(url))   m = 'tiki';
      else if (/tiktok\.com/i.test(url))m = 'tiktok';
    }
    if (m === 'shopee-kol' || m === 'shopee_kol') m = 'shopee';
    return m;
  }

  function appendRel(existing, more){
    const set = new Set(
      String(existing || '')
        .split(/\s+/)
        .filter(Boolean)
    );
    String(more || '')
      .split(/\s+/)
      .filter(Boolean)
      .forEach(v => set.add(v));
    return Array.from(set).join(' ');
  }

  function isIsclix(href){
    return /go\.isclix\.com\/deep_link/i.test(href || '');
  }

  // === CORE: scan một root (document hoặc container) ===
  function scan(root){
    root = root || global.document;
    if (!root || !root.querySelectorAll) return;

    /** 
     * Chỉ xử lý:
     *  - a[data-origin-url]
     *  - hoặc a.buy / a[data-sku] / a[data-merchant]
     *  - hoặc a[href chứa shopee.vn / lazada.vn / tiki.vn / tiktok.com]
     */
    const anchors = root.querySelectorAll('a[href]');
    anchors.forEach(a => {
      if (!a) return;

      // cho phép cố tình bỏ qua
      if (a.dataset.noAff === '1') return;

      const rawHref = a.getAttribute('href') || '';
      const rawDataOrigin = a.dataset.originUrl || '';

      // Nếu đã là isclix rồi thì không đụng
      if (isIsclix(rawHref)) {
        // chuẩn hóa thêm metadata nếu thiếu
        if (!a.dataset.originUrl) a.dataset.originUrl = '';
        return;
      }

      // Quyết định có nên xử lý link này không
      const looksLikeProductLink =
        a.classList.contains('buy') ||
        a.hasAttribute('data-sku') ||
        a.hasAttribute('data-origin-url');

      let origin = normalizeUrl(rawDataOrigin || rawHref);
      if (!origin) {
        if (!looksLikeProductLink) return;
      }

      // Nếu sau normalize vẫn rỗng → bỏ
      if (!origin) return;

      // Chỉ ecom domain
      if (!/shopee\.vn|lazada\.vn|tiki\.vn|tiktok\.com/i.test(origin)) {
        // Không phải 4 sàn → không động vào (tránh phá nav/contact)
        return;
      }

      const merchant = guessMerchantFromUrl(origin, a.dataset.merchant || '');

      const base = MXD_AFF_BASE[merchant];
      if (!base) {
        // nếu không map được sàn thì thôi, giữ origin
        return;
      }

      const deeplink = base + encodeURIComponent(origin);

      // Cập nhật lại thẻ <a>
      a.setAttribute('href', deeplink);
      a.dataset.originUrl = origin;
      a.dataset.merchant  = merchant;
      a.setAttribute('rel', appendRel(a.getAttribute('rel'), 'nofollow sponsored noopener'));
      a.setAttribute('target', '_blank');
    });
  }

  // === AUTO SCAN on DOMContentLoaded ===
  if (global.document && !global.mxdAffiliateAutoBound){
    global.mxdAffiliateAutoBound = true;
    global.document.addEventListener('DOMContentLoaded', function(){
      try{ scan(global.document); }catch(e){ /* ignore */ }
    });
  }

  // === Export API ===
  global.mxdAffiliate = global.mxdAffiliate || {};
  global.mxdAffiliate.scan = function(root){
    try{ scan(root || global.document); }catch(e){ /* ignore */ }
  };
  global.mxdAffiliate.version = 'mxd-aff-universal-v2025-11-22';

})(window);
