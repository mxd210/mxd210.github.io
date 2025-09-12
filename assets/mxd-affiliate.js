(function () {
  const AFF = {
    "shopee.vn": { rel: "nofollow sponsored noreferrer" },
    "lazada.vn": { rel: "nofollow sponsored noreferrer" },
    "tiki.vn":   { rel: "nofollow sponsored noreferrer" }
  };
  document.querySelectorAll('a[href^="http"]').forEach(a => {
    try {
      const u = new URL(a.href);
      if (AFF[u.hostname]) {
        a.setAttribute("rel", AFF[u.hostname].rel);
        a.setAttribute("target", "_blank");
        // TODO: khi có mã affiliate chính thức, thêm tham số rewrite tại đây
      }
    } catch(e){}
  });
})();
