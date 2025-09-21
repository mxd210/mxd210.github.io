import fs from 'fs';
const CHECKED = 'assets/data/affiliates.checked.json';
const CONFIG = JSON.parse(fs.readFileSync('mxd.auto.config.json','utf8'));
const THRESH = Number(CONFIG.alerts?.deadLinkThreshold ?? 5);
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
if (!fs.existsSync(CHECKED)) { process.exit(0); }
const checked = JSON.parse(fs.readFileSync(CHECKED,'utf8')||'[]');
const dead = checked.filter(x=>x.is_dead);
if (dead.length <= THRESH || !token || !chatId) { process.exit(0); }
const msg = `⚠️ MXD Alert\nLink chết: ${dead.length}\nVí dụ: ${dead.slice(0,5).map(x=>x.sku).join(', ')}`;
const url = `https://api.telegram.org/bot${token}/sendMessage`;
await fetch(url, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ chat_id: chatId, text: msg }) });
console.log('[i] Đã gửi Telegram alert.');
