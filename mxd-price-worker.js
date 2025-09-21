export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/,'') || '/';
    const dest = url.searchParams.get('url');
    if (path === '/head') return headCheck(dest);
    if (path === '/img')  return proxyImage(dest);
    if (path === '/aff')  return makeAffiliate(url, env);
    return new Response(JSON.stringify({ ok: true, tip: 'Use /head?url=, /img?url=, /aff?url=&merchant=' }), { headers:{'content-type':'application/json; charset=utf-8'} });
  }
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const H_JSON = {'content-type':'application/json; charset=utf-8'};

async function headCheck(url){
  if (!url) return new Response(JSON.stringify({ ok:false, error:'missing url' }), { headers:H_JSON, status:400 });
  try{
    const r = await fetch(url, { method:'HEAD', redirect:'follow', headers:{'user-agent':UA} });
    return new Response(JSON.stringify({ ok:r.ok, status:r.status }), { headers:H_JSON, status:200 });
  }catch{ return new Response(JSON.stringify({ ok:false, status:0 }), { headers:H_JSON, status:200 }); }
}

async function proxyImage(url){
  if (!url) return new Response('bad', { status:400 });
  const r = await fetch(url, { headers:{'user-agent':UA} });
  return new Response(await r.arrayBuffer(), { headers:{ 'content-type': r.headers.get('content-type') || 'image/webp', 'cache-control':'public, max-age=86400' }, status:r.status });
}

function buildAccesstrade(template, params){
  let out = template;
  for (const [k,v] of Object.entries(params)){
    out = out.replace(new RegExp('{'+k+'}','g'), encodeURIComponent(v??''));
  }
  return out;
}

async function makeAffiliate(u, env){
  const url = u.searchParams.get('url') || '';
  const merchant = (u.searchParams.get('merchant') || '').toLowerCase();
  const aff_id = env.AFF_ID || '';
  const sub1 = u.searchParams.get('sub1') || '';
  const sub2 = u.searchParams.get('sub2') || '';
  const sub3 = u.searchParams.get('sub3') || '';
  const sub4 = u.searchParams.get('sub4') || '';
  let tpl = '';
  if (merchant === 'shopee') tpl = env.AFF_SHOPEE_TEMPLATE || '';
  if (merchant === 'lazada') tpl = env.AFF_LAZADA_TEMPLATE || '';
  if (!tpl || !url) return new Response(JSON.stringify({ ok:false, error:'missing template/url' }), { headers:H_JSON, status:400 });
  const deep = buildAccesstrade(tpl, { url, aff_id, sub1, sub2, sub3, sub4, merchant });
  return new Response(JSON.stringify({ ok:true, deep }), { headers:H_JSON });
}
