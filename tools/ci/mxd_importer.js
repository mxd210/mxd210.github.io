// mxd_importer.js — nhập link -> merge JSON + tải ảnh .webp 800x800
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import slugify from 'slugify';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Gốc repo do Actions truyền vào, fallback về ../../
const ROOT = process.env.REPO_ROOT || path.resolve(__dirname, '../../');
const AFF_PATH = path.join(ROOT, 'assets', 'data', 'affiliates.json');
const IMG_DIR  = path.join(ROOT, 'assets', 'img', 'products');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

function ensureDirs() {
  fs.mkdirSync(path.dirname(AFF_PATH), { recursive: true });
  fs.mkdirSync(IMG_DIR, { recursive: true });
}

function detectMerchant(u) {
  try {
    const h = new URL(u).hostname;
    if (h.includes('shopee')) return 'shopee';
    if (h.includes('lazada')) return 'lazada';
    if (h.includes('tiki'))   return 'tiki';
    return 'other';
  } catch { return 'other'; }
}

// Hỗ trợ "Tên | giá | link" hoặc chỉ "link"
function parseLine(line) {
  const parts = line.split('|').map(s => s.trim()).filter(Boolean);
  if (parts.length >= 3) {
    const [name, priceRaw, origin] = parts;
    const price = Number(String(priceRaw).replace(/[^\d]/g, '')) || null;
    return { name, price, origin };
  }
  return { name: null, price: null, origin: line.trim() };
}

async function fetchOgImage(url) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'vi,en;q=0.8' }, redirect: 'follow' });
    const html = await res.text();
    const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
           || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return m ? m[1] : null;
  } catch { return null; }
}

async function downloadToWebp(srcUrl, outPath) {
  try {
    const res = await fetch(srcUrl, { headers: { 'user-agent': UA }, redirect: 'follow' });
    if (!res.ok) throw new Error('img http ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    await sharp(buf)
      .resize(800, 800, { fit: 'contain', background: '#ffffff' })
      .webp({ quality: 90 })
      .toFile(outPath);
    return true;
  } catch {
    // Fallback: tạo ảnh trắng 800x800 để không vỡ layout
    const blank = await sharp({
      create: { width: 800, height: 800, channels: 3, background: '#ffffff' }
    }).webp({ quality: 90 }).toBuffer();
    await fs.promises.writeFile(outPath, blank);
    return false;
  }
}

function loadJsonSafe() {
  if (fs.existsSync(AFF_PATH)) {
    try { return JSON.parse(fs.readFileSync(AFF_PATH, 'utf8')); }
    catch { return []; }
  }
  return [];
}

function saveJson(data) {
  const sorted = [...data].sort((a, b) => (a.sku||'').localeCompare(b.sku||''));
  fs.writeFileSync(AFF_PATH, JSON.stringify(sorted, null, 2), 'utf8');
}

function makeSku({ name, origin }) {
  if (name) return slugify(name, { lower: true, strict: true, locale: 'vi' });
  try {
    const u = new URL(origin);
    const last = u.pathname.split('/').filter(Boolean).pop() || u.hostname;
    return slugify(last, { lower: true, strict: true, locale: 'vi' });
  } catch {
    return slugify(origin.slice(0, 40), { lower: true, strict: true, locale: 'vi' });
  }
}

async function main() {
  ensureDirs();

  const raw = (process.env.LINKS || '').trim();
  if (!raw) {
    console.log('LINKS env is empty; nothing to do.');
    return;
  }

  const lines = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const items = lines.map(parseLine);

  const db = loadJsonSafe();
  const bySku = new Map(db.map(x => [x.sku, x]));

  const added = [];

  for (const it of items) {
    const merchant = detectMerchant(it.origin);
    const sku = makeSku(it);
    const imgRel = `/assets/img/products/${sku}.webp`;
    const imgAbs = path.join(IMG_DIR, `${sku}.webp`);

    // 1) lấy ảnh
    let ok = false;
    const og = await fetchOgImage(it.origin);
    if (og) ok = await downloadToWebp(og, imgAbs);
    if (!ok && !fs.existsSync(imgAbs)) {
      // nếu không lấy được ảnh OG và chưa có ảnh cũ: tạo ảnh trắng
      await downloadToWebp('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQI12P4//8/AwAI/AL+1Q1cBQAAAABJRU5ErkJggg==', imgAbs);
    }

    // 2) merge JSON theo sku
    const now = new Date().toISOString();
    const rec = {
      name: it.name || (bySku.get(sku)?.name ?? sku),
      price: (it.price ?? bySku.get(sku)?.price ?? null),
      origin: it.origin,
      merchant,
      sku,
      image: imgRel,
      updated_at: now,
      featured: bySku.get(sku)?.featured ?? false,
      status: bySku.get(sku)?.status ?? true
    };

    bySku.set(sku, rec);
    added.push({ sku, merchant });
  }

  const out = Array.from(bySku.values());
  saveJson(out);

  // Commit subject để workflow dùng vào message
  const subject = added.length === 1
    ? `${added[0].sku} (${added[0].merchant})`
    : `${added.length} items: ${added.slice(0,3).map(x=>x.sku).join(', ')}${added.length>3?'…':''}`;
  fs.appendFileSync(process.env.GITHUB_ENV, `COMMIT_SUBJECT=${subject}\n`);

  console.log('Done. Added/updated:', added);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
