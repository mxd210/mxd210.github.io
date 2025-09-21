// --- 4.0.1 Helpers ---
function decodeURIComponentSafe(s){ try{ return decodeURIComponent(s) }catch{ return s } }
function humanNameFromURL(u){
  try{
    const url=new URL(u);
    const last=url.pathname.split('/').filter(Boolean).pop()||url.hostname;
    const dec=decodeURIComponentSafe(last).replace(/[-_]+/g,' ').trim();
    return /^\d+$/.test(dec) ? url.hostname : dec;
  }catch{ return u }
}
function slugifyVN(s){
  s=String(s||'').trim();
  if(/%[0-9A-Fa-f]{2}/.test(s)) s=decodeURIComponentSafe(s);
  s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase();
  s=s.replace(/[^a-z0-9]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
  if(s.length>80) s=s.slice(0,80).replace(/-+$/,'');
  return s || ('mxd-'+Date.now().toString(36));
}
// Worker mode helper (uses SETTINGS.worker_mode + SETTINGS.worker)
function currentWorker(){
  const mode = (window.SETTINGS && SETTINGS.worker_mode)||'default';
  if(mode==='default') return 'https://mxd210.mxd6686.workers.dev';
  if(mode==='custom')  return (SETTINGS.worker||'').trim();
  return ''; // none
}
// Price adjust helper
function adjPrice(p){
  let v = Number(p)||0;
  const adj = (window.SETTINGS && Number(SETTINGS.price_adj))||-3; // default -3
  const round = !!(window.SETTINGS && SETTINGS.price_round);
  v = v * (1 + (Number(adj)||0)/100);
  if (round) v = Math.round(v/1000)*1000;
  return Math.max(0, Math.floor(v));
}
