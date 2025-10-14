/* ==== MXD LinkAuto Crawler Panel (Shopee/Lazada) ==== */
/* Cấu hình — nếu đổi worker hoặc key chỉ cần sửa 2 dòng này */
const CRAWLER_CFG = {
  WORKER: 'https://link-auto.mxd6686.workers.dev',
  X_KEY:  'mxd-2025-super',
};

/* --------- Panel UI + Logic --------- */
function renderCrawlerPanel(root){
  if(!root){ console.warn('renderCrawlerPanel: thiếu phần tử mount'); return; }

  // UI
  root.innerHTML = `
  <div style="display:grid;gap:12px;padding:12px;background:#0e1722;border:1px solid #203148;border-radius:12px;color:#e8f0fb">

    <!-- HÀNG MÔI TRƯỜNG -->
    <div style="display:flex;gap:10px;align-items:center;font-size:12px;opacity:.9">
      <div>Worker: <code id="cr-worker"></code></div>
      <div>Key: <code id="cr-key"></code></div>
      <button id="cr-ping" style="margin-left:6px">Kiểm tra Worker</button>
      <span id="cr-ping-res" style="margin-left:6px"></span>
    </div>

    <!-- HÀNG FORM -->
    <div style="display:grid;gap:10px;grid-template-columns:120px 1fr 100px 160px auto">
      <label style="display:grid;gap:6px">
        <span>Source</span>
        <select id="cr-src">
          <option value="shopee">Shopee</option>
          <option value="lazada">Lazada</option>
        </select>
      </label>

      <label style="display:grid;gap:6px">
        <span>Từ khóa</span>
        <input id="cr-q" placeholder="máy laze"/>
      </label>

      <label style="display:grid;gap:6px">
        <span>Limit</span>
        <input id="cr-limit" type="number" min="1" max="50" value="50"/>
      </label>

      <label style="display:grid;gap:6px">
        <span>Brand (tuỳ chọn)</span>
        <input id="cr-brand" placeholder="hukan, bosch..."/>
      </label>

      <div style="display:flex;gap:8px;align-items:end">
        <button id="cr-run">Lấy dữ liệu</button>
      </div>
    </div>

    <div id="cr-status" style="font-size:12px;opacity:.85"></div>

    <div style="display:flex;gap:8px">
      <button id="cr-export">Export CSV</button>
      <button id="cr-zip">Tải ảnh ZIP</button>
    </div>

    <div style="max-height:420px;overflow:auto;border:1px dashed #334a66;border-radius:8px">
      <table id="cr-table" style="width:100%;font-size:13px;border-collapse:collapse">
        <thead>
          <tr style="background:#0c141d;position:sticky;top:0">
            <th style="padding:6px;border-bottom:1px solid #22354a">#</th>
            <th style="padding:6px;border-bottom:1px solid #22354a;text-align:left">Tên</th>
            <th style="padding:6px;border-bottom:1px solid #22354a">Giá</th>
            <th style="padding:6px;border-bottom:1px solid #22354a">Brand</th>
            <th style="padding:6px;border-bottom:1px solid #22354a">Source</th>
            <th style="padding:6px;border-bottom:1px solid #22354a">Link</th>
            <th style="padding:6px;border-bottom:1px solid #22354a">Ảnh</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  </div>`;

  // refs
  const el = {
    src:    root.querySelector('#cr-src'),
    q:      root.querySelector('#cr-q'),
    limit:  root.querySelector('#cr-limit'),
    brand:  root.querySelector('#cr-brand'),
    run:    root.querySelector('#cr-run'),
    btnExport: root.querySelector('#cr-export'),
    btnZip:    root.querySelector('#cr-zip'),
    status: root.querySelector('#cr-status'),
    tbody:  root.querySelector('#cr-table tbody'),
    ping:   root.querySelector('#cr-ping'),
  };

  // hiển thị worker/key + ping
  document.getElementById('cr-worker').textContent = CRAWLER_CFG.WORKER;
  document.getElementById('cr-key').textContent    = mask(CRAWLER_CFG.X_KEY);
  el.ping.onclick = checkWorker;
  checkWorker();

  let last = [];  // cache kết quả để export/zip

  // chạy crawler
  el.run.onclick = async () => {
    const src   = el.src.value;
    const q     = (el.q.value||'').trim();
    const limit = Math.max(1, Math.min(50, Number(el.limit.value||50)));
    const brand = (el.brand.value||'').trim();
    if(!q){ alert('Nhập từ khóa.'); return; }

    const url = new URL(`${CRAWLER_CFG.WORKER}/crawler/${src}/top`);
    url.searchParams.set('mode','keyword');
    url.searchParams.set('q', q);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('by','sales');
    if(brand) url.searchParams.set('brand', brand);
    url.searchParams.set('key', CRAWLER_CFG.X_KEY);

    el.status.textContent = 'Đang lấy dữ liệu...';
    el.tbody.innerHTML = '';
    last = [];

    const t0 = performance.now();
    const r = await fetch(url.toString(), {
  headers: { 'x-key': CRAWLER_CFG.X_KEY }
});

    const js = await r.json().catch(()=>({ok:false,error:'Bad JSON'}));
    const took = Math.round(performance.now()-t0);

    if(!js.ok){ el.status.textContent = `Lỗi: ${js.error||'unknown'}`; return; }

    last = (js.items||[]).map((x,i)=>({
      idx: i+1,
      name: x.name || '',
      price_vnd: x.price_vnd || 0,
      brand: x.brand || '',
      source: x.source || src,
      origin_url: x.origin_url || '',
      image_url: x.image_url || ''
    }));

    el.status.textContent = `Source: ${js.source} • status=${js.status} • ${last.length} items • ${took}ms`;
    el.tbody.innerHTML = last.map(r => `
      <tr>
        <td style="padding:6px;border-bottom:1px solid #22354a;text-align:center">${r.idx}</td>
        <td style="padding:6px;border-bottom:1px solid #22354a">${escapeHtml(r.name)}</td>
        <td style="padding:6px;border-bottom:1px solid #22354a;text-align:right">${fmtVND(r.price_vnd)}</td>
        <td style="padding:6px;border-bottom:1px solid #22354a;text-align:center">${escapeHtml(r.brand)}</td>
        <td style="padding:6px;border-bottom:1px solid #22354a;text-align:center">${r.source}</td>
        <td style="padding:6px;border-bottom:1px solid #22354a"><a href="${r.origin_url}" target="_blank" rel="noopener">mở</a></td>
        <td style="padding:6px;border-bottom:1px solid #22354a"><a href="${r.image_url}" target="_blank" rel="noopener">ảnh</a></td>
      </tr>
    `).join('');
  };

  // export CSV
  el.btnExport.onclick = () => {
    if(!last.length){ alert('Chưa có dữ liệu.'); return; }
    const rows = last.map(r => ({
      name: r.name,
      price_vnd: r.price_vnd,
      source: r.source,
      brand: r.brand,
      origin_url: r.origin_url,
      image_url: r.image_url
    }));
    downloadCSV(rows, 'crawler_export.csv');
  };

  // tải ảnh ZIP
  el.btnZip.onclick = async () => {
    if(!last.length){ alert('Chưa có dữ liệu.'); return; }
    el.status.textContent = 'Đang tải ảnh & đóng gói ZIP...';
    try{
      await ensureJSZip();
      const zip = new JSZip();
      let ok = 0, fail = 0;
      for(let i=0;i<last.length;i++){
        const r = last[i];
        if(!r.image_url){ fail++; continue; }
        try{
          const res = await fetch(r.image_url, {cache:'no-store'});
          if(!res.ok){ fail++; continue; }
          const buf = await res.arrayBuffer();
          const ext = (r.image_url.match(/\.(webp|jpg|jpeg|png)/i)||['','.webp'])[1].toLowerCase();
          const fname = `${String(i+1).padStart(2,'0')}_${slug(r.name).slice(0,40)}.${ext}`;
          zip.file(fname, buf);
          ok++;
        }catch(_){ fail++; }
      }
      const blob = await zip.generateAsync({type:'blob'});
      saveBlob(blob, 'crawler_images.zip');
      el.status.textContent = `ZIP xong: ${ok} ảnh thành công, ${fail} lỗi.`;
    }catch(e){
      el.status.textContent = 'Lỗi ZIP: '+ e;
    }
  };
}

