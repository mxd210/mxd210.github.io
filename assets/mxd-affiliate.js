// REPLACE WHOLE FILE: /assets/mxd-affiliate.js
// MXD-AFFILIATE v2025-12-01 — universal scanner (index, store, danh mục, blog)

const MXD_AFF_BASE = {
  shopee: 'https://go.isclix.com/deep_link/6803097511817356947/4751584435713464237?url=',
  lazada: 'https://go.isclix.com/deep_link/6803097511817356947/5127144557053758578?url=',
  tiki:   'https://go.isclix.com/deep_link/6803097511817356947/4348614231480407268?url=',
  tiktok: 'https://go.isclix.com/deep_link/6803097511817356947/6648523843406889655?url='
};

(function (global) {
  'use strict';

  function normalizeUrl(raw) {
    if (!raw) return '';
    var u = String(raw).trim();
    if (!u) return '';

    // Chuẩn hoá tương đối → tuyệt đối
    if (u.indexOf('//') === 0) {
      u = 'https:' + u;
    } else if (!/^https?:\/\//i.test(u)) {
      // Nếu chỉ có shopee.vn/..., tiki.vn/... thì thêm https://
      u = 'https://' + u.replace(/^\/+/, '');
    }

    return u;
  }

  function isIsclix(url) {
    return /go\.isclix\.com/i.test(url || '');
  }

  function detectMerchantFromUrl(url) {
    if (!url) return '';
    var host = '';

    try {
      host = new URL(url).hostname.toLowerCase();
    } catch (e) {
      // fallback kiểu “shopee.vn/abc”
      var m = String(url).toLowerCase().match(/^[a-z]+:\/\/([^/]+)/);
      if (m && m[1]) host = m[1];
    }

    if (!host) {
      var m2 = String(url).toLowerCase().match(/([^/]+\.[a-z]{2,})(?:\/|$)/);
      if (m2 && m2[1]) host = m2[1];
    }

    if (!host) return '';

    if (host.indexOf('shopee.vn') !== -1) return 'shopee';
    if (host.indexOf('lazada.vn') !== -1 || host.indexOf('lzd.co') !== -1) return 'lazada';
    if (host.indexOf('tiki.vn') !== -1) return 'tiki';
    if (host.indexOf('tiktok.com') !== -1 || host.indexOf('vt.tiktok.com') !== -1) return 'tiktok';

    return '';
  }

  function buildDeeplink(merchant, originUrl) {
    if (!merchant || !MXD_AFF_BASE[merchant]) return '';
    var cleanOrigin = normalizeUrl(originUrl);
    if (!cleanOrigin) return '';
    return MXD_AFF_BASE[merchant] + encodeURIComponent(cleanOrigin);
  }

  function shouldSkipLink(a) {
    if (!a) return true;
    if (a.dataset && a.dataset.noAff === '1') return true;
    if (a.dataset && a.dataset.mxdAff === '1') return true;

    var href = (a.getAttribute('href') || '').trim();
    if (!href) return true;

    var low = href.toLowerCase();
    if (low.indexOf('javascript:') === 0) return true;
    if (low.indexOf('mailto:') === 0) return true;
    if (low.indexOf('tel:') === 0) return true;
    if (low.charAt(0) === '#') return true;

    // Đã là isclix rồi thì thôi
    if (isIsclix(href)) return true;

    return false;
  }

  function affOneLink(a) {
    if (shouldSkipLink(a)) return;

    var href = (a.getAttribute('href') || '').trim();
    var dataOrigin = (a.dataset.originUrl || a.dataset.origin || '').trim();
    var dataMerchant = (a.dataset.merchant || '').trim();

    var origin = dataOrigin || href;
    origin = normalizeUrl(origin);

    var merchant = dataMerchant || detectMerchantFromUrl(origin);
    if (!merchant || !MXD_AFF_BASE[merchant]) {
      return; // không thuộc Shopee/Lazada/Tiki/TikTok → bỏ qua
    }

    var deeplink = buildDeeplink(merchant, origin);
    if (!deeplink) return;

    a.setAttribute('href', deeplink);
    a.dataset.merchant = merchant;
    a.dataset.originUrl = origin;
    a.dataset.mxdAff = '1';

    // Thêm rel cho an toàn + SEO
    var rel = (a.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
    ['nofollow', 'noopener', 'noreferrer'].forEach(function (flag) {
      if (rel.indexOf(flag) === -1) rel.push(flag);
    });
    a.setAttribute('rel', rel.join(' '));

    // Mặc định mở tab mới
    if (!a.hasAttribute('target') || a.getAttribute('target') === '_self') {
      a.setAttribute('target', '_blank');
    }
  }

  function scanLinks(root) {
    var scope = root || document;
    var anchors = scope.querySelectorAll ? scope.querySelectorAll('a[href]') : [];

    for (var i = 0; i < anchors.length; i++) {
      try {
        affOneLink(anchors[i]);
      } catch (e) {
        // Không crash cả trang chỉ vì 1 link lỗi
        console && console.warn && console.warn('[MXD-AFFILIATE] link error', e);
      }
    }
  }

  function setupObservers() {
    try {
      // Quét lần đầu
      scanLinks(document);

      // Theo dõi DOM thay đổi (filter, load thêm sản phẩm…)
      if ('MutationObserver' in global && document.body) {
        var observer = new MutationObserver(function (mutations) {
          for (var i = 0; i < mutations.length; i++) {
            var m = mutations[i];
            if (!m.addedNodes) continue;
            for (var j = 0; j < m.addedNodes.length; j++) {
              var node = m.addedNodes[j];
              if (!node || node.nodeType !== 1) continue; // ELEMENT_NODE
              scanLinks(node);
            }
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
    } catch (e) {
      console && console.error && console.error('[MXD-AFFILIATE] setup error', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupObservers);
  } else {
    setupObservers();
  }

  // Hook cho các script khác: mxdAffiliate.scan()
  global.mxdAffiliate = global.mxdAffiliate || {};
  global.mxdAffiliate.scan = function (root) {
    try {
      scanLinks(root || document);
    } catch (e) {
      console && console.error && console.error('[MXD-AFFILIATE] manual scan error', e);
    }
  };
  global.mxdAffiliate.normalizeUrl = normalizeUrl;

})(window);
