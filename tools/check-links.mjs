import fs from 'fs';
import { setTimeout as delay } from 'timers/promises';
const SRC = 'assets/data/affiliates.json';
const OUT = 'assets/data/affiliates.checked.json';
const UA = 'MXD Link Checker/0.2 (+https://mxd210.github.io)';
const CONCURRENCY = 10;
const TIMEOUT_MS = 10000;
if (!fs.existsSync(SRC)) { console.error(`[ERR] ${SRC} không tồn tại.`); process.exit(0); }
const items = JSON.parse(fs.readFileSync(SRC,'utf8')||'[]');
console.log(`[i] Check ${items.length} links…`);
function timeoutFetch(url, opts={}){
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(url, { ...opts, signal: controller.signal, redirect:'follow', headers:{'user-agent':UA} }).finally(()=>clearTimeout(id));
}
async function checkOne(it){
  const res = { sku: it.sku, origin: it.origin, ok: false, status: 0, checked_at: new Date().toISOString(), is_dead: false };
  if (!/^https?:\/\//.test(it.origin||'')) { res.is_dead = true; return res; }
  try {
    let r = await timeoutFetch(it.origin, { method:'HEAD' });
    if (!r.ok) r = await timeoutFetch(it.origin, { method:'GET' });
    res.status = r.status; res.ok = r.status >= 200 && r.status < 400; res.is_dead = !res.ok;
  } catch { res.status = 0; res.ok = false; res.is_dead = true; }
  await delay(30); return res;
}
async function run(){
  const out = []; let cursor = 0; const pool = new Set();
  function spawn(){ if (cursor >= items.length) return; const it = items[cursor++]; const p = checkOne(it).then(r => { out.push(r); pool.delete(p); spawn(); }); pool.add(p); }
  for (let i=0;i<CONCURRENCY;i++) spawn(); await Promise.all([...pool]);
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2)); console.log(`[✓] Wrote ${OUT} (${out.length} items)`);
}
run().catch(e=>{ console.error(e); process.exit(0); });
