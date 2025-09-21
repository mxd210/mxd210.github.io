import fs from 'fs';
const CONFIG = JSON.parse(fs.readFileSync('mxd.auto.config.json','utf8'));
const CSV_PATH = CONFIG.import?.csvPath || 'assets/data/affiliates.csv';
const SHEET = CONFIG.import?.sheetCsvUrl || '';
const OUT = 'assets/data/affiliates.json';

function parseCsv(txt){
  const lines = txt.split(/\r?\n/).filter(Boolean);
  const head = lines.shift().split(',').map(s=>s.trim());
  const rows = lines.map(l => {
    // naive CSV (no quotes) for simplicity
    const parts = l.split(','); const obj = {};
    head.forEach((h,i)=> obj[h]=parts[i]?.trim() ?? '');
    return obj;
  });
  return rows;
}

function normalize(a){
  // Keep fields only
  return a.map(x => ({
    sku: (x.sku||'').trim(),
    name: (x.name||'').trim(),
    price: Number(x.price||0),
    origin: (x.origin||'').trim(),
    merchant: (x.merchant||'shopee').trim().toLowerCase()
  })).filter(x => x.sku && x.name && x.price>0 && /^https?:\/\//.test(x.origin));
}

async function fetchCsv(url){
  try{
    const r = await fetch(url, { headers:{'user-agent':'MXD Sheet Import/0.2'} });
    if (!r.ok) return null; return await r.text();
  }catch{ return null; }
}

async function run(){
  let txt = '';
  if (SHEET) { txt = await fetchCsv(SHEET) || ''; }
  if (!txt && fs.existsSync(CSV_PATH)) { txt = fs.readFileSync(CSV_PATH,'utf8'); }
  if (!txt) { console.log('[i] Không có CSV/Sheet để import.'); return; }
  const rows = parseCsv(txt);
  const items = normalize(rows);
  if (!fs.existsSync(OUT)) fs.writeFileSync(OUT, '[]');
  const cur = JSON.parse(fs.readFileSync(OUT,'utf8')||'[]');
  // Merge by sku (upsert)
  const map = new Map(cur.map(x=>[x.sku,x]));
  for (const it of items){ map.set(it.sku, it); }
  const merged = [...map.values()];
  fs.writeFileSync(OUT, JSON.stringify(merged, null, 2));
  console.log(`[✓] Import xong: ${items.length} item, merged thành ${merged.length}.`);
}
run();
