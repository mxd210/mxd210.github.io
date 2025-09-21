import fs from 'fs'; import path from 'path';
const CONFIG = JSON.parse(fs.readFileSync('mxd.auto.config.json','utf8'));
const COUNT = CONFIG.featured?.count ?? 5;
const SRC = 'assets/data/affiliates.json';
const OUT = 'assets/data/featured.json';
const IMG_DIR = 'assets/img/products';
if (!fs.existsSync(SRC)) { console.warn(`[WARN] ${SRC} không tồn tại.`); process.exit(0); }
const items = JSON.parse(fs.readFileSync(SRC,'utf8')||'[]');
function hasImg(sku){ return fs.existsSync(path.join(IMG_DIR, `${sku}.webp`)); }
function mulberry32(a){ return function(){ let t = a += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; } }
const seedStr = new Date().toISOString().slice(0,10).replace(/-/g,''); const rng = mulberry32(parseInt(seedStr,10) || 1234);
const pool = items.filter(x => x && x.sku && hasImg(x.sku));
for (let i=pool.length-1;i>0;i--){ const j = Math.floor(rng()*(i+1)); [pool[i],pool[j]] = [pool[j],pool[i]]; }
const featured = pool.slice(0, COUNT).map(x => ({ sku:x.sku, name:x.name, price:x.price, img:`/assets/img/products/${x.sku}.webp`, merchant:x.merchant }));
fs.writeFileSync(OUT, JSON.stringify(featured, null, 2)); console.log(`[✓] Wrote ${OUT} (${featured.length} items)`);
