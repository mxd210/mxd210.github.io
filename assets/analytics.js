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

  // Bật page_view mặc định
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
    const list =
      document.querySelector('[data-list="featured"]') ||
      document.querySelector('section[aria-label="Sản phẩm"]');
    if (!list) return;
    const cards = [.]()
