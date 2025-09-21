import fs from 'fs'; import path from 'path';
const SRC = 'assets/data/affiliates.json';
const CHECKED = 'assets/data/affiliates.checked.json';
const BACKUP_DIR = 'assets/data';
if (!fs.existsSync(SRC) || !fs.existsSync(CHECKED)) { console.warn(`[WARN] thiếu dữ liệu.`); process.exit(0); }
const items = JSON.parse(fs.readFileSync(SRC,'utf8')||'[]');
const checked = JSON.parse(fs.readFileSync(CHECKED,'utf8')||'[]');
const deadSet = new Set(checked.filter(x=>x.is_dead).map(x=>x.sku));
const kept = items.filter(x => x.origin && !deadSet.has(x.sku));
const stamp = new Date().toISOString().slice(0,10);
const backupPath = path.join(BACKUP_DIR, `affiliates.backup.${stamp}.json`);
fs.writeFileSync(backupPath, JSON.stringify(items, null, 2));
fs.writeFileSync(SRC, JSON.stringify(kept, null, 2));
console.log(`[✓] Pruned: kept ${kept.length}/${items.length}. Backup → ${backupPath}`);
