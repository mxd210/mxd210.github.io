import fs from 'fs';
import path from 'path';
const args = process.argv.slice(2);
const repoIdx = args.indexOf('--repo');
if (repoIdx === -1 || !args[repoIdx+1]) {
  console.error('Usage: node tasks/validate-images.js --repo <path-to-site-repo>');
  process.exit(1);
}
const SITE_REPO = path.resolve(args[repoIdx+1]);
const AFF = path.join(SITE_REPO, 'assets', 'data', 'affiliates.json');
const IMG_DIR = path.join(SITE_REPO, 'assets', 'img', 'products');
function main(){
  if(!fs.existsSync(AFF)){ console.error('Missing', AFF); process.exit(2); }
  const arr = JSON.parse(fs.readFileSync(AFF,'utf8'));
  const missing = [];
  for(const p of arr){
    const sku = p.sku || '';
    const img = path.join(IMG_DIR, `${sku}.webp`);
    if(!fs.existsSync(img)){
      missing.push({sku, expected:`/assets/img/products/${sku}.webp`, name:p.name||'', origin:p.origin});
    }
  }
  const out = path.join(SITE_REPO, 'assets', 'data', 'images.missing.json');
  fs.writeFileSync(out, JSON.stringify(missing, null, 2), 'utf8');
  console.log(`Checked ${arr.length} items. Missing images: ${missing.length}. See ${out}`);
}
main();
