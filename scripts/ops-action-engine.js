#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const core = require('./lib/moderation-ledger-core.js');

const SCHEMA_VERSION = 2;
const ALLOWED_ACTION_TYPES = [
  'mark_pending_review',
  'mark_expiring_soon',
  'archive_expired_candidate',
  'suspend_risk_candidate',
  'resolve_moderation_case',
  'request_reconfirmation_prepare'
];

const ROLE_PERMISSIONS = {
  viewer: [],
  operator: [
    'mark_pending_review',
    'mark_expiring_soon',
    'archive_expired_candidate',
    'request_reconfirmation_prepare'
  ],
  admin: ALLOWED_ACTION_TYPES.slice()
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeString(value) {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function ensureDirForFile(filePath) {
  ensureDir(path.dirname(filePath));
}

function readJsonArray(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error('missing_source:' + label + ':' + filePath);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error('invalid_json:' + label + ':' + error.message);
  }
  if (!Array.isArray(parsed)) {
    throw new Error('invalid_contract:' + label + ':expected_array');
  }
  return parsed;
}

function writeJsonArrayAtomic(filePath, value) {
  ensureDirForFile(filePath);
  const tmp = filePath + '.tmp.' + process.pid + '.' + Date.now();
  try {
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n', 'utf8');
    fs.renameSync(tmp, filePath);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch (_) { /* best effort */ }
    throw err;
  }
}

function appendJsonl(filePath, payload) {
  ensureDirForFile(filePath);
  fs.appendFileSync(filePath, JSON.stringify(payload) + '\n', { encoding: 'utf8', flag: 'a' });
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw.trim()) return [];
  return core.parseJsonl(raw).map((row) => row.parsed);
}

function buildPaths(root) {
  return {
    listings: path.join(root, 'data', 'listings.json'),
    riskReport: path.join(root, 'data', 'risk-report.json'),
    moderationEvents: path.join(root, 'data', 'moderation-events.log.jsonl'),
    moderationReviewSnapshots: path.join(root, 'data', 'moderation-review-snapshots.log.jsonl'),
    actionLog: path.join(root, 'data', 'chany', 'action-log.jsonl'),
    reconfirmationPrepared: path.join(root, 'data', 'chany', 'reconfirmation-prepared.jsonl')
  };
}

function getLatestModerationOutcome(events, listingId) {
  let selected = null;
  let selectedTs = -1;
  events.forEach((event) => {
    if (!event || event.listing_id !== listingId) return;
    const ts = Date.parse(event.created_at || '');
    const sortable = Number.isNaN(ts) ? -1 : ts;
    if (sortable >= selectedTs) {
      selectedTs = sortable;
      selected = event;
    }
  });
  return selected;
}

function getModerationTail(events) {
  let previousHash = null;
  events.forEach((event) => {
    const schemaVersion = core.inferSchemaVersion(event);
    previousHash = schemaVersion >= 2 && event.event_hash
      ? event.event_hash
      : core.computeEventHash(event, schemaVersion);
  });
  return previousHash;
}

function ensureArrayField(objectRef, field) {
  if (!Array.isArray(objectRef[field])) objectRef[field] = [];
  return objectRef[field];
}

function summarizeListingForAudit(listing) {
  if (!listing) return null;
  return {
    id: listing.id || null,
    status: listing.status || null,
    verification_state: listing.verification_state || null,
    expiration_at: listing.expiration_at || null,
    published_at: listing.published_at || null,
    badges: Array.isArray(listing.badges) ? listing.badges.slice(0, 10) : [],
    ops_flags: Array.isArray(listing.ops_flags) ? listing.ops_flags.slice(0, 10) : []
  };
}

function mapActionToModerationOutcome(actionType, previousOutcome) {
  if (actionType === 'mark_pending_review') return 'pending_review';
  if (actionType === 'suspend_risk_candidate') return 'suspend_candidate';
  if (actionType === 'resolve_moderation_case') {
    if (previousOutcome === 'quarantine') return 'pending_review';
    if (previousOutcome === 'suspend_candidate') return 'quarantine';
    return 'allow_with_monitoring';
  }
  if (actionType === 'archive_expired_candidate') {
    return previousOutcome || 'allow_with_monitoring';
  }
  return null;
}

