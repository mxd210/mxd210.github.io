import fs from 'fs';
const PATH = 'assets/data/affiliates.json';
function warn(msg){ console.warn('[WARN]', msg); }
function ok(msg){ console.log('[OK]', msg); }
if (!fs.existsSync(PATH)) { warn(`${PATH} không tồn tại.`); process.exit(0); }
const raw = fs.readFileSync(PATH, 'utf8').trim() || '[]';
let data;
try { data = JSON.parse(raw); } catch { warn('affiliates.json không hợp lệ.'); process.exit(0); }
if (!Array.isArray(data)){ warn('affiliates.json phải là mảng.'); process.exit(0); }
let bad = 0;
for (const [i,it] of data.entries()){
  const req = ['sku','name','price','origin','merchant'];
  for (const k of req){ if (!(k in it)) { warn(`#${i} thiếu "${k}" (sku=${it.sku||'?'})`); bad++; } }
  if (typeof it.price !== 'number') { warn(`#${i} price phải là number`); bad++; }
  if (!/^https?:\/\//.test(it.origin||'')) { warn(`#${i} origin không hợp lệ`); bad++; }
  if (!/^[a-z0-9\-]+$/.test(it.sku||'')) { warn(`#${i} sku nên là lowercase-kebab-case`); }
}
ok(`Kiểm tra xong: ${data.length} item, cảnh báo: ${bad}`);
