// /assets/analytics.js
(() => {
  // Tránh khởi tạo trùng nếu file bị nhúng 2 lần
  if (window.__mxdGA_INIT__) return;
  window.__mxdGA_INIT__ = true;

  // Bỏ qua offline.html nếu lỡ nhúng
  if (location.pathname === '/offline.html') return;

  const MEASUREMENT_ID = 'G-SRMVN734DX'; // ✅ ID đúng

  // --- GA4 init ---------------------------------------------------
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }

  const ga = document.createElement('script');
  ga.async = true;
  ga.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(ga);

  // Bật page_view mặc định
  gtag('js', new Date());
  gtag('config', MEASUREMENT_ID, { send_page_view: true });

  // Gửi lại page_view khi quay lại bằng BFCache (Back/Forward)
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      gtag('event', 'page_view', {
        page_title: document.title,
        page_location: location.href,
        page_path: location.pathname,
        transport_type: 'beacon'
      });
    }
  });

  // --- Helpers ----------------------------------------------------
  const parsePrice = (s) => {
    if (!s) return undefined;
    const n = (s + '').replace(/[^\d]/g, '');
    return n ? Number(n) : undefined;
  };

  const itemFromCard = (card, idx = 0) => {
    const name  = card.querySelector('h3, .title, [itemprop="name"]')?.textContent?.trim();
    const price = parsePrice(card.querySelector('.price, [data-price]')?.textContent || card.getAttribute('data-price'));
    const aMain = card.querySelector('a[data-merchant], a[href]');
    const href  = aMain?.getAttribute('href') || '';
    return {
      item_id: href || name || ('item_' + idx),
      item_name: name || 'Unknown',
      price,
      currency: 'VND'
    };
  };

  const isAffHost = (h) => /(^|\.)lazada\.vn$|(^|\.)shopee\.vn$|(^|\.)tiki\.vn$/.test(h);

  // --- 1) View item list (các danh sách sản phẩm phổ biến) -------
  document.addEventListener('DOMContentLoaded', () => {
    try {
      // Tìm một trong các vùng danh sách sản phẩm
      const list =
        document.querySelector('[data-list="featured"]') ||
        document.querySelector('[data-list="products"]') ||
        document.querySelector('section[aria-label="Sản phẩm"]') ||
        document.querySelector('.products,.grid.products');

      if (list) {
        const allCandidates = Array.from(
          list.querySelectorAll('li, .card, article, .product-card, .item')
        );

        // Chỉ giữ thẻ có dấu hiệu là sản phẩm (có .price, có data-merchant hoặc link tới lazada/shopee/tiki)
        const cards = allCandidates.filter(el => {
          if (el.querySelector('.price,[data-price],a[data-merchant]')) return true;
          const href = el.querySelector('a')?.href || '';
          try { return isAffHost(new URL(href).hostname); } catch { return false; }
        });

        if (cards.length) {
          const items = cards.map((c, i) => itemFromCard(c, i));
          const listName =
            list.getAttribute('data-list-name') ||
            list.getAttribute('aria-label') ||
            'Danh sách sản phẩm';

          gtag('event', 'view_item_list', {
            item_list_name: listName,
            items,
            transport_type: 'beacon'
          });

          // Gắn click → select_item
          cards.forEach((card, idx) => {
            const link = card.querySelector('a[href]');
            if (!link) return;
            link.addEventListener('click', () => {
              try {
                const it = itemFromCard(card, idx);
                gtag('event', 'select_item', {
                  item_list_name: listName,
                  items: [it],
                  value: it.price,
                  currency: 'VND',
                  transport_type: 'beacon'
                });
              } catch {}
            }, { passive: true });
          });
        }
      }
    } catch {}
  });

  // --- 2) Affiliate click tracking -------------------------------
  document.addEventListener('click', (e) => {
    try {
      const a = e.target.closest('a[href]');
      if (!a) return;

      const href = a.getAttribute('href');
      // Ưu tiên link có data-merchant, fallback kiểm tra hostname
      const merchant =
        a.getAttribute('data-merchant') ||
        (() => {
          try { return new URL(href, location.href).hostname; } catch { return ''; }
        })();

      // Chỉ log khi là link affiliate hoặc trỏ ra lazada/shopee/tiki
      if (a.hasAttribute('data-merchant') || isAffHost(merchant)) {
        gtag('event', 'affiliate_click', {
          merchant,
          link_url: href,
          page_path: location.pathname,
          transport_type: 'beacon'
        });
      }
    } catch {}
  }, { passive: true });

})();
