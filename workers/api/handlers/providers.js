import { sendJson, sendError, readMultipartBody } from '../lib/http.js';

const MAX_MULTIPART_BYTES = 8 * 1024 * 1024;

function createProvidersHandlers(env, emailHandlers) {

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

    // Moderacion automatica con IA
    if (env.ANTHROPIC_API_KEY) {
      const modResult = await autoModerate(provider, env);
      provider.status = modResult.status || 'pending_review';
      provider.auto_moderation = {
        decision: modResult.status,
        reason: modResult.reason,
        confidence: modResult.confidence,
        moderated_at: new Date().toISOString()
      };
      await env.LOVENTY_KV.put('provider:' + providerId, JSON.stringify(provider), { expirationTtl: 365 * 24 * 3600 });
    }

    return sendJson(isEdit ? 200 : 201, {
      ok: true,
      mode: isEdit ? 'updated' : 'created',
      provider_id: providerId,
      edit_key: isEdit ? undefined : editKey,
      status: provider.status
    }, request);
  }

  async function list(request) {
    const url = new URL(request.url);
    const cat = url.searchParams.get('cat') || '';
    const country = url.searchParams.get('country') || '';
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
    const statusFilter = url.searchParams.get('status') || 'active';

    if (statusFilter !== 'active') {
      const apiKey = request.headers.get('x-api-key') || '';
      if (apiKey !== env.ADMIN_API_KEY) return sendError(403, 'forbidden', null, request);
    }

    let ids = [];
    if (cat && statusFilter === 'active') {
      ids = JSON.parse(await env.LOVENTY_KV.get('providers:cat:' + cat) || '[]');
    } else {
      const allKey = await env.LOVENTY_KV.list({ prefix: 'provider:' });
      ids = allKey.keys.map(k => k.name.replace('provider:', ''));
    }

    const isAdmin = statusFilter !== 'active';
    const providers = [];
    for (const id of ids) {
      if (providers.length >= limit) break;
      const raw = await env.LOVENTY_KV.get('provider:' + id);
      if (!raw) continue;
      const p = JSON.parse(raw);
      if (p.status !== statusFilter) continue;
      if (country && p.country !== country.toUpperCase()) continue;
      if (q && !p.provider_name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q) && !p.zone.toLowerCase().includes(q)) continue;
      const entry = {
        id: p.id,
        provider_name: p.provider_name,
        category: p.category,
        description: p.description.slice(0, 120),
        zone: p.zone,
        country: p.country,
        price_info: p.price_info,
        photos: p.photos.slice(0, 1),
        created_at: p.created_at
      };
      if (isAdmin) entry.contact_email = p.contact_email;
      providers.push(entry);
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

  async function moderate(request) {
    const authHeader = request.headers.get('x-api-key') || '';
    if (authHeader !== env.ADMIN_API_KEY) {
      return sendError(403, 'forbidden', null, request);
    }
    let body;
    try {
      const text = await request.text();
      body = JSON.parse(text);
    } catch { return sendError(400, 'invalid_body', null, request); }

    const id = String(body.provider_id || '').trim();
    const status = String(body.status || '').trim();
    if (!id) return sendError(400, 'provider_id_required', null, request);
    if (!['active','rejected','suspended'].includes(status)) return sendError(400, 'invalid_status', null, request);

    const raw = await env.LOVENTY_KV.get('provider:' + id);
    if (!raw) return sendError(404, 'provider_not_found', null, request);

    const provider = JSON.parse(raw);
    provider.status = status;
    provider.moderated_at = new Date().toISOString();
    await env.LOVENTY_KV.put('provider:' + id, JSON.stringify(provider), { expirationTtl: 365 * 24 * 3600 });

    if (emailHandlers && provider.contact_email) {
      if (status === 'active') {
        emailHandlers.sendEmail({ to: provider.contact_email, subject: 'Tu ficha ha sido aprobada — neuralgpt.store', html: emailHandlers.providerApprovedEmail(provider.provider_name) }).catch(() => {});
      } else if (status === 'rejected') {
        const reason = provider.auto_moderation?.reason || 'no cumple los criterios de la plataforma';
        emailHandlers.sendEmail({ to: provider.contact_email, subject: 'Tu ficha necesita ajustes — neuralgpt.store', html: emailHandlers.providerRejectedEmail(provider.provider_name, reason) }).catch(() => {});
      }
    }

    return sendJson(200, { ok: true, provider_id: id, status }, request);
  }

  async function autoModerate(provider, env) {
    const prompt = `Eres el sistema de moderacion automatica de Loventy, una plataforma europea de cuidado para personas mayores.

Analiza esta ficha de proveedor y decide si aprobarla, rechazarla o marcarla para revision humana.

FICHA:
- Nombre: ${provider.provider_name}
- Categoria: ${provider.category}
- Descripcion: ${provider.description}
- Zona: ${provider.zone}
- Pais: ${provider.country}
- Precio: ${provider.price_info || 'no indicado'}
- Web: ${provider.website || 'no indicada'}

CRITERIOS:
APROBAR si: informacion coherente, descripcion profesional y relevante para cuidado de mayores, sin contenido ofensivo, sin spam, sin datos personales expuestos innecesariamente.
RECHAZAR si: contenido ofensivo, spam, servicios ilegales, contenido sexual, contenido violento, publicidad no relacionada con cuidado de mayores.
REVISION si: informacion incompleta, descripcion muy vaga, precio sospechosamente bajo o alto, necesita verificacion adicional.

Responde SOLO con este JSON sin ningun texto adicional:
{"decision":"active|rejected|pending_review","reason":"motivo breve en español","confidence":0.0-1.0}`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error('[autoModerate] API error', response.status, errText);
        return { status: 'pending_review', reason: 'api_error_' + response.status, confidence: 0 };
      }

      const data = await response.json();
      const raw = data.content?.[0]?.text || '';
      // Extrae JSON aunque venga envuelto en markdown
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) {
        console.error('[autoModerate] no JSON in response:', raw);
        return { status: 'pending_review', reason: 'no_json_en_respuesta', confidence: 0 };
      }
      const parsed = JSON.parse(match[0]);

      if (!['active','rejected','pending_review'].includes(parsed.decision)) return { status: 'pending_review', reason: 'decision_invalida', confidence: 0 };
      console.log('[autoModerate] decision:', parsed.decision, 'confidence:', parsed.confidence);
      return { status: parsed.decision, reason: parsed.reason, confidence: parsed.confidence };
    } catch(e) {
      console.error('[autoModerate] catch:', e?.message);
      return { status: 'pending_review', reason: 'error_en_moderacion_automatica', confidence: 0 };
    }
  }

  return { upsert, list, getProvider, moderate };
}

export { createProvidersHandlers };
