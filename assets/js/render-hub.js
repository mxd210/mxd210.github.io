/* ====== MXD Category Aliases (global) ======
   - Hợp nhất mọi biến thể/telex/không dấu → 1 khóa chuẩn
   - Dùng cho renderer & cho script quét affiliates.json
*/
(function (root){
  const deaccent = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const slug = s => deaccent(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-+/g,'-').replace(/(^-|-$)/g,'');

  const MAP = {
    // --- Máy laze (laser level) ---
    "may-laze": [
      "may-laze","may-lazer","may-laser","laser","laze","la-ze","la re","la-re",
      "may-can-bang-laser","can-bang-laser","laser-level","muc-tia-laser","level-laser"
    ],

    // --- Máy cắt ---
    "may-cat": [
      "may-cat","cat-gach","may-cat-gach","may-cat-da","tile-cutter","tile-saw",
      "oscillating","may-cat-da-nang","may-cat-sat","may-cat-nhom","cut-off","luoi-cat"
    ],

    // --- Khoan/đục/vít/bulông + phụ trợ pin ---
    "may-khoan-duc-vit": [
      "may-khoan-duc-vit","may-khoan","may-khoan-be-tong","khoan-sds","khoan-sds-plus","may-duc",
      "may-ban-vit","may-bat-vit","impact-driver","may-bulong","sung-bulong","impact-wrench",
      "khoan-rut-loi","may-rut-loi","may-thoi","may-thoi-la","blower","may-bom-hoi","bom-hoi-pin",
      "phu-kien-khoan"
    ],

    // --- Máy mài/đánh bóng/chà nhám ---
    "may-mai": [
      "may-mai","may-mai-goc","may-mai-pin","angle-grinder","grinder",
      "may-cha-nham","sander","may-danh-bong","polisher","mai-be-tong"
    ],

    // --- Máy rung ốp lát (đầm gạch) ---
    "may-rung-op-lat": [
      "may-rung-op-lat","may-rung-gach","rung-op","tile-vibrator","vibrator-tile","may-rung-hut"
    ],

    // --- Dây mực / bắn dây ---
    "may-ban-day": [
      "may-ban-day","ban-day-muc","chalk-line","may-ban-muc","day-muc"
    ],

    // --- Tool cầm tay ốp lát khác ---
    "bay-rang-cua": [
      "bay-rang-cua","bay-rang-cua-4mm","notched-trowel","bay-tra-keo"
    ],
    "dung-cu-op-lat": [
      "dung-cu-op-lat","nem-gach","kep-can-bang","ke-gach","bo-ke-nem","cu-op-lat"
    ],
    "keo-op-lat": [
      "keo-op-lat","tile-adhesive","xi-mang-keo","keo-gach"
    ],
    "chong-tham": [
      "chong-tham","waterproof","son-chong-tham","phu-chong-tham"
    ],

    // --- Phụ kiện máy (mặc định đổ về đây nếu chỉ là lưỡi/mũi/bit/pin) ---
    "phu-kien-may": [
      "phu-kien-may","mui-khoan","mui-duc","socket","khau","bit","adapter",
      "pin","sac-pin","dia-mai","luoi-cat-phu-kien","phu-kien"
    ],

    // === THỜI TRANG (NEW) ===
    // Hub: /store/thoi-trang.html  → gom các nhánh con như thoi-trang-nu/nam/tre-em...
    "thoi-trang": [
      "thoi-trang","thoi-trang-nu","thoi-trang-nam","thoi-trang-tre-em","tre-em",
      "do-bao-ho","do-bao-ho-lao-dong",
      "mua-he","thu-dong",
      // vài nhóm item phổ biến (để guess/normalize tiện hơn)
      "ao","quan","vay","dam","ao-khoac","ao-phao","ao-hoodie","ao-thun","ao-polo","so-mi","somi",
      "quan-jean","quan-kaki","quan-short","do-bo","do-ngu","do-tap",
      "phu-kien-thoi-trang","that-lung","mu-non","gang-tay","tat","tat-vo"
    ]
  };

  function normalizeCategory(input){
    const s = slug(input||'');
    if (!s) return '';
    for (const [canon, aliases] of Object.entries(MAP)){
      if (aliases.some(a => s.startsWith(slug(a)))) return canon;
    }
    return s; // không khớp alias thì để slug hiện có
  }

  // Dò đoán từ name/tags (khi category trống/sai)
  function guessCategoryByText(name='', tags=[]){
    const t = slug([name, ...(Array.isArray(tags)?tags:[])].join(' '));
    const hit = (keyArr)=> keyArr.some(k => t.includes(slug(k)));

    // Ưu tiên các nhóm lớn trước
    if (hit(MAP["thoi-trang"])) return "thoi-trang";
    if (hit(MAP["may-laze"])) return "may-laze";
    if (hit(MAP["may-khoan-duc-vit"])) return "may-khoan-duc-vit";
    if (hit(MAP["may-cat"])) return "may-cat";
    if (hit(MAP["may-mai"])) return "may-mai";
    if (hit(MAP["may-rung-op-lat"])) return "may-rung-op-lat";
    if (hit(MAP["may-ban-day"])) return "may-ban-day";
    if (hit(MAP["bay-rang-cua"])) return "bay-rang-cua";
    if (hit(MAP["dung-cu-op-lat"])) return "dung-cu-op-lat";
    if (hit(MAP["keo-op-lat"])) return "keo-op-lat";
    if (hit(MAP["chong-tham"])) return "chong-tham";
    if (hit(MAP["phu-kien-may"])) return "phu-kien-may";
    return "";
  }

  // expose
  root.MXD = root.MXD || {};
  root.MXD.normalizeCategory = normalizeCategory;
  root.MXD.guessCategoryByText = guessCategoryByText;
  root.MXD._CATEGORY_ALIASES = MAP;           // tiện debug
  root.MXD_CATEGORY_ALIAS = MAP;              // COMPAT cho renderer cũ (đọc trực tiếp alias map)
})(window);
