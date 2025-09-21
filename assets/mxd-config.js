// MXD config cho auto-products (Sheet CSV + proxy ảnh)
window.MXD_CFG = {
  // Đổi thành link CSV của Google Sheet của bạn (hướng dẫn ở dưới)
  SHEET_CSV: "https://docs.google.com/spreadsheets/d/PASTE_SHEET_ID/export?format=csv&gid=0",

  // (tuỳ chọn) Proxy ảnh qua Cloudflare Worker nếu có để tránh chặn hotlink
  // Ví dụ: "https://your-worker.workers.dev/img"
  IMG_PROXY: ""
};
