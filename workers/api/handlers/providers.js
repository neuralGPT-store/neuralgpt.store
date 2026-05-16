import { sendJson, sendError, readMultipartBody } from '../lib/http.js';

const MAX_MULTIPART_BYTES = 8 * 1024 * 1024;

function createProvidersHandlers(env) {

  async function upsert(request) {
    let parsed;
    try {
      parsed = await readMultipartBody(request, MAX_MULTIPART_BYTES);
    } catch (error) {
      if (error.message === 'payload_too_large') return sendError(413, 'payload_too_large', null, request);
      return sendError(400, error.message || 'invalid_body', null, request);
    }

    const f = parsed.fields;

    if (f.website_url && f.website_url.length > 0 && f.honeypot) return sendError(400, 'honeypot_rejected', null, request);

    const required = ['provider_name','category','description','zone','country','contact_name','contact_email'];
    for (const field of required) {
      if (!f[field] || !String(f[field]).trim()) return sendError(400, field + '_required', null, request);
    }

    if (!f.terms_accepted || f.terms_accepted !== 'true') return sendError(400, 'terms_required', null, request);
    if (!f.privacy_accepted || f.privacy_accepted !== 'true') return sendError(400, 'privacy_required', null, request);

    const email = String(f.contact_email).trim().toLowerCase();
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) return sendError(400, 'invalid_email', null, request);

    const description = String(f.description).trim().slice(0, 500);

    const isEdit = Boolean(f.provider_id && f.edit_key);

    const providerId = isEdit ? String(f.provider_id) : 'pv_' + crypto.randomUUID().replace(/-/g,'').slice(0,16);

    const photos = [];
    for (const file of (parsed.files || [])) {
      if (photos.length >= 3) break;
      const allowed = ['image/jpeg','image/png','image/webp'];
      if (!allowed.includes(file.type)) continue;
      if (file.size > 2 * 1024 * 1024) continue;
      const b64 = btoa(String.fromCharCode(...new Uint8Array(file.data)));
      const photoKey = 'photo:' + providerId + ':' + photos.length;
      await env.LOVENTY_KV.put(photoKey, b64, { expirationTtl: 365 * 24 * 3600 });
      photos.push(photoKey);
    }

    if (isEdit) {
      const existing = await env.LOVENTY_KV.get('provider:' + providerId);
      if (!existing) return sendError(404, 'provider_not_found', null, request);
      const existingData = JSON.parse(existing);
      if (existingData.edit_key !== f.edit_key) return sendError(403, 'invalid_edit_key', null, request);
    }

    const editKeyArr = new Uint8Array(16);
    crypto.getRandomValues(editKeyArr);
    const editKey = isEdit ? f.edit_key : Array.from(editKeyArr).map(b => b.toString(16).padStart(2,'0')).join('');

    const provider = {
      id: providerId,
      provider_name: String(f.provider_name).trim().slice(0, 100),
      category: String(f.category).trim(),
      description,
      zone: String(f.zone).trim().slice(0, 100),
      country: String(f.country).trim().slice(0, 2).toUpperCase(),
      languages: String(f.languages || '').trim().slice(0, 200),
      price_info: String(f.price_info || '').trim().slice(0, 200),
      availability: String(f.availability || '').trim().slice(0, 200),
      contact_name: String(f.contact_name).trim().slice(0, 100),
      contact_email: email,
      website: String(f.website || '').trim().slice(0, 200),
      photos,
      status: 'pending_review',
      edit_key: editKey,
      created_at: isEdit ? undefined : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await env.LOVENTY_KV.put('provider:' + providerId, JSON.stringify(provider), { expirationTtl: 365 * 24 * 3600 });

    const catKey = 'providers:cat:' + provider.category;
    const catList = JSON.parse(await env.LOVENTY_KV.get(catKey) || '[]');
    if (!catList.includes(providerId)) catList.push(providerId);
    await env.LOVENTY_KV.put(catKey, JSON.stringify(catList));

    return sendJson(isEdit ? 200 : 201, {
      ok: true,
      mode: isEdit ? 'updated' : 'created',
      provider_id: providerId,
      edit_key: isEdit ? undefined : editKey,
      status: 'pending_review'
    }, request);
  }

  async function list(request) {
    const url = new URL(request.url);
    const cat = url.searchParams.get('cat') || '';
    const country = url.searchParams.get('country') || '';
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);

    let ids = [];
    if (cat) {
      ids = JSON.parse(await env.LOVENTY_KV.get('providers:cat:' + cat) || '[]');
    } else {
      const allKey = await env.LOVENTY_KV.list({ prefix: 'provider:' });
      ids = allKey.keys.map(k => k.name.replace('provider:', ''));
    }

    const providers = [];
    for (const id of ids) {
      if (providers.length >= limit) break;
      const raw = await env.LOVENTY_KV.get('provider:' + id);
      if (!raw) continue;
      const p = JSON.parse(raw);
      if (p.status !== 'active') continue;
      if (country && p.country !== country.toUpperCase()) continue;
      if (q && !p.provider_name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q) && !p.zone.toLowerCase().includes(q)) continue;
      providers.push({
        id: p.id,
        provider_name: p.provider_name,
        category: p.category,
        description: p.description.slice(0, 120),
        zone: p.zone,
        country: p.country,
        price_info: p.price_info,
        photos: p.photos.slice(0, 1),
        created_at: p.created_at
      });
    }

    return sendJson(200, { ok: true, providers, total: providers.length }, request);
  }

  async function getProvider(request) {
    const url = new URL(request.url);
    const id = url.searchParams.get('id') || '';
    if (!id) return sendError(400, 'id_required', null, request);

    const raw = await env.LOVENTY_KV.get('provider:' + id);
    if (!raw) return sendError(404, 'provider_not_found', null, request);

    const p = JSON.parse(raw);
    if (p.status !== 'active') return sendError(404, 'provider_not_found', null, request);

    const safe = { ...p };
    delete safe.edit_key;
    delete safe.contact_email;

    return sendJson(200, { ok: true, provider: safe }, request);
  }

  return { upsert, list, getProvider };
}

export { createProvidersHandlers };
