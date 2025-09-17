/* mxd-affiliate.js – Chuẩn hoá nút Mua ngay (MXD)
   - Rewrites: link gốc → deep link AccessTrade
   - Adds: target, rel, và GA4 click event
   - Chỉ động vào <a.buy data-merchant ...>
*/
(() => {
  // ---- Config: AccessTrade (điền đúng mã của bạn) --------------------------
  const PUB_ID = '6803097511817356947'; // Publisher ID
  const CAMPAIGN = {
    'shopee.vn': '5785137271776984286',
    'lazada.vn': '5127144557053758578',
    'tiki.vn':   'REPLACE_TIKI_CAMPAIGN_ID' // TODO: điền mã Tiki nếu dùng
  };

  // ---- Helpers --------------------------------------------------------------
  const cleanHost = (h) => h.replace(/^www\./, '');
  const isAlreadyAff = (url) =>
    /go\.isclix\.com\/deep_link/i.test(url);

  const pageSlug = (() => {
    const f = location.pathname.split('/').pop() || '';
    return (f.replace(/\.html$/,'') || 'home').toLowerCase();
  })();

  const buildUTM = (a) => {
    const sub1 = a.dataset.sub1 || pageSlug;
    return `utm_source=mxd-blog&utm_medium=content&utm_campaign=${encodeURIComponent(sub1)}`;
  };

  const buildAccessTradeLink = (a) => {
    const href = a.getAttribute('href');
    if (!href) return null;
    let u;
    try { u = new URL(href, location.origin); } catch { return null; }

    const host = cleanHost(u.hostname);
    const camp = CAMPAIGN[host];
    if (!camp) return null;

    const deep = encodeURIComponent(u.toString());
    const qs = new URLSearchParams();

    // sub1..sub4 từ data-*
    ['sub1','sub2','sub3','sub4'].forEach(k => {
      if (a.dataset[k]) qs.set(k, a.dataset[k]);
    });

    // Thêm UTM
    const utm = buildUTM(a).split('&');
    utm.forEach(kv => {
      const [k,v] = kv.split('=');
      if (k && v) qs.set(k, v);
    });

    return `https://go.isclix.com/deep_link/${PUB_ID}/${camp}?url=${deep}` +
           (qs.toString() ? `&${qs.toString()}` : '');
  };

  // ---- Rewrite tất cả nút .buy ---------------------------------------------
  const buttons = document.querySelectorAll('a.buy[data-merchant]');
  buttons.forEach(a => {
    const rawHref = a.getAttribute('href');

    // Cảnh báo nếu còn để "#"/rỗng → phải điền link gốc trước
    if (!rawHref || rawHref === '#') {
      console.warn('[MXD] Nút "Mua ngay" thiếu link gốc:', a);
      a.target = '_blank';
      a.rel = 'nofollow sponsored noreferrer';
      return;
    }

    // Nếu đã là link AccessTrade → chỉ bổ sung thuộc tính an toàn
    if (isAlreadyAff(a.href)) {
      a.target = '_blank';
      a.rel = 'nofollow sponsored noreferrer';
    } else {
      const aff = buildAccessTradeLink(a);
      if (aff) a.href = aff;
      a.target = '_blank';
      a.rel = 'nofollow sponsored noreferrer';
    }

    // GA4 click event (analytics.js phải load trước)
    a.addEventListener('click', () => {
      try {
        if (window.gtag) {
          const merch = a.dataset.merchant || 'unknown';
          window.gtag('event', 'affiliate_click', {
            event_category: 'affiliate',
            event_label: merch,
            value: 1
          });
        }
      } catch {}
    }, { capture: true });
  });

  // ---- Audit nhanh: log các nút còn sai ------------------------------------
  const bad = [...document.querySelectorAll('a.buy')]
    .filter(a => a.getAttribute('href') === '#' || !a.getAttribute('href'));
  if (bad.length) {
    console.group('[MXD] Nút "Mua ngay" vẫn để href="#" hoặc rỗng');
    bad.forEach(a => console.log(a));
    console.groupEnd();
  }
})();
// MXD Link Upgrader: dùng affiliates.json để thay /g.html?sku=... bằng deeplink trực tiếp
(() => {
  const UPGRADE = async () => {
    try {
      const res = await fetch('/assets/data/affiliates.json', { cache: 'no-cache' });
      const map = await res.json();

      document.querySelectorAll('a.buy, a.product-meta, a.go').forEach(a => {
        const sku = (a.dataset.sku || '').trim().toLowerCase();
        if (!sku || !map[sku] || !map[sku].deeplink) return;
        a.href = map[sku].deeplink;
        a.setAttribute('rel', 'nofollow sponsored noopener');
        a.dataset.merchant = a.dataset.merchant || (map[sku].merchant || '');
      });
    } catch (e) {
      console.warn('MXD Link Upgrader: cannot load affiliates.json', e);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', UPGRADE);
  } else {
    UPGRADE();
  }
})();
