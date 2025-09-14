// /assets/analytics.js
(() => {
  // Tránh khởi tạo trùng nếu file bị nhúng 2 lần
  if (window.__mxdGA_INIT__) return;
  window.__mxdGA_INIT__ = true;

  // Bỏ qua offline.html nếu lỡ nhúng
  if (location.pathname === '/offline.html') return;

  const MEASUREMENT_ID = 'G-SRMVN734D';

  // --- GA4 init ---------------------------------------------------
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }

  const ga = document.createElement('script');
  ga.async = true;
  ga.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(ga);

  gtag('js', new Date());
  gtag('config', MEASUREMENT_ID, { send_page_view: true });

  // --- Helpers ----------------------------------------------------
  const parsePrice = (s) => {
    if (!s) return undefined;
    const n = (s + '').replace(/[^\d]/g, '');
    return n ? Number(n) : undefined;
  };
  const itemFromCard = (card, idx = 0) => {
    const name  = card.querySelector('h3')?.textContent?.trim();
    const price = parsePrice(card.querySelector('.price')?.textContent);
    const href  = card.querySelector('a[data-merchant]')?.getAttribute('href') || '';
    return {
      item_id: href || name || ('item_' + idx),
      item_name: name || 'Unknown',
      price,
      currency: 'VND'
    };
  };

  // --- 1) View item list (Sản phẩm nổi bật trên trang) -----------
  document.addEventListener('DOMContentLoaded', () => {
    const list = document.querySelector('section[aria-label="Sản phẩm"]');
    if (!list) return;
    const cards = [...list.querySelectorAll('.card')];
    if (!cards.length) return;
    const items = cards.map((c, i) => itemFromCard(c, i));
    gtag('event', 'view_item_list', {
      item_list_name: 'Trang chủ – Sản phẩm nổi bật',
      items
    });
  });

  // --- 2) Click affiliate (conversion chính) ----------------------
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-merchant]');
    if (!a) return;

    const href = a.getAttribute('href') || '';
    const merchant = a.getAttribute('data-merchant') || 'unknown';
    const card = a.closest('.card');
    const item = card
      ? itemFromCard(card)
      : { item_id: href, item_name: (a.textContent || '').trim() || 'CTA', currency: 'VND' };

    // Nếu mở tab mới hoặc dùng phím bổ trợ → không chặn điều hướng
    const modifier = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1 || a.target === '_blank';

    if (!modifier) {
      e.preventDefault();
      let navigated = false;
      const go = () => { if (!navigated) { navigated = true; if (href) location.href = href; } };
      const timeout = setTimeout(go, 800);

      gtag('event', 'affiliate_click', {
        merchant,
        link_url: href,
        value: item.price,
        currency: 'VND',
        items: [item],
        event_callback: () => { clearTimeout(timeout); go(); }
      });

      // Ecom chuẩn để phân tích thêm
      gtag('event', 'select_item', {
        item_list_name: document.title || 'Page',
        items: [item]
      });
    } else {
      // Không chặn điều hướng: chỉ bắn sự kiện
      gtag('event', 'affiliate_click', {
        merchant,
        link_url: href,
        value: item.price,
        currency: 'VND',
        items: [item]
      });
      gtag('event', 'select_item', {
        item_list_name: document.title || 'Page',
        items: [item]
      });
    }
  });

  // --- 3) Lead: click gọi/Zalo/Messenger --------------------------
  document.addEventListener('click', (e) => {
    const a = e.target.closest('.float-box a, a[href^="tel:"], a[href*="zalo.me"], a[href*="m.me/"]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    const method =
      href.startsWith('tel:')   ? 'phone' :
      href.includes('zalo.me')  ? 'zalo'  :
      href.includes('m.me/')    ? 'messenger' : 'other';

    gtag('event', 'generate_lead', { method, link_url: href });
  });

  // (Tuỳ chọn) Outbound click chung — bật nếu cần
  // document.addEventListener('click', (e) => {
  //   const a = e.target.closest('a[href^="http"]');
  //   if (!a) return;
  //   try {
  //     const u = new URL(a.href);
  //     if (u.host !== location.host && !a.hasAttribute('data-merchant') && !a.closest('.float-box')) {
  //       gtag('event', 'outbound_click', { host: u.host, href: a.href });
  //     }
  //   } catch {}
  // });
})();
