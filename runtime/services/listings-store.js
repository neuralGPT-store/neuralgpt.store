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

module.exports = {
  readStore,
  writeStore,
  sanitizeListingInput,
  buildListingRecord,
  verifyEditKey,
  normalizeSlug
};
