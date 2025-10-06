// tools/mxd-soi-addon.js — SOI floating panel (add-on cho mxd-importerv1.html)
// Không phụ thuộc code cũ. Dùng Shadow DOM để không xung đột CSS.

(() => {
  const host = document.createElement('div');
  host.id = 'mxd-soi-addon';
  const shadow = host.attachShadow({ mode: 'open' });
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(host));

  const css = `
  :host{all:initial}
  .btn{cursor:pointer;border:0;border-radius:10px;padding:10px 14px;font-weight:700}
  .fab{position:fixed;right:16px;bottom:16px;background:#7cc4ff;color:#001528;box-shadow:0 6px 20px rgba(0,0,0,.3)}
  .panel{position:fixed;right:16px;bottom:76px;width:360px;max-height:70vh;overflow:auto;background:#0e1622;color:#e8f0fb;border:1px solid #1f2a3a;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.35);display:none}
  .hd{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid #1f2a3a;font-weight:700}
  .wrap{padding:12px}
  label{display:block;margin:8px 0 4px;color:#a7b4c2;font-size:13px}
  input,select,textarea{width:100%;padding:8px;border-radius:10px;border:1px solid #1f2a3a;background:#0b0f14;color:#e8f0fb;font-size:14px}
  textarea{min-height:80px;white-space:pre;overflow:auto}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .btns{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
  .muted{background:#223146;color:#a7b4c2}
  .ok{background:#7cc4ff;color:#001528}
  .tiny{font-size:12px;color:#a7b4c2;margin-top:6px}
  .pill{display:inline-block;background:#112033;border:1px solid #1f2a3a;padding:3px 8px;border-radius:999px;font-size:12px;margin-right:6px}
  pre{white-space:pre-wrap;background:#0b0f14;border:1px solid #1f2a3a;border-radius:10px;padding:8px;max-height:220px;overflow:auto;font-size:12px}
  `;
  const html = `
  <style>${css}</style>
  <button class="btn fab" id="toggle">SOI</button>
  <div class="panel" id="panel">
    <div class="hd">
      <span>MXD — SOI Panel</span>
      <button class="btn muted" id="close">Đóng</button>
    </div>
    <div class="wrap">
      <label>Worker URL gốc</label>
      <input id="base" placeholder="https://<worker>.workers.dev">
      <div class="row">
        <div>
          <label>X-Key</label>
          <input id="xkey" placeholder="••••••••">
        </div>
        <div>
          <label>Branch</label>
          <input id="branch" value="main">
        </div>
      </div>
      <div class="row">
        <div>
          <label>Dry-run</label>
          <select id="dry"><option value="true" selected>true</option><option value="false">false</option></select>
        </div>
        <div>
          <label>&nbsp;</label>
          <button class="btn muted" id="health">Health</button>
        </div>
      </div>

      <div class="pill">META</div>
      <div class="btns">
        <button class="btn ok" data-cmd="audit.meta">Audit Meta</button>
        <button class="btn muted" data-cmd="fix.meta">Fix Meta</button>
      </div>

      <div class="pill" style="margin-top:8px">STRUCTURE</div>
      <div class="btns">
        <button class="btn ok" data-cmd="audit.structure">Audit Structure</button>
        <button class="btn muted" data-cmd="fix.sitemaps">Fix Sitemaps</button>
      </div>

      <div class="pill" style="margin-top:8px">PRODUCTS</div>
      <div class="btns">
        <button class="btn ok" data-cmd="audit.products">Audit Products</button>
        <button class="btn muted" data-cmd="fix.products">Fix Products</button>
      </div>

      <div class="tiny">Fix sẽ tuân theo trạng thái <b>Dry-run</b> ở trên: true = chỉ xem diff; false = commit.</div>

      <label style="margin-top:10px">Kết quả</label>
      <pre id="out"></pre>

      <label>Diff (khi Dry-run)</label>
      <pre id="diff"></pre>
    </div>
  </div>
  `;

  shadow.innerHTML = html;

  const $ = (sel) => shadow.querySelector(sel);
  const store = {
    get(k){ try { return localStorage.getItem('mxd_soi_'+k) || '' } catch { return '' } },
    set(k,v){ try { localStorage.setItem('mxd_soi_'+k, v) } catch {} }
  };

  // Prefill: nếu trang importerv1 có ô #base/#xKey/#branch thì lấy giá trị để đỡ gõ
  setTimeout(() => {
    const guessBase = document.querySelector('#base')?.value || document.querySelector('#adminUrl')?.value?.replace(/\/admin\/command$/,'') || store.get('base');
    const guessKey  = document.querySelector('#xkey')?.value || document.querySelector('#xKey')?.value || store.get('xkey');
    const guessBr   = document.querySelector('#branch')?.value || store.get('branch') || 'main';
    $('#base').value   = guessBase || '';
    $('#xkey').value   = guessKey  || '';
    $('#branch').value = guessBr;
    $('#dry').value    = store.get('dry') || 'true';
  }, 0);

  // UI wiring
  $('#toggle').onclick = () => { $('#panel').style.display = 'block'; };
  $('#close').onclick  = () => { $('#panel').style.display = 'none'; };
  $('#health').onclick = () => call(`${base()}/health`);

  for (const btn of shadow.querySelectorAll('[data-cmd]')) {
    btn.onclick = async () => {
      const cmd = btn.getAttribute('data-cmd');
      const body = { cmd, dry_run: ($('#dry').value === 'true') };
      const res  = await call(`${base()}/admin/command`, 'POST', body, true);
      if (res && res.diffs) $('#diff').textContent = renderDiffs(res.diffs);
    };
  }

  function base(){
    const v = $('#base').value.trim().replace(/\/$/,''); store.set('base', v); return v;
  }
  function key(){
    const v = $('#xkey').value.trim(); store.set('xkey', v); return v;
  }
  function branch(){
    const v = $('#branch').value.trim() || 'main'; store.set('branch', v); return v;
  }

  async function call(url, method='GET', body=null, admin=false){
    try{
      const init = { method, headers: { 'content-type': 'application/json' } };
      if (admin) init.headers['x-key'] = key();
      if (body) init.body = JSON.stringify({ branch: branch(), ...body });
      const r = await fetch(url, init);
      const j = await r.json().catch(()=>({}));
      $('#out').textContent = JSON.stringify(j, null, 2);
      return j;
    }catch(e){
      $('#out').textContent = JSON.stringify({ ok:false, error: String(e) }, null, 2);
    }
  }
  function renderDiffs(diffs){
    return (diffs||[]).map(d => `# ${d.path}\n--- BEFORE ---\n${(d.beforeSample||'').slice(0,400)}\n--- AFTER ---\n${(d.afterSample||'').slice(0,400)}`).join('\n\n');
  }
})();
