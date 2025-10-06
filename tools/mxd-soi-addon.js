// tools/mxd-soi-addon.js — v1.2 (SOI + Notes + HTML Patch)
// Shadow DOM addon cho mxd-importerv1.html

(() => {
  const host = document.createElement('div'); host.id='mxd-soi-addon';
  const shadow = host.attachShadow({mode:'open'});
  document.addEventListener('DOMContentLoaded', ()=>document.body.appendChild(host));

  const css = `
  :host{all:initial}
  .btn{cursor:pointer;border:0;border-radius:10px;padding:10px 14px;font-weight:700}
  .fab{position:fixed;right:16px;bottom:16px;background:#7cc4ff;color:#001528;box-shadow:0 6px 20px rgba(0,0,0,.3)}
  .panel{position:fixed;right:16px;bottom:76px;width:400px;max-height:80vh;overflow:auto;background:#0e1622;color:#e8f0fb;border:1px solid #1f2a3a;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.35);display:none}
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
  pre{white-space:pre-wrap;background:#0b0f14;border:1px solid #1f2a3a;border-radius:10px;padding:8px;max-height:240px;overflow:auto;font-size:12px}
  details{border:1px solid #1f2a3a;border-radius:10px;padding:8px;margin-top:8px}
  details>summary{cursor:pointer}
  `;
  const templateNote = `<!-- MXD-CHECK v{{date}} [hub:/store/{{slug}}.html]
- Canonical tuyệt đối; robots=index,follow; meta verify hiện diện
- GA4 (/assets/analytics.js) TRƯỚC /assets/mxd-affiliate.js (duy nhất 1 lần)
- OG: title/desc/url/image (≥1200×630 .webp) tuyệt đối
- Hub KHÔNG nhồi mục con trong store.html; trang này là hub chuyên mục
- product-grid dùng data-category="{{slug}}" (+ data-sub cho anchor)
- Icon danh mục /assets/img/categories/{{slug}}.webp ; alt="Tên danh mục — MXD"
- Không dán deep-link thủ công; affiliate script rewrite
- SW: HTML network-first; assets SWR; bump sw.js VERSION khi đổi asset
FIND: MXD-CHECK v{{date}} [hub:/store/{{slug}}.html]
-->`;

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
        <div><label>X-Key</label><input id="xkey" placeholder="••••••••"></div>
        <div><label>Branch</label><input id="branch" value="main"></div>
      </div>
      <div class="row">
        <div><label>Dry-run</label><select id="dry"><option value="true" selected>true</option><option value="false">false</option></select></div>
        <div><label>&nbsp;</label><button class="btn muted" id="health">Health</button></div>
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

      <details>
        <summary><b>NOTES / INJECT</b></summary>
        <label>FIND (marker để replace nguyên block)</label>
        <input id="find" placeholder="MXD-CHECK v{{date}} [hub:/store/{{slug}}.html]">
        <label>Block (hỗ trợ {{date}} {{slug}} {{hub}})</label>
        <textarea id="blockNote" spellcheck="false">${templateNote}</textarea>
        <div class="row">
          <div><label>Đích: paths (phẩy)</label><input id="paths" placeholder="store/may-cat.html,store/may-laze.html"></div>
          <div><label>Ngày</label><input id="date"></div>
        </div>
        <div class="row">
          <div><label>glob</label><input id="glob" placeholder="store/*.html"></div>
          <div><label>regex</label><input id="regex" placeholder="^store/(may-.*)\\.html$"></div>
        </div>
        <div class="row">
          <div><label>Vị trí</label>
            <select id="pos">
              <option value="before_head_end">trước </head></option>
              <option value="before_body_end">trước </body></option>
              <option value="top">đầu file</option>
              <option value="bottom">cuối file</option>
            </select>
          </div>
          <div><label>&nbsp;</label><button class="btn ok" id="injectNote">Inject</button></div>
        </div>
      </details>

      <details>
        <summary><b>HTML PATCH (tự do)</b></summary>
        <label>Đích (chọn một trong ba)</label>
        <input id="p_paths" placeholder="paths: a.html,b.html">
        <input id="p_glob"  placeholder="glob: store/*.html">
        <input id="p_regex" placeholder="regex: ^store/(may-.*)\\.html$">
        <div class="row">
          <div><label>Anchor (RegExp)</label><input id="p_anchor" placeholder='<div id="product-grid">'></div>
          <div><label>Mode</label>
            <select id="p_mode">
              <option value="before">before</option>
              <option value="after">after</option>
              <option value="replace">replace</option>
              <option value="before_head_end">before_head_end</option>
              <option value="before_body_end">before_body_end</option>
              <option value="top">top</option>
              <option value="bottom">bottom</option>
              <option value="remove">remove</option>
            </select>
          </div>
        </div>
        <div class="row">
          <div><label>Marker (tuỳ chọn)</label><input id="p_marker" placeholder="mxd-tag-2025"></div>
          <div><label>nth</label><input id="p_nth" type="number" value="1"></div>
        </div>
        <label>Block (nội dung chèn/thay; để trống nếu remove)</label>
        <textarea id="p_block" spellcheck="false"></textarea>
        <div class="btns"><button class="btn ok" id="btnPatch">Run Patch</button></div>
      </details>

      <label style="margin-top:10px">Kết quả</label>
      <pre id="out"></pre>
      <label>Diff</label>
      <pre id="diff"></pre>
    </div>
  </div>
  `;

  shadow.innerHTML = html;

  const $ = (s)=>shadow.querySelector(s);
  const store = { get:k=>localStorage.getItem('mxd_soi_'+k)||'', set:(k,v)=>localStorage.setItem('mxd_soi_'+k,v) };

  setTimeout(()=>{
    $('#base').value = store.get('base') || '';
    $('#xkey').value = store.get('xkey') || '';
    $('#branch').value = store.get('branch') || 'main';
    $('#dry').value = store.get('dry') || 'true';
    $('#date').value = store.get('date') || new Date().toISOString().slice(0,10);
    $('#blockNote').value = store.get('blockNote') || $('#blockNote').value;
    $('#find').value = store.get('find') || 'MXD-CHECK v{{date}} [hub:/store/{{slug}}.html]';
  },0);

  // Base controls
  $('#toggle').onclick = ()=>$('#panel').style.display='block';
  $('#close').onclick  = ()=>$('#panel').style.display='none';
  $('#health').onclick = ()=> call(`${base()}/health`);
  for (const btn of shadow.querySelectorAll('[data-cmd]')){
    btn.onclick = async ()=>{
      const cmd = btn.getAttribute('data-cmd');
      const res = await call(`${base()}/admin/command`, 'POST', { cmd, dry_run:($('#dry').value==='true') }, true);
      if (res && res.diffs) $('#diff').textContent = renderDiffs(res.diffs);
    };
  }

  // Notes inject
  $('#injectNote').onclick = async ()=>{
    const args = {
      cmd:'notes.inject',
      dry_run: ($('#dry').value==='true'),
      args: {
        date: $('#date').value,
        block: $('#blockNote').value,
        dedupe_find: $('#find').value,
        position: $('#pos').value
      }
    };
    const paths=$('#paths').value.trim(), glob=$('#glob').value.trim(), regex=$('#regex').value.trim();
    if (paths) args.args.paths = paths.split(',').map(s=>s.trim()).filter(Boolean);
    if (glob)  args.args.glob  = glob;
    if (regex) args.args.regex = regex;

    persistCommon();
    const res = await call(`${base()}/admin/command`, 'POST', args, true);
    if (res && res.diffs) $('#diff').textContent = renderDiffs(res.diffs);
  };

  // HTML patch
  $('#btnPatch').onclick = async ()=>{
    const args = {
      cmd:'html.patch',
      dry_run: ($('#dry').value==='true'),
      args: {
        mode: $('#p_mode').value,
        anchor: $('#p_anchor').value || undefined,
        marker: $('#p_marker').value || undefined,
        nth: Number($('#p_nth').value||1),
        block: $('#p_block').value || undefined
      }
    };
    const paths=$('#p_paths').value.trim(), glob=$('#p_glob').value.trim(), regex=$('#p_regex').value.trim();
    if (paths) args.args.paths = paths.split(',').map(s=>s.trim()).filter(Boolean);
    if (glob)  args.args.glob  = glob;
    if (regex) args.args.regex = regex;

    persistCommon();
    const res = await call(`${base()}/admin/command`, 'POST', args, true);
    if (res && res.diffs) $('#diff').textContent = renderDiffs(res.diffs);
  };

  function persistCommon(){
    store.set('base', base()); store.set('xkey', key()); store.set('branch', branch());
    store.set('dry', $('#dry').value);
    store.set('date', $('#date').value);
    store.set('blockNote', $('#blockNote').value);
    store.set('find', $('#find').value);
  }

  // helpers
  function base(){ const v=$('#base').value.trim().replace(/\/$/,''); store.set('base',v); return v; }
  function key(){  const v=$('#xkey').value.trim(); store.set('xkey',v); return v; }
  function branch(){ const v=$('#branch').value.trim()||'main'; store.set('branch',v); return v; }

  async function call(url, method='GET', payload=null, admin=false){
    try{
      const init = { method, headers:{'content-type':'application/json'} };
      if (admin) init.headers['x-key'] = key();
      if (payload) init.body = JSON.stringify({ branch: branch(), ...payload });
      const r = await fetch(url, init);
      const j = await r.json().catch(()=>({}));
      $('#out').textContent = JSON.stringify(j, null, 2);
      return j;
    }catch(e){ $('#out').textContent = JSON.stringify({ok:false,error:String(e)}, null, 2); }
  }
  function renderDiffs(diffs){
    return (diffs||[]).map(d=>`# ${d.path}\n--- BEFORE ---\n${(d.beforeSample||'').slice(0,400)}\n--- AFTER ---\n${(d.afterSample||'').slice(0,400)}`).join('\n\n');
  }
})();
