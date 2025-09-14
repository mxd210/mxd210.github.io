<script>
(function(){
  // ---- Helpers ---------------------------------------------------
  const parsePrice = (s) => {
    if (!s) return undefined;
    const n = (s+'').replace(/[^\d]/g,'');
    return n ? Number(n) : undefined;
  };
  const itemFromCard = (card, idx=0) => {
    const name  = card.querySelector('h3')?.textContent?.trim();
    const price = parsePrice(card.querySelector('.price')?.textContent);
    const href  = card.querySelector('a[data-merchant]')?.getAttribute('href') || '';
    return { item_id: href || name || ('item_'+idx), item_name: name || 'Unknown', price, currency: 'VND' };
  };

  // ---- 1) Xem danh sách sản phẩm nổi bật -------------------------
  document.addEventListener('DOMContentLoaded', () => {
    const list = document.querySelector('section[aria-label="Sản phẩm"]');
    if (list) {
      const cards = [...list.querySelectorAll('.card')];
      if (cards.length) {
        const items = cards.map((c, i) => itemFromCard(c, i));
        gtag('event', 'view_item_list', {
          item_list_name: 'Trang chủ – Sản phẩm nổi bật',
          items
        });
      }
    }
  });

  // ---- 2) Click affiliate (conversion chính) ---------------------
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-merchant]');
    if (!a) return;

    const merchant = a.getAttribute('data-merchant') || 'unknown';
    const href = a.getAttribute('href') || '';
    const card = a.closest('.card');
    const item = card ? itemFromCard(card) : { item_id: href, item_name: a.textContent.trim() || 'CTA' };

    // Chờ GA bắn xong rồi mới điều hướng
    e.preventDefault();
    let navigated = false;
    const go = () => { if (!navigated) { navigated = true; if (href) window.location.href = href; } };
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
  });

  // ---- 3) Lead: click gọi/Zalo/Messenger -------------------------
  document.addEventListener('click', (e) => {
    const a = e.target.closest('.float-box a, a[href^="tel:"], a[href*="zalo.me"], a[href*="m.me/"]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    const method =
      href.startsWith('tel:') ? 'phone' :
      href.includes('zalo.me') ? 'zalo' :
      href.includes('m.me/') ? 'messenger' : 'other';

    gtag('event', 'generate_lead', { method, link_url: href });
  });
})();
</script>