function actionSignals(actionType) {
  if (actionType === 'mark_pending_review') return ['chany_ops_mark_pending_review'];
  if (actionType === 'suspend_risk_candidate') return ['chany_ops_suspend_risk_candidate'];
  if (actionType === 'resolve_moderation_case') return ['chany_ops_resolve_moderation_case'];
  if (actionType === 'archive_expired_candidate') return ['chany_ops_archive_expired_candidate'];
  return ['chany_ops_manual_action'];
}

function applyListingMutation(actionType, listing, now) {
  const badges = ensureArrayField(listing, 'badges');
  const flags = ensureArrayField(listing, 'ops_flags');
  const changes = [];

  if (actionType === 'mark_pending_review') {
    if (listing.verification_state !== 'in_review') {
      listing.verification_state = 'in_review';
      changes.push('verification_state=in_review');
    }
    if (!flags.includes('pending_review')) {
      flags.push('pending_review');
      changes.push('ops_flags+=pending_review');
    }
  }

  if (actionType === 'mark_expiring_soon') {
    if (!badges.includes('expira-pronto')) {
      badges.push('expira-pronto');
      changes.push('badges+=expira-pronto');
    }
    if (!flags.includes('expiring_soon')) {
      flags.push('expiring_soon');
      changes.push('ops_flags+=expiring_soon');
    }
  }

  if (actionType === 'archive_expired_candidate') {
    if (listing.status !== 'off_market') {
      listing.status = 'off_market';
      changes.push('status=off_market');
    }
    listing.archived_at = now;
    changes.push('archived_at=' + now);
    if (!flags.includes('archived_candidate')) {
      flags.push('archived_candidate');
      changes.push('ops_flags+=archived_candidate');
    }
  }

  if (actionType === 'suspend_risk_candidate') {
    if (listing.status !== 'off_market') {
      listing.status = 'off_market';
      changes.push('status=off_market');
    }
    if (listing.verification_state !== 'pending') {
      listing.verification_state = 'pending';
      changes.push('verification_state=pending');
    }
    if (!flags.includes('suspend_candidate')) {
      flags.push('suspend_candidate');
      changes.push('ops_flags+=suspend_candidate');
    }
  }

  if (actionType === 'resolve_moderation_case') {
    if (listing.verification_state !== 'verified') {
      listing.verification_state = 'verified';
      changes.push('verification_state=verified');
    }
    listing.review_resolved_at = now;
    changes.push('review_resolved_at=' + now);
    listing.ops_flags = flags.filter((item) => item !== 'pending_review' && item !== 'suspend_candidate');
    changes.push('ops_flags_cleanup=done');
  }

  return changes;
}

function appendModerationEvent(params) {
  const now = params.now;
  const base = {
    schema_version: 2,
    moderation_event_id: 'evt_chany_' + now.replace(/[:.]/g, '-') + '_' + params.actionId.slice(-6),
    listing_id: params.listing.id,
    slug: params.listing.slug || null,
    actor_type: 'ops',
    actor_id: params.actor,
    previous_outcome: params.previousOutcome,
    new_outcome: params.newOutcome,
    trigger_type: 'manual_review',
    trigger_signals: params.triggerSignals,
    notes: params.notes,
    created_at: now,
    override_transition: false
  };

  const allowed = core.isTransitionAllowed(base.previous_outcome, base.new_outcome);
  const sensitive = core.isSensitiveTransition(base.previous_outcome, base.new_outcome);
  if (!allowed || sensitive) {
    base.override_transition = true;
    base.override_reason_code = 'data_correction';
    const just = 'Chany Ops acción manual autenticada: ' + params.reason;
    if (just.length < core.OVERRIDE_POLICY.required_justification_min_length) {
      throw new Error('reason_too_short_for_override:min_chars=' + core.OVERRIDE_POLICY.required_justification_min_length);
    }
    base.override_justification = just;
  }

  base.prev_hash = params.previousHash;
  base.event_hash = core.computeEventHash(base, 2);
  appendJsonl(params.paths.moderationEvents, base);
  return base;
}

