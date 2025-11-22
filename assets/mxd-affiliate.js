// MXD Affiliate v2025-11-22
// Sinh deeplink isclix từ origin_url + merchant
(function (window, document) {
  'use strict';

  // aff_base MXD210 (có thể override bằng window.MXD_AFF_BASE)
  const DEFAULT_BASE = {
    shopee: 'https://go.isclix.com/deep_link/6803097511817356947/4751584435713464237?url=',
    lazada: 'https://go.isclix.com/deep_link/6803097511817356947/5127144557053758578?url=',
    tiki:   'https://go.isclix.com/deep_link/6803097511817356947/4348614231480407268?url=',
    tiktok: 'https://go.isclix.com/deep_link/6803097511817356947/6648523843406889655?url='
  };

  function normalizeOrigin(raw) {
    let u = (raw || '').toString().trim();
    if (!u) return '';
    if (u.startsWith('//')) u = 'https:' + u;
    if (!/^https?:\/\//i.test(u)) {
      u = 'https://' + u.replace(/^\/+/, '');
    }
    return u;
  }

  function guessMerchantFromUrl(url) {
    const u = url || '';
    if (/shopee\.vn/i.test(u)) return 'shopee';
    if (/lazada\.vn/i.test(u)) return 'lazada';
    if (/tiki\.vn/i.test(u)) return 'tiki';
    if (/tiktok\.com/i.test(u)) return 'tiktok';
    return '';
  }

  function isIsclix(url) {
    return /go\.isclix\.com\/deep_link/i.test(url || '');
  }

  function buildDeeplink(originUrl, merchant, baseMap) {
    const clean = normalizeOrigin(originUrl);
    if (!clean) return '';

    const m = (merchant || '').toLowerCase().trim() || guessMerchantFromUrl(clean);
    const base = baseMap[m];
    if (!base) return '';

    // Accesstrade yêu cầu url= phải là URL-encoded
    return base + encodeURIComponent(clean);
  }

  function scan(root) {
    const scope = root || document;
    const baseMap = Object.assign({}, DEFAULT_BASE, window.MXD_AFF_BASE || {});
    const links = scope.querySelectorAll('a[data-merchant]');

    links.forEach(a => {
      // Đã được xử lý rồi thì thôi
      if (a.dataset.noAff === '1') return;

      const currentHref = a.getAttribute('href') || '';
      if (!currentHref) return;

      // Nếu đã là isclix thì chỉ đánh dấu noAff
      if (isIsclix(currentHref)) {
        a.dataset.noAff = '1';
        return;
      }

      const originAttr = a.getAttribute('data-origin-url') || currentHref;
      const deeplink = buildDeeplink(originAttr, a.getAttribute('data-merchant'), baseMap);
      if (!deeplink) return;

      a.setAttribute('data-origin-url', normalizeOrigin(originAttr));
      a.setAttribute('href', deeplink);
      a.dataset.noAff = '1';
    });
  }

  window.mxdAffiliate = window.mxdAffiliate || {};
  window.mxdAffiliate.scan = scan;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scan(document));
  } else {
    scan(document);
  }

})(window, document);
