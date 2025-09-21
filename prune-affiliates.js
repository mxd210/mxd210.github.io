import fs from 'fs';
import path from 'path';
const args = process.argv.slice(2);
const repoIdx = args.indexOf('--repo');
if (repoIdx === -1 || !args[repoIdx+1]) {
  console.error('Usage: node tasks/prune-affiliates.js --repo <path-to-site-repo> [--write]');
  process.exit(1);
}
const WRITE = args.includes('--write');
const SITE_REPO = path.resolve(args[repoIdx+1]);
const IN   = path.join(SITE_REPO, 'assets', 'data', 'affiliates.checked.json');
const OUT  = path.join(SITE_REPO, 'assets', 'data', 'affiliates.pruned.json');
const BASE = path.join(SITE_REPO, 'assets', 'data', 'affiliates.json');
function main(){
  if(!fs.existsSync(IN)){ console.error('Missing', IN); process.exit(2); }
  const arr = JSON.parse(fs.readFileSync(IN,'utf8'));
  const keep = arr.filter(x => x._check && x._check.ok).map(({_check, ...p})=>p);
  fs.writeFileSync(OUT, JSON.stringify(keep, null, 2), 'utf8');
  console.log(`Wrote ${OUT} (${keep.length}/${arr.length})`);
  if(WRITE){
    fs.writeFileSync(BASE, JSON.stringify(keep, null, 2), 'utf8');
    console.log(`Overwrote ${BASE}`);
  }
}
main();
