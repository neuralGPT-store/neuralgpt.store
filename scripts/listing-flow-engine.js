#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { runImagePipeline } = require('./image-pipeline.js');
const riskEngine = require(path.join(__dirname, '..', 'js', 'real-estate-risk-engine.js'));

function nowIso() {
  return new Date().toISOString();
}

function readJsonArray(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(label + '_not_found');
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(label + '_invalid_array');
  }
  return parsed;
}

function writeJsonArrayAtomic(filePath, arr) {
  const tmpPath = filePath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(arr, null, 2) + '\n', 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function appendJsonl(filePath, row) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const line = JSON.stringify(row) + '\n';
  fs.appendFileSync(filePath, line, 'utf8');
}

function normalizeString(value) {
  if (value == null) return null;
  const out = String(value).trim();
  return out || null;
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

function randomToken() {
  return crypto.randomBytes(24).toString('hex');
}

function dedupeList(items) {
  const out = [];
  const seen = new Set();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const key = normalizeString(item);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(key);
  });
  return out;
}

function normalizeForPolicy(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ' ')
    .replace(/[^a-z0-9@.\-_/ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function policyMatchFlags(haystack, rules, severity, points, sink) {
  rules.forEach((entry) => {
    if (entry.re.test(haystack)) {
      sink.flags.push(entry.code);
      sink.evidence.push({
        code: entry.code,
        severity: severity,
        points: points,
        source: entry.source
      });
      sink.score += points;
    }
  });
}

function evaluateContentPolicy(listing, imageFiles) {
  const title = normalizeForPolicy(listing && listing.title);
  const summary = normalizeForPolicy(listing && listing.summary);
  const description = normalizeForPolicy(listing && listing.description);
  const zone = normalizeForPolicy(listing && listing.zone);
  const city = normalizeForPolicy(listing && listing.city);
  const content = [title, summary, description, city, zone].filter(Boolean).join(' ');
  const imageNames = (Array.isArray(imageFiles) ? imageFiles : [])
    .map((item) => normalizeForPolicy(item && item.original_name))
    .filter(Boolean)
    .join(' ');
  const joined = [content, imageNames].filter(Boolean).join(' ');

  const out = { score: 0, flags: [], evidence: [] };
  const blockRules = [
    { code: 'adult_content', source: 'texto', re: /\b(porno|xxx|escort|escorts|sexo|sexual|onlyfans|camgirl|prostituci|adulto erotico)\b/ },
    { code: 'sexual_services', source: 'texto', re: /\b(servicios sexuales|masaje erotico|acompanante sexual|sexo por hora)\b/ },
    { code: 'non_real_estate_product', source: 'texto', re: /\b(software|app|aplicacion|saas|curso online|bootcamp|criptomoneda|crypto|token|nft|forex|casino|apuestas)\b/ },
    { code: 'obvious_scam', source: 'texto', re: /\b(ingreso garantizado|dinero rapido|multiplica tu dinero|sin riesgo|retorno asegurado)\b/ }
  ];
  const reviewRules = [
    { code: 'spam_contact_pattern', source: 'texto', re: /\b(whatsapp|telegram|t\.me|linktr\.ee)\b/ },
    { code: 'excessive_urls', source: 'texto', re: /(https?:\/\/|www\.)/ },
    { code: 'low_quality_noise', source: 'texto', re: /\b(lorem ipsum|asdf|qwerty|test test|prueba prueba)\b/ },
    { code: 'image_name_suspicious', source: 'imagen', re: /\b(sexy|escort|porn|casino|crypto|software|curso)\b/ }
  ];

  policyMatchFlags(joined, blockRules, 'high', 45, out);
  policyMatchFlags(joined, reviewRules, 'medium', 18, out);

  // señales estructurales conservadoras: si no huele a inmueble, forzar revisión
  const realEstateHints = /\b(piso|casa|apartamento|atico|chalet|duplex|habitacion|local|nave|suelo|parcela|inmueble|edificio|oficina|residencial|comercial)\b/;
  if (!realEstateHints.test(content)) {
    out.flags.push('missing_real_estate_context');
    out.evidence.push({ code: 'missing_real_estate_context', severity: 'medium', points: 22, source: 'texto' });
    out.score += 22;
  }

  const uniqueFlags = dedupeList(out.flags);
  const dedupEvidence = [];
  const seenEvidence = new Set();
  out.evidence.forEach((item) => {
    const key = item.code + ':' + item.source;
    if (seenEvidence.has(key)) return;
    seenEvidence.add(key);
    dedupEvidence.push(item);
  });

  const score = Number(out.score || 0);
  const blocked = score >= 90 || uniqueFlags.includes('adult_content') || uniqueFlags.includes('sexual_services');
  const reviewRequired = !blocked && score >= 35;

  return {
    content_policy_score: score,
    content_policy_flags: uniqueFlags,
    content_policy_evidence: dedupEvidence.slice(0, 12),
    content_blocked: blocked,
    review_required: reviewRequired
  };
}

function absToWebPath(root, absPath) {
  const rel = path.relative(root, absPath).replace(/\\/g, '/');
  return '/' + rel.replace(/^\/+/, '');
}

function ensureRequiredListingFields(listing) {
  const required = ['id', 'slug', 'title', 'operation', 'asset_type', 'city', 'price', 'surface_m2', 'status', 'verification_state'];
  const missing = required.filter((field) => listing[field] == null || String(listing[field]).trim() === '');
  if (missing.length) {
    const error = new Error('listing_required_fields_missing:' + missing.join(','));
    error.statusCode = 400;
    throw error;
  }

  const allowedOperations = new Set(['sale', 'long_term_rent', 'room_rent']);
  const allowedAssetTypes = new Set(['apartment', 'room', 'commercial_unit', 'warehouse', 'land', 'singular_asset']);
  if (!allowedOperations.has(String(listing.operation))) {
    const error = new Error('listing_operation_invalid');
    error.statusCode = 400;
    throw error;
  }
  if (!allowedAssetTypes.has(String(listing.asset_type))) {
    const error = new Error('listing_asset_type_invalid');
    error.statusCode = 400;
    throw error;
  }
  const price = Number(listing.price);
  const surface = Number(listing.surface_m2);
  if (!Number.isFinite(price) || price < 0) {
    const error = new Error('listing_price_invalid');
    error.statusCode = 400;
    throw error;
  }
  if (!Number.isFinite(surface) || surface <= 0) {
    const error = new Error('listing_surface_invalid');
    error.statusCode = 400;
    throw error;
  }
  const lat = Number(listing && listing.coordinates && listing.coordinates.lat);
  const lng = Number(listing && listing.coordinates && listing.coordinates.lng);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    const error = new Error('listing_coordinates_invalid');
    error.statusCode = 400;
    throw error;
  }
}

function ensureRequiredAdvertiserContact(listing) {
  const required = ['contact_name', 'contact_phone', 'contact_email'];
  const missing = required.filter((field) => listing[field] == null || String(listing[field]).trim() === '');
  if (missing.length) {
    const error = new Error('advertiser_contact_required_fields_missing:' + missing.join(','));
    error.statusCode = 400;
    throw error;
  }
}

function buildModerationEvent(payload) {
  const ts = nowIso();
  const eventId = 'evt_dup_' + ts.replace(/[:.TZ-]/g, '').slice(0, 14) + '_' + String(payload.listing_id || 'unknown').slice(-8);
  const topSignals = payload && Array.isArray(payload.trigger_signals) ? payload.trigger_signals.slice(0, 8) : [];
  return {
    schema_version: 2,
    moderation_event_id: eventId,
    listing_id: payload.listing_id,
    slug: payload.slug || null,
    actor_type: 'system',
    actor_id: payload.actor_id || null,
    previous_outcome: payload.previous_outcome || null,
    new_outcome: 'pending_review',
    trigger_type: payload.trigger_type || 'duplicate_detection',
    trigger_signals: topSignals,
    notes: payload.notes || 'Candidato duplicado enviado a revisión humana.',
    created_at: ts,
    override_transition: false
  };
}

async function processImagesIfProvided(root, listingId, imageFiles) {
  if (!Array.isArray(imageFiles) || !imageFiles.length) {
    return { changed: false, pipeline: null, imagePaths: null, imageHashes: null, imageWarnings: [] };
  }

  const outputRoot = path.join(root, 'assets', 'img', 'staging', 'listings');
  const result = await runImagePipeline(imageFiles, {
    listingId: String(listingId || 'listing-temp'),
    outputRoot,
    maxFiles: 6,
    allowTransform: true,
    preferredFormats: ['avif', 'webp']
  });

  if (!result.ok) {
    const error = new Error('image_pipeline_failed');
    error.statusCode = 422;
    error.details = result;
    throw error;
  }

  const artifacts = Array.isArray(result.artifacts) ? result.artifacts : [];
  const mappedArtifacts = artifacts.map((item) => ({
    index: item.index,
    original_name: item.original_name,
    normalized_name: item.normalized_name,
    hash: item.hash,
    mime: item.mime,
    size_bytes: item.size_bytes,
    width: item.width,
    height: item.height,
    stages: {
      original_controlado: Object.assign({}, item.stages.original_controlado, {
        web_path: absToWebPath(root, item.stages.original_controlado.path)
      }),
      web_optimizada: Object.assign({}, item.stages.web_optimizada, {
        web_path: absToWebPath(root, item.stages.web_optimizada.path)
      }),
      thumbnail: Object.assign({}, item.stages.thumbnail, {
        web_path: absToWebPath(root, item.stages.thumbnail.path)
      })
    }
  }));

  return {
    changed: true,
    pipeline: {
      contract_version: result.contract_version,
      processed_at: nowIso(),
      storage_mode: result.storage_mode,
      output_dir: absToWebPath(root, result.output_dir),
      limits: result.limits,
      preferred_output_formats: result.preferred_output_formats,
      input_file_count: result.input_file_count,
      total_input_bytes: result.total_input_bytes,
      warnings: result.warnings,
      artifacts: mappedArtifacts
    },
    imagePaths: mappedArtifacts.map((item) => item.stages.web_optimizada.web_path),
    imageHashes: mappedArtifacts.map((item) => item.hash),
    imageWarnings: result.warnings || []
  };
}

function computeDuplicateReviewDecision(listing, pool) {
  const duplicate = riskEngine.computeDuplicateSignals(listing, pool, {});
  const candidates = Array.isArray(duplicate.duplicate_candidates) ? duplicate.duplicate_candidates : [];
  const topMatch = duplicate.top_match || null;
  const strongSuspicion = duplicate.abuse_blocked === true;
  const moderateSuspicion = !strongSuspicion && candidates.length > 0;

  return {
    duplicate_score: Number(duplicate.duplicate_score || duplicate.score || 0),
    duplicate_flags: Array.isArray(duplicate.duplicate_flags) ? duplicate.duplicate_flags : [],
    duplicate_candidates: candidates,
    top_match: topMatch,
    duplicate_reason_evidence: duplicate.reason_evidence || null,
    duplicate_abuse_blocked: strongSuspicion,
    duplicate_abuse_block_reason: duplicate.abuse_block_reason || null,
    review_required: strongSuspicion || moderateSuspicion,
    review_severity: strongSuspicion ? 'strong' : (moderateSuspicion ? 'moderate' : 'none')
  };
}

async function upsertListing(payload, context) {
  const root = context && context.root ? context.root : process.cwd();
  const actor = context && context.actor ? String(context.actor) : 'ops_local';
  const role = context && context.role ? String(context.role) : 'operator';

  const listingsPath = path.join(root, 'data', 'listings.json');
  const moderationEventsPath = path.join(root, 'data', 'moderation-events.log.jsonl');

  const listings = readJsonArray(listingsPath, 'listings');
  const mode = normalizeString(payload && payload.mode) || 'upsert';
  const incoming = payload && payload.listing && typeof payload.listing === 'object' ? payload.listing : null;
  if (!incoming) {
    const error = new Error('listing_required');
    error.statusCode = 400;
    throw error;
  }

  const incomingId = normalizeString(incoming.id);
  const incomingSlug = normalizeString(incoming.slug);
  const targetId = normalizeString(payload && payload.target_id) || incomingId;
  const editKeyInput = normalizeString(payload && payload.edit_key);

  const existingIndex = listings.findIndex((item) => item && (
    (targetId && String(item.id) === targetId) ||
    (incomingSlug && String(item.slug) === incomingSlug)
  ));
  const existing = existingIndex >= 0 ? listings[existingIndex] : null;

  if (mode === 'create' && existing) {
    const error = new Error('listing_already_exists');
    error.statusCode = 409;
    throw error;
  }
  if (mode === 'edit' && !existing) {
    const error = new Error('listing_not_found_for_edit');
    error.statusCode = 404;
    throw error;
  }
  if (existing && mode !== 'create') {
    const expectedHash = normalizeString(existing.edit_key_hash);
    const candidateHash = editKeyInput ? sha256(editKeyInput) : null;
    if (!expectedHash || !candidateHash || expectedHash !== candidateHash) {
      const error = new Error('edit_forbidden_invalid_key');
      error.statusCode = 403;
      throw error;
    }
  }

  const base = existing ? Object.assign({}, existing) : {};
  const draft = Object.assign(base, incoming);

  ensureRequiredListingFields(draft);
  ensureRequiredAdvertiserContact(draft);

  // contrato de contacto del anunciante: solo nombre + teléfono + correo.
  draft.contact_name = normalizeString(draft.contact_name);
  draft.contact_phone = normalizeString(draft.contact_phone);
  draft.contact_email = normalizeString(draft.contact_email);
  delete draft.contact_whatsapp;
  delete draft.contact_telegram;
  delete draft.contact_url;
  delete draft.contact_address;
  delete draft.contact_extra;

  const imageResult = await processImagesIfProvided(root, draft.id, payload && payload.image_files);
  if (imageResult.changed) {
    draft.images = imageResult.imagePaths;
    draft.image_hashes = imageResult.imageHashes;
    draft.image_pipeline = imageResult.pipeline;
    draft.image_pipeline_warnings = imageResult.imageWarnings;
    draft.image_processed_count = imageResult.imagePaths.length;
  }

  const pool = listings.filter((item, idx) => {
    if (!item) return false;
    if (existing && idx === existingIndex) return false;
    return !(draft.id && item.id && String(item.id) === String(draft.id));
  });

  const contentPolicy = evaluateContentPolicy(draft, payload && payload.image_files);
  draft.content_policy_score = contentPolicy.content_policy_score;
  draft.content_policy_flags = contentPolicy.content_policy_flags;
  draft.content_policy_evidence = contentPolicy.content_policy_evidence;
  draft.content_blocked = contentPolicy.content_blocked;

  if (contentPolicy.content_blocked) {
    const error = new Error('content_policy_blocked');
    error.statusCode = 422;
    error.details = {
      content_policy_score: contentPolicy.content_policy_score,
      content_policy_flags: contentPolicy.content_policy_flags,
      content_policy_evidence: contentPolicy.content_policy_evidence
    };
    throw error;
  }

  const dup = computeDuplicateReviewDecision(draft, pool);
  draft.duplicate_score = dup.duplicate_score;
  draft.duplicate_flags = dup.duplicate_flags;
  draft.duplicate_candidates = dup.duplicate_candidates;
  draft.top_match = dup.top_match;
  draft.duplicate_reason_evidence = dup.duplicate_reason_evidence;
  draft.duplicate_abuse_blocked = dup.duplicate_abuse_blocked;
  draft.duplicate_abuse_block_reason = dup.duplicate_abuse_block_reason;

  const opsFlags = dedupeList([].concat(draft.ops_flags || []));
  if (dup.review_required && opsFlags.indexOf('duplicate_candidate') < 0) opsFlags.push('duplicate_candidate');
  if (dup.duplicate_abuse_blocked && opsFlags.indexOf('duplicate_abuse_blocked') < 0) opsFlags.push('duplicate_abuse_blocked');
  if (contentPolicy.review_required && opsFlags.indexOf('content_policy_review') < 0) opsFlags.push('content_policy_review');
  draft.ops_flags = opsFlags;

  if (dup.review_required || contentPolicy.review_required) {
    draft.verification_state = 'pending_review';
    if (String(draft.status || '').toLowerCase() === 'published') {
      draft.status = 'pending';
    }
    if (dup.review_required) {
      const duplicateEvent = buildModerationEvent({
        listing_id: draft.id,
        slug: draft.slug,
        actor_id: actor,
        previous_outcome: null,
        trigger_signals: dup.duplicate_flags,
        trigger_type: dup.duplicate_abuse_blocked ? 'duplicate_abuse_block' : 'duplicate_detection',
        notes: dup.duplicate_abuse_blocked
          ? 'Sospecha fuerte de duplicado: bloqueo no destructivo y revisión humana obligatoria.'
          : 'Candidato duplicado moderado: revisión humana requerida.'
      });
      appendJsonl(moderationEventsPath, duplicateEvent);
    }
    if (contentPolicy.review_required) {
      const contentEvent = buildModerationEvent({
        listing_id: draft.id,
        slug: draft.slug,
        actor_id: actor,
        previous_outcome: null,
        trigger_signals: contentPolicy.content_policy_flags,
        trigger_type: 'content_policy_detection',
        notes: 'Contenido no claramente inmobiliario: revisión humana conservadora.'
      });
      appendJsonl(moderationEventsPath, contentEvent);
    }
  }

  draft.updated_at = nowIso();
  if (!existing && !draft.created_at) draft.created_at = draft.updated_at;
  let createEditKey = null;
  if (!existing) {
    createEditKey = randomToken();
    draft.edit_key_hash = sha256(createEditKey);
    // edit_key sin expiración en MVP — para añadir: crear draft.edit_key_expires_at aquí y validar antes del hash check (línea ~226)
  }

  if (existingIndex >= 0) {
    listings[existingIndex] = draft;
  } else {
    listings.push(draft);
  }

  writeJsonArrayAtomic(listingsPath, listings);

  return {
    ok: true,
    mode: existing ? 'updated' : 'created',
    actor,
    role,
    listing: draft,
    image_pipeline: imageResult.changed ? draft.image_pipeline : null,
    edit_key: createEditKey,
    duplicate_review: {
      duplicate_score: dup.duplicate_score,
      duplicate_flags: dup.duplicate_flags,
      duplicate_candidates: dup.duplicate_candidates,
      top_match: dup.top_match,
      duplicate_reason_evidence: dup.duplicate_reason_evidence,
      duplicate_abuse_blocked: dup.duplicate_abuse_blocked,
      duplicate_abuse_block_reason: dup.duplicate_abuse_block_reason,
      review_required: dup.review_required,
      review_severity: dup.review_severity
    },
    content_policy: {
      content_policy_score: contentPolicy.content_policy_score,
      content_policy_flags: contentPolicy.content_policy_flags,
      content_policy_evidence: contentPolicy.content_policy_evidence,
      content_blocked: contentPolicy.content_blocked,
      review_required: contentPolicy.review_required
    },
    destructive_actions_applied: false
  };
}

module.exports = {
  upsertListing
};
