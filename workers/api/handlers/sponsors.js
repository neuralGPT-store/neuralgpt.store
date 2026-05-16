import { sendJson, sendError, readJsonBody } from '../lib/http.js';

const MAX_JSON_BYTES = 4096;

function createSponsorsHandlers(env) {
  async function sponsorClick(request) {
    let body;
    try {
      body = await readJsonBody(request, MAX_JSON_BYTES);
    } catch {
      return sendError(400, 'invalid_body', null, request);
    }

    const sponsor = String(body.sponsor || '').trim().slice(0, 64);
    const strip = String(body.strip || '').trim().slice(0, 16);
    if (!sponsor) return sendError(400, 'sponsor_required', null, request);

    const today = new Date().toISOString().slice(0, 10);
    const key = 'sponsor_click:' + sponsor + ':' + today;

    try {
      const existing = await env.LOVENTY_KV.get(key);
      const count = existing ? parseInt(existing) + 1 : 1;
      await env.LOVENTY_KV.put(key, String(count), { expirationTtl: 90 * 24 * 3600 });
    } catch {
      return sendError(503, 'kv_error', null, request);
    }

    return sendJson(200, { ok: true, sponsor, strip }, request);
  }

  async function sponsorStats(request) {
    const url = new URL(request.url);
    const sponsor = String(url.searchParams.get('sponsor') || '').trim().slice(0, 64);
    if (!sponsor) return sendError(400, 'sponsor_required', null, request);

    const apiKey = request.headers.get('x-api-key') || '';
    if (apiKey !== env.ADMIN_API_KEY) return sendError(403, 'forbidden', null, request);

    if (sponsor === 'ALL') {
      const allList = await env.LOVENTY_KV.list({ prefix: 'sponsor_click:' });
      const totals = {};
      const lastDate = {};
      for (const key of allList.keys) {
        const after = key.name.slice('sponsor_click:'.length);
        const lastColon = after.lastIndexOf(':');
        const name = after.slice(0, lastColon);
        const date = after.slice(lastColon + 1);
        const val = await env.LOVENTY_KV.get(key.name);
        totals[name] = (totals[name] || 0) + parseInt(val || '0');
        if (!lastDate[name] || date > lastDate[name]) lastDate[name] = date;
      }
      const sponsors = Object.keys(totals).map(s => ({ sponsor: s, total: totals[s], last_date: lastDate[s] }));
      return sendJson(200, { ok: true, sponsors }, request);
    }

    const prefix = 'sponsor_click:' + sponsor + ':';
    const list = await env.LOVENTY_KV.list({ prefix });

    const stats = {};
    for (const key of list.keys) {
      const date = key.name.replace(prefix, '');
      const val = await env.LOVENTY_KV.get(key.name);
      stats[date] = parseInt(val || '0');
    }

    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    return sendJson(200, { ok: true, sponsor, total, by_date: stats }, request);
  }

  return { sponsorClick, sponsorStats };
}

export { createSponsorsHandlers };
