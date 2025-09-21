import fs from 'fs';
import path from 'path';
const args = process.argv.slice(2);
const repoIdx = args.indexOf('--repo');
const baseIdx = args.indexOf('--base');
if (repoIdx === -1 || !args[repoIdx+1]) {
  console.error('Usage: node tasks/build-sitemaps.js --repo <path-to-site-repo> --base https://mxd210.github.io');
  process.exit(1);
}
const SITE_REPO = path.resolve(args[repoIdx+1]);
const SITE_BASE = (baseIdx !== -1 && args[baseIdx+1]) ? args[baseIdx+1] : 'https://mxd210.github.io';
const OUTDIR = path.join(SITE_REPO, 'out', 'sitemaps');
const AFF = path.join(SITE_REPO, 'assets', 'data', 'affiliates.json');
function xmlWrap(urls){
  const body = urls.map(u=>`  <url><loc>${u}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}
function ensure(p){ fs.mkdirSync(p, {recursive:true}); }
function main(){
  ensure(OUTDIR);
  let storeUrls = [];
  if(fs.existsSync(AFF)){
    let arr = []; try{ arr = JSON.parse(fs.readFileSync(AFF,'utf8')); }catch{}
    storeUrls = arr.map(p=>`${SITE_BASE}/g.html?sku=${encodeURIComponent(p.sku)}`);
  }
  fs.writeFileSync(path.join(OUTDIR, 'sitemap-store.xml'), xmlWrap(storeUrls));
  const mainUrls = [`${SITE_BASE}/`, `${SITE_BASE}/store.html`];
  fs.writeFileSync(path.join(OUTDIR, 'sitemap.xml'), xmlWrap(mainUrls));
  const blogUrls = [];
  fs.writeFileSync(path.join(OUTDIR, 'sitemap-blog.xml'), xmlWrap(blogUrls));
  for(const f of ['sitemap.xml','sitemap-store.xml','sitemap-blog.xml']){
    const src = path.join(OUTDIR, f);
    const dest = path.join(SITE_REPO, f);
    try{ fs.copyFileSync(src, dest); }catch{}
  }
  console.log('Sitemaps generated to out/sitemaps and copied to repo root.');
}
main();
