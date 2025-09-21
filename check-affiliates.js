import fs from 'fs';
import path from 'path';
const args = process.argv.slice(2);
const repoIdx = args.indexOf('--repo');
if (repoIdx === -1 || !args[repoIdx+1]) {
  console.error('Usage: node tasks/check-affiliates.js --repo <path-to-site-repo>');
  process.exit(1);
}
const SITE_REPO = path.resolve(args[repoIdx+1]);
const IN  = path.join(SITE_REPO, 'assets', 'data', 'affiliates.json');
const OUT = path.join(SITE_REPO, 'assets', 'data', 'affiliates.checked.json');
const H = {'user-agent':'Mozilla/5.0 MXD-Control/2','accept-language':'vi,en;q=0.8'};
async function head(url, ms=8000){
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort('timeout'), ms);
  try{
    const r = await fetch(url, {method:'HEAD', redirect:'manual', headers:H, signal: ctrl.signal});
    clearTimeout(t);
    if(r.status>=200 && r.status<400) return {ok:true, status:r.status};
    if(r.status===405 || r.status===403) return {ok:true, status:r.status};
    const g = await fetch(url, {method:'GET', redirect:'manual', headers:H});
    return {ok: g.status>=200 && g.status<400, status: g.status};
  }catch(e){
    clearTimeout(t);
    try{
      const g = await fetch(url, {method:'GET', redirect:'manual', headers:H});
      return {ok: g.status>=200 && g.status<400, status: g.status};
    }catch(err){
      return {ok:false, status:0, error:String(err)};
    }
  }
}
async function main(){
  if(!fs.existsSync(IN)){ console.error('Missing', IN); process.exit(2); }
  const arr = JSON.parse(fs.readFileSync(IN,'utf8'));
  const out = []; let ok=0,bad=0;
  for(const p of arr){
    const r = await head(p.origin);
    out.push({...p, _check: {ok:r.ok, status:r.status}});
    if(r.ok) ok++; else bad++;
    console.log(`${r.ok?'OK':'BAD'} ${r.status} :: ${p.origin}`);
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
  console.log(`Wrote ${OUT} (${out.length} items). OK=${ok}, BAD=${bad}`);
}
main();
