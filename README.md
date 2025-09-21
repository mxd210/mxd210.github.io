# MXD-Control v2

Bảng điều khiển tác vụ cho site MXD (không phụ thuộc thư viện ngoài). Hỗ trợ:
- Kiểm tra link gốc (Shopee/Lazada) → `affiliates.checked.json`
- Lọc link chết → `affiliates.json` sạch
- Sinh sitemap (`sitemap.xml`, `sitemap-store.xml`, `sitemap-blog.xml`) vào `out/sitemaps`
- Kiểm tra ảnh theo SKU trong `/assets/img/products/` → báo thiếu
- Chạy toàn bộ chuỗi và commit/push (tuỳ chọn)

> Yêu cầu: Node 18+; Git (nếu dùng commit); PowerShell (để dùng `mxd-control.ps1`).

## Cách dùng nhanh
1) Giải nén gói này cạnh repo site (ví dụ cùng cấp với `mxd210.github.io/`).
2) Mở PowerShell tại thư mục này và chạy:
```
.\mxd-control.ps1 -SiteRepo ../mxd210.github.io -DoCommit
```
Mặc định sẽ chạy: check → prune → sitemaps → kiểm tra ảnh → (commit sitemaps & data nếu `-DoCommit`).

## Chạy lẻ từng nhiệm vụ
```
# Chỉ check link
node tasks/check-affiliates.js --repo ../mxd210.github.io

# Chỉ prune (ghi đè affiliates.json)
node tasks/prune-affiliates.js --repo ../mxd210.github.io --write

# Chỉ sitemap
node tasks/build-sitemaps.js --repo ../mxd210.github.io --base https://mxd210.github.io

# Chỉ kiểm tra ảnh
node tasks/validate-images.js --repo ../mxd210.github.io
```

## Commit message gợi ý
```
chore(automation): mxd-control v2 — check/prune/sitemaps/image-validate
```
