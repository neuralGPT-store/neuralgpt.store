const KV_KEY = 'listings';

const VALID_CATEGORIES = new Set([
  'cuidador', 'residencia', 'sanitario', 'hogar',
  'transporte', 'voluntariado', 'legal', 'farmacia'
]);

// ── Web Crypto helpers ──

async function sha256(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(String(input || ''));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomToken(size) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function normalizeSlug(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function nowIso() {
  return new Date().toISOString();
}

// ── KV operations ──

async function readStore(kvBinding) {
  try {
    const data = await kvBinding.get(KV_KEY, 'json');
    return Array.isArray(data) ? data : [];
  } catch (_error) {
    return [];
  }
}

async function writeStore(kvBinding, data) {
  await kvBinding.put(KV_KEY, JSON.stringify(data));
}

async function keyDigest(editKey, pepper) {
  const combined = String(pepper || '') + '|' + String(editKey || '');
  return await sha256(combined);
}

// ── Data sanitization ──

function sanitizeText(value, maxLen) {
  return String(value || '').replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, maxLen);
}

function sanitizeListingInput(fields) {
  const providerName = sanitizeText(fields.provider_name || fields.title || '', 160);

  const rawCategory = sanitizeText(fields.category || fields.asset_type || '', 40).toLowerCase();
  const category = VALID_CATEGORIES.has(rawCategory) ? rawCategory : '';

  const description = sanitizeText(fields.description || '', 4000);
  const zone = sanitizeText(fields.zone || fields.city || '', 120);
  const country = sanitizeText(fields.country || 'ES', 5).toUpperCase().slice(0, 5);

  let languages = [];
  const rawLangs = String(fields.languages || '');
  if (rawLangs) {
    try {
      const parsed = JSON.parse(rawLangs);
      languages = Array.isArray(parsed)
        ? parsed.map(l => sanitizeText(l, 10)).filter(Boolean).slice(0, 10)
        : [sanitizeText(String(parsed), 10)].filter(Boolean);
    } catch (_) {
      languages = rawLangs.split(',').map(l => sanitizeText(l.trim(), 10)).filter(Boolean).slice(0, 10);
    }
  }

  const priceInfo = sanitizeText(fields.price_info || fields.summary || '', 200);
  const availability = sanitizeText(fields.availability || fields.region || '', 120);
  const contactName = sanitizeText(fields.contact_name || '', 80);
  const contactEmail = sanitizeText(fields.contact_email || '', 120).toLowerCase();
  const website = sanitizeText(fields.website || '', 200);

  return {
    mode: sanitizeText(fields.mode || 'create', 20) || 'create',
    listingId: sanitizeText(fields.listing_id || '', 120),
    editKey: sanitizeText(fields.edit_key || '', 256),
    providerName,
    category,
    description,
    zone,
    country,
    languages,
    priceInfo,
    availability,
    contactName,
    contactEmail,
    website,
    privacyAccepted: String(fields.privacy_accepted || '').toLowerCase() === 'true',
    termsAccepted: String(fields.terms_accepted || '').toLowerCase() === 'true',
    honeypot: sanitizeText(fields.hp_check || '', 16)
  };
}

async function buildListingRecord(input, existing, pepper) {
  const draft = existing || {};
  const now = nowIso();
  const listingId = draft.id || input.listingId || ('lo-' + randomToken(8));
  const slugBase = normalizeSlug(input.providerName || listingId) || listingId;
  const slug = slugBase.slice(0, 140);

  const record = {
    id: listingId,
    slug,
    provider_name: input.providerName,
    category: input.category,
    description: input.description,
    zone: input.zone,
    country: input.country,
    languages: input.languages,
    price_info: input.priceInfo,
    availability: input.availability,
    contact_name: input.contactName,
    contact_email: input.contactEmail,
    website: input.website || null,
    status: draft.status || 'published',
    updated_at: now,
    created_at: draft.created_at || now,
    edit_key_hash: draft.edit_key_hash || null,
    meta: {
      source: 'cloudflare_workers',
      last_mode: input.mode
    }
  };

  if (!record.edit_key_hash) {
    const plainEditKey = randomToken(18);
    record.edit_key_hash = await keyDigest(plainEditKey, pepper);
    return { record, plainEditKey };
  }

  return { record, plainEditKey: null };
}

async function verifyEditKey(record, editKey, pepper) {
  if (!record || !record.edit_key_hash || !editKey) return false;
  const hash = await keyDigest(editKey, pepper);
  return record.edit_key_hash === hash;
}

function findListingIndex(rows, listingId) {
  return rows.findIndex((row) => String(row && row.id) === String(listingId || ''));
}

async function getListingById(kvBinding, listingId) {
  const rows = await readStore(kvBinding);
  const idx = findListingIndex(rows, listingId);
  if (idx < 0) return null;
  return rows[idx];
}

async function updateListingById(kvBinding, listingId, updater) {
  const rows = await readStore(kvBinding);
  const idx = findListingIndex(rows, listingId);

  if (idx < 0) {
    return { ok: false, code: 'listing_not_found', listing: null };
  }

  const current = rows[idx];
  const next = updater(current);

  if (!next || typeof next !== 'object') {
    return { ok: false, code: 'invalid_listing_update', listing: null };
  }

  rows[idx] = next;
  await writeStore(kvBinding, rows);
  return { ok: true, code: 'updated', listing: next };
}

async function getListingEditState(kvBinding, listingId, editKey, pepper) {
  if (!listingId || !editKey) {
    return { ok: false, code: 'listing_id_and_edit_key_required' };
  }

  const listing = await getListingById(kvBinding, listingId);
  if (!listing) return { ok: false, code: 'listing_not_found' };

  const valid = await verifyEditKey(listing, editKey, pepper);
  if (!valid) return { ok: false, code: 'invalid_edit_key' };

  return { ok: true, code: 'ok', listing };
}

// ── Commercial effects (Stripe integration) ──

function ensureCommercialState(record) {
  const listing = record || {};
  const commercial = listing.commercial && typeof listing.commercial === 'object' ? listing.commercial : {};

  commercial.processed_event_ids = Array.isArray(commercial.processed_event_ids) ? commercial.processed_event_ids : [];
  commercial.processed_transaction_keys = Array.isArray(commercial.processed_transaction_keys) ? commercial.processed_transaction_keys : [];
  commercial.ledger = Array.isArray(commercial.ledger) ? commercial.ledger : [];
  commercial.effects = commercial.effects && typeof commercial.effects === 'object' ? commercial.effects : {};
  commercial.subscription = commercial.subscription && typeof commercial.subscription === 'object' ? commercial.subscription : {};

  listing.commercial = commercial;
  return commercial;
}

function pushLimitedUnique(list, value, maxSize) {
  if (!value) return;
  const str = String(value);
  if (list.includes(str)) return;
  list.push(str);
  if (list.length > maxSize) list.splice(0, list.length - maxSize);
}

function toIsoPlusHours(dateIso, hours) {
  const base = new Date(dateIso);
  const at = Number.isFinite(base.getTime()) ? base.getTime() : Date.now();
  return new Date(at + Math.round(hours * 60 * 60 * 1000)).toISOString();
}

async function applyCommercialEffect(kvBinding, input) {
  const listingId = sanitizeText(input && input.listingId, 120);
  const effectKey = sanitizeText(input && input.effectKey, 60);

  if (!listingId) return { ok: false, code: 'listing_id_required' };
  if (!effectKey) return { ok: false, code: 'effect_key_required' };

  const rows = await readStore(kvBinding);
  const idx = findListingIndex(rows, listingId);
  if (idx < 0) return { ok: false, code: 'listing_not_found', listing: null };

  const record = { ...rows[idx] };
  const commercial = ensureCommercialState(record);
  const now = nowIso();

  const txKey = sanitizeText(input && input.transactionKey, 140);
  const eventId = sanitizeText(input && input.eventId, 140);
  const eventType = sanitizeText(input && input.eventType, 140);
  const checkoutSessionId = sanitizeText(input && input.checkoutSessionId, 140);
  const paymentIntentId = sanitizeText(input && input.paymentIntentId, 140);
  const priceId = sanitizeText(input && input.priceId, 140);
  const productId = sanitizeText(input && input.productId, 140);

  if (txKey && commercial.processed_transaction_keys.includes(txKey)) {
    return { ok: true, code: 'duplicate_transaction', listing: record };
  }

  if (!txKey && eventId && commercial.processed_event_ids.includes(eventId)) {
    return { ok: true, code: 'duplicate_event', listing: record };
  }

  const effects = commercial.effects;
  const effect = effects[effectKey] && typeof effects[effectKey] === 'object' ? effects[effectKey] : {};

  effect.count = Number(effect.count || 0) + 1;
  effect.last_applied_at = now;
  effect.last_event_type = eventType || null;
  effect.last_event_id = eventId || null;
  effect.last_transaction_key = txKey || null;
  effect.last_checkout_session_id = checkoutSessionId || null;
  effect.last_payment_intent_id = paymentIntentId || null;
  effect.last_price_id = priceId || null;
  effect.last_product_id = productId || null;

  if (effectKey === 'mas_visibilidad') {
    record.visibility_rank = Number(record.visibility_rank || 0) + 1;
  } else if (effectKey === 'sensacional_24h') {
    const currentUntil = new Date(String(commercial.sensacional_until || 0)).getTime();
    const nextUntil = new Date(toIsoPlusHours(now, 24)).getTime();
    commercial.sensacional_until = new Date(Math.max(currentUntil || 0, nextUntil)).toISOString();
  } else if (effectKey === 'plan_basico' || effectKey === 'plan_premium' || effectKey === 'plan_enterprise') {
    commercial.subscription.tier = effectKey === 'plan_premium' ? 'premium' : effectKey === 'plan_enterprise' ? 'enterprise' : 'basico';
    commercial.subscription.updated_at = now;
    commercial.subscription.active = true;
  }

  effects[effectKey] = effect;
  commercial.last_effect_key = effectKey;
  commercial.last_applied_at = now;
  commercial.last_event_type = eventType || null;

  const ledgerEntry = {
    at: now,
    effect_key: effectKey,
    event_id: eventId || null,
    event_type: eventType || null,
    transaction_key: txKey || null,
    checkout_session_id: checkoutSessionId || null,
    payment_intent_id: paymentIntentId || null,
    price_id: priceId || null,
    product_id: productId || null
  };

  commercial.ledger.push(ledgerEntry);
  if (commercial.ledger.length > 100) commercial.ledger.splice(0, commercial.ledger.length - 100);

  pushLimitedUnique(commercial.processed_event_ids, eventId, 300);
  pushLimitedUnique(commercial.processed_transaction_keys, txKey, 300);

  record.updated_at = now;
  rows[idx] = record;

  await writeStore(kvBinding, rows);
  return { ok: true, code: 'applied', listing: record };
}

// ── Listing limits ──

function getPlanLimit(tier) {
  if (tier === 'enterprise') return Infinity;
  if (tier === 'premium') return 100;
  if (tier === 'basico') return 50;
  return 5;
}

async function countUserListings(kvBinding, contactEmail) {
  if (!contactEmail) return 0;
  const rows = await readStore(kvBinding);
  const normalized = String(contactEmail).toLowerCase().trim();
  return rows.filter((r) => String(r.contact_email || '').toLowerCase().trim() === normalized).length;
}

async function checkListingLimit(kvBinding, contactEmail, tier) {
  const count = await countUserListings(kvBinding, contactEmail);
  const limit = getPlanLimit(tier);

  if (count >= limit) {
    return {
      ok: false,
      code: 'payment_required',
      reason: 'listing_limit_exceeded',
      current_count: count,
      limit,
      tier: tier || 'free',
      upgrade_required: tier === 'free' ? 'basico' : tier === 'basico' ? 'premium' : 'additional',
      checkout_url_hint: '/api/stripe/checkout-publicacion-adicional'
    };
  }

  return {
    ok: true,
    current_count: count,
    limit,
    tier: tier || 'free',
    remaining: limit - count
  };
}

export {
  readStore,
  writeStore,
  sanitizeListingInput,
  buildListingRecord,
  verifyEditKey,
  normalizeSlug,
  getListingById,
  updateListingById,
  getListingEditState,
  applyCommercialEffect,
  getPlanLimit,
  countUserListings,
  checkListingLimit
};