/* --------- Helpers --------- */
function fmtVND(n){ n = Number(n||0); return n? n.toLocaleString('vi-VN') : ''; }
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
function slug(s){ return String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }

function downloadCSV(rows, filename){
  const cols = ['name','price_vnd','source','brand','origin_url','image_url'];
  const csv = [cols.join(',')]
    .concat(rows.map(r => cols.map(c => csvCell(r[c])).join(',')))
    .join('\r\n');
  const blob = new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8'}); // BOM cho Excel
  saveBlob(blob, filename);
}

// hiển thị key đã che
function mask(s){
  s = String(s||'');
  if(s.length <= 6) return s.replace(/.(?=..)/g,'*');
  return s.slice(0,3) + '***' + s.slice(-2);
}

// ping worker/health + auth
async function checkWorker(){
  const out = document.getElementById('cr-ping-res');
  if(!out) return;
  out.textContent = 'Đang kiểm tra...';
  out.style.color = '#a7b4c2';

  const paths = ['/ops/health','/health'];
  let ok = false, lastErr = '';
  for(const p of paths){
    try{
      const u = new URL(CRAWLER_CFG.WORKER + p);
      u.searchParams.set('key', CRAWLER_CFG.X_KEY); // một số route cần key
      const r = await fetch(u.toString(), { headers: { 'x-key': CRAWLER_CFG.X_KEY }});
      const js = await r.json().catch(()=>null);
      if(js && js.ok){ ok = true; break; }
      lastErr = js?.error || `HTTP ${r.status}`;
    }catch(e){ lastErr = String(e); }
  }
  if(ok){
    out.textContent = '✅ Worker kết nối OK';
    out.style.color = '#7CFC7C';
  }else{
    out.textContent = '❌ Worker/Key lỗi: ' + (lastErr||'Unauthorized');
    out.style.color = '#ff9aa2';
  }
}

function csvCell(v){
  let s = String(v==null? '' : v);
  if(/[",\n]/.test(s)) s = '"' + s.replace(/"/g,'""') + '"';
  return s;
}
function saveBlob(blob, name){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1200);
}
async function ensureJSZip(){
  if(window.JSZip) return;
  await new Promise((res,rej)=>{
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
    s.onload=res; s.onerror=()=>rej('Không tải được JSZip');
    document.head.appendChild(s);
  });
}

/* gắn hàm vào window để trang HTML có thể gọi */
window.renderCrawlerPanel = renderCrawlerPanel;
