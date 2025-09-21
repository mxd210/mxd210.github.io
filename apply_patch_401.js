
/**
 * apply_patch_401.js — Non-destructive injector for MXD Importer 4.0
 * Usage: node apply_patch_401.js --file path\to\tools\shopee-importer.html
 */
import fs from 'fs';
import path from 'path';
const args = process.argv.slice(2);
const idx = args.indexOf('--file');
if (idx === -1 || !args[idx+1]) {
  console.error('Usage: node apply_patch_401.js --file <path-to-shopee-importer.html>');
  process.exit(1);
}
const file = path.resolve(args[idx+1]);
let html = fs.readFileSync(file, 'utf8');

function read(rel){ return fs.readFileSync(new URL(rel, import.meta.url), 'utf8'); }
const css401 = read('./patches/css/401_clean.css');
const helpers = read('./patches/js/helpers_401.js');
const headOv  = read('./patches/js/fetchHead_override.js');
const overlay = read('./patches/js/settings_mount_save.txt') + '\n' + read('./patches/js/parse_fetch_changes.txt');
const workerHTML = read('./snippets/html/worker_mode.html');
const priceHTML  = read('./snippets/html/price_adjust.html');
const bulkHTML   = read('./snippets/html/import_bulk_sub1.html');

function insertBefore(str, marker, insert){
  const i = str.indexOf(marker);
  if(i === -1) return null;
  return str.slice(0,i) + insert + marker + str.slice(i+marker.length);
}
function insertAfter(str, marker, insert){
  const i = str.indexOf(marker);
  if(i === -1) return null;
  return str.slice(0,i+marker.length) + insert + str.slice(i+marker.length);
}

// 1) Inject CSS before </head>
if (!html.includes('id="mxd-401"')){
  const styleTag = `<style id="mxd-401">\n${css401}\n</style>\n`;
  let next = insertBefore(html, '</head>', styleTag);
  if (next) html = next;
  else html = styleTag + html; // fallback prepend
}

// 2) Inject scripts before </body>
const scriptHelpers = `<script id="mxd-401-helpers">\n${helpers}\n</script>\n`;
const scriptHead    = `<script id="mxd-401-fetchhead">\n${headOv}\n</script>\n`;
const scriptOverlay = `<script id="mxd-401-overlay">\n${overlay}\n</script>\n`;
if (!html.includes('id="mxd-401-helpers"')){
  let next = insertBefore(html, '</body>', scriptHelpers);
  if (next) html = next; else html += scriptHelpers;
}
if (!html.includes('id="mxd-401-fetchhead"')){
  let next = insertBefore(html, '</body>', scriptHead);
  if (next) html = next; else html += scriptHead;
}
if (!html.includes('id="mxd-401-overlay"')){
  let next = insertBefore(html, '</body>', scriptOverlay);
  if (next) html = next; else html += scriptOverlay;
}

// 3) Inject Settings HTML
function injectSettings(block){
  // Try common settings containers
  const ids = ['id="settings"', "id='settings'", 'id="tab-settings"', "id='tab-settings'"];
  for(const id of ids){
    const idx = html.indexOf(id);
    if(idx !== -1){
      // Find closing tag of the parent section/div that contains this id
      // Simplified approach: locate nearest closing </section> or </div> after idx, and insert before it.
      const after = html.indexOf('</section>', idx);
      const afterDiv = html.indexOf('</div>', idx);
      const pos = (after !== -1) ? after : afterDiv;
      if (pos !== -1){
        html = html.slice(0,pos) + '\n' + block + '\n' + html.slice(pos);
        return true;
      }
    }
  }
  return false;
}

const settingsBlock = `\n<!-- MXD 4.0.1 Settings Block -->\n${workerHTML}\n${priceHTML}\n`;
if (!html.includes('MXD 4.0.1 Settings Block')){
  if (!injectSettings(settingsBlock)){
    // Fallback: put near start of body in its own section
    const fallback = `<section id="mxd-401-settings" class="card">\n<h3>MXD 4.0.1 Settings</h3>\n${settingsBlock}\n</section>\n`;
    let next = insertAfter(html, '<body', ''); // noop to find <body
    // insert after the first '>' after <body
    const bodyOpen = html.indexOf('<body');
    const gt = bodyOpen>=0 ? html.indexOf('>', bodyOpen) : -1;
    if (gt>=0) html = html.slice(0,gt+1) + '\n' + fallback + html.slice(gt+1);
    else html = fallback + html;
  }
}

// 4) Inject Import bulk checkbox
function injectImport(block){
  const ids = ['id="import"', "id='import'", 'id="tab-import"', "id='tab-import'"];
  for(const id of ids){
    const idx = html.indexOf(id);
    if(idx !== -1){
      const after = html.indexOf('</section>', idx);
      const afterDiv = html.indexOf('</div>', idx);
      const pos = (after !== -1) ? after : afterDiv;
      if (pos !== -1){
        html = html.slice(0,pos) + '\n' + block + '\n' + html.slice(pos);
        return true;
      }
    }
  }
  return false;
}
const importBlock = `\n<!-- MXD 4.0.1 Import Block -->\n${bulkHTML}\n`;
if (!html.includes('MXD 4.0.1 Import Block')){
  if (!injectImport(importBlock)){
    // Fallback: append near end of body
    let next = insertBefore(html, '</body>', `<section id="mxd-401-import" class="card">\n<h3>MXD 4.0.1 Import</h3>\n${importBlock}\n</section>\n`);
    if (next) html = next; else html += importBlock;
  }
}

// Write back
fs.writeFileSync(file, html, 'utf8');
console.log('Applied MXD Importer Patch 4.0.1 Clean to', file);
