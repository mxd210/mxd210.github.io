// /assets/mxd-affiliate.js — canonical rewrite (Shopee/Lazada). GA4 should be loaded before this file.
(function(){
  if(window.mxdAffiliate && typeof window.mxdAffiliate.scan === 'function') return;
  const TPL={
    shopee:(url, sub1='', sub2='', sub3='', sub4='') =>
      `https://go.isclix.com/deep_link/6803097511817356947/4751584435713464237?url=${encodeURIComponent(url)}&sub1=${encodeURIComponent(sub1)}&sub2=${encodeURIComponent(sub2)}&sub3=${encodeURIComponent(sub3)}&sub4=${encodeURIComponent(sub4)}`,
    lazada:(url, sub1='', sub2='', sub3='', sub4='') =>
      `https://go.isclix.com/deep_link/6803097511817356947/4751584435713464237?url=${encodeURIComponent(url)}&sub1=${encodeURIComponent(sub1)}&sub2=${encodeURIComponent(sub2)}&sub3=${encodeURIComponent(sub3)}&sub4=${encodeURIComponent(sub4)}`
  };
  const getMerchant=(u)=>{
    try{
      const h = new URL(u, location.href).hostname;
      if(h.includes('shopee')) return 'shopee';
      if(h.includes('lazada')) return 'lazada';
    }catch(e){}
    return '';
  };
  function scan(scope=document){
    const links = scope.querySelectorAll('a.buy, a.product-meta');
    links.forEach(a=>{
      const origin = a.getAttribute('href')||'';
      if(!origin || !/^https?:\/\//i.test(origin)) return;
      const merchant = a.getAttribute('data-merchant') || getMerchant(origin);
      const sku = a.getAttribute('data-sku') || a.dataset.sub2 || '';
      const sub1 = a.getAttribute('data-sub1') || sku || '';
      const sub2 = a.getAttribute('data-sub2') || sku || '';
      const sub3 = a.getAttribute('data-sub3') || 'store';
      const sub4 = a.getAttribute('data-sub4') || 'mxd';
      if(TPL[merchant]){
        a.href = TPL[merchant](origin, sub1, sub2, sub3, sub4);
        a.setAttribute('rel','nofollow noopener');
      }
    });
  }
  document.addEventListener('DOMContentLoaded', ()=>scan());
  window.mxdAffiliate = { scan };
})();