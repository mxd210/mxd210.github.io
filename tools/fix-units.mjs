// tools/fix-units.mjs
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const EXTS = new Set(['.html', '.css']);
const UNIT_FIXES = [
  [/\b(\d+)\s+px\b/g, '$1px'],
  [/\b(\d+(?:\.\d+)?)\s+fr\b/g, '$1fr'],
  [/\b(\d+)\s+deg\b/g, '$1deg'],
  [/\b(\d+(?:\.\d+)?)\s+rem\b/g, '$1rem'],
  [/\b(\d+(?:\.\d+)?)\s+em\b/g, '$1em'],
  [/\b(\d+(?:\.\d+)?)\s+vh\b/g, '$1vh'],
  [/\b(\d+(?:\.\d+)?)\s+vw\b/g, '$1vw'],
];

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name.startsWith('.git')) continue;
      walk(p);
    } else {
      const ext = path.extname(name).toLowerCase();
      if (!EXTS.has(ext)) continue;
      let txt = fs.readFileSync(p, 'utf8');
      let out = txt;
      for (const [re, rep] of UNIT_FIXES) out = out.replace(re, rep);
      if (out !== txt) {
        fs.writeFileSync(p, out);
        console.log('fixed:', p);
      }
    }
  }
}
walk(ROOT);
console.log('Done.');
