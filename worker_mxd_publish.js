// Cloudflare Worker: MXD Publish Bridge
// Routes:
//  - POST /publish {links, price_adj, price_round, sub1_mode, sub1_custom, override_deeplink, worker_base, tpl_shopee, tpl_lazada, tpl_tiki, aff_id}
//    -> triggers GitHub workflow_dispatch for mxd_importer.yml
//  - GET  /status?workflow=mxd_importer.yml
//    -> returns latest 10 runs (status/urls) for convenience
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/publish') {
      const body = await request.json();
      const inputs = {
        links: String(body.links||''),
        price_adj: String(body.price_adj ?? '-3'),
        price_round: String(body.price_round ? 'true' : 'false'),
        sub1_mode: String(body.sub1_mode || 'sku'),
        sub1_custom: String(body.sub1_custom || ''),
        override_deeplink: String(body.override_deeplink ? 'true' : 'false'),
        worker_base: String(body.worker_base || ''),
        tpl_shopee: String(body.tpl_shopee || ''),
        tpl_lazada: String(body.tpl_lazada || ''),
        tpl_tiki: String(body.tpl_tiki || ''),
        aff_id: String(body.aff_id || '')
      };
      const gh = `https://api.github.com/repos/${env.GH_OWNER}/${env.GH_REPO}/actions/workflows/${env.WORKFLOW_FILE}/dispatches`;
      const resp = await fetch(gh, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ref: env.GH_REF || 'main', inputs })
      });
      if (resp.status === 204) {
        return new Response(JSON.stringify({ ok: true, message: 'Dispatched', actions_url: `https://github.com/${env.GH_OWNER}/${env.GH_REPO}/actions` }), {
          status: 202, headers: { 'content-type': 'application/json' }
        });
      }
      const txt = await resp.text();
      return new Response(JSON.stringify({ ok:false, status: resp.status, error: txt }), { status: 500, headers: {'content-type':'application/json'} });
    }

    if (request.method === 'GET' && url.pathname === '/status') {
      const workflow = url.searchParams.get('workflow') || env.WORKFLOW_FILE;
      const gh = `https://api.github.com/repos/${env.GH_OWNER}/${env.GH_REPO}/actions/workflows/${workflow}/runs?per_page=10`;
      const resp = await fetch(gh, {
        headers: {
          'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });
      const data = await resp.json();
      return new Response(JSON.stringify(data), { headers: {'content-type':'application/json'} });
    }

    return new Response('MXD Publish Bridge', { status: 200 });
  }
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'content-type,authorization'
    }
  });
};
