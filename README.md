
# MXD Importer — Patch Pack v4.0.1 Clean (Fixed)

Đây là bản vá đã đóng gói đúng **thư mục + auto-applier**.
Bạn **không** kéo thả JSON vào repo nữa; thay vào đó:

## Cách dùng nhanh
1) Giải nén gói này.
2) Mở PowerShell tại thư mục đã giải nén.
3) Chạy:
```powershell
.\MXD-Patch-Importer-401.ps1 -File ../mxd210.github.io/tools/shopee-importer.html
```
(Chỉnh đường dẫn `-File` cho đúng vị trí importer của bạn.)

Hoặc dùng Node trực tiếp:
```bash
node apply_patch_401.js --file ../mxd210.github.io/tools/shopee-importer.html
```

## Script sẽ làm gì
- Chèn CSS (font & polish) vào `<head>`
- Chèn JS helpers + `fetchHead` override + overlay settings
- Thêm UI Worker/Price vào **Settings** (hoặc fallback section nếu không tìm được)
- Thêm checkbox **bulk sub1={sku}** vào **Import** (hoặc fallback section)

> Cách này **không phụ thuộc** mã gốc chính xác 100%: nếu không tìm được anchor, script thêm **khu riêng** để bạn vẫn dùng được tính năng.

## Commit message gợi ý
```
feat(importer): apply Patch Pack v4.0.1 Clean
- Font VN + layout polish
- SKU chuẩn hóa + bulk sub1={sku}
- Worker modes (Default/Custom/None)
- Default price adjust -3% + optional round 1.000đ
- fetchHead via Worker (/head)
```
