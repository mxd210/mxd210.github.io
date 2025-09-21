// --- 4.0.1: fetchHead using currentWorker ---
async function fetchHead(url){
  try{
    const base = (currentWorker()||'').replace(/\/+$/,'');
    if(!base){
      return {status:0, parser:'fallback', title:'', image:'', price:null, brand:''};
    }
    const res = await fetch(base + '/head?url=' + encodeURIComponent(url), {mode:'cors'});
    let data={}; try{ data = await res.json() }catch(_){}
    return {
      status: res.status||0, parser:'worker-head',
      title: data.title||data.ogTitle||'', image: data.image||data.ogImage||'',
      price: (data.price!=null && isFinite(Number(data.price))) ? Number(data.price) : null,
      brand: data.brand||''
    };
  }catch(e){
    return {status:0, parser:'error', title:'', image:'', price:null, brand:''};
  }
}
