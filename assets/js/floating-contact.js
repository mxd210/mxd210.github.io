// /assets/js/floating-contact.js — MXD v2
(() => {
  // === Config nhanh ===
  const CONFIG = {
    // Dùng cả dạng local & quốc tế để linh hoạt hiển thị
    phoneLocal: '0338328898',
    phoneIntl:  '+84338328898',    // tel: nên ưu tiên +84 cho mobile
    zalo:       '0338328898',      // 0338328898 hoặc 84338328898
    messenger:  'mxd6686',         // username sau m.me/
    side:       'right',           // 'right' | 'left'
    bottom:     16                 // px
  };

  // Không chèn nếu đã có (tránh trùng ở store.html hoặc layout khác)
  if (document.querySelector('.float-box')) return;

  // ===== CSS (ăn theo theme qua CSS variables, có fallback) =====
  const sideProp = CONFIG.side === 'left' ? 'left' : 'right';
  const css = `
    .float-box{
      position:fixed; ${sideProp}:${CONFIG.bottom}px; bottom:${CONFIG.bottom}px;
      display:flex; flex-direction:column; gap:10px; z-index:9999;
      padding-bottom: env(safe-area-inset-bottom, 0);
    }
    .float-btn{
      display:flex; align-items:center; gap:8px;
      background:var(--card,#ffffff); color:var(--text,#111111);
      text-decoration:none; border:1px solid var(--border,#111111);
      border-radius:999px; padding:10px 14px;
      box-shadow:0 8px 24px rgba(0,0,0,.12);
      font:600 14px/1 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
      transition:transform .15s ease, filter .15s ease;
    }
    .float-btn:hover{ transform:translateY(-1px); filter:brightness(1.02) }
    .float-btn .icon{ font-size:18px; line-height:1 }
    .float-btn.brand{
      background:var(--brand,#0a84ff); border-color:var(--brand,#0a84ff);
      color:var(--brand-contrast,#ffffff);
    }
    .float-btn.top{ display:none }        /* hiện bằng JS khi cuộn xuống */
    @media (max-width:480px){ .float-btn .label{ display:none } }
    @media print{ .float-box{ display:none !important } }
  `;
  const style = document.createElement('style');
  style.id = 'mxd-floating-contact-css';
  style.textContent = css;
  document.head.appendChild(style);

  // ===== HTML =====
  const telHref = `tel:${CONFIG.phoneIntl || CONFIG.phoneLocal || ''}`;
  const box = document.createElement('div');
  box.className = 'float-box';
  box.setAttribute('aria-label','Liên hệ nhanh MXD');
  box.innerHTML = `
    <a class="float-btn brand" href="https://zalo.me/${CONFIG.zalo}" target="_blank" rel="noopener nofollow"
       data-channel="zalo" aria-label="Zalo ${CONFIG.phoneLocal||CONFIG.zalo}">
      <span class="icon">💬</span><span class="label">Zalo</span>
    </a>
    <a class="float-btn brand" href="https://m.me/${CONFIG.messenger}" target="_blank" rel="noopener nofollow"
       data-channel="facebook" aria-label="Facebook Messenger ${CONFIG.messenger}">
      <span class="icon">📨</span><span class="label">Messenger</span>
    </a>
    <a class="float-btn" href="${telHref}" data-channel="phone" aria-label="Gọi ${CONFIG.phoneLocal||''}">
      <span class="icon">📞</span><span class="label">Gọi ${CONFIG.phoneLocal||'MXD'}</span>
    </a>
    <button class="float-btn top" type="button" id="mxdToTop" aria-label="Lên đầu trang">
      <span class="icon">⬆️</span><span class="label">Lên đầu</span>
    </button>
  `;

  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(box);

    // ===== toTop show/hide + smooth scroll =====
    const toTop = document.getElementById('mxdToTop');
    const toggleTop = () => {
      if (!toTop) return;
      toTop.style.display = (window.scrollY > 320) ? 'flex' : 'none';
    };
    toggleTop();
    window.addEventListener('scroll', toggleTop, {passive:true});
    toTop?.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      track('to_top');
    });

    // ===== GA4 tracking (nếu đã có gtag trong /assets/analytics.js) =====
    function track(channel){
      if (window.gtag) {
        window.gtag('event','contact_click', { channel, page: location.pathname });
      }
    }
    box.querySelectorAll('[data-channel]').forEach(el => {
      el.addEventListener('click', () => track(el.dataset.channel), {passive:true});
    });
  });
})();
