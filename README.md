# MXD Automation v0.2

Nâng cấp từ v0.1:
- **Importer CSV/Google Sheet** → cập nhật `assets/data/affiliates.json`
- **Telegram alert** nếu số link chết > ngưỡng (dùng repo secrets)
- **Worker** hỗ trợ deep-link Shopee/Lazada + /head + /img proxy
- **JS render** Featured & Store dạng drop-in, không phá chuẩn GA4/affiliate

## Cách cài đặt nhanh
1) Tải zip, giải nén vào gốc repo `mxd210.github.io` (merge).
2) Commit & push.
3) (Tuỳ chọn) Thêm Secrets:
   - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
   - `AFF_ID`, `AFF_SHOPEE_TEMPLATE`, `AFF_LAZADA_TEMPLATE`
4) (Tuỳ chọn) Nhập sản phẩm nhanh: dán `assets/data/affiliates.csv` hoặc set `import.sheetCsvUrl` (Google Sheet → Publish to web → CSV).

## Scripts chính
- `npm run import:csv` → tạo/ghép `affiliates.json` từ CSV/Sheet
- `npm run check:links` + `npm run prune:dead` → quét & gỡ link chết (backup tự động)
- `npm run gen:featured` → `assets/data/featured.json`
- `npm run build:sitemap` → sitemap.xml + blog/store
- `npm run alert:telegram` → gửi cảnh báo nếu vượt ngưỡng

## Front-end
- Thêm vào cuối `index.html` block:
  ```html
  <div id="featured-products"></div>
  <script src="/assets/analytics.js" defer></script>
  <script src="/assets/mxd-affiliate.js" defer></script>
  <script src="/assets/js/featured.js" defer></script>
  ```
- `store.html` thêm:
  ```html
  <div id="store-grid"></div>
  <script src="/assets/analytics.js" defer></script>
  <script src="/assets/mxd-affiliate.js" defer></script>
  <script src="/assets/js/store.js" defer></script>
  ```

## Workflow
Chạy 4 giờ/lần và khi push. Commit: `chore(auto): import, check, prune, featured, sitemaps, alert [skip ci]`
