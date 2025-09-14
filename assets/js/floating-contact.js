// /assets/js/floating-contact.js
(() => {
  // === Config nhanh ===
  const CONFIG = {
    phone: '+84338328898',   // để dạng +84...
    zalo:  '0338328898',     // 0338328898 hoặc 84338328898
    messenger: 'mxd6686',    // username sau m.me/
    side: 'right',           // 'right' | 'left'
    bottom: 16               // px
  };

  // Không chèn nếu đã có box (tránh trùng ở store.html)
  if (document.querySelector('.float-box')) return;

  // CSS
  const sideProp = CONFIG.side === 'left' ? 'left' : 'right';
  const css = `
    .float-box{
      position:fixed; ${sideProp}:${CONFIG.bottom}px; bottom:${CONFIG.bottom}px;
      display:flex; flex-direction:column; gap:10px; z-index:9999;
    }
    .float-btn{
      display:flex; align-items:center; gap:8px;
      background:#fff; color:#111; text-decoration:none;
      border:1px solid #111; border-radius:999px;
      padding:10px 14px; box-shadow:0 8px 24px rgba(0,0,0,.12);
      font:600 14px/1 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
      transition:transform .15s ease;
    }
    .float-btn:hover{ transform:translateY(-1px); }
    .float-btn .icon{ font-size:18px; line-height:1; }
    @media (max-width:480px){ .float-btn .label{ display:none; } }
    @media print{ .float-box{ display:none !important; } }
    @supports(padding: max(0px)){ .float-box{ padding-bottom: env(safe-area-inset-bottom); } }
  `;
  const style = document.createElement('style');
  style.id = 'mxd-floating-contact-css';
  style.textContent = css;
  document.head.appendChild(style);

  // HTML
  const box = document.createElement('div');
  box.className = 'float-box';
  box.setAttribute('aria-label','Liên hệ nhanh MXD');
  box.innerHTML = `
    <a class="float-btn" href="tel:${CONFIG.phone}" aria-label="Gọi điện cho MXD">
      <span class="icon">📞</span><span class="label">Gọi MXD</span>
    </a>
    <a class="float-btn" href="https://zalo.me/${CONFIG.zalo}" target="_blank" rel="noopener"
       aria-label="Nhắn Zalo cho MXD">
      <span class="icon">💬</span><span class="label">Zalo</span>
    </a>
    <a class="float-btn" href="https://m.me/${CONFIG.messenger}" target="_blank" rel="noopener"
       aria-label="Nhắn Messenger cho MXD">
      <span class="icon">📨</span><span class="label">Messenger</span>
    </a>
  `;
  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(box);
  });
})();
