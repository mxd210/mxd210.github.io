// /assets/mxd-affiliates.js
// MXD AFFILIATE v2 — tự động bọc deeplink isclix cho mọi .buy[data-sku]

const AFF_BASE = {
  shopee: "https://go.isclix.com/deep_link/6803097511817356947/4751584435713464237/4751584435713464237?url=",
  lazada: "https://go.isclix.com/deep_link/6803097511817356947/5127144557053758578?url=",
  tiktok: "https://go.isclix.com/deep_link/6803097511817356947/6648523843406889655?url=",
  tiki:   "https://go.isclix.com/deep_link/6803097511817356947/4348614231480407268?url="
};

document.addEventListener('DOMContentLoaded', () => {
  initMXDAffiliates().catch(err => {
    console.error('MXD affiliates error:', err);
  });
});

async function initMXDAffiliates() {
  const buttons = Array.from(document.querySelectorAll('a.buy[data-sku],button.buy[data-sku]'));
  if (!buttons.length) return;

  let mapBySku = {};
  try {
    const res = await fetch('/assets/data/affiliates.json', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json)) {
        json.forEach(p => {
          if (!p || !p.sku) return;
          mapBySku[String(p.sku)] = p;
        });
      }
    }
  } catch (e) {
    console.warn('Không tải được affiliates.json cho affiliates.js, sẽ fallback dựa trên href:', e);
  }

  buttons.forEach(btn => {
    try {
      const sku = String(btn.dataset.sku || '').trim();
      const merchantRaw = (btn.dataset.merchant || '').toLowerCase();
      const product = sku && mapBySku[sku] ? mapBySku[sku] : null;

      let origin =
        (product && (product.origin || product.origin_url)) ||
        btn.getAttribute('href') ||
        '';

      origin = normalizeOrigin(origin);

      // Nếu origin/deeplink đã là isclix thì giữ nguyên
      if (origin.includes('go.isclix.com')) {
        btn.href = origin;
        return;
      }

      const merchant =
        merchantRaw ||
        (product && product.merchant) ||
        detectMerchant(origin);

      let deeplink = product && product.deeplink;
      if (deeplink && deeplink.includes('go.isclix.com')) {
        btn.href = deeplink;
        return;
      }

      // Tự build deeplink nếu có AFF_BASE
      const base = AFF_BASE[merchant];
      if (base && origin) {
        deeplink = base + encodeURIComponent(origin);
        btn.href = deeplink;
      } else if (origin) {
        // Không có aff base → giữ link gốc
        btn.href = origin;
      }

      // Đặt lại data cho g.html hoặc debug
      if (merchant) btn.dataset.merchant = merchant;
    } catch (e) {
      console.error('Lỗi xử lý affiliate cho 1 nút:', e);
    }
  });
}

/* ===== Helpers ===== */

function normalizeOrigin(url) {
  url = (url || '').trim();
  if (!url) return '';

  // nếu đã là isclix thì trả lại luôn
  if (url.includes('go.isclix.com')) return url;

  // thêm scheme nếu thiếu
  if (!/^https?:\/\//i.test(url)) {
    if (url.startsWith('shopee.vn') ||
        url.startsWith('www.shopee.vn')) {
      url = 'https://' + url.replace(/^https?:\/\//i, '');
    } else if (url.startsWith('lazada.vn') ||
               url.startsWith('www.lazada.vn')) {
      url = 'https://' + url.replace(/^https?:\/\//i, '');
    } else if (url.startsWith('tiki.vn') ||
               url.startsWith('www.tiki.vn')) {
      url = 'https://' + url.replace(/^https?:\/\//i, '');
    } else if (url.startsWith('tiktok.com') ||
               url.startsWith('www.tiktok.com')) {
      url = 'https://' + url.replace(/^https?:\/\//i, '');
    }
  }

  return url;
}

function detectMerchant(url) {
  try {
    if (!url) return '';
    const u = new URL(url.startsWith('http') ? url : 'https://' + url);
    const host = u.hostname.toLowerCase();
    if (host.includes('shopee')) return 'shopee';
    if (host.includes('lazada')) return 'lazada';
    if (host.includes('tiki')) return 'tiki';
    if (host.includes('tiktok')) return 'tiktok';
    return '';
  } catch {
    return '';
  }
}
