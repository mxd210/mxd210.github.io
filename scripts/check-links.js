// scripts/check-links.js
// Node 18+, ESM
import fetch from 'node-fetch';
import pLimit from 'p-limit';
import fs from 'fs-extra';
import cheerio from 'cheerio';

const AFF_FILE = './assets/data/affiliates.json';          // nguồn
const OUT_FILE = './assets/data/affiliates.checked.json';  // đích
const CONCURRENCY = 8;
const TIMEOUT = 15000;

function toHost(u){ try{ return new URL(u).host; } catch{ return ''; } }

function timeoutFetch(url, opts={}) {
  return Promise.race([
    fetch(url, {redirect:'follow', ...opts, timeout: TIMEOUT}),
    new Promise((_, rej)=>setTimeout(()=>rej(new Error('timeout')), TIMEOUT))
  ]);
}

async function sniffContent(url){
  try{
    const r = await timeoutFetch(url, {method:'GET'});
    const text = (await r.text()||'').toLowerCase();
    const $ = cheerio.load(text);
    const body = $('body').text();

    const badPhrases = [
      'sản phẩm không tồn tại','sản phẩm đã hết','hết hàng','không còn bán',
      'product not found','page not found','404','unavailable','expired'
    ];
    const hit = badPhrases.some(p => body.includes(p));
    return { hit, len: body.length, status: r.status };
  }catch(e){
    return { hit:false, len:0, status:0, err: e.message };
  }
}

async function checkOne(item){
  const out = {...item};
  out.checked_at = new Date().toISOString();
  out.active = false; // default đến khi chứng minh OK
  out.status = 'unknown';
  out.http_status = 0;
  out.final_url = item.origin;

  try{
    let res;
    try { res = await timeoutFetch(item.origin, {method:'HEAD'}); }
    catch { res = await timeoutFetch(item.origin, {method:'GET'}); }

    out.http_status = res.status || 0;
    out.final_url = res.url || item.origin;

    if (res.status >= 400) {
      out.status = 'dead'; out.active = false; out.notes = `HTTP ${res.status}`;
      return out;
    }

    const ct = (res.headers && res.headers.get('content-type')) || '';
    if (ct.includes('text/html')) {
      const sniff = await sniffContent(out.final_url);
      if (sniff.err) { out.notes = `sniff err: ${sniff.err}`; }
      if (sniff.status >= 400) { out.status = 'dead'; out.active = false; out.notes = `HTML ${sniff.status}`; return out; }
      if (sniff.hit || sniff.len < 300) { out.status = sniff.hit ? 'dead':'unknown'; out.active = false; out.notes = sniff.hit ? 'not-found text':'very short'; return out; }
    }

    const host = toHost(out.final_url);
    if (host.includes('isclix') || host.includes('shopee') || host.includes('lazada') || host.includes('tiki')) {
      out.status = 'ok'; out.active = true; out.notes = '';
      return out;
    }

    out.status = 'ok'; out.active = true; out.notes = 'non-html or allowed';
    return out;
  }catch(e){
    out.status = 'unknown'; out.active = false; out.notes = `error: ${e.message}`;
    return out;
  }
}

async function main(){
  const items = await fs.readJson(AFF_FILE);
  const limit = pLimit(CONCURRENCY);
  const results = await Promise.all(items.map(it => limit(()=>checkOne(it))));
  await fs.ensureFile(OUT_FILE);
  await fs.writeJson(OUT_FILE, results, {spaces:2});
  console.log(`Wrote ${OUT_FILE} (${results.length} items)`);
}
main().catch(e=>{ console.error(e); process.exit(1); });
