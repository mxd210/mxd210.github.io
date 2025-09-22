# /assets/img/products/ — MXD image rules

**Ngày tạo:** 2025-09-22 08:26:20

Quy ước cố định (MXD Web Conventions):
- Thư mục ảnh sản phẩm luôn là **/assets/img/products/** (có chữ *s*).
- Định dạng ảnh: **.webp**.
- Tên file = **slug** của SKU: **lowercase-kebab-case** (không dấu), ví dụ: `dekton-dk-ag950s.webp`.
- Mọi `product-meta` đều có `data-sku` và `data-img` trỏ đúng file trong thư mục này.
- Fallback mặc định của renderer: `/assets/img/products/<data-sku>.webp`.
- Khi thay/đổi ảnh: **bump SW VERSION** trong service worker để tránh cache cũ.

File có sẵn:
- `placeholder.webp` — 1200×630 dùng cho OG/social.
- `placeholder-square.webp` — 800×800 dùng tạm cho thẻ sản phẩm.

Gợi ý xuất ảnh:
- Nền sáng trung tính, biên an toàn ~24px, kích thước tối thiểu 800×800, nén webp chất lượng 80–90.
- Tên file phải khớp **SKU** trong `data-sku`, ví dụ SKU `bosch-gws-900-125-s` → ảnh `bosch-gws-900-125-s.webp`.

Commit gợi ý:
```
chore(assets): recreate /assets/img/products with .gitkeep + placeholders
```
