'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function sha256(input) {
  return crypto.createHash('sha256').update(String(input || '')).digest('hex');
}

function randomToken(size) {
  return crypto.randomBytes(size).toString('base64url');
}

function normalizeSlug(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function nowIso() {
  return new Date().toISOString();
}

function readStore(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function writeStore(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function keyDigest(editKey, pepper) {
  return sha256(String(pepper || '') + '|' + String(editKey || ''));
}

function sanitizeText(value, maxLen) {
  return String(value || '').replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, maxLen);
}

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function sanitizeListingInput(fields, files) {
  const operation = sanitizeText(fields.operation || 'sale', 40) || 'sale';
  const assetType = sanitizeText(fields.asset_type || 'apartment', 40) || 'apartment';
  const country = sanitizeText(fields.country || 'ES', 2).toUpperCase();
  const region = sanitizeText(fields.region || '', 80);
  const city = sanitizeText(fields.city || '', 80);
  const zone = sanitizeText(fields.zone || '', 120);
  const title = sanitizeText(fields.title || '', 160);
  const summary = sanitizeText(fields.summary || '', 400);
  const description = sanitizeText(fields.description || '', 4000);
  const contactName = sanitizeText(fields.contact_name || '', 80);
  const contactPhone = sanitizeText(fields.contact_phone || '', 40);
  const contactEmail = sanitizeText(fields.contact_email || '', 120).toLowerCase();

  return {
    mode: sanitizeText(fields.mode || 'create', 20) || 'create',
    listingId: sanitizeText(fields.listing_id || '', 120),
    editKey: sanitizeText(fields.edit_key || '', 256),
    slug: sanitizeText(fields.slug || '', 160),
    operation,
    assetType,
    country,
    region,
    city,
    zone,
    title,
    summary,
    description,
    price: toNumber(fields.price, 0),
    surfaceM2: toNumber(fields.surface_m2, 0),
    rooms: toNumber(fields.rooms, 0),
    bathrooms: toNumber(fields.bathrooms, 0),
    lat: toNumber(fields.lat, 0),
    lng: toNumber(fields.lng, 0),
    contactName,
    contactPhone,
    contactEmail,
    filesCount: Array.isArray(files) ? files.length : 0,
    privacyAccepted: String(fields.privacy_accepted || '').toLowerCase() === 'true',
    honeypot: sanitizeText(fields.hp_check || '', 16)
  };
}

function buildListingRecord(input, existing, pepper) {
  const draft = existing || {};
  const now = nowIso();

  const listingId = draft.id || input.listingId || ('re-' + randomToken(8));
  const slugBase = input.slug || normalizeSlug(input.title || listingId) || listingId;
  const slug = slugBase.slice(0, 140);

  const record = {
    id: listingId,
    slug,
    operation: input.operation,
    asset_type: input.assetType,
    country: input.country,
    region: input.region,
    city: input.city,
    zone: input.zone,
    title: input.title,
    summary: input.summary,
    description: input.description,
    price: input.price,
    surface_m2: input.surfaceM2,
    rooms: input.rooms,
    bathrooms: input.bathrooms,
    lat: input.lat,
    lng: input.lng,
    contact_name: input.contactName,
    contact_phone: input.contactPhone,
    contact_email: input.contactEmail,
    status: draft.status || 'published',
    files_count: input.filesCount,
    updated_at: now,
    created_at: draft.created_at || now,
    edit_key_hash: draft.edit_key_hash || null,
    meta: {
      source: 'runtime_scaffold',
      last_mode: input.mode
    }
  };

  if (!record.edit_key_hash) {
    const plainEditKey = randomToken(18);
    record.edit_key_hash = keyDigest(plainEditKey, pepper);
    return { record, plainEditKey };
  }

  return { record, plainEditKey: null };
}

function verifyEditKey(record, editKey, pepper) {
  if (!record || !record.edit_key_hash || !editKey) return false;
  return record.edit_key_hash === keyDigest(editKey, pepper);
}

function findListingIndex(rows, listingId) {
  return rows.findIndex((row) => String(row && row.id) === String(listingId || ''));
}

function getListingById(filePath, listingId) {
  const rows = readStore(filePath);
  const idx = findListingIndex(rows, listingId);
  if (idx < 0) return null;
  return rows[idx];
}

function updateListingById(filePath, listingId, updater) {
  const rows = readStore(filePath);
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
  writeStore(filePath, rows);
  return { ok: true, code: 'updated', listing: next };
}

function getListingEditState(filePath, listingId, editKey, pepper) {
  if (!listingId || !editKey) return { ok: false, code: 'listing_id_and_edit_key_required' };
  const listing = getListingById(filePath, listingId);
  if (!listing) return { ok: false, code: 'listing_not_found' };
  if (!verifyEditKey(listing, editKey, pepper)) return { ok: false, code: 'invalid_edit_key' };
  return { ok: true, code: 'ok', listing };
}

function ensureCommercialState(record) {
  const listing = record || {};
  const commercial = listing.commercial && typeof listing.commercial === 'object' ? listing.commercial : {};

  commercial.processed_event_ids = Array.isArray(commercial.processed_event_ids) ? commercial.processed_event_ids : [];
  commercial.processed_transaction_keys = Array.isArray(commercial.processed_transaction_keys)
    ? commercial.processed_transaction_keys
    : [];
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

function applyCommercialEffect(filePath, input) {
  const listingId = sanitizeText(input && input.listingId, 120);
  const effectKey = sanitizeText(input && input.effectKey, 60);

  if (!listingId) return { ok: false, code: 'listing_id_required' };
  if (!effectKey) return { ok: false, code: 'effect_key_required' };
  const rows = readStore(filePath);
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
    const prev = Number(record.visibility_rank || 0);
    record.visibility_rank = prev + 1;
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
  writeStore(filePath, rows);
  return { ok: true, code: 'applied', listing: record };
}

function getPlanLimit(tier) {
  if (tier === 'enterprise') return Infinity;
  if (tier === 'premium') return 100;
  if (tier === 'basico') return 50;
  return 5; // free
}

function countUserListings(filePath, contactEmail) {
  if (!contactEmail) return 0;
  const rows = readStore(filePath);
  const normalized = String(contactEmail).toLowerCase().trim();
  return rows.filter((r) => String(r.contact_email || '').toLowerCase().trim() === normalized).length;
}

function checkListingLimit(filePath, contactEmail, tier) {
  const count = countUserListings(filePath, contactEmail);
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

function hasActivePlan(record) {
  if (!record || !record.commercial) return false;
  const sub = record.commercial.subscription;
  if (!sub || !sub.active) return false;
  return sub.tier === 'basico' || sub.tier === 'premium' || sub.tier === 'enterprise';
}

module.exports = {
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
  checkListingLimit,
  hasActivePlan
};