function canRoleApply(role, actionType) {
  const allowed = ROLE_PERMISSIONS[role] || [];
  return allowed.includes(actionType);
}

function validatePayload(payload, context) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('invalid_payload');
  }

  const actionType = normalizeString(payload.action_type);
  if (!actionType || ALLOWED_ACTION_TYPES.indexOf(actionType) < 0) {
    throw new Error('action_not_allowed:' + String(payload.action_type || 'null'));
  }

  const role = normalizeString(context && context.role) || 'viewer';
  if (!ROLE_PERMISSIONS[role]) {
    throw new Error('invalid_role:' + role);
  }
  if (!canRoleApply(role, actionType)) {
    throw new Error('forbidden_by_role:' + role + ':' + actionType);
  }

  const targetId = normalizeString(payload.target_id || payload.listing_id);
  if (!targetId) throw new Error('target_required');

  const actorFromContext = normalizeString(context && context.actor);
  if (!actorFromContext) throw new Error('actor_required');

  const reason = normalizeString(payload.reason);
  if (!reason) throw new Error('reason_required');
  if (reason.length < 12) throw new Error('reason_too_short:min_chars=12');
  if (reason.length > 2048) throw new Error('reason_too_long:max_2048');

  const actionId = normalizeString(payload.action_id);
  if (!actionId) throw new Error('action_id_required');

  if (payload.confirmed !== true) throw new Error('confirmation_required');

  return {
    action_id: actionId,
    action_type: actionType,
    target_id: targetId,
    actor: actorFromContext,
    role,
    reason,
    source_proposal_id: normalizeString(payload.source_proposal_id),
    dry_run: payload.dry_run === true,
    requested_at: nowIso()
  };
}

function buildAuditEntry(base) {
  return {
    schema_version: SCHEMA_VERSION,
    action_id: base.action_id,
    actor: base.actor,
    role: base.role,
    action_type: base.action_type,
    target_id: base.target_id,
    reason: base.reason,
    created_at: base.created_at,
    dry_run: !!base.dry_run,
    idempotency_status: base.idempotency_status,
    applied: !!base.applied,
    duplicated_attempt: !!base.duplicated_attempt,
    result: base.result,
    before: base.before,
    after: base.after,
    source_proposal_id: base.source_proposal_id,
    metadata: base.metadata || {}
  };
}

