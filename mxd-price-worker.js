/* mxd-price-proxy — ESM (Modules) — hardened
 * Endpoints:
 *   GET /health
 *   GET /head?url=<encoded>
 *   GET /img?url=<encoded>
 *   GET /aff?url=<encoded>&merchant=shopee|lazada|tiki|tiktok[&sub1..sub4][&aff_id=...]
 */

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const H_JSON = { 'content-type': 'application/json; charset=utf-8' };
const H_TEXT = { 'content-type': 'text/plain; charset=utf-8' };
const ALLOWED_MERCHANTS = new Set(['shopee', 'lazada', 'tiki', 'tiktok']);

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const origin = request.headers.get('Origin') || '';
      const method = request.method.toUpperCase();

      // CORS preflight
      if (method === 'OPTIONS') {
        return withCORS(new Response(null, { status: 204 }), origin, env, true);
      }

      const path = (url.pathname.replace(/\/+$/, '') || '/').toLowerCase();
      const destRaw = url.searchParams.get('url');

      if (path === '/' || path === '') {
        const tip = {
          ok: true,
          name: 'mxd-price-proxy',
          use: ['/health', '/head?url=', '/img?url=', '/aff?url=&merchant='],
        };
        return withCORS(json(tip), origin, env);
      }

      if (path === '/health') {
        return withCORS(
          json({ ok: true, name: 'mxd-price-proxy', ts: Date.now() }),
          origin,
          env,
        );
      }

      if (path === '/head') {
        const safe = safeURL(destRaw);
        if (!safe) return withCORS(bad(400, 'missing/invalid url'), origin, env);
        return withCORS(await headCheck(safe), origin, env);
      }

      if (path === '/img') {
        const safe = safeURL(destRaw);
        if (!safe) return new Response('bad url', { status: 400, headers: H_TEXT });
        return await proxyImage(safe, origin, env);
      }

      if (path === '/aff') {
        return withCORS(await makeAffiliate(url, env), origin, env);
      }

      return withCORS(bad(404, 'not found'), origin, env);
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: String(e || 'err') }), {
        headers: H_JSON,
        status: 500,
      });
    }
  },

  // Cron safe: optional; will no-op if no KV binding is present
  async scheduled(event, env, ctx) {
    try {
      if (env.PRICE_CACHE && typeof env.PRICE_CACHE.put === 'function') {
        await env.PRICE_CACHE.put('mxd:price:lastbeat', String(Date.now()));
      }
    } catch (_) {}
  },
};

/* ---------- helpers ---------- */

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { headers: H_JSON, status });
}

function bad(status, msg) {
  return json({ ok: false, error: msg }, status);
}

function parseAllowOrigins(env) {
  const raw = (env.ALLOW_ORIGINS || '').trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function withCORS(resp, origin, env, isPreflight = false) {
  const allow = parseAllowOrigins(env);
  const allowAny = allow.includes('*');
  const headers = new Headers(resp.headers);

  if (allowAny || (origin && allow.includes(origin))) {
    headers.set('Access-Control-Allow-Origin', allowAny ? '*' : origin);
    headers.set('Vary', 'Origin');
  }
  headers.set('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept');
  headers.set('Access-Control-Max-Age', '86400');
  headers.set('X-Worker', 'mxd-price-proxy');

  return new Response(isPreflight ? null : resp.body, {
    status: resp.status,
    headers,
  });
}

function safeURL(u) {
  if (!u) return null;
  try {
    const decoded = decodeURIComponent(u);
    const x = new URL(decoded);
    if (x.protocol !== 'http:' && x.protocol !== 'https:') return null;
    return x.toString();
  } catch {
    return null;
  }
}

async function headCheck(url) {
  try {
    const r = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: { 'user-agent': UA },
      cf: { cacheTtl: 300, cacheEverything: false },
    });
    return json({ ok: r.ok, status: r.status });
  } catch {
    return json({ ok: false, status: 0 });
  }
}

function sniffContentType(url, fallback = 'application/octet-stream') {
  const ext = (url.split('?')[0] || '').toLowerCase();
  if (ext.endsWith('.png')) return 'image/png';
  if (ext.endsWith('.jpg') || ext.endsWith('.jpeg')) return 'image/jpeg';
  if (ext.endsWith('.webp')) return 'image/webp';
  if (ext.endsWith('.gif')) return 'image/gif';
  if (ext.endsWith('.svg')) return 'image/svg+xml';
  return fallback;
}

async function proxyImage(url, origin, env) {
  const r = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'image/*,*/*' },
    redirect: 'follow',
    cf: { cacheTtl: 86400, cacheEverything: true },
  });

  const ct = r.headers.get('content-type') || sniffContentType(url);
  const headers = new Headers({
    'content-type': ct,
    'cache-control': 'public, max-age=86400',
    'x-proxied': '1',
  });

  // CORS for <img> or fetch
  const allow = parseAllowOrigins(env);
  const allowAny = allow.includes('*');
  if (allowAny || (origin && allow.includes(origin))) {
    headers.set('Access-Control-Allow-Origin', allowAny ? '*' : origin);
    headers.set('Vary', 'Origin');
  }

  return new Response(r.body, { status: r.status, headers });
}

function buildAccesstrade(templateOrBase, params) {
  // Support {url} template or plain base with query ?url=
  let out = templateOrBase || '';
  const enc = encodeURIComponent(params.url ?? '');

  if (!out) return '';

  if (out.includes('{url}')) {
    out = out.replace(/\{url\}/g, enc);
  } else {
    const sep = out.includes('?') ? '&' : '?';
    out = `${out}${sep}url=${enc}`;
  }

  // Append optional params if provided
  for (const k of ['sub1', 'sub2', 'sub3', 'sub4']) {
    if (params[k]) out += `&${k}=${encodeURIComponent(params[k])}`;
  }
  if (params.aff_id && !/([?&])aff_id=/.test(out)) {
    out += `&aff_id=${encodeURIComponent(params.aff_id)}`;
  }
  if (params.merchant && !/([?&])merchant=/.test(out)) {
    out += `&merchant=${encodeURIComponent(params.merchant)}`;
  }
  return out;
}

function pickTemplate(merchant, env) {
  switch (merchant) {
    case 'shopee':
      return env.AFF_SHOPEE_TEMPLATE || env.AT_BASE_SHOPEE || '';
    case 'lazada':
      return env.AFF_LAZADA_TEMPLATE || env.AT_BASE_LAZADA || '';
    case 'tiki':
      return env.AFF_TIKI_TEMPLATE || env.AT_BASE_TIKI || '';
    case 'tiktok':
      return env.AFF_TIKTOK_TEMPLATE || env.AT_BASE_TIKTOK || '';
    default:
      return '';
  }
}

async function makeAffiliate(u, env) {
  const url = u.searchParams.get('url') || '';
  const merchant = (u.searchParams.get('merchant') || '').toLowerCase();

  if (!url) return bad(400, 'missing url');
  if (!ALLOWED_MERCHANTS.has(merchant)) return bad(400, 'invalid merchant');

  const params = {
    url,
    merchant,
    aff_id: u.searchParams.get('aff_id') || env.AFF_ID || '',
    sub1: u.searchParams.get('sub1') || '',
    sub2: u.searchParams.get('sub2') || '',
    sub3: u.searchParams.get('sub3') || '',
    sub4: u.searchParams.get('sub4') || '',
  };

  const tpl = pickTemplate(merchant, env);
  if (!tpl) return bad(400, 'missing template/base for merchant');

  const deep = buildAccesstrade(tpl, params);
  return json({ ok: true, deep });
}
