import fs from 'fs'; import path from 'path';
const CONFIG = JSON.parse(fs.readFileSync('mxd.auto.config.json','utf8'));
const BASE = CONFIG.siteBase || 'https://mxd210.github.io';
function listHtml(dir){ if (!fs.existsSync(dir)) return []; return fs.readdirSync(dir).filter(f => f.endsWith('.html')).map(f => path.join(dir,f)); }
function toUrl(p){ const web = p.replace(/\\/g,'/').replace(/^\./,''); return `${BASE}/${web}`.replace(/\/\//g,'/'); }
function lastmod(p){ try { return fs.statSync(p).mtime.toISOString().slice(0,10); } catch { return new Date().toISOString().slice(0,10); } }
function buildOne(urls){ const head = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`; const body = urls.map(u => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq||'weekly'}</changefreq>\n    <priority>${u.priority||'0.6'}</priority>\n  </url>`).join('\n\n'); const foot = `\n</urlset>\n`; return head + "\n" + body + foot; }
const rootUrls = [{ loc: `${BASE}/`, lastmod: new Date().toISOString().slice(0,10), changefreq:'weekly', priority:'1.0' }, { loc: `${BASE}/store.html`, lastmod: new Date().toISOString().slice(0,10), changefreq:'weekly', priority:'0.9' }];
fs.writeFileSync('sitemap.xml', buildOne(rootUrls));
const blogFiles = listHtml('blog'); const blogUrls = blogFiles.map(p => ({ loc: toUrl(p), lastmod: lastmod(p), changefreq:'weekly', priority:'0.6' })); fs.writeFileSync('sitemap-blog.xml', buildOne(blogUrls));
const storeFiles = listHtml('store'); const storeUrls = storeFiles.map(p => ({ loc: toUrl(p), lastmod: lastmod(p), changefreq:'weekly', priority:'0.7' })); fs.writeFileSync('sitemap-store.xml', buildOne(storeUrls));
console.log('[✓] Wrote sitemap.xml, sitemap-blog.xml, sitemap-store.xml');
