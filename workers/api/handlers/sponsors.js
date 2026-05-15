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