function applyAction(payload, options) {
  const root = options && options.root ? options.root : process.cwd();
  const context = {
    actor: normalizeString(options && options.actor),
    role: normalizeString(options && options.role) || 'viewer'
  };
  const paths = buildPaths(root);
  const request = validatePayload(payload, context);
  const now = nowIso();

  const existingLogEntries = readJsonl(paths.actionLog);
  const duplicateOf = existingLogEntries.find((entry) => entry && entry.action_id === request.action_id) || null;

  if (duplicateOf) {
    const duplicateAudit = buildAuditEntry({
      action_id: request.action_id,
      actor: request.actor,
      role: request.role,
      action_type: request.action_type,
      target_id: request.target_id,
      reason: request.reason,
      created_at: now,
      dry_run: request.dry_run,
      idempotency_status: 'duplicate',
      applied: false,
      duplicated_attempt: true,
      result: {
        status: 'duplicate',
        message: 'Idempotencia activa: action_id ya procesado, sin mutación.'
      },
      before: null,
      after: null,
      source_proposal_id: request.source_proposal_id,
      metadata: {
        original_created_at: duplicateOf.created_at || null,
        original_idempotency_status: duplicateOf.idempotency_status || null,
        original_applied: !!duplicateOf.applied
      }
    });
    appendJsonl(paths.actionLog, duplicateAudit);
    return {
      ok: true,
      idempotent: true,
      action: duplicateAudit,
      paths
    };
  }

  const listings = readJsonArray(paths.listings, 'listings');
  const listing = listings.find((item) => item && item.id === request.target_id);
  if (!listing) throw new Error('target_not_found:' + request.target_id);

  const before = summarizeListingForAudit(listing);
  const simulated = deepClone(listing);
  const projectedChanges = applyListingMutation(request.action_type, simulated, now);
  const simulatedAfter = summarizeListingForAudit(simulated);

  const moderationEvents = readJsonl(paths.moderationEvents);
  const currentModeration = getLatestModerationOutcome(moderationEvents, request.target_id);
  const previousOutcome = currentModeration ? normalizeString(currentModeration.new_outcome) : null;
  const nextOutcome = mapActionToModerationOutcome(request.action_type, previousOutcome);

  if (request.dry_run) {
    const dryRunAudit = buildAuditEntry({
      action_id: request.action_id,
      actor: request.actor,
      role: request.role,
      action_type: request.action_type,
      target_id: request.target_id,
      reason: request.reason,
      created_at: now,
      dry_run: true,
      idempotency_status: 'dry_run',
      applied: false,
      duplicated_attempt: false,
      result: {
        status: 'simulated',
        message: 'Dry-run validado: sin escrituras reales.'
      },
      before,
      after: simulatedAfter,
      source_proposal_id: request.source_proposal_id,
      metadata: {
        projected_listing_changes: projectedChanges,
        projected_moderation_transition: nextOutcome
          ? String(previousOutcome) + '->' + String(nextOutcome)
          : null,
        would_append_reconfirmation_prepare: request.action_type === 'request_reconfirmation_prepare'
      }
    });
    appendJsonl(paths.actionLog, dryRunAudit);
    return {
      ok: true,
      idempotent: false,
      action: dryRunAudit,
      paths
    };
  }

  const listingChanges = [];
  const metadata = {
    moderation_event_id: null,
    reconfirmation_prepared: false,
    listing_changes: listingChanges
  };

  if (request.action_type === 'request_reconfirmation_prepare') {
    const reconfirmationRecord = {
      schema_version: SCHEMA_VERSION,
      prepared_id: 'prep_' + request.action_id,
      listing_id: request.target_id,
      actor: request.actor,
      role: request.role,
      reason: request.reason,
      source_proposal_id: request.source_proposal_id,
      created_at: now,
      status: 'prepared_only'
    };
    appendJsonl(paths.reconfirmationPrepared, reconfirmationRecord);
    metadata.reconfirmation_prepared = true;
  } else {
    const changes = applyListingMutation(request.action_type, listing, now);
    changes.forEach((item) => listingChanges.push(item));
    writeJsonArrayAtomic(paths.listings, listings);

    if (nextOutcome) {
      const moderationEvent = appendModerationEvent({
        actionId: request.action_id,
        now,
        actor: request.actor,
        listing,
        previousOutcome,
        newOutcome: nextOutcome,
        triggerSignals: actionSignals(request.action_type),
        notes: 'Chany Ops acción manual: ' + request.action_type + ' · motivo: ' + request.reason,
        reason: request.reason,
        paths,
        previousHash: getModerationTail(moderationEvents)
      });
      metadata.moderation_event_id = moderationEvent.moderation_event_id;
    }
  }

  const after = summarizeListingForAudit(
    request.action_type === 'request_reconfirmation_prepare'
      ? listing
      : (readJsonArray(paths.listings, 'listings').find((item) => item && item.id === request.target_id) || listing)
  );

  const appliedAudit = buildAuditEntry({
    action_id: request.action_id,
    actor: request.actor,
    role: request.role,
    action_type: request.action_type,
    target_id: request.target_id,
    reason: request.reason,
    created_at: now,
    dry_run: false,
    idempotency_status: 'applied',
    applied: true,
    duplicated_attempt: false,
    result: {
      status: 'applied',
      message: 'Acción aplicada.'
    },
    before,
    after,
    source_proposal_id: request.source_proposal_id,
    metadata
  });
  appendJsonl(paths.actionLog, appliedAudit);

  return {
    ok: true,
    idempotent: false,
    action: appliedAudit,
    paths
  };
}

function listRecentActions(options) {
  const root = options && options.root ? options.root : process.cwd();
  const paths = buildPaths(root);
  const limit = options && Number.isFinite(Number(options.limit))
    ? Math.max(1, Math.min(100, Number(options.limit)))
    : 20;
  const entries = readJsonl(paths.actionLog);
  return entries.slice(-limit).reverse();
}

module.exports = {
  ALLOWED_ACTION_TYPES,
  ROLE_PERMISSIONS,
  applyAction,
  listRecentActions
};
