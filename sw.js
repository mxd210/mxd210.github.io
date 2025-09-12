const CACHE = "mxd-v1";
const ASSETS = ["/","/assets/site.css","/assets/mxd-affiliate.js"];
self.addEventListener("install",e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener("fetch",e=>{
  e.respondWith(
    caches.match(e.request).then(r=> r || fetch(e.request).then(resp=>{
      const copy = resp.clone();
      caches.open(CACHE).then(c=>c.put(e.request, copy));
      return resp;
    }).catch(()=>r))
  );
});
