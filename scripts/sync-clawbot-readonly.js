#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const batchPreflightEngine = require('./ops-batch-preflight-engine.js');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(ROOT, 'data', 'chany', 'ops-snapshot.json');
const HISTORY_DIR = path.join(ROOT, 'data', 'chany', 'history');
const HISTORY_INDEX_PATH = path.join(HISTORY_DIR, 'index.json');
const SITE_SETTINGS_PATH = path.join(ROOT, 'data', 'site-settings.json');
const SNAPSHOT_VERSION = '2.3.2';
const DEFAULT_HISTORY_LIMIT = 40;
const MAX_HISTORY_LIMIT = 240;
const RECENT_ACTIONS_WINDOW = 120;
const MAX_PENDING_LISTINGS = 20;
const MAX_MODERATION_ITEMS = 20;
const MAX_RISK_ITEMS = 20;
const MAX_SUGGESTED_ACTIONS = 80;
const MAX_APPLIED_ACTIONS = 20;
const MAX_OPERATIONAL_ITEMS = 24;
const DEFAULT_OPS_THRESHOLDS = {
  validity_days_global_all_assets: null,
  validity_days_sale_non_rent: 90,
  validity_days_rent: 60,
  reconfirmation_due_soon_days: 14,
  expiration_expiring_soon_days: 7,
  expiration_archived_candidate_days: 15,
  priority_urgent_min: 75,
  priority_moderate_min: 55,
  batch_quality_min_critical_fields_pct: 95,
  batch_quality_min_city_pct: 95,
  batch_quality_min_operation_pct: 95
};

const SOURCES = {
  queue: '/home/pokershadow/LAB/clawbot/jobs/job_queue.json',
  module_state: '/home/pokershadow/LAB/clawbot/memory/module_state.json',
  project_state: '/home/pokershadow/LAB/clawbot/memory/project_state.json',
  system_actions: '/home/pokershadow/LAB/workspace/op_logs/system_actions.jsonl'
};

const PORTAL_SOURCES = {
  listings: path.join(ROOT, 'data', 'listings.json'),
  risk_report: path.join(ROOT, 'data', 'risk-report.json'),
  moderation_events: path.join(ROOT, 'data', 'moderation-events.log.jsonl'),
  moderation_review_snapshots: path.join(ROOT, 'data', 'moderation-review-snapshots.log.jsonl'),
  moderation_legacy_exceptions: path.join(ROOT, 'data', 'moderation-legacy-exceptions.json'),
  chany_public_listing_upsert_log: path.join(ROOT, 'data', 'chany', 'public-listing-upsert-log.jsonl'),
  site_settings: SITE_SETTINGS_PATH,
  chany_action_log: path.join(ROOT, 'data', 'chany', 'action-log.jsonl'),
  chany_reconfirmation_prepared: path.join(ROOT, 'data', 'chany', 'reconfirmation-prepared.jsonl'),
  chany_batch_review_log: path.join(ROOT, 'data', 'chany', 'batch-review-log.jsonl'),
  chany_batch_item_review_log: path.join(ROOT, 'data', 'chany', 'batch-item-review-log.jsonl'),
  chany_batch_item_review_conflicts_log: path.join(ROOT, 'data', 'chany', 'batch-item-review-conflicts.log.jsonl'),
  chany_batch_execution_log: path.join(ROOT, 'data', 'chany', 'batch-execution-log.jsonl')
};

function toInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}

function loadOpsThresholds(siteSettingsData) {
  const root = siteSettingsData && typeof siteSettingsData === 'object'
    ? siteSettingsData
    : {};
  const raw = root.ops_thresholds && typeof root.ops_thresholds === 'object'
    ? root.ops_thresholds
    : {};
  const urgentMin = toInt(raw.priority_urgent_min, DEFAULT_OPS_THRESHOLDS.priority_urgent_min);
  const moderateMinRaw = toInt(raw.priority_moderate_min, DEFAULT_OPS_THRESHOLDS.priority_moderate_min);
  const moderateMin = Math.min(moderateMinRaw, urgentMin);
  const globalValidity = toInt(raw.validity_days_global_all_assets, 0);
  const useGlobalValidity = globalValidity > 0;
  const saleValidity = useGlobalValidity
    ? globalValidity
    : toInt(raw.validity_days_sale_non_rent, DEFAULT_OPS_THRESHOLDS.validity_days_sale_non_rent);
  const rentValidity = useGlobalValidity
    ? globalValidity
    : toInt(raw.validity_days_rent, DEFAULT_OPS_THRESHOLDS.validity_days_rent);
  return {
    validity_mode: useGlobalValidity ? 'global_all_assets' : 'split_by_operation',
    validity_days_global_all_assets: useGlobalValidity ? globalValidity : null,
    validity_days_sale_non_rent: saleValidity,
    validity_days_rent: rentValidity,
    reconfirmation_due_soon_days: toInt(raw.reconfirmation_due_soon_days, DEFAULT_OPS_THRESHOLDS.reconfirmation_due_soon_days),
    expiration_expiring_soon_days: toInt(raw.expiration_expiring_soon_days, DEFAULT_OPS_THRESHOLDS.expiration_expiring_soon_days),
    expiration_archived_candidate_days: toInt(raw.expiration_archived_candidate_days, DEFAULT_OPS_THRESHOLDS.expiration_archived_candidate_days),
    priority_urgent_min: urgentMin,
    priority_moderate_min: moderateMin,
    batch_quality_min_critical_fields_pct: toInt(
      raw.batch_quality_min_critical_fields_pct,
      DEFAULT_OPS_THRESHOLDS.batch_quality_min_critical_fields_pct
    ),
    batch_quality_min_city_pct: toInt(
      raw.batch_quality_min_city_pct,
      DEFAULT_OPS_THRESHOLDS.batch_quality_min_city_pct
    ),
    batch_quality_min_operation_pct: toInt(
      raw.batch_quality_min_operation_pct,
      DEFAULT_OPS_THRESHOLDS.batch_quality_min_operation_pct
    )
  };
}

function nowIso() {
  return new Date().toISOString();
}

function ensureDirForFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function parseHistoryLimit(raw) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_HISTORY_LIMIT;
  return Math.min(Math.floor(value), MAX_HISTORY_LIMIT);
}

function safeTimestampForFile(iso) {
  return String(iso || nowIso()).replace(/:/g, '-');
}

function sourceEntry(absPath) {
  return {
    path: absPath,
    exists: false,
    status: 'missing'
  };
}

function summarizePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload == null ? null : String(payload);
  }

  const keys = Object.keys(payload).slice(0, 5);
  const out = {};
  keys.forEach((key) => {
    const value = payload[key];
    if (value == null) {
      out[key] = null;
      return;
    }
    if (typeof value === 'string') {
      out[key] = value.length > 140 ? value.slice(0, 140) + '…' : value;
      return;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
      return;
    }
    if (Array.isArray(value)) {
      out[key] = '[array:' + value.length + ']';
      return;
    }
    if (typeof value === 'object') {
      out[key] = '[object]';
      return;
    }
    out[key] = String(value);
  });
  return out;
}

function readJsonSource(name, absPath, snapshot) {
  const meta = sourceEntry(absPath);
  snapshot.sources_ok[name] = meta;

  if (!fs.existsSync(absPath)) {
    snapshot.errors.push('source_missing:' + name + ':' + absPath);
    return null;
  }

  meta.exists = true;
  try {
    const raw = fs.readFileSync(absPath, 'utf8');
    const parsed = JSON.parse(raw);
    meta.status = 'ok';
    return parsed;
  } catch (error) {
    meta.status = 'error';
    snapshot.errors.push('source_error:' + name + ':' + error.message);
    return null;
  }
}

function readJsonlSource(name, absPath, snapshot) {
  const meta = sourceEntry(absPath);
  snapshot.sources_ok[name] = meta;

  if (!fs.existsSync(absPath)) {
    snapshot.errors.push('source_missing:' + name + ':' + absPath);
    return [];
  }

  meta.exists = true;
  try {
    const raw = fs.readFileSync(absPath, 'utf8');
    if (!raw.trim()) {
      meta.status = 'ok';
      return [];
    }

    const lines = raw.split(/\r?\n/);
    const parsed = [];
    lines.forEach((line, index) => {
      const text = line.trim();
      if (!text) return;
      try {
        parsed.push(JSON.parse(text));
      } catch (error) {
        snapshot.errors.push(
          'jsonl_parse_error:' + name + ':line:' + String(index + 1) + ':' + error.message
        );
      }
    });
    meta.status = parsed.length > 0 || !snapshot.errors.some((err) => err.startsWith('jsonl_parse_error:' + name))
      ? 'ok'
      : 'error';
    return parsed;
  } catch (error) {
    meta.status = 'error';
    snapshot.errors.push('source_error:' + name + ':' + error.message);
    return [];
  }
}

function readJsonSourceTracked(name, absPath, sourceMap, errorList) {
  const meta = sourceEntry(absPath);
  sourceMap[name] = meta;
  if (!fs.existsSync(absPath)) {
    errorList.push('source_missing:' + name + ':' + absPath);
    return null;
  }
  meta.exists = true;
  try {
    const raw = fs.readFileSync(absPath, 'utf8');
    const parsed = JSON.parse(raw);
    meta.status = 'ok';
    return parsed;
  } catch (error) {
    meta.status = 'error';
    errorList.push('source_error:' + name + ':' + error.message);
    return null;
  }
}

function readJsonlSourceTracked(name, absPath, sourceMap, errorList) {
  const meta = sourceEntry(absPath);
  sourceMap[name] = meta;
  const options = arguments[4] && typeof arguments[4] === 'object' ? arguments[4] : {};
  const optional = !!options.optional;
  const initIfMissing = !!options.initIfMissing;
  if (!fs.existsSync(absPath)) {
    if (initIfMissing) {
      try {
        ensureDirForFile(absPath);
        fs.writeFileSync(absPath, '', 'utf8');
        meta.exists = true;
        meta.status = 'ok';
        meta.note = 'initialized_empty';
        return [];
      } catch (error) {
        meta.status = 'error';
        errorList.push('source_error:' + name + ':' + error.message);
        return [];
      }
    }
    if (optional) {
      meta.status = 'not_initialized';
      meta.note = 'optional_missing';
      return [];
    }
    errorList.push('source_missing:' + name + ':' + absPath);
    return [];
  }
  meta.exists = true;
  try {
    const raw = fs.readFileSync(absPath, 'utf8');
    if (!raw.trim()) {
      meta.status = 'ok';
      return [];
    }
    const lines = raw.split(/\r?\n/);
    const parsed = [];
    lines.forEach((line, index) => {
      const text = line.trim();
      if (!text) return;
      try {
        parsed.push(JSON.parse(text));
      } catch (error) {
        errorList.push(
          'jsonl_parse_error:' + name + ':line:' + String(index + 1) + ':' + error.message
        );
      }
    });
    meta.status = parsed.length > 0 || !errorList.some((err) => err.startsWith('jsonl_parse_error:' + name))
      ? 'ok'
      : 'error';
    return parsed;
  } catch (error) {
    meta.status = 'error';
    errorList.push('source_error:' + name + ':' + error.message);
    return [];
  }
}

function normalizeLabel(value, emptyFallback) {
  const fallback = emptyFallback || 'N/A';
  if (value == null) return fallback;
  const collapsed = String(value).trim().replace(/\s+/g, ' ');
  if (!collapsed) return fallback;
  return collapsed
    .toLocaleLowerCase('es-ES')
    .split(' ')
    .map((token) => token ? token.charAt(0).toLocaleUpperCase('es-ES') + token.slice(1) : token)
    .join(' ');
}

function normalizeCity(value) {
  return normalizeLabel(value, 'Sin ciudad');
}

function normalizeZone(value) {
  return normalizeLabel(value, 'Sin zona');
}

function buildQueueSummary(queueData) {
  const jobs = queueData && Array.isArray(queueData.jobs) ? queueData.jobs : [];
  const byStatus = {};
  jobs.forEach((job) => {
    const key = String((job && job.status) || 'unknown');
    byStatus[key] = (byStatus[key] || 0) + 1;
  });
  return {
    total: jobs.length,
    pending: byStatus.pending || 0,
    running: byStatus.running || 0,
    done: byStatus.done || 0,
    failed: byStatus.failed || 0,
    by_status: byStatus
  };
}

function buildQueueItems(queueData) {
  const jobs = queueData && Array.isArray(queueData.jobs) ? queueData.jobs : [];
  return jobs
    .slice(-25)
    .reverse()
    .map((job) => {
      const prompt = String((job && job.prompt) || '');
      return {
        id: (job && job.id) || '',
        status: (job && job.status) || 'unknown',
        kind: (job && job.kind) || 'unknown',
        priority: (job && job.priority) || null,
        source: (job && job.source) || 'unknown',
        created_at: (job && job.created_at) || null,
        updated_at: (job && job.updated_at) || null,
        attempts: Number((job && job.attempts) || 0),
        max_attempts: Number((job && job.max_attempts) || 1),
        prompt_preview: prompt.length > 180 ? prompt.slice(0, 180) + '…' : prompt,
        last_error: (job && job.last_error) || ''
      };
    });
}

function buildProjectState(projectStateData) {
  if (!projectStateData || typeof projectStateData !== 'object') {
    return null;
  }

  const memory = projectStateData.memory && typeof projectStateData.memory === 'object'
    ? projectStateData.memory
    : {};
  return {
    label: projectStateData.label || null,
    mode: projectStateData.mode || null,
    model: projectStateData.model || null,
    saved_at: projectStateData.saved_at || null,
    memory: {
      project_name: memory.project_name || null,
      current_goal: memory.current_goal || null,
      current_phase: memory.current_phase || null,
      focus: memory.focus || null,
      updated_at: memory.updated_at || null,
      operational_state: memory.operational_state || null,
      recent_events: Array.isArray(memory.recent_events) ? memory.recent_events.slice(-12).reverse() : [],
      summaries: Array.isArray(memory.summaries) ? memory.summaries.slice(-8).reverse() : []
    }
  };
}

function buildModuleState(moduleStateData) {
  if (!moduleStateData || typeof moduleStateData !== 'object') {
    return null;
  }
  return moduleStateData;
}

function buildRecentActions(systemActions) {
  return (Array.isArray(systemActions) ? systemActions : [])
    .slice(-RECENT_ACTIONS_WINDOW)
    .reverse()
    .map((item) => ({
      timestamp: item && item.timestamp ? item.timestamp : null,
      kind: item && item.kind ? item.kind : 'unknown',
      payload: summarizePayload(item && item.payload ? item.payload : null)
    }));
}

function buildAlerts(snapshot) {
  const alerts = [];
  Object.keys(snapshot.sources_ok).forEach((key) => {
    const src = snapshot.sources_ok[key];
    if (!src || src.status === 'ok') return;
    alerts.push({
      code: 'source_' + src.status,
      severity: src.status === 'missing' ? 'high' : 'medium',
      source: key,
      message: 'Fuente ' + key + ' en estado ' + src.status
    });
  });

  if (snapshot.queue_summary.failed > 0) {
    alerts.push({
      code: 'queue_failed_jobs',
      severity: 'medium',
      source: 'queue',
      message: 'Hay jobs fallidos en cola: ' + snapshot.queue_summary.failed
    });
  }

  if (!snapshot.recent_actions.length) {
    alerts.push({
      code: 'no_recent_actions',
      severity: 'low',
      source: 'system_actions',
      message: 'No hay acciones recientes registradas.'
    });
  }

  return alerts;
}

function countBy(items, picker) {
  const out = {};
  (Array.isArray(items) ? items : []).forEach((item) => {
    const key = picker(item);
    const normalized = key == null || key === '' ? 'unknown' : String(key);
    out[normalized] = (out[normalized] || 0) + 1;
  });
  return out;
}

function toIsoOrNull(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function inferPendingReason(listing, nowMs) {
  const verification = String((listing && listing.verification_state) || '').toLowerCase();
  const status = String((listing && listing.status) || '').toLowerCase();
  if (verification === 'in_review' || verification === 'pending' || verification === 'pending_review') {
    return 'moderation_review';
  }
  if (status === 'pending') return 'status_pending';
  const expirationAt = toIsoOrNull(listing && listing.expiration_at);
  if (expirationAt && new Date(expirationAt).getTime() < nowMs) {
    return 'expired';
  }
  return 'operational_watch';
}

function buildListingsSummary(listings) {
  const data = Array.isArray(listings) ? listings : [];
  const nowMs = Date.now();
  const byStatus = countBy(data, (item) => item && item.status);
  const byVerification = countBy(data, (item) => item && item.verification_state);
  const byOperation = countBy(data, (item) => item && item.operation);
  const byAssetType = countBy(data, (item) => item && item.asset_type);

  const expiredCount = data.filter((item) => {
    const expirationAt = toIsoOrNull(item && item.expiration_at);
    return !!expirationAt && new Date(expirationAt).getTime() < nowMs;
  }).length;
  const pendingItems = data.filter((item) => {
    const verification = String((item && item.verification_state) || '').toLowerCase();
    const status = String((item && item.status) || '').toLowerCase();
    return verification === 'in_review' || verification === 'pending' || verification === 'pending_review' || status === 'pending';
  });
  const imageProcessedCount = data.filter((item) => item && item.image_pipeline && item.image_pipeline.processed_at).length;
  const imageWarningsCount = data.reduce((acc, item) => {
    const warnings = Array.isArray(item && item.image_pipeline_warnings) ? item.image_pipeline_warnings : [];
    return acc + warnings.length;
  }, 0);
  const duplicateCandidateCount = data.filter((item) => {
    const list = Array.isArray(item && item.duplicate_candidates) ? item.duplicate_candidates : [];
    return list.length > 0;
  }).length;
  const duplicateAbuseBlockedCount = data.filter((item) => item && item.duplicate_abuse_blocked === true).length;

  const pendingListings = pendingItems
    .sort((a, b) => {
      const aDate = toIsoOrNull((a && a.published_at) || (a && a.expiration_at)) || '';
      const bDate = toIsoOrNull((b && b.published_at) || (b && b.expiration_at)) || '';
      return bDate.localeCompare(aDate);
    })
    .slice(0, MAX_PENDING_LISTINGS)
    .map((item) => ({
      id: (item && item.id) || null,
      asset_type: (item && item.asset_type) || null,
      operation: (item && item.operation) || null,
      city: normalizeCity(item && item.city),
      zone: normalizeZone(item && item.zone),
      status: (item && item.status) || null,
      verification_state: (item && item.verification_state) || null,
      published_at: toIsoOrNull(item && item.published_at),
      expiration_at: toIsoOrNull(item && item.expiration_at),
      reason: inferPendingReason(item, nowMs),
      image_processed: !!(item && item.image_pipeline && item.image_pipeline.processed_at),
      image_warnings_count: Array.isArray(item && item.image_pipeline_warnings) ? item.image_pipeline_warnings.length : 0,
      duplicate_score: Number((item && item.duplicate_score) || 0),
      duplicate_candidates_count: Array.isArray(item && item.duplicate_candidates) ? item.duplicate_candidates.length : 0,
      duplicate_abuse_blocked: item && item.duplicate_abuse_blocked === true,
      duplicate_evidence: item && item.duplicate_reason_evidence
        ? String(item.duplicate_reason_evidence)
        : (item && item.top_match && item.top_match.evidence ? String(item.top_match.evidence) : null)
    }));

  const activeCount = (byStatus.published || 0) + (byStatus.active || 0);
  const archivedCount = (byStatus.archived || 0) + (byStatus.off_market || 0) + (byStatus.removed || 0);
  const verifiedCount = byVerification.verified || 0;

  return {
    listings_summary: {
      total: data.length,
      active: activeCount,
      pending: pendingItems.length,
      expired: expiredCount,
      archived: archivedCount,
      verified: verifiedCount,
      image_processed_count: imageProcessedCount,
      image_warnings_count: imageWarningsCount,
      duplicate_candidate_count: duplicateCandidateCount,
      duplicate_abuse_blocked_count: duplicateAbuseBlockedCount,
      by_status: byStatus,
      by_verification_state: byVerification,
      by_operation: byOperation,
      by_asset_type: byAssetType
    },
    pending_listings: pendingListings
  };
}

function buildModerationSummary(moderationEvents, reviewSnapshots, legacyExceptions) {
  const events = Array.isArray(moderationEvents) ? moderationEvents : [];
  const snapshots = Array.isArray(reviewSnapshots) ? reviewSnapshots : [];
  const exceptions = legacyExceptions &&
    Array.isArray(legacyExceptions.accepted_sensitive_transition_exceptions)
    ? legacyExceptions.accepted_sensitive_transition_exceptions
    : [];

  const byOutcome = countBy(events, (item) => item && item.new_outcome);
  const byTrigger = countBy(events, (item) => item && item.trigger_type);
  const byActor = countBy(events, (item) => item && item.actor_type);

  const signalCount = {};
  events.forEach((item) => {
    const signals = item && Array.isArray(item.trigger_signals) ? item.trigger_signals : [];
    signals.forEach((signal) => {
      const key = String(signal || 'unknown');
      signalCount[key] = (signalCount[key] || 0) + 1;
    });
  });
  const topSignals = Object.entries(signalCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([signal, count]) => ({ signal, count }));

  const latestByListing = {};
  events
    .slice()
    .sort((a, b) => String((a && a.created_at) || '').localeCompare(String((b && b.created_at) || '')))
    .forEach((event) => {
      const listingId = (event && event.listing_id) || '';
      if (!listingId) return;
      latestByListing[listingId] = event;
    });

  const openCases = Object.values(latestByListing).filter((event) => {
    const state = String((event && event.new_outcome) || '').toLowerCase();
    return state === 'pending_review' || state === 'quarantine' || state === 'suspend_candidate';
  }).length;

  const moderationItems = events
    .slice()
    .sort((a, b) => String((b && b.created_at) || '').localeCompare(String((a && a.created_at) || '')))
    .slice(0, MAX_MODERATION_ITEMS)
    .map((event) => ({
      moderation_event_id: (event && event.moderation_event_id) || null,
      listing_id: (event && event.listing_id) || null,
      new_outcome: (event && event.new_outcome) || null,
      previous_outcome: (event && event.previous_outcome) || null,
      trigger_type: (event && event.trigger_type) || null,
      actor_type: (event && event.actor_type) || null,
      trigger_signals: event && Array.isArray(event.trigger_signals) ? event.trigger_signals.slice(0, 6) : [],
      created_at: toIsoOrNull(event && event.created_at),
      notes: (event && event.notes) || null
    }));

  return {
    moderation_summary: {
      total_events: events.length,
      open_cases: openCases,
      review_snapshots_count: snapshots.length,
      legacy_exceptions_count: exceptions.length,
      by_new_outcome: byOutcome,
      by_trigger_type: byTrigger,
      by_actor_type: byActor,
      top_signals: topSignals
    },
    moderation_items: moderationItems
  };
}

function buildRiskSummary(riskReport) {
  const report = riskReport && typeof riskReport === 'object' ? riskReport : null;
  const items = report && Array.isArray(report.items) ? report.items : [];
  const totals = report && report.totals && report.totals.outcomes ? report.totals.outcomes : {};
  const bySeverity = countBy(items, (item) => item && item.moderation_snapshot && item.moderation_snapshot.risk_band);

  const signalCount = {};
  let totalFlags = 0;
  let duplicateAbuseBlockedCount = 0;
  items.forEach((item) => {
    const fraudSignals = item && Array.isArray(item.fraud_signals) ? item.fraud_signals : [];
    const ownFlags = item && item.duplicate_signals && Array.isArray(item.duplicate_signals.own_flags)
      ? item.duplicate_signals.own_flags
      : [];
    const peerSignals = item && item.duplicate_signals && Array.isArray(item.duplicate_signals.peer_signal_codes)
      ? item.duplicate_signals.peer_signal_codes
      : [];
    const allSignals = [].concat(fraudSignals, ownFlags, peerSignals);
    totalFlags += allSignals.length;
    if (item && item.duplicate_abuse_blocked === true) {
      duplicateAbuseBlockedCount += 1;
    }
    allSignals.forEach((signal) => {
      const key = String(signal || 'unknown');
      signalCount[key] = (signalCount[key] || 0) + 1;
    });
  });

  const topSignals = Object.entries(signalCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([signal, count]) => ({ signal, count }));

  const riskItems = items
    .slice()
    .sort((a, b) => Number((b && b.total_score) || 0) - Number((a && a.total_score) || 0))
    .slice(0, MAX_RISK_ITEMS)
    .map((item) => ({
      listing_id: (item && item.listing_id) || null,
      outcome: (item && item.outcome) || null,
      total_score: Number((item && item.total_score) || 0),
      duplicate_score: Number((item && item.duplicate_score) || 0),
      duplicate_flags: Array.isArray(item && item.duplicate_flags) ? item.duplicate_flags.slice(0, 10) : [],
      duplicate_candidates: Array.isArray(item && item.duplicate_candidates) ? item.duplicate_candidates.slice(0, 3) : [],
      top_match: item && item.top_match ? item.top_match : null,
      duplicate_reason_evidence: item && item.duplicate_reason_evidence ? item.duplicate_reason_evidence : null,
      duplicate_abuse_blocked: item && item.duplicate_abuse_blocked === true,
      duplicate_abuse_block_reason: item && item.duplicate_abuse_block_reason ? item.duplicate_abuse_block_reason : null,
      fraud_score: Number((item && item.fraud_score) || 0),
      severity: item && item.moderation_snapshot ? item.moderation_snapshot.risk_band || null : null,
      review_priority: (item && item.review_priority) || null,
      generated_at: toIsoOrNull(item && item.generated_at),
      signals: []
        .concat(item && Array.isArray(item.fraud_signals) ? item.fraud_signals : [])
        .concat(item && item.duplicate_signals && Array.isArray(item.duplicate_signals.own_flags) ? item.duplicate_signals.own_flags : [])
        .slice(0, 8),
      summary: (item && item.summary) || null
    }));

  return {
    risk_summary: {
      engine_version: report ? report.engine_version || null : null,
      generated_at: report ? toIsoOrNull(report.generated_at) : null,
      total_items: items.length,
      total_flags: totalFlags,
      duplicate_abuse_blocked_count: duplicateAbuseBlockedCount,
      outcomes: totals,
      by_severity: bySeverity,
      top_signals: topSignals
    },
    risk_items: riskItems
  };
}

function buildPublicListingSummary(entries) {
  const logs = Array.isArray(entries) ? entries : [];
  const ordered = logs
    .slice()
    .sort((a, b) => String((b && b.ts) || '').localeCompare(String((a && a.ts) || '')));
  const okEntries = ordered.filter((item) => item && item.ok === true);
  const errorEntries = ordered.filter((item) => item && item.ok === false);
  return {
    listing_publication_summary: {
      total_requests: ordered.length,
      success_count: okEntries.length,
      error_count: errorEntries.length,
      abuse_blocked_count: okEntries.filter((item) => item && item.duplicate_abuse_blocked === true).length,
      image_processed_total: okEntries.reduce((acc, item) => acc + Number((item && item.image_processed_count) || 0), 0)
    },
    listing_publication_recent: ordered.slice(0, 20).map((item) => ({
      ts: item && item.ts ? item.ts : null,
      ok: item && item.ok === true,
      listing_id: item && item.listing_id ? item.listing_id : null,
      mode: item && item.mode ? item.mode : null,
      image_processed_count: Number((item && item.image_processed_count) || 0),
      duplicate_score: Number((item && item.duplicate_score) || 0),
      duplicate_abuse_blocked: item && item.duplicate_abuse_blocked === true,
      error: item && item.error ? item.error : null
    }))
  };
}

function buildAppliedActionsSummary(actionLogEntries, reconfirmationPreparedEntries) {
  const actions = Array.isArray(actionLogEntries) ? actionLogEntries : [];
  const reconfirmations = Array.isArray(reconfirmationPreparedEntries) ? reconfirmationPreparedEntries : [];
  const byType = countBy(actions, (item) => item && item.action_type);
  const byResult = countBy(actions, (item) => item && item.result && item.result.status);
  const byRole = countBy(actions, (item) => item && item.role);
  const byIdempotency = countBy(actions, (item) => item && item.idempotency_status);
  const dryRunCount = actions.filter((item) => item && item.dry_run === true).length;
  const duplicatedAttempts = actions.filter((item) => item && item.duplicated_attempt === true).length;
  const recent = actions
    .slice()
    .sort((a, b) => String((b && b.created_at) || '').localeCompare(String((a && a.created_at) || '')))
    .slice(0, MAX_APPLIED_ACTIONS)
    .map((item) => ({
      action_id: item && item.action_id ? item.action_id : null,
      action_type: item && item.action_type ? item.action_type : null,
      actor: item && item.actor ? item.actor : null,
      role: item && item.role ? item.role : null,
      target_id: item && item.target_id ? item.target_id : null,
      result: item && item.result && item.result.status ? item.result.status : null,
      dry_run: item && item.dry_run === true,
      idempotency_status: item && item.idempotency_status ? item.idempotency_status : null,
      applied: item && item.applied === true,
      duplicated_attempt: item && item.duplicated_attempt === true,
      created_at: toIsoOrNull(item && item.created_at),
      source_proposal_id: item && item.source_proposal_id ? item.source_proposal_id : null
    }));
  return {
    applied_actions_summary: {
      total: actions.length,
      by_type: byType,
      by_result: byResult,
      by_role: byRole,
      by_idempotency_status: byIdempotency,
      dry_run_count: dryRunCount,
      duplicated_attempts: duplicatedAttempts,
      reconfirmation_prepared_count: reconfirmations.length
    },
    applied_actions_recent: recent
  };
}

function buildReconfirmationPreparedInsights(reconfirmationPreparedEntries, listingsData, thresholds) {
  const rows = Array.isArray(reconfirmationPreparedEntries) ? reconfirmationPreparedEntries : [];
  const listings = Array.isArray(listingsData) ? listingsData : [];
  const byListingId = {};
  listings.forEach((listing) => {
    if (listing && listing.id) byListingId[String(listing.id)] = listing;
  });
  const now = nowIso();

  const items = rows
    .slice()
    .sort((a, b) => String((b && b.created_at) || '').localeCompare(String((a && a.created_at) || '')))
    .map((row) => {
      const listingId = row && row.listing_id ? String(row.listing_id) : null;
      const listing = listingId ? byListingId[listingId] : null;
      const createdAt = toIsoOrNull(row && row.created_at);
      const publishedAt = toIsoOrNull(listing && listing.published_at);
      const operation = listing && listing.operation ? listing.operation : null;
      const expectedDays = getExpectedValidityDays(operation, thresholds);
      const listingAgeDays = publishedAt ? daysBetween(publishedAt, now) : null;
      const daysOutsideWindow = listingAgeDays != null
        ? Math.max(0, listingAgeDays - expectedDays)
        : null;
      let priority = 'low';
      if (daysOutsideWindow != null && daysOutsideWindow > 30) priority = 'urgent';
      else if (daysOutsideWindow != null && daysOutsideWindow > 0) priority = 'medium';
      const reason = row && row.reason
        ? String(row.reason).slice(0, 180)
        : (daysOutsideWindow && daysOutsideWindow > 0
          ? 'Fuera de ventana de vigencia esperada.'
          : 'Preparado para validación humana.');
      return {
        prepared_id: row && row.prepared_id ? row.prepared_id : null,
        listing_id: listingId,
        actor: row && row.actor ? row.actor : null,
        role: row && row.role ? row.role : null,
        status: row && row.status ? row.status : null,
        source_proposal_id: row && row.source_proposal_id ? row.source_proposal_id : null,
        created_at: createdAt,
        city: normalizeCity(listing && listing.city),
        zone: normalizeZone(listing && listing.zone),
        operation,
        listing_age_days: listingAgeDays,
        expected_window_days: expectedDays,
        days_outside_window: daysOutsideWindow,
        priority,
        reason_summary: reason
      };
    });

  const byCity = countBy(items, (item) => item && item.city);
  const byOperation = countBy(items, (item) => item && item.operation);
  const byPriority = countBy(items, (item) => item && item.priority);
  const latestAt = items.length ? items[0].created_at : null;

  return {
    reconfirmation_prepared_summary: {
      total: items.length,
      by_city: byCity,
      by_operation: byOperation,
      by_priority: byPriority,
      latest_prepared_at: latestAt
    },
    reconfirmation_prepared_items: items.slice(0, MAX_OPERATIONAL_ITEMS)
  };
}

function summarizeListingForBatch(listing) {
  if (!listing || typeof listing !== 'object') return null;
  return {
    id: listing.id || null,
    status: listing.status || null,
    verification_state: listing.verification_state || null,
    city: normalizeCity(listing.city),
    zone: normalizeZone(listing.zone),
    operation: listing.operation || null,
    asset_type: listing.asset_type || null,
    published_at: toIsoOrNull(listing.published_at),
    expiration_at: toIsoOrNull(listing.expiration_at)
  };
}

function applyExpectedAfter(actionType, beforeState) {
  const before = beforeState && typeof beforeState === 'object' ? beforeState : {};
  const after = JSON.parse(JSON.stringify(before));
  if (actionType === 'mark_pending_review') {
    after.verification_state = 'in_review';
  }
  if (actionType === 'mark_expiring_soon') {
    after.status = after.status || 'published';
  }
  if (actionType === 'archive_expired_candidate') {
    after.status = 'off_market';
  }
  if (actionType === 'suspend_risk_candidate') {
    after.status = 'off_market';
    after.verification_state = 'pending';
  }
  if (actionType === 'resolve_moderation_case') {
    after.verification_state = 'verified';
  }
  return after;
}

function inferBatchAction(batchType, item) {
  const reason = String((item && item.reason) || '').toLowerCase();
  if (batchType === 'reconfirmation') return 'request_reconfirmation_prepare';
  if (batchType === 'moderation') {
    if (reason.indexOf('suspend') >= 0 || reason.indexOf('quarantine') >= 0) return 'resolve_moderation_case';
    return 'mark_pending_review';
  }
  if (batchType === 'risk') {
    if (reason.indexOf('high') >= 0 || reason.indexOf('critical') >= 0 || reason.indexOf('suspend') >= 0) {
      return 'suspend_risk_candidate';
    }
    return 'mark_pending_review';
  }
  return 'mark_pending_review';
}

function dateDiffDays(fromIso, toIso) {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return Math.floor((to.getTime() - from.getTime()) / 86400000);
}

function getExpectedValidityDays(operation, thresholds) {
  const op = String(operation || '').toLowerCase();
  return (op === 'long_term_rent' || op === 'room_rent')
    ? Number((thresholds && thresholds.validity_days_rent) || DEFAULT_OPS_THRESHOLDS.validity_days_rent)
    : Number((thresholds && thresholds.validity_days_sale_non_rent) || DEFAULT_OPS_THRESHOLDS.validity_days_sale_non_rent);
}

function buildLatestModerationByListing(moderationEvents) {
  const latest = {};
  (Array.isArray(moderationEvents) ? moderationEvents : [])
    .slice()
    .sort((a, b) => String((a && a.created_at) || '').localeCompare(String((b && b.created_at) || '')))
    .forEach((event) => {
      const listingId = event && event.listing_id ? String(event.listing_id) : '';
      if (!listingId) return;
      latest[listingId] = event;
    });
  return latest;
}

function buildRiskByListing(riskReportData) {
  const map = {};
  const items = riskReportData && Array.isArray(riskReportData.items) ? riskReportData.items : [];
  items.forEach((item) => {
    const listingId = item && item.listing_id ? String(item.listing_id) : '';
    if (!listingId) return;
    map[listingId] = item;
  });
  return map;
}

function inferRiskBand(riskItem) {
  if (!riskItem || typeof riskItem !== 'object') return 'low';
  const explicit = riskItem.moderation_snapshot && riskItem.moderation_snapshot.risk_band
    ? String(riskItem.moderation_snapshot.risk_band).toLowerCase()
    : '';
  if (explicit === 'critical' || explicit === 'high' || explicit === 'medium' || explicit === 'low') {
    return explicit;
  }
  const score = Number(riskItem.total_score || 0);
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

function buildOperationalWork(input) {
  const listings = Array.isArray(input.listingsData) ? input.listingsData : [];
  const suggestedActions = Array.isArray(input.suggestedActions) ? input.suggestedActions : [];
  const thresholds = input && input.opsThresholds ? input.opsThresholds : DEFAULT_OPS_THRESHOLDS;
  const latestModerationByListing = buildLatestModerationByListing(input.moderationEventsData);
  const riskByListing = buildRiskByListing(input.riskReportData);
  const now = nowIso();

  const reconSoon = [];
  const reconOverdue = [];
  const expiringSoon = [];
  const expiredCandidates = [];
  const archivedCandidates = [];
  const pendingReviewItems = [];
  const moderationPriorityItems = [];
  const riskPriorityItems = [];
  const pendingReasons = {};

  const suggestionsByListing = {};
  suggestedActions.forEach((item) => {
    const listingId = item && (item.listing_id || item.target_id) ? String(item.listing_id || item.target_id) : '';
    if (!listingId) return;
    if (!suggestionsByListing[listingId]) suggestionsByListing[listingId] = [];
    suggestionsByListing[listingId].push(item);
  });

  listings.forEach((listing) => {
    const id = listing && listing.id ? String(listing.id) : '';
    if (!id) return;
    const operation = listing.operation || null;
    const city = normalizeCity(listing && listing.city);
    const assetType = listing.asset_type || null;
    const status = String((listing && listing.status) || '').toLowerCase();
    const verification = String((listing && listing.verification_state) || '').toLowerCase();
    const publishedAt = toIsoOrNull(listing && listing.published_at);
    const expirationAt = toIsoOrNull(listing && listing.expiration_at);
    const expectedDays = getExpectedValidityDays(operation, thresholds);
    const listingSuggestions = suggestionsByListing[id] || [];

    if (publishedAt) {
      const dueAtDate = new Date(publishedAt);
      dueAtDate.setUTCDate(dueAtDate.getUTCDate() + expectedDays);
      const dueAt = dueAtDate.toISOString();
      const daysToDue = dateDiffDays(now, dueAt);
      const basePayload = {
        listing_id: id,
        city,
        operation,
        asset_type: assetType,
        published_at: publishedAt,
        reconfirm_due_at: dueAt,
        days_to_due: daysToDue,
        priority: daysToDue != null && daysToDue < 0 ? 'urgent' : 'medium',
        action_available: 'request_reconfirmation_prepare'
      };
      if (daysToDue != null && daysToDue < 0) {
        reconOverdue.push(Object.assign({}, basePayload, {
          priority_score: 92 + Math.min(7, Math.abs(daysToDue)),
          reason: 'Reconfirmación vencida',
          bucket: 'overdue'
        }));
      } else if (daysToDue != null && daysToDue <= thresholds.reconfirmation_due_soon_days) {
        reconSoon.push(Object.assign({}, basePayload, {
          priority_score: 70 + Math.max(0, (thresholds.reconfirmation_due_soon_days - daysToDue)),
          reason: 'Reconfirmación próxima',
          bucket: 'soon'
        }));
      }
    }

    if (expirationAt) {
      const daysToExpire = dateDiffDays(now, expirationAt);
      const expirationPayload = {
        listing_id: id,
        city,
        operation,
        asset_type: assetType,
        status: listing.status || null,
        expiration_at: expirationAt,
        days_to_expiration: daysToExpire
      };
      if (daysToExpire != null && daysToExpire >= 0 && daysToExpire <= thresholds.expiration_expiring_soon_days) {
        expiringSoon.push(Object.assign({}, expirationPayload, {
          priority: daysToExpire <= 2 ? 'urgent' : 'medium',
          action_available: 'mark_expiring_soon',
          priority_score: daysToExpire <= 2 ? 88 : 74,
          reason: 'Vencimiento próximo'
        }));
      }
      if (daysToExpire != null && daysToExpire < 0) {
        expiredCandidates.push(Object.assign({}, expirationPayload, {
          priority: 'urgent',
          action_available: 'archive_expired_candidate',
          priority_score: 90 + Math.min(8, Math.abs(daysToExpire)),
          reason: 'Vencido'
        }));
        if (status !== 'off_market' && status !== 'archived' && Math.abs(daysToExpire) >= thresholds.expiration_archived_candidate_days) {
          archivedCandidates.push(Object.assign({}, expirationPayload, {
            priority: 'urgent',
            action_available: 'archive_expired_candidate',
            priority_score: 96,
            reason: 'Candidato a archivado por vencimiento prolongado'
          }));
        }
      }
    }

    const moderationEvent = latestModerationByListing[id] || null;
    const moderationOutcome = moderationEvent && moderationEvent.new_outcome
      ? String(moderationEvent.new_outcome).toLowerCase()
      : null;
    const riskItem = riskByListing[id] || null;
    const riskBand = inferRiskBand(riskItem);
    const riskScore = riskItem ? Number(riskItem.total_score || 0) : 0;
    const dominantReasons = [];

    if (verification === 'in_review' || verification === 'pending') dominantReasons.push('verification_' + verification);
    if (moderationOutcome === 'pending_review' || moderationOutcome === 'quarantine' || moderationOutcome === 'suspend_candidate') {
      dominantReasons.push('moderation_' + moderationOutcome);
    }
    if (riskBand === 'high' || riskBand === 'critical' || riskScore >= 20) {
      dominantReasons.push('risk_' + riskBand);
    }
    listingSuggestions.forEach((suggestion) => {
      const type = suggestion && suggestion.action_type ? String(suggestion.action_type) : '';
      if (type) dominantReasons.push('suggested_' + type);
    });

    if (dominantReasons.length) {
      dominantReasons.forEach((reason) => {
        pendingReasons[reason] = (pendingReasons[reason] || 0) + 1;
      });
      const topSuggestion = listingSuggestions
        .slice()
        .sort((a, b) => Number((b && b.priority_score) || 0) - Number((a && a.priority_score) || 0))[0];
      const priorityScore = Math.max(
        topSuggestion ? Number(topSuggestion.priority_score || 0) : 0,
        (moderationOutcome === 'suspend_candidate' ? 97 : 0),
        (moderationOutcome === 'quarantine' ? 92 : 0),
        (riskBand === 'critical' ? 95 : 0),
        (riskBand === 'high' ? 82 : 0),
        (verification === 'in_review' ? 72 : 0)
      );
      pendingReviewItems.push({
        listing_id: id,
        city,
        operation,
        asset_type: assetType,
        verification_state: listing.verification_state || null,
        moderation_state: moderationOutcome,
        risk_band: riskBand,
        risk_score: riskScore,
        dominant_reasons: dominantReasons.slice(0, 6),
        priority_score: priorityScore,
        priority: priorityScore >= thresholds.priority_urgent_min
          ? 'urgent'
          : (priorityScore >= thresholds.priority_moderate_min ? 'medium' : 'low'),
        action_available: moderationOutcome === 'suspend_candidate'
          ? 'suspend_risk_candidate'
          : 'mark_pending_review'
      });
    }

    if (moderationOutcome === 'pending_review' || moderationOutcome === 'quarantine' || moderationOutcome === 'suspend_candidate') {
      const priorityScore = moderationOutcome === 'suspend_candidate'
        ? 98
        : (moderationOutcome === 'quarantine' ? 93 : 84);
      moderationPriorityItems.push({
        listing_id: id,
        city,
        operation,
        moderation_state: moderationOutcome,
        trigger_type: moderationEvent && moderationEvent.trigger_type ? moderationEvent.trigger_type : null,
        created_at: moderationEvent && moderationEvent.created_at ? moderationEvent.created_at : null,
        priority: moderationOutcome === 'pending_review' ? 'medium' : 'urgent',
        priority_score: priorityScore,
        review_required: true
      });
    }

    if (riskItem) {
      const signals = []
        .concat(Array.isArray(riskItem.fraud_signals) ? riskItem.fraud_signals : [])
        .concat(riskItem.duplicate_signals && Array.isArray(riskItem.duplicate_signals.own_flags) ? riskItem.duplicate_signals.own_flags : [])
        .slice(0, 8);
      const candidateSuspend = riskBand === 'critical' || riskBand === 'high' || String(riskItem.outcome || '').toLowerCase() === 'suspend_candidate';
      riskPriorityItems.push({
        listing_id: id,
        city,
        operation,
        risk_band: riskBand,
        total_score: Number(riskItem.total_score || 0),
        fraud_score: Number(riskItem.fraud_score || 0),
        outcome: riskItem.outcome || null,
        candidate_suspend: candidateSuspend,
        priority: candidateSuspend ? 'urgent' : (riskBand === 'medium' ? 'medium' : 'low'),
        priority_score: candidateSuspend ? 92 : (riskBand === 'medium' ? 72 : 55),
        top_signals: signals
      });
    }
  });

  function sortByPriority(items) {
    return items
      .slice()
      .sort((a, b) => Number((b && b.priority_score) || 0) - Number((a && a.priority_score) || 0));
  }

  const reconSoonSorted = sortByPriority(reconSoon);
  const reconOverdueSorted = sortByPriority(reconOverdue);
  const expiringSoonSorted = sortByPriority(expiringSoon);
  const expiredCandidatesSorted = sortByPriority(expiredCandidates);
  const archivedCandidatesSorted = sortByPriority(archivedCandidates);
  const pendingReviewSorted = sortByPriority(pendingReviewItems);
  const moderationPrioritySorted = sortByPriority(moderationPriorityItems);
  const riskPrioritySorted = sortByPriority(riskPriorityItems);

  const dominantReasons = Object.entries(pendingReasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([reason, count]) => ({ reason, count }));

  const pendingGrouping = {
    by_city: countBy(pendingReviewSorted, (item) => item && item.city),
    by_operation: countBy(pendingReviewSorted, (item) => item && item.operation),
    by_asset_type: countBy(pendingReviewSorted, (item) => item && item.asset_type)
  };

  const moderationProblemStates = countBy(moderationPrioritySorted, (item) => item && item.moderation_state);
  const riskByBand = countBy(riskPrioritySorted, (item) => item && item.risk_band);
  const riskTopSignals = {};
  riskPrioritySorted.forEach((item) => {
    const signals = item && Array.isArray(item.top_signals) ? item.top_signals : [];
    signals.forEach((signal) => {
      const key = String(signal || 'unknown');
      riskTopSignals[key] = (riskTopSignals[key] || 0) + 1;
    });
  });
  const riskTopSignalsArr = Object.entries(riskTopSignals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([signal, count]) => ({ signal, count }));

  const reconBatchItems = []
    .concat(reconOverdueSorted.slice(0, 12))
    .concat(reconSoonSorted.slice(0, 8))
    .slice(0, 16)
    .map((item) => ({
      listing_id: item.listing_id,
      city: item.city,
      operation: item.operation,
      priority: item.priority,
      priority_score: item.priority_score,
      action_available: item.action_available,
      bucket: item.bucket
    }));

  const todayItems = []
    .concat(reconOverdueSorted.slice(0, 8).map((item) => ({
      type: 'reconfirmation_overdue',
      listing_id: item.listing_id,
      city: item.city,
      operation: item.operation,
      priority: item.priority,
      priority_score: item.priority_score,
      reason: item.reason,
      action_available: item.action_available
    })))
    .concat(archivedCandidatesSorted.slice(0, 6).map((item) => ({
      type: 'archive_candidate',
      listing_id: item.listing_id,
      city: item.city,
      operation: item.operation,
      priority: item.priority,
      priority_score: item.priority_score,
      reason: item.reason,
      action_available: item.action_available
    })))
    .concat(pendingReviewSorted.slice(0, 8).map((item) => ({
      type: 'pending_review',
      listing_id: item.listing_id,
      city: item.city,
      operation: item.operation,
      priority: item.priority,
      priority_score: item.priority_score,
      reason: (item.dominant_reasons || []).join(','),
      action_available: item.action_available
    })))
    .concat(moderationPrioritySorted.slice(0, 6).map((item) => ({
      type: 'moderation_urgent',
      listing_id: item.listing_id,
      city: item.city,
      operation: item.operation,
      priority: item.priority,
      priority_score: item.priority_score,
      reason: item.moderation_state || 'moderation_case',
      action_available: item.moderation_state === 'suspend_candidate'
        ? 'suspend_risk_candidate'
        : 'resolve_moderation_case'
    })))
    .concat(riskPrioritySorted.slice(0, 6).map((item) => ({
      type: 'risk_priority',
      listing_id: item.listing_id,
      city: item.city,
      operation: item.operation,
      priority: item.priority,
      priority_score: item.priority_score,
      reason: item.risk_band || 'risk_case',
      action_available: item.candidate_suspend ? 'suspend_risk_candidate' : 'mark_pending_review'
    })));

  const todaySorted = sortByPriority(todayItems).slice(0, MAX_OPERATIONAL_ITEMS);
  const cityWorkloadMap = {};
  function getCityBucket(city) {
    const key = normalizeCity(city);
    if (!cityWorkloadMap[key]) {
      cityWorkloadMap[key] = {
        city: key,
        total_items: 0,
        urgent_items: 0,
        pending_review_count: 0,
        risk_priority_count: 0,
        moderation_priority_count: 0,
        reconfirmation_count: 0
      };
    }
    return cityWorkloadMap[key];
  }
  todaySorted.forEach((item) => {
    const bucket = getCityBucket(item && item.city);
    bucket.total_items += 1;
    if (item && item.priority === 'urgent') bucket.urgent_items += 1;
    const type = item && item.type ? String(item.type) : '';
    if (type.indexOf('reconfirmation') === 0) bucket.reconfirmation_count += 1;
    if (type === 'pending_review') bucket.pending_review_count += 1;
    if (type === 'risk_priority') bucket.risk_priority_count += 1;
    if (type === 'moderation_urgent') bucket.moderation_priority_count += 1;
  });
  const cityWorkloadItems = Object.values(cityWorkloadMap)
    .sort((a, b) => {
      const totalDiff = Number(b.total_items || 0) - Number(a.total_items || 0);
      if (totalDiff !== 0) return totalDiff;
      return Number(b.urgent_items || 0) - Number(a.urgent_items || 0);
    })
    .slice(0, 20);

  return {
    reconfirmation_summary: {
      due_soon_count: reconSoonSorted.length,
      overdue_count: reconOverdueSorted.length,
      total_actionable: reconSoonSorted.length + reconOverdueSorted.length,
      batch_size_suggested: reconBatchItems.length
    },
    reconfirmation_items: {
      due_soon: reconSoonSorted.slice(0, MAX_OPERATIONAL_ITEMS),
      overdue: reconOverdueSorted.slice(0, MAX_OPERATIONAL_ITEMS),
      proposed_batch: {
        batch_id: 'recon_batch_' + now.replace(/[:.]/g, '-'),
        generated_at: now,
        total_items: reconBatchItems.length,
        criteria: 'Overdue + próximas <= ' + thresholds.reconfirmation_due_soon_days + ' días, orden por prioridad.',
        items: reconBatchItems
      }
    },
    expiration_summary: {
      expiring_soon_count: expiringSoonSorted.length,
      expired_candidate_count: expiredCandidatesSorted.length,
      archived_candidate_count: archivedCandidatesSorted.length
    },
    expiration_items: {
      expiring_soon: expiringSoonSorted.slice(0, MAX_OPERATIONAL_ITEMS),
      expired_candidates: expiredCandidatesSorted.slice(0, MAX_OPERATIONAL_ITEMS),
      archived_candidates: archivedCandidatesSorted.slice(0, MAX_OPERATIONAL_ITEMS)
    },
    pending_review_summary: {
      total: pendingReviewSorted.length,
      urgent_count: pendingReviewSorted.filter((item) => item.priority === 'urgent').length,
      medium_count: pendingReviewSorted.filter((item) => item.priority === 'medium').length,
      dominant_reasons: dominantReasons
    },
    pending_review_items: pendingReviewSorted.slice(0, MAX_OPERATIONAL_ITEMS),
    pending_review_grouping: pendingGrouping,
    moderation_priority_summary: {
      total_open: moderationPrioritySorted.length,
      urgent_count: moderationPrioritySorted.filter((item) => item.priority === 'urgent').length,
      problematic_states: moderationProblemStates
    },
    moderation_priority_items: moderationPrioritySorted.slice(0, MAX_OPERATIONAL_ITEMS),
    risk_priority_summary: {
      total: riskPrioritySorted.length,
      by_band: riskByBand,
      suspend_candidate_count: riskPrioritySorted.filter((item) => !!item.candidate_suspend).length,
      top_signals: riskTopSignalsArr
    },
    risk_priority_items: riskPrioritySorted.slice(0, MAX_OPERATIONAL_ITEMS),
    workload_today: {
      generated_at: now,
      total_items: todaySorted.length,
      by_type: countBy(todaySorted, (item) => item && item.type),
      urgent_count: todaySorted.filter((item) => item.priority === 'urgent').length,
      medium_count: todaySorted.filter((item) => item.priority === 'medium').length,
      criteria: 'Reconfirmaciones, expiraciones, pending_review, moderación y riesgo priorizados sin ejecución automática.',
      items: todaySorted
    },
    workload_by_city: {
      generated_at: now,
      total_cities: cityWorkloadItems.length,
      sorted_by: 'total_items_desc_then_urgent_desc',
      items: cityWorkloadItems
    }
  };
}

function daysBetween(fromIso, toIso) {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return Math.floor((to.getTime() - from.getTime()) / 86400000);
}

function normalizeOperation(value) {
  const operation = String(value || '').toLowerCase();
  if (operation === 'long_term_rent' || operation === 'room_rent') return 'rent';
  return 'sale_or_non_rent';
}

function buildSuggestedActions(input) {
  const listings = Array.isArray(input.listingsData) ? input.listingsData : [];
  const thresholds = input && input.opsThresholds ? input.opsThresholds : DEFAULT_OPS_THRESHOLDS;
  const riskItems = input && input.riskReportData && Array.isArray(input.riskReportData.items)
    ? input.riskReportData.items
    : [];
  const moderationEvents = Array.isArray(input.moderationEventsData) ? input.moderationEventsData : [];
  const requiredListingFields = ['id', 'title', 'operation', 'asset_type', 'city', 'status', 'verification_state', 'published_at', 'expiration_at'];
  const now = nowIso();
  let counter = 0;
  const severityBase = { high: 32, medium: 20, low: 10 };

  const listingsById = {};
  listings.forEach((item) => {
    if (item && item.id) listingsById[item.id] = item;
  });

  const latestModerationByListing = {};
  moderationEvents
    .slice()
    .sort((a, b) => String((a && a.created_at) || '').localeCompare(String((b && b.created_at) || '')))
    .forEach((event) => {
      const listingId = event && event.listing_id ? String(event.listing_id) : '';
      if (!listingId) return;
      latestModerationByListing[listingId] = event;
    });

  function calcImpactScore(listing) {
    let impact = 8;
    const status = String((listing && listing.status) || '').toLowerCase();
    const operationKind = normalizeOperation(listing && listing.operation);
    const assetType = String((listing && listing.asset_type) || '').toLowerCase();
    if (status === 'published' || status === 'active') impact += 12;
    if (operationKind === 'rent') impact += 6;
    if (operationKind === 'sale_or_non_rent') impact += 8;
    if (assetType === 'singular_asset' || assetType === 'commercial_unit' || assetType === 'warehouse' || assetType === 'land') {
      impact += 4;
    } else {
      impact += 2;
    }
    if (normalizeCity(listing && listing.city) !== 'Sin ciudad') impact += 2;
    return Math.min(40, impact);
  }

  function calcPriorityMeta(params) {
    const sev = String(params.severity || 'low').toLowerCase();
    const confidence = Number(params.confidence || 0);
    const impactScore = Math.max(0, Math.min(40, Number(params.impactScore || 0)));
    const urgencyScore = Math.max(0, Math.min(40, Number(params.urgencyScore || 0)));
    const base = severityBase[sev] || severityBase.low;
    const confidencePoints = Math.max(0, Math.min(12, Math.round(confidence * 12)));
    const priorityScore = Math.max(0, Math.min(100, Math.round(base + impactScore + urgencyScore + confidencePoints)));
    return {
      severity: sev,
      impact_score: impactScore,
      urgency_score: urgencyScore,
      priority_score: priorityScore
    };
  }

  function addAction(payload) {
    counter += 1;
    const listing = payload.listing_id ? listingsById[payload.listing_id] : null;
    const priorityMeta = calcPriorityMeta({
      severity: payload.severity,
      confidence: payload.confidence,
      impactScore: payload.impact_score,
      urgencyScore: payload.urgency_score
    });
    return {
      id: 'sa_' + now.replace(/[:.]/g, '-') + '_' + String(counter).padStart(4, '0'),
      action_type: payload.action_type,
      severity: priorityMeta.severity,
      confidence: payload.confidence,
      impact_score: priorityMeta.impact_score,
      urgency_score: priorityMeta.urgency_score,
      priority_score: priorityMeta.priority_score,
      source: payload.source,
      listing_id: payload.listing_id || null,
      target_id: payload.target_id || payload.listing_id || null,
      city: normalizeCity(listing && listing.city),
      zone: normalizeZone(listing && listing.zone),
      operation: listing && listing.operation ? listing.operation : null,
      listing_status: listing && listing.status ? listing.status : null,
      verification_state: listing && listing.verification_state ? listing.verification_state : null,
      title: payload.title,
      reason: payload.reason,
      evidence: payload.evidence,
      review_required: payload.review_required !== false,
      created_at: now
    };
  }

  const actions = [];

  listings.forEach((listing) => {
    const listingId = listing && listing.id ? String(listing.id) : null;
    if (!listingId) return;
    const operationKind = normalizeOperation(listing.operation);
    const expirationIso = toIsoOrNull(listing.expiration_at);
    const publishedIso = toIsoOrNull(listing.published_at);
    const verification = String((listing && listing.verification_state) || '').toLowerCase();
    const status = String((listing && listing.status) || '').toLowerCase();

    if (expirationIso) {
      const daysToExpire = daysBetween(now, expirationIso);
      if (daysToExpire != null && daysToExpire < 0) {
        actions.push(addAction({
          action_type: 'archive_expired_candidate',
          severity: 'high',
          confidence: 0.95,
          impact_score: calcImpactScore(listing),
          urgency_score: 40,
          source: 'listings',
          listing_id: listingId,
          title: 'Candidato a archivo por caducidad',
          reason: 'Anuncio vencido según política de vigencia.',
          evidence: 'expiration_at=' + expirationIso + ' · days_to_expiration=' + String(daysToExpire)
        }));
      } else if (daysToExpire != null && daysToExpire <= thresholds.expiration_expiring_soon_days) {
        actions.push(addAction({
          action_type: 'mark_expiring_soon',
          severity: daysToExpire <= 2 ? 'high' : 'medium',
          confidence: 0.9,
          impact_score: calcImpactScore(listing),
          urgency_score: daysToExpire <= 2 ? 34 : 24,
          source: 'listings',
          listing_id: listingId,
          title: 'Anuncio próximo a caducar',
          reason: 'Vigencia próxima al límite operativo.',
          evidence: 'expiration_at=' + expirationIso + ' · days_to_expiration=' + String(daysToExpire)
        }));
      }
    }

    if (publishedIso && expirationIso) {
      const listingAgeDays = daysBetween(publishedIso, now);
      const validityDays = daysBetween(publishedIso, expirationIso);
      const expectedWindow = operationKind === 'rent'
        ? thresholds.validity_days_rent
        : thresholds.validity_days_sale_non_rent;
      if (validityDays != null && validityDays > expectedWindow + 2) {
        const validityExcess = Math.max(0, validityDays - expectedWindow);
        actions.push(addAction({
          action_type: 'request_reconfirmation',
          severity: 'medium',
          confidence: 0.82,
          impact_score: calcImpactScore(listing),
          urgency_score: Math.min(28, 12 + Math.floor(validityExcess / 4)),
          source: 'listings',
          listing_id: listingId,
          title: 'Solicitar reconfirmación de vigencia',
          reason: 'Ventana de vigencia excede política operativa esperada.',
          evidence: 'operation=' + String(listing.operation || 'n/a') +
            ' · validity_days=' + String(validityDays) + ' · expected_max=' + String(expectedWindow)
        }));
      } else if (listingAgeDays != null && listingAgeDays >= 30 && status === 'published') {
        actions.push(addAction({
          action_type: 'request_reconfirmation',
          severity: 'low',
          confidence: 0.66,
          impact_score: calcImpactScore(listing),
          urgency_score: listingAgeDays >= 60 ? 18 : 12,
          source: 'listings',
          listing_id: listingId,
          title: 'Reconfirmación periódica recomendada',
          reason: 'Anuncio activo durante más de 30 días.',
          evidence: 'published_at=' + publishedIso + ' · listing_age_days=' + String(listingAgeDays)
        }));
      }
    }

    const missingFields = requiredListingFields.filter((field) => {
      const value = listing ? listing[field] : undefined;
      return value == null || value === '';
    });
    if (verification === 'in_review' || missingFields.length) {
      const missingUrgency = Math.min(18, missingFields.length * 3);
      actions.push(addAction({
        action_type: 'review_incomplete_listing',
        severity: verification === 'in_review' ? 'medium' : 'low',
        confidence: verification === 'in_review' ? 0.87 : 0.7,
        impact_score: calcImpactScore(listing),
        urgency_score: verification === 'in_review' ? 24 : 10 + missingUrgency,
        source: 'listings',
        listing_id: listingId,
        title: 'Revisar anuncio incompleto o en revisión',
        reason: verification === 'in_review'
          ? 'El anuncio sigue en estado in_review.'
          : 'Faltan campos relevantes para operación.',
        evidence: 'verification_state=' + String(listing.verification_state || 'n/a') +
          ' · missing_fields=' + (missingFields.length ? missingFields.join(',') : 'none')
      }));
    }
  });

  riskItems.forEach((riskItem) => {
    const listingId = riskItem && riskItem.listing_id ? String(riskItem.listing_id) : null;
    if (!listingId) return;
    const fraudScore = Number((riskItem && riskItem.fraud_score) || 0);
    const totalScore = Number((riskItem && riskItem.total_score) || 0);
    const duplicateStrong = Number((riskItem && riskItem.duplicate_signals && riskItem.duplicate_signals.strong_match_count) || 0);
    const outcome = String((riskItem && riskItem.outcome) || '').toLowerCase();
    const riskBand = String((riskItem && riskItem.moderation_snapshot && riskItem.moderation_snapshot.risk_band) || '').toLowerCase();
    const listing = listingsById[listingId] || null;

    if (duplicateStrong > 0 || outcome === 'pending_review') {
      actions.push(addAction({
        action_type: 'review_duplicate_candidate',
        severity: duplicateStrong >= 2 ? 'high' : 'medium',
        confidence: duplicateStrong >= 2 ? 0.92 : 0.75,
        impact_score: calcImpactScore(listing),
        urgency_score: duplicateStrong >= 2 ? 30 : 18,
        source: 'risk_report',
        listing_id: listingId,
        title: 'Revisar posible duplicado',
        reason: 'Se detectan señales de duplicidad en el motor de riesgo.',
        evidence: 'duplicate_strong_count=' + String(duplicateStrong) +
          ' · duplicate_score=' + String(Number((riskItem && riskItem.duplicate_score) || 0))
      }));
    }

    if (fraudScore >= 20 || totalScore >= 35 || outcome === 'suspend_candidate' || riskBand === 'critical') {
      actions.push(addAction({
        action_type: 'review_risk_candidate',
        severity: 'high',
        confidence: 0.9,
        impact_score: calcImpactScore(listing),
        urgency_score: Math.min(38, 18 + Math.floor(totalScore / 2)),
        source: 'risk_report',
        listing_id: listingId,
        title: 'Candidato a revisión de riesgo alto',
        reason: 'Señales de riesgo por encima de umbral operativo.',
        evidence: 'fraud_score=' + String(fraudScore) +
          ' · total_score=' + String(totalScore) +
          ' · outcome=' + String(riskItem && riskItem.outcome || 'n/a')
      }));
    } else if (fraudScore >= 10 || totalScore >= 15) {
      actions.push(addAction({
        action_type: 'review_risk_candidate',
        severity: 'medium',
        confidence: 0.74,
        impact_score: calcImpactScore(listing),
        urgency_score: Math.min(24, 10 + Math.floor(totalScore / 3)),
        source: 'risk_report',
        listing_id: listingId,
        title: 'Revisión de riesgo recomendada',
        reason: 'Riesgo medio acumulado en señales de fraude/duplicidad.',
        evidence: 'fraud_score=' + String(fraudScore) + ' · total_score=' + String(totalScore)
      }));
    }
  });

  Object.keys(latestModerationByListing).forEach((listingId) => {
    const event = latestModerationByListing[listingId];
    const state = String((event && event.new_outcome) || '').toLowerCase();
    const listing = listingsById[listingId] || null;
    if (state === 'pending_review' || state === 'quarantine' || state === 'suspend_candidate') {
      actions.push(addAction({
        action_type: 'review_moderation_case',
        severity: state === 'suspend_candidate' ? 'high' : 'medium',
        confidence: 0.88,
        impact_score: calcImpactScore(listing),
        urgency_score: state === 'suspend_candidate' ? 36 : (state === 'quarantine' ? 30 : 24),
        source: 'moderation_events',
        listing_id: listingId,
        title: 'Caso de moderación pendiente de cierre',
        reason: 'Último estado de moderación requiere revisión humana.',
        evidence: 'new_outcome=' + String(event && event.new_outcome || 'n/a') +
          ' · trigger_type=' + String(event && event.trigger_type || 'n/a') +
          ' · created_at=' + String(event && event.created_at || 'n/a')
      }));
    }
  });

  const dedup = {};
  const unique = [];
  actions.forEach((item) => {
    const key = [item.action_type, item.listing_id || item.target_id || 'none', item.reason].join('|');
    if (dedup[key]) return;
    dedup[key] = true;
    unique.push(item);
  });

  const sorted = unique
    .sort((a, b) => {
      const priA = Number((a && a.priority_score) || 0);
      const priB = Number((b && b.priority_score) || 0);
      if (priB !== priA) return priB - priA;
      return Number((b.confidence || 0)) - Number((a.confidence || 0));
    })
    .slice(0, MAX_SUGGESTED_ACTIONS);

  const byType = countBy(sorted, (item) => item && item.action_type);
  const bySeverity = countBy(sorted, (item) => item && item.severity);
  const byCity = countBy(sorted, (item) => item && item.city);
  const byOperation = countBy(sorted, (item) => item && item.operation);
  const byPriorityBand = countBy(sorted, (item) => {
    const score = Number((item && item.priority_score) || 0);
    if (score >= thresholds.priority_urgent_min) return 'urgent';
    if (score >= thresholds.priority_moderate_min) return 'moderate';
    return 'low';
  });
  const byZone = countBy(sorted, (item) => item && item.zone);
  const topZones = Object.entries(byZone)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([zone, count]) => ({ zone, count }));

  const workload = {
    total: sorted.length,
    urgent_count: byPriorityBand.urgent || 0,
    moderate_count: byPriorityBand.moderate || 0,
    low_count: byPriorityBand.low || 0,
    by_city: byCity,
    by_operation: byOperation,
    by_type: byType,
    by_severity: bySeverity,
    top_zones: topZones
  };

  const batchCandidates = sorted.filter((item) => Number((item && item.priority_score) || 0) >= 70);
  const selectedBatchItems = (batchCandidates.length ? batchCandidates : sorted)
    .slice(0, batchCandidates.length ? 12 : 8)
    .map((item) => ({
      id: item.id,
      action_type: item.action_type,
      severity: item.severity,
      priority_score: item.priority_score,
      listing_id: item.listing_id,
      city: item.city,
      operation: item.operation,
      title: item.title
    }));
  const globalPriority = selectedBatchItems.length
    ? Math.round(selectedBatchItems.reduce((acc, item) => acc + Number(item.priority_score || 0), 0) / selectedBatchItems.length)
    : 0;
  const proposedBatch = {
    batch_id: 'pab_' + now.replace(/[:.]/g, '-'),
    generated_at: now,
    total_items: selectedBatchItems.length,
    global_priority: globalPriority,
    criteria: batchCandidates.length
      ? 'Top propuestas con priority_score >= 70, ordenadas por prioridad.'
      : 'No hay propuestas >= 70; se propone lote con las mejores disponibles.',
    items: selectedBatchItems
  };

  return {
    suggested_actions_summary: {
      total: sorted.length,
      by_type: byType,
      by_severity: bySeverity,
      by_priority_band: byPriorityBand,
      review_required_count: sorted.filter((item) => !!item.review_required).length,
      top_priority_score: sorted.length ? Number(sorted[0].priority_score || 0) : 0,
      average_priority_score: sorted.length
        ? Math.round(sorted.reduce((acc, item) => acc + Number(item.priority_score || 0), 0) / sorted.length)
        : 0
    },
    suggested_actions: sorted,
    suggested_actions_grouping: {
      by_city: byCity,
      by_operation: byOperation,
      by_type: byType,
      by_severity: bySeverity,
      by_priority_band: byPriorityBand,
      top_zones: topZones
    },
    suggested_workload: workload,
    proposed_action_batch: proposedBatch
  };
}

function buildOperationalBatches(input) {
  const now = nowIso();
  const listings = Array.isArray(input && input.listingsData) ? input.listingsData : [];
  const thresholds = input && input.opsThresholds ? input.opsThresholds : DEFAULT_OPS_THRESHOLDS;
  const batchReviews = Array.isArray(input && input.batchReviewLogData) ? input.batchReviewLogData : [];
  const batchItemReviews = Array.isArray(input && input.batchItemReviewLogData) ? input.batchItemReviewLogData : [];
  const listingById = {};
  listings.forEach((listing) => {
    if (listing && listing.id) listingById[String(listing.id)] = listing;
  });
  const recon = input && input.reconfirmationPreparedItems && Array.isArray(input.reconfirmationPreparedItems)
    ? input.reconfirmationPreparedItems
    : [];
  const moderation = input && input.moderationPriorityItems && Array.isArray(input.moderationPriorityItems)
    ? input.moderationPriorityItems
    : [];
  const risk = input && input.riskPriorityItems && Array.isArray(input.riskPriorityItems)
    ? input.riskPriorityItems
    : [];
  const pending = input && input.pendingReviewItems && Array.isArray(input.pendingReviewItems)
    ? input.pendingReviewItems
    : [];

  function priorityToScore(priority) {
    const p = String(priority || '').toLowerCase();
    if (p === 'urgent') return 90;
    if (p === 'medium' || p === 'moderate') return 70;
    return 50;
  }

  function hasValue(value) {
    return value != null && String(value).trim() !== '';
  }

  function stableBatchId(batchType, items) {
    const keys = (Array.isArray(items) ? items : []).map((item) => {
      return String((item && (item.listing_id || item.item_id)) || 'none');
    });
    const signature = keys.join('|');
    let hash = 0;
    for (let i = 0; i < signature.length; i += 1) {
      hash = ((hash << 5) - hash) + signature.charCodeAt(i);
      hash |= 0;
    }
    const token = String(Math.abs(hash));
    return 'ops_batch_' + batchType + '_' + token;
  }

  function enrichBatchItem(batchType, item, index) {
    const listingId = item && item.listing_id ? String(item.listing_id) : null;
    const listing = listingId ? listingById[listingId] : null;
    const before = summarizeListingForBatch(listing) || {
      id: listingId,
      status: null,
      verification_state: null,
      city: normalizeCity(item && item.city),
      zone: normalizeZone(item && item.zone),
      operation: item && item.operation ? item.operation : null,
      asset_type: null,
      published_at: null,
      expiration_at: null
    };
    const suggestedAction = inferBatchAction(batchType, item);
    const afterExpected = applyExpectedAfter(suggestedAction, before);
    const score = Number((item && item.priority_score) || priorityToScore(item && item.priority));
    const severity = score >= 90 ? 'high' : (score >= 70 ? 'medium' : 'low');
    const critical = {
      city_valid: before.city !== 'Sin ciudad',
      zone_valid: before.zone !== 'Sin zona',
      operation_valid: hasValue(before.operation),
      critical_fields_complete: hasValue(before.status) && hasValue(before.verification_state) && hasValue(before.operation)
    };
    return {
      item_id: item && item.id ? item.id : (batchType + '_' + String(index + 1)),
      listing_id: listingId,
      city: before.city,
      zone: before.zone,
      operation: before.operation,
      priority: item && item.priority ? item.priority : 'low',
      priority_score: Number.isFinite(score) ? score : 0,
      severity,
      suggested_action: suggestedAction,
      review_required: true,
      reason: item && item.reason ? item.reason : null,
      evidence: item && item.reason ? String(item.reason).slice(0, 220) : 'Sin evidencia adicional',
      before,
      after_expected: afterExpected,
      critical
    };
  }

  function validateBatch(batch) {
    const items = batch && Array.isArray(batch.items) ? batch.items : [];
    const total = items.length;
    if (!total) {
      return {
        batch_id: batch ? batch.batch_id : null,
        batch_type: batch ? batch.batch_type : null,
        total_items: 0,
        city_valid_pct: 0,
        zone_valid_pct: 0,
        operation_valid_pct: 0,
        critical_fields_complete_pct: 0,
        inconsistencies: ['batch_empty'],
        quality_gate_status: 'quality_blocked',
        quality_signals: ['no_data']
      };
    }
    const cityValid = items.filter((item) => item && item.critical && item.critical.city_valid).length;
    const zoneValid = items.filter((item) => item && item.critical && item.critical.zone_valid).length;
    const operationValid = items.filter((item) => item && item.critical && item.critical.operation_valid).length;
    const complete = items.filter((item) => item && item.critical && item.critical.critical_fields_complete).length;
    const cityPct = Number(((cityValid / total) * 100).toFixed(1));
    const zonePct = Number(((zoneValid / total) * 100).toFixed(1));
    const operationPct = Number(((operationValid / total) * 100).toFixed(1));
    const completePct = Number(((complete / total) * 100).toFixed(1));
    const inconsistencies = [];
    if (cityPct < thresholds.batch_quality_min_city_pct) inconsistencies.push('city_coverage_below_threshold');
    if (zonePct < 80) inconsistencies.push('zone_coverage_below_80');
    if (operationPct < thresholds.batch_quality_min_operation_pct) inconsistencies.push('operation_coverage_below_threshold');
    if (completePct < thresholds.batch_quality_min_critical_fields_pct) inconsistencies.push('critical_fields_below_threshold');
    let qualityGateStatus = 'quality_ok';
    if (
      completePct < thresholds.batch_quality_min_critical_fields_pct ||
      cityPct < thresholds.batch_quality_min_city_pct ||
      operationPct < thresholds.batch_quality_min_operation_pct
    ) {
      qualityGateStatus = 'quality_blocked';
    } else if (inconsistencies.length) {
      qualityGateStatus = 'quality_warn';
    }
    return {
      batch_id: batch.batch_id,
      batch_type: batch.batch_type,
      total_items: total,
      city_valid_pct: cityPct,
      zone_valid_pct: zonePct,
      operation_valid_pct: operationPct,
      critical_fields_complete_pct: completePct,
      inconsistencies,
      quality_gate_status: qualityGateStatus,
      quality_signals: inconsistencies.length ? ['needs_review'] : ['ok']
    };
  }

  function summarizeBatch(batchType, criteria, items) {
    const baseList = (Array.isArray(items) ? items : []).slice(0, 24);
    const list = baseList.map((item, index) => enrichBatchItem(batchType, item, index));
    const citySummary = countBy(list, (item) => item && item.city);
    const operationSummary = countBy(list, (item) => item && item.operation);
    const globalPriority = list.length
      ? Math.round(
        list.reduce((acc, item) => {
          const score = Number((item && item.priority_score) || priorityToScore(item && item.priority));
          return acc + (Number.isFinite(score) ? score : 0);
        }, 0) / list.length
      )
      : 0;
    return {
      batch_id: stableBatchId(batchType, list),
      batch_type: batchType,
      generated_at: now,
      total_items: list.length,
      global_priority: globalPriority,
      city_summary: citySummary,
      operation_summary: operationSummary,
      criteria,
      items: list
    };
  }

  function buildLatestMap(rows, keyBuilder) {
    const sorted = (Array.isArray(rows) ? rows : [])
      .slice()
      .sort((a, b) => String((a && (a.reviewed_at || a.created_at)) || '').localeCompare(String((b && (b.reviewed_at || b.created_at)) || '')));
    const out = {};
    sorted.forEach((row) => {
      const key = keyBuilder(row);
      if (!key) return;
      out[key] = row;
    });
    return out;
  }

  function computeItemReviewSummary(batch) {
    const total = batch && Array.isArray(batch.items) ? batch.items.length : 0;
    if (!total) {
      return {
        accepted_count: 0,
        rejected_count: 0,
        deferred_count: 0,
        pending_review_count: 0,
        accepted_pct: 0,
        rejected_pct: 0,
        deferred_pct: 0
      };
    }
    const latestItemByKey = buildLatestMap(batchItemReviews, (row) => {
      if (!row || row.batch_id !== batch.batch_id) return null;
      const itemId = row.item_id ? String(row.item_id) : '';
      const listingId = row.listing_id ? String(row.listing_id) : '';
      return itemId || listingId || null;
    });
    let accepted = 0;
    let rejected = 0;
    let deferred = 0;
    batch.items.forEach((item) => {
      const key = String((item && item.item_id) || (item && item.listing_id) || '');
      const review = latestItemByKey[key];
      const status = String((review && review.review_status) || '').toLowerCase();
      if (status === 'accepted') accepted += 1;
      else if (status === 'rejected') rejected += 1;
      else if (status === 'deferred') deferred += 1;
    });
    const pending = Math.max(0, total - accepted - rejected - deferred);
    return {
      accepted_count: accepted,
      rejected_count: rejected,
      deferred_count: deferred,
      pending_review_count: pending,
      accepted_pct: Number(((accepted / total) * 100).toFixed(1)),
      rejected_pct: Number(((rejected / total) * 100).toFixed(1)),
      deferred_pct: Number(((deferred / total) * 100).toFixed(1))
    };
  }

  const latestGlobalByBatch = buildLatestMap(batchReviews, (row) => row && row.batch_id ? String(row.batch_id) : null);

  const batches = [
    summarizeBatch(
      'reconfirmation',
      'Reconfirmaciones preparadas, priorizadas por antigüedad y exceso de ventana.',
      recon.map((item) => ({
        listing_id: item.listing_id,
        prepared_id: item.prepared_id,
        city: item.city,
        operation: item.operation,
        priority: item.priority,
        priority_score: priorityToScore(item.priority) + Math.min(10, Number(item.days_outside_window || 0)),
        reason: item.reason_summary,
        created_at: item.created_at
      }))
    ),
    summarizeBatch(
      'moderation',
      'Incidencias de moderación abiertas, orden por prioridad operativa.',
      moderation.map((item) => ({
        listing_id: item.listing_id,
        city: item.city,
        operation: item.operation,
        priority: item.priority,
        priority_score: item.priority_score,
        reason: item.moderation_state || 'moderation_case',
        created_at: item.created_at
      }))
    ),
    summarizeBatch(
      'risk',
      'Casos de riesgo con señales activas y candidatos a revisión humana.',
      risk.map((item) => ({
        listing_id: item.listing_id,
        city: item.city,
        operation: item.operation,
        priority: item.priority,
        priority_score: item.priority_score,
        reason: item.risk_band || 'risk_case',
        created_at: item.generated_at || null
      }))
    ),
    summarizeBatch(
      'pending',
      'Pendientes de revisión consolidados por señales dominantes.',
      pending.map((item) => ({
        listing_id: item.listing_id,
        city: item.city,
        operation: item.operation,
        priority: item.priority,
        priority_score: item.priority_score,
        reason: (item.dominant_reasons || []).join(',') || 'pending_review',
        created_at: null
      }))
    )
  ];

  const topBatch = batches
    .slice()
    .sort((a, b) => Number((b && b.global_priority) || 0) - Number((a && a.global_priority) || 0))[0] || null;
  const validations = batches.map((batch) => {
    const base = validateBatch(batch);
    const itemReview = computeItemReviewSummary(batch);
    const globalReview = latestGlobalByBatch[batch.batch_id] || null;
    const driftSignals = [];
    if (globalReview && String(globalReview.review_status || '').toLowerCase() === 'accepted') {
      if (itemReview.accepted_count <= (itemReview.rejected_count + itemReview.deferred_count)) {
        driftSignals.push('global_accepted_but_item_mix_not_majority_accepted');
      }
    }
    if (globalReview && String(globalReview.review_status || '').toLowerCase() === 'rejected') {
      if (itemReview.accepted_count > itemReview.rejected_count) {
        driftSignals.push('global_rejected_but_item_majority_accepted');
      }
    }
    return Object.assign({}, base, {
      item_review_summary: itemReview,
      global_review_latest: globalReview
        ? {
          review_id: globalReview.review_id || null,
          reviewed_at: toIsoOrNull(globalReview.reviewed_at),
          reviewed_by: globalReview.reviewed_by || null,
          review_status: globalReview.review_status || null,
          review_reason: globalReview.review_reason || null
        }
        : null,
      review_drift: {
        has_drift: driftSignals.length > 0,
        signals: driftSignals
      }
    });
  });
  const aggregateItemReview = validations.reduce((acc, validation) => {
    const summary = validation && validation.item_review_summary ? validation.item_review_summary : {};
    acc.accepted_count += Number(summary.accepted_count || 0);
    acc.rejected_count += Number(summary.rejected_count || 0);
    acc.deferred_count += Number(summary.deferred_count || 0);
    acc.pending_review_count += Number(summary.pending_review_count || 0);
    return acc;
  }, {
    accepted_count: 0,
    rejected_count: 0,
    deferred_count: 0,
    pending_review_count: 0
  });
  const aggregateTotal = aggregateItemReview.accepted_count +
    aggregateItemReview.rejected_count +
    aggregateItemReview.deferred_count +
    aggregateItemReview.pending_review_count;
  aggregateItemReview.accepted_pct = aggregateTotal > 0
    ? Number(((aggregateItemReview.accepted_count / aggregateTotal) * 100).toFixed(1))
    : 0;
  aggregateItemReview.rejected_pct = aggregateTotal > 0
    ? Number(((aggregateItemReview.rejected_count / aggregateTotal) * 100).toFixed(1))
    : 0;
  aggregateItemReview.deferred_pct = aggregateTotal > 0
    ? Number(((aggregateItemReview.deferred_count / aggregateTotal) * 100).toFixed(1))
    : 0;

  return {
    operational_batches: batches,
    operational_batch_validations: validations,
    operational_item_review_summary: aggregateItemReview,
    operational_batches_summary: {
      total_batches: batches.length,
      non_empty_batches: batches.filter((item) => item.total_items > 0).length,
      top_workload_batch: topBatch ? topBatch.batch_type : null,
      by_type: countBy(batches, (item) => item && item.batch_type)
    }
  };
}

function buildPresetCoverage(payload) {
  const items = payload && payload.workloadToday && Array.isArray(payload.workloadToday.items)
    ? payload.workloadToday.items
    : [];
  const urgentMin = Number(
    payload && payload.thresholds && Number.isFinite(payload.thresholds.priority_urgent_min)
      ? payload.thresholds.priority_urgent_min
      : DEFAULT_OPS_THRESHOLDS.priority_urgent_min
  );
  function isUrgent(item) {
    if (String((item && item.priority) || '').toLowerCase() === 'urgent') return true;
    const score = Number((item && item.priority_score) || 0);
    return score >= urgentMin;
  }
  function filterByPreset(name) {
    if (name === 'today') return items.slice();
    if (name === 'urgent') return items.filter((item) => isUrgent(item));
    if (name === 'moderation') return items.filter((item) => String((item && item.type) || '') === 'moderation_urgent');
    if (name === 'risk') return items.filter((item) => String((item && item.type) || '') === 'risk_priority');
    if (name === 'reconfirmation') {
      return items.filter((item) => {
        const type = String((item && item.type) || '');
        return type === 'reconfirmation_overdue' || type === 'archive_candidate';
      });
    }
    return [];
  }
  const presets = ['today', 'urgent', 'moderation', 'risk', 'reconfirmation'].map((name) => {
    const subset = filterByPreset(name);
    return {
      preset: name,
      case_count: subset.length,
      outside_count: Math.max(0, items.length - subset.length),
      urgent_case_count: subset.filter((item) => isUrgent(item)).length
    };
  });
  const ranked = presets
    .slice()
    .filter((item) => item.preset !== 'today')
    .sort((a, b) => Number(b.case_count || 0) - Number(a.case_count || 0));
  const maxPreset = ranked[0] || null;
  return {
    preset_coverage: {
      total_cases: items.length,
      presets,
      max_workload_preset: maxPreset ? maxPreset.preset : null
    }
  };
}

function buildLocationConsistency(listingsData) {
  const listings = Array.isArray(listingsData) ? listingsData : [];
  const total = listings.length;
  const withCity = listings.filter((item) => normalizeCity(item && item.city) !== 'Sin ciudad').length;
  const withoutCity = total - withCity;
  const withoutZone = listings.filter((item) => normalizeZone(item && item.zone) === 'Sin zona').length;
  const cityCoverage = total > 0 ? Number(((withCity / total) * 100).toFixed(1)) : 0;
  const zoneCoverage = total > 0 ? Number((((total - withoutZone) / total) * 100).toFixed(1)) : 0;
  const qualitySignals = [];
  if (cityCoverage < 95) qualitySignals.push('city_coverage_below_95');
  if (zoneCoverage < 80) qualitySignals.push('zone_coverage_below_80');
  if (!qualitySignals.length) qualitySignals.push('ok');
  return {
    location_consistency: {
      total_listings: total,
      with_valid_city: withCity,
      without_city: withoutCity,
      without_zone: withoutZone,
      city_coverage_pct: cityCoverage,
      zone_coverage_pct: zoneCoverage,
      quality_signals: qualitySignals
    }
  };
}

function buildBatchReviewSummary(entries) {
  const rows = Array.isArray(entries) ? entries : [];
  const byStatus = countBy(rows, (item) => item && item.review_status);
  const byReviewer = countBy(rows, (item) => item && item.reviewed_by);
  const recent = rows
    .slice()
    .sort((a, b) => String((b && b.reviewed_at) || '').localeCompare(String((a && a.reviewed_at) || '')))
    .slice(0, 20)
    .map((item) => ({
      review_id: item && item.review_id ? item.review_id : null,
      batch_id: item && item.batch_id ? item.batch_id : null,
      reviewed_at: toIsoOrNull(item && item.reviewed_at),
      reviewed_by: item && item.reviewed_by ? item.reviewed_by : null,
      review_status: item && item.review_status ? item.review_status : null,
      review_reason: item && item.review_reason ? item.review_reason : null,
      item_count: Number((item && item.item_count) || 0),
      notes: item && item.notes ? item.notes : null
    }));
  return {
    batch_review_summary: {
      total_reviews: rows.length,
      by_status: byStatus,
      by_reviewer: byReviewer
    },
    batch_review_recent: recent
  };
}

function buildDataHealth(payload) {
  const clawbotSources = payload && payload.sources_ok && typeof payload.sources_ok === 'object'
    ? payload.sources_ok
    : {};
  const portalSources = payload && payload.portal_sources_ok && typeof payload.portal_sources_ok === 'object'
    ? payload.portal_sources_ok
    : {};
  const listings = Array.isArray(payload.listingsData) ? payload.listingsData : [];
  const riskReport = payload && payload.riskReportData && typeof payload.riskReportData === 'object'
    ? payload.riskReportData
    : null;
  const moderationEvents = Array.isArray(payload.moderationEventsData) ? payload.moderationEventsData : [];
  const moderationReviewSnapshots = Array.isArray(payload.moderationReviewSnapshotsData) ? payload.moderationReviewSnapshotsData : [];
  const legacyExceptions = payload && payload.moderationLegacyExceptionsData &&
    Array.isArray(payload.moderationLegacyExceptionsData.accepted_sensitive_transition_exceptions)
    ? payload.moderationLegacyExceptionsData.accepted_sensitive_transition_exceptions
    : [];
  const chanyActionLog = Array.isArray(payload.chanyActionLogData) ? payload.chanyActionLogData : [];
  const chanyReconfirmationPrepared = Array.isArray(payload.chanyReconfirmationPreparedData) ? payload.chanyReconfirmationPreparedData : [];
  const chanyBatchReviewLog = Array.isArray(payload.chanyBatchReviewLogData) ? payload.chanyBatchReviewLogData : [];
  const chanyBatchItemReviewLog = Array.isArray(payload.chanyBatchItemReviewLogData) ? payload.chanyBatchItemReviewLogData : [];
  const queueJobs = payload && payload.queueData && Array.isArray(payload.queueData.jobs) ? payload.queueData.jobs : [];
  const moduleCount = payload && payload.moduleStateData && payload.moduleStateData.modules
    ? Object.keys(payload.moduleStateData.modules).length
    : 0;
  const actionsCount = Array.isArray(payload.systemActions) ? payload.systemActions.length : 0;
  const riskItems = riskReport && Array.isArray(riskReport.items) ? riskReport.items : [];

  function summarizeSourceMap(map) {
    const values = Object.values(map || {});
    const total = values.length;
    const ok = values.filter((item) => item && item.status === 'ok').length;
    const missing = values.filter((item) => item && item.status === 'missing').length;
    const error = values.filter((item) => item && item.status === 'error').length;
    return {
      total_sources: total,
      ok_sources: ok,
      missing_sources: missing,
      error_sources: error,
      ok_ratio: total > 0 ? Number((ok / total).toFixed(2)) : 0
    };
  }

  function computeMissingByField(items, requiredFields) {
    const missingByField = {};
    requiredFields.forEach((field) => {
      let missing = 0;
      items.forEach((item) => {
        const value = item ? item[field] : undefined;
        if (value == null || value === '') missing += 1;
      });
      missingByField[field] = missing;
    });
    return missingByField;
  }

  const listingsRequired = ['id', 'title', 'operation', 'asset_type', 'city', 'status', 'verification_state'];
  const riskRequired = [
    'listing_id',
    'outcome',
    'total_score',
    'duplicate_score',
    'duplicate_flags',
    'duplicate_candidates',
    'top_match',
    'duplicate_abuse_blocked',
    'fraud_score'
  ];
  const moderationRequired = ['moderation_event_id', 'listing_id', 'new_outcome', 'trigger_type', 'created_at'];

  const listingsMissing = computeMissingByField(listings, listingsRequired);
  const riskMissing = computeMissingByField(riskItems, riskRequired);
  const moderationMissing = computeMissingByField(moderationEvents, moderationRequired);

  function toIssues(source, missingMap, sampleSize) {
    return Object.keys(missingMap)
      .filter((field) => missingMap[field] > 0)
      .map((field) => ({
        source,
        field,
        missing_count: missingMap[field],
        sample_size: sampleSize
      }));
  }

  const missingRelevantFields = []
    .concat(toIssues('listings', listingsMissing, listings.length))
    .concat(toIssues('risk_report.items', riskMissing, riskItems.length))
    .concat(toIssues('moderation_events', moderationMissing, moderationEvents.length))
    .slice(0, 24);

  const schemaDrift = [
    {
      source: 'listings',
      status: listings.length ? (missingRelevantFields.some((item) => item.source === 'listings') ? 'warn' : 'ok') : 'warn',
      checked_fields: listingsRequired,
      message: listings.length
        ? 'Verificación de campos requeridos ejecutada sobre listings.'
        : 'Sin listings para verificar estructura.'
    },
    {
      source: 'risk_report.items',
      status: riskItems.length ? (missingRelevantFields.some((item) => item.source === 'risk_report.items') ? 'warn' : 'ok') : 'warn',
      checked_fields: riskRequired,
      message: riskItems.length
        ? 'Verificación de campos requeridos ejecutada sobre risk items.'
        : 'Sin risk items para verificar estructura.'
    },
    {
      source: 'moderation_events',
      status: moderationEvents.length ? (missingRelevantFields.some((item) => item.source === 'moderation_events') ? 'warn' : 'ok') : 'warn',
      checked_fields: moderationRequired,
      message: moderationEvents.length
        ? 'Verificación de campos requeridos ejecutada sobre moderation events.'
        : 'Sin moderation events para verificar estructura.'
    },
    {
      source: 'fraud_rules',
      status: 'no_verificado',
      checked_fields: [],
      message: 'Reglas cargadas en origen, consistencia semántica no verificada automáticamente.'
    }
  ];

  const suspiciousEmpty = [];
  if (!listings.length) {
    suspiciousEmpty.push({
      source: 'listings',
      metric: 'records',
      value: 0,
      status: 'warn',
      message: 'Inventario vacío.'
    });
  }
  if (!riskItems.length) {
    suspiciousEmpty.push({
      source: 'risk_report',
      metric: 'items',
      value: 0,
      status: 'warn',
      message: 'Reporte de riesgo sin items.'
    });
  }
  if (!moderationEvents.length) {
    suspiciousEmpty.push({
      source: 'moderation_events',
      metric: 'events',
      value: 0,
      status: 'warn',
      message: 'Sin eventos de moderación.'
    });
  }
  if (!actionsCount) {
    suspiciousEmpty.push({
      source: 'system_actions',
      metric: 'events',
      value: 0,
      status: 'warn',
      message: 'Sin acciones de sistema recientes.'
    });
  }

  const checks = [
    {
      id: 'clawbot_sources_ok',
      source: 'clawbot',
      status: summarizeSourceMap(clawbotSources).error_sources === 0 && summarizeSourceMap(clawbotSources).missing_sources === 0 ? 'ok' : 'error',
      message: 'Fuentes ClawBot leídas con validación básica de acceso.'
    },
    {
      id: 'portal_sources_ok',
      source: 'portal',
      status: summarizeSourceMap(portalSources).error_sources === 0 && summarizeSourceMap(portalSources).missing_sources === 0 ? 'ok' : 'error',
      message: 'Fuentes del portal leídas con validación básica de acceso.'
    },
    {
      id: 'listings_schema_required_fields',
      source: 'listings',
      status: missingRelevantFields.some((item) => item.source === 'listings') ? 'warn' : 'ok',
      message: 'Chequeo de campos requeridos de listings.'
    },
    {
      id: 'semantic_consistency',
      source: 'global',
      status: 'no_verificado',
      message: 'Consistencia semántica de negocio no verificada automáticamente.'
    }
  ];

  return {
    checked_at: nowIso(),
    clawbot: summarizeSourceMap(clawbotSources),
    portal: summarizeSourceMap(portalSources),
    source_counts: {
      queue_jobs: queueJobs.length,
      module_count: moduleCount,
      project_state_present: !!payload.projectStateData,
      system_actions_count: actionsCount,
      listings_count: listings.length,
      risk_items_count: riskItems.length,
      moderation_events_count: moderationEvents.length,
      moderation_review_snapshots_count: moderationReviewSnapshots.length,
      moderation_legacy_exceptions_count: legacyExceptions.length,
      chany_action_log_count: chanyActionLog.length,
      chany_reconfirmation_prepared_count: chanyReconfirmationPrepared.length,
      chany_batch_review_log_count: chanyBatchReviewLog.length,
      chany_batch_item_review_log_count: chanyBatchItemReviewLog.length
    },
    schema_drift: schemaDrift,
    missing_relevant_fields: missingRelevantFields,
    suspicious_empty: suspiciousEmpty,
    checks
  };
}

function writeHistorySnapshot(snapshot, historyLimit) {
  ensureDir(HISTORY_DIR);
  const historyFileName = 'ops-snapshot-' + safeTimestampForFile(snapshot.generated_at) + '.json';
  const historyPath = path.join(HISTORY_DIR, historyFileName);
  fs.writeFileSync(historyPath, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');

  const historyEntries = fs.readdirSync(HISTORY_DIR)
    .filter((name) => name.startsWith('ops-snapshot-') && name.endsWith('.json'))
    .sort();

  if (historyEntries.length <= historyLimit) {
    return {
      written: historyPath,
      retained: historyEntries.length,
      deleted: 0
    };
  }

  const toDelete = historyEntries.slice(0, historyEntries.length - historyLimit);
  toDelete.forEach((name) => {
    const filePath = path.join(HISTORY_DIR, name);
    try {
      fs.unlinkSync(filePath);
    } catch (_error) {
      /* ignore cleanup errors to avoid destructive fail */
    }
  });

  return {
    written: historyPath,
    retained: historyEntries.length - toDelete.length,
    deleted: toDelete.length
  };
}

function readSnapshotMeta(absPath, fallbackFilename) {
  try {
    const raw = fs.readFileSync(absPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      filename: fallbackFilename || path.basename(absPath),
      generated_at: parsed.generated_at || null,
      connected: !!parsed.connected,
      queue_count: Number.isFinite(parsed.queue_count) ? parsed.queue_count : 0,
      alert_count: Number.isFinite(parsed.alert_count) ? parsed.alert_count : 0,
      error_count: Number.isFinite(parsed.error_count) ? parsed.error_count : 0,
      snapshot_version: parsed.snapshot_version || null
    };
  } catch (_error) {
    return null;
  }
}

function writeHistoryIndex() {
  ensureDir(HISTORY_DIR);
  const files = fs.readdirSync(HISTORY_DIR)
    .filter((name) => name.startsWith('ops-snapshot-') && name.endsWith('.json'))
    .sort()
    .reverse();

  const entries = [];
  files.forEach((file) => {
    const fullPath = path.join(HISTORY_DIR, file);
    const meta = readSnapshotMeta(fullPath, file);
    if (meta) entries.push(meta);
  });

  const indexPayload = {
    generated_at: nowIso(),
    source: 'data/chany/history',
    count: entries.length,
    entries
  };
  fs.writeFileSync(HISTORY_INDEX_PATH, JSON.stringify(indexPayload, null, 2) + '\n', 'utf8');
  return {
    path: HISTORY_INDEX_PATH,
    count: entries.length
  };
}

function run() {
  const historyLimit = parseHistoryLimit(process.env.CHANY_SNAPSHOT_HISTORY_LIMIT);
  const snapshot = {
    snapshot_version: SNAPSHOT_VERSION,
    generated_at: nowIso(),
    generated_from: {
      script: 'scripts/sync-clawbot-readonly.js',
      sources: SOURCES,
      portal_sources: PORTAL_SOURCES
    },
    connected: false,
    sources_ok: {},
    source_count: 0,
    source_errors_count: 0,
    portal_sources_ok: {},
    portal_errors: [],
    portal_source_count: 0,
    portal_source_errors_count: 0,
    queue_summary: {},
    queue_items: [],
    module_state: null,
    project_state: null,
    recent_actions: [],
    listings_summary: null,
    pending_listings: [],
    listing_publication_summary: {
      total_requests: 0,
      success_count: 0,
      error_count: 0,
      abuse_blocked_count: 0,
      image_processed_total: 0
    },
    listing_publication_recent: [],
    moderation_summary: null,
    moderation_items: [],
    risk_summary: null,
    risk_items: [],
    reconfirmation_summary: {
      due_soon_count: 0,
      overdue_count: 0,
      total_actionable: 0,
      batch_size_suggested: 0
    },
    reconfirmation_items: {
      due_soon: [],
      overdue: [],
      proposed_batch: {
        batch_id: null,
        generated_at: null,
        total_items: 0,
        criteria: 'Sin datos',
        items: []
      }
    },
    expiration_summary: {
      expiring_soon_count: 0,
      expired_candidate_count: 0,
      archived_candidate_count: 0
    },
    expiration_items: {
      expiring_soon: [],
      expired_candidates: [],
      archived_candidates: []
    },
    content_policy_summary: {
      total: 0,
      blocked: 0,
      review: 0,
      clean: 0,
      top_reasons: []
    },
    pending_review_summary: {
      total: 0,
      urgent_count: 0,
      medium_count: 0,
      dominant_reasons: []
    },
    pending_review_items: [],
    pending_review_grouping: {
      by_city: {},
      by_operation: {},
      by_asset_type: {}
    },
    moderation_priority_summary: {
      total_open: 0,
      urgent_count: 0,
      problematic_states: {}
    },
    moderation_priority_items: [],
    risk_priority_summary: {
      total: 0,
      by_band: {},
      suspend_candidate_count: 0,
      top_signals: []
    },
    risk_priority_items: [],
    workload_by_city: {
      generated_at: null,
      total_cities: 0,
      sorted_by: 'total_items_desc_then_urgent_desc',
      items: []
    },
    operational_config: {
      source: 'default_fallback',
      ops_thresholds: DEFAULT_OPS_THRESHOLDS
    },
    workload_today: {
      generated_at: null,
      total_items: 0,
      by_type: {},
      urgent_count: 0,
      medium_count: 0,
      criteria: 'Sin datos',
      items: []
    },
    applied_actions_summary: {
      total: 0,
      by_type: {},
      by_result: {},
      by_role: {},
      by_idempotency_status: {},
      dry_run_count: 0,
      duplicated_attempts: 0,
      reconfirmation_prepared_count: 0
    },
    applied_actions_recent: [],
    reconfirmation_prepared_summary: {
      total: 0,
      by_city: {},
      by_operation: {},
      by_priority: {},
      latest_prepared_at: null
    },
    reconfirmation_prepared_items: [],
    operational_batches_summary: {
      total_batches: 0,
      non_empty_batches: 0,
      top_workload_batch: null,
      by_type: {}
    },
    operational_batches: [],
    operational_batch_validations: [],
    operational_item_review_summary: {
      accepted_count: 0,
      rejected_count: 0,
      deferred_count: 0,
      pending_review_count: 0,
      accepted_pct: 0,
      rejected_pct: 0,
      deferred_pct: 0
    },
    batch_review_summary: {
      total_reviews: 0,
      by_status: {},
      by_reviewer: {}
    },
    batch_review_recent: [],
    batch_item_review_recent: [],
      batch_preflight_summary: {
        schema_version: 1,
        generated_at: null,
        total_batches: 0,
        executable_batches: 0,
        blocked_batches: 0,
        ready_for_manual_execution_batches: 0,
        blocked_for_manual_execution_batches: 0,
        any_executable: false,
        any_ready_for_manual_execution: false
      },
    batch_preflight: [],
    batch_execution_summary: {
      total_executions: 0,
      by_status: {},
      last_execution_at: null
    },
    batch_execution_recent: [],
    batch_item_execution_recent: [],
    preset_coverage: {
      total_cases: 0,
      presets: [],
      max_workload_preset: null
    },
    location_consistency: {
      total_listings: 0,
      with_valid_city: 0,
      without_city: 0,
      without_zone: 0,
      city_coverage_pct: 0,
      zone_coverage_pct: 0,
      quality_signals: ['no_data']
    },
    data_health: null,
    suggested_actions_summary: {
      total: 0,
      by_type: {},
      by_severity: {},
      by_priority_band: {},
      review_required_count: 0,
      top_priority_score: 0,
      average_priority_score: 0
    },
    suggested_actions: [],
    suggested_actions_grouping: {
      by_city: {},
      by_operation: {},
      by_type: {},
      by_severity: {},
      by_priority_band: {},
      top_zones: []
    },
    suggested_workload: {
      total: 0,
      urgent_count: 0,
      moderate_count: 0,
      low_count: 0,
      by_city: {},
      by_operation: {},
      by_type: {},
      by_severity: {},
      top_zones: []
    },
    proposed_action_batch: {
      batch_id: null,
      generated_at: null,
      total_items: 0,
      global_priority: 0,
      criteria: 'Sin propuestas',
      items: []
    },
    queue_count: 0,
    module_count: 0,
    recent_actions_count: 0,
    alert_count: 0,
    error_count: 0,
    alerts: [],
    errors: []
  };

  const queueData = readJsonSource('queue', SOURCES.queue, snapshot);
  const moduleStateData = readJsonSource('module_state', SOURCES.module_state, snapshot);
  const projectStateData = readJsonSource('project_state', SOURCES.project_state, snapshot);
  const systemActions = readJsonlSource('system_actions', SOURCES.system_actions, snapshot);
  const listingsData = readJsonSourceTracked('listings', PORTAL_SOURCES.listings, snapshot.portal_sources_ok, snapshot.portal_errors);
  const riskReportData = readJsonSourceTracked('risk_report', PORTAL_SOURCES.risk_report, snapshot.portal_sources_ok, snapshot.portal_errors);
  const moderationEventsData = readJsonlSourceTracked('moderation_events', PORTAL_SOURCES.moderation_events, snapshot.portal_sources_ok, snapshot.portal_errors);
  const moderationReviewSnapshotsData = readJsonlSourceTracked('moderation_review_snapshots', PORTAL_SOURCES.moderation_review_snapshots, snapshot.portal_sources_ok, snapshot.portal_errors);
  const moderationLegacyExceptionsData = readJsonSourceTracked('moderation_legacy_exceptions', PORTAL_SOURCES.moderation_legacy_exceptions, snapshot.portal_sources_ok, snapshot.portal_errors);
  const publicListingUpsertLogData = readJsonlSourceTracked(
    'chany_public_listing_upsert_log',
    PORTAL_SOURCES.chany_public_listing_upsert_log,
    snapshot.portal_sources_ok,
    snapshot.portal_errors,
    { optional: true, initIfMissing: true }
  );
  const siteSettingsData = readJsonSourceTracked('site_settings', PORTAL_SOURCES.site_settings, snapshot.portal_sources_ok, snapshot.portal_errors);
  const chanyActionLogData = readJsonlSourceTracked('chany_action_log', PORTAL_SOURCES.chany_action_log, snapshot.portal_sources_ok, snapshot.portal_errors);
  const chanyReconfirmationPreparedData = readJsonlSourceTracked(
    'chany_reconfirmation_prepared',
    PORTAL_SOURCES.chany_reconfirmation_prepared,
    snapshot.portal_sources_ok,
    snapshot.portal_errors,
    { optional: true, initIfMissing: true }
  );
  const chanyBatchReviewLogData = readJsonlSourceTracked(
    'chany_batch_review_log',
    PORTAL_SOURCES.chany_batch_review_log,
    snapshot.portal_sources_ok,
    snapshot.portal_errors,
    { optional: true, initIfMissing: true }
  );
  const chanyBatchItemReviewLogData = readJsonlSourceTracked(
    'chany_batch_item_review_log',
    PORTAL_SOURCES.chany_batch_item_review_log,
    snapshot.portal_sources_ok,
    snapshot.portal_errors,
    { optional: true, initIfMissing: true }
  );
  const chanyBatchItemReviewConflictsData = readJsonlSourceTracked(
    'chany_batch_item_review_conflicts_log',
    PORTAL_SOURCES.chany_batch_item_review_conflicts_log,
    snapshot.portal_sources_ok,
    snapshot.portal_errors,
    { optional: true, initIfMissing: true }
  );
  const chanyBatchExecutionLogData = readJsonlSourceTracked(
    'chany_batch_execution_log',
    PORTAL_SOURCES.chany_batch_execution_log,
    snapshot.portal_sources_ok,
    snapshot.portal_errors,
    { optional: true, initIfMissing: true }
  );
  const opsThresholds = loadOpsThresholds(siteSettingsData);
  snapshot.operational_config = {
    source: siteSettingsData ? 'data/site-settings.json:ops_thresholds' : 'default_fallback',
    ops_thresholds: opsThresholds
  };

  snapshot.queue_summary = buildQueueSummary(queueData);
  snapshot.queue_items = buildQueueItems(queueData);
  snapshot.module_state = buildModuleState(moduleStateData);
  snapshot.project_state = buildProjectState(projectStateData);
  snapshot.recent_actions = buildRecentActions(systemActions);
  const listingsPayload = buildListingsSummary(listingsData);
  snapshot.listings_summary = listingsPayload.listings_summary;
  snapshot.pending_listings = listingsPayload.pending_listings;
  const moderationPayload = buildModerationSummary(
    moderationEventsData,
    moderationReviewSnapshotsData,
    moderationLegacyExceptionsData
  );
  snapshot.moderation_summary = moderationPayload.moderation_summary;
  snapshot.moderation_items = moderationPayload.moderation_items;
  const riskPayload = buildRiskSummary(riskReportData);
  snapshot.risk_summary = riskPayload.risk_summary;
  snapshot.risk_items = riskPayload.risk_items;
  const publicListingPayload = buildPublicListingSummary(publicListingUpsertLogData);
  snapshot.listing_publication_summary = publicListingPayload.listing_publication_summary;
  snapshot.listing_publication_recent = publicListingPayload.listing_publication_recent;
  const appliedActionsPayload = buildAppliedActionsSummary(chanyActionLogData, chanyReconfirmationPreparedData);
  snapshot.applied_actions_summary = appliedActionsPayload.applied_actions_summary;
  snapshot.applied_actions_recent = appliedActionsPayload.applied_actions_recent;
  const reconfirmationPreparedPayload = buildReconfirmationPreparedInsights(
    chanyReconfirmationPreparedData,
    listingsData,
    opsThresholds
  );
  snapshot.reconfirmation_prepared_summary = reconfirmationPreparedPayload.reconfirmation_prepared_summary;
  snapshot.reconfirmation_prepared_items = reconfirmationPreparedPayload.reconfirmation_prepared_items;
  const suggestedPayload = buildSuggestedActions({
    listingsData,
    riskReportData,
    moderationEventsData,
    opsThresholds
  });
  const operationalPayload = buildOperationalWork({
    listingsData,
    riskReportData,
    moderationEventsData,
    suggestedActions: suggestedPayload.suggested_actions,
    opsThresholds
  });
  snapshot.suggested_actions_summary = suggestedPayload.suggested_actions_summary;
  snapshot.suggested_actions = suggestedPayload.suggested_actions;
  snapshot.suggested_actions_grouping = suggestedPayload.suggested_actions_grouping;
  snapshot.suggested_workload = suggestedPayload.suggested_workload;
  snapshot.proposed_action_batch = suggestedPayload.proposed_action_batch;
  snapshot.reconfirmation_summary = operationalPayload.reconfirmation_summary;
  snapshot.reconfirmation_items = operationalPayload.reconfirmation_items;
  snapshot.expiration_summary = operationalPayload.expiration_summary;
  snapshot.expiration_items = operationalPayload.expiration_items;
  snapshot.pending_review_summary = operationalPayload.pending_review_summary;
  snapshot.pending_review_items = operationalPayload.pending_review_items;
  snapshot.pending_review_grouping = operationalPayload.pending_review_grouping;
  snapshot.moderation_priority_summary = operationalPayload.moderation_priority_summary;
  snapshot.moderation_priority_items = operationalPayload.moderation_priority_items;
  snapshot.risk_priority_summary = operationalPayload.risk_priority_summary;
  snapshot.risk_priority_items = operationalPayload.risk_priority_items;
  snapshot.workload_by_city = operationalPayload.workload_by_city;
  snapshot.workload_today = operationalPayload.workload_today;
  const batchesPayload = buildOperationalBatches({
    listingsData,
    reconfirmationPreparedItems: snapshot.reconfirmation_prepared_items,
    moderationPriorityItems: snapshot.moderation_priority_items,
    riskPriorityItems: snapshot.risk_priority_items,
    pendingReviewItems: snapshot.pending_review_items,
    opsThresholds,
    batchReviewLogData: chanyBatchReviewLogData,
    batchItemReviewLogData: chanyBatchItemReviewLogData
  });
  snapshot.operational_batches_summary = batchesPayload.operational_batches_summary;
  snapshot.operational_batches = batchesPayload.operational_batches;
  snapshot.operational_batch_validations = batchesPayload.operational_batch_validations;
  snapshot.operational_item_review_summary = batchesPayload.operational_item_review_summary;
  const batchReviewPayload = buildBatchReviewSummary(chanyBatchReviewLogData);
  snapshot.batch_review_summary = batchReviewPayload.batch_review_summary;
  snapshot.batch_review_recent = batchReviewPayload.batch_review_recent;
  snapshot.batch_item_review_recent = Array.isArray(chanyBatchItemReviewLogData)
    ? chanyBatchItemReviewLogData
      .slice()
      .sort((a, b) => String((b && b.reviewed_at) || '').localeCompare(String((a && a.reviewed_at) || '')))
      .slice(0, 40)
    : [];
  const preflightResult = batchPreflightEngine.runBatchPreflight({
    batches: snapshot.operational_batches,
    validations: snapshot.operational_batch_validations,
    batchReviews: Array.isArray(chanyBatchReviewLogData) ? chanyBatchReviewLogData : [],
    itemReviews: Array.isArray(chanyBatchItemReviewLogData) ? chanyBatchItemReviewLogData : [],
    conflicts: Array.isArray(chanyBatchItemReviewConflictsData) ? chanyBatchItemReviewConflictsData : [],
    executionLogs: Array.isArray(chanyBatchExecutionLogData) ? chanyBatchExecutionLogData : [],
    listingsData: listingsData || []
  });
  snapshot.batch_preflight_summary = preflightResult.batch_preflight_summary;
  snapshot.batch_preflight = preflightResult.batch_preflight;

  // ejecuciones de lote (lectura directa de logs, sin ejecutar nada)
  const batchExecLogPath = path.join(ROOT, 'data', 'chany', 'batch-execution-log.jsonl');
  const batchItemExecLogPath = path.join(ROOT, 'data', 'chany', 'batch-item-execution-log.jsonl');
  function readJsonlSafe(p) {
    if (!fs.existsSync(p)) return [];
    try {
      const raw = fs.readFileSync(p, 'utf8');
      if (!raw.trim()) return [];
      const out = [];
      raw.split(/\r?\n/).forEach((line) => {
        const text = line.trim();
        if (!text) return;
        try { out.push(JSON.parse(text)); } catch (_) { /* skip */ }
      });
      return out;
    } catch (_) { return []; }
  }
  const batchExecLog = readJsonlSafe(batchExecLogPath);
  const batchItemExecLog = readJsonlSafe(batchItemExecLogPath);
  const recentExecs = batchExecLog
    .slice()
    .sort((a, b) => String((b && b.started_at) || '').localeCompare(String((a && a.started_at) || '')))
    .slice(0, 20)
    .map((row) => {
      if (!row) return row;
      const { item_results: _, ...rest } = row;
      return Object.assign({}, rest, { item_count: Array.isArray(row.item_results) ? row.item_results.length : 0 });
    });
  const execByStatus = {};
  batchExecLog.forEach((e) => {
    if (!e) return;
    const s = e.result_status || 'unknown';
    execByStatus[s] = (execByStatus[s] || 0) + 1;
  });
  snapshot.batch_execution_summary = {
    total_executions: batchExecLog.length,
    by_status: execByStatus,
    last_execution_at: recentExecs.length ? (recentExecs[0].started_at || null) : null
  };
  snapshot.batch_execution_recent = recentExecs;
  snapshot.batch_item_execution_recent = batchItemExecLog
    .slice()
    .sort((a, b) => String((b && b.executed_at) || '').localeCompare(String((a && a.executed_at) || '')))
    .slice(0, 40);

  const presetCoveragePayload = buildPresetCoverage({
    workloadToday: snapshot.workload_today,
    thresholds: opsThresholds
  });
  snapshot.preset_coverage = presetCoveragePayload.preset_coverage;
  const locationConsistencyPayload = buildLocationConsistency(listingsData);
  snapshot.location_consistency = locationConsistencyPayload.location_consistency;
  snapshot.data_health = buildDataHealth({
    sources_ok: snapshot.sources_ok,
    portal_sources_ok: snapshot.portal_sources_ok,
    queueData,
    moduleStateData,
    projectStateData,
    systemActions,
    listingsData,
    riskReportData,
    moderationEventsData,
    moderationReviewSnapshotsData,
    moderationLegacyExceptionsData,
    chanyActionLogData,
    chanyReconfirmationPreparedData,
    chanyBatchReviewLogData,
    chanyBatchItemReviewLogData
  });
  (function buildContentPolicySummary() {
    const items = Array.isArray(listingsData) ? listingsData : [];
    let blocked = 0, review = 0, clean = 0;
    const reasons = {};
    items.forEach((l) => {
      const flags = l && l.content_policy_flags;
      if (!flags || !Array.isArray(flags) || flags.length === 0) { clean++; return; }
      const hasBlock = flags.some((f) => f && f.action === 'block');
      if (hasBlock) blocked++; else review++;
      flags.forEach((f) => {
        if (f && f.reason) reasons[f.reason] = (reasons[f.reason] || 0) + 1;
      });
    });
    snapshot.content_policy_summary = {
      total: items.length,
      blocked,
      review,
      clean,
      top_reasons: Object.entries(reasons)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([reason, count]) => ({ reason, count }))
    };
  })();

  snapshot.connected = Object.keys(snapshot.sources_ok).length > 0 &&
    Object.values(snapshot.sources_ok).every((source) => source.status === 'ok');
  snapshot.alerts = buildAlerts(snapshot);
  snapshot.source_count = Object.keys(snapshot.sources_ok).length;
  snapshot.source_errors_count = Object.values(snapshot.sources_ok)
    .filter((source) => source && source.status !== 'ok')
    .length;
  snapshot.portal_source_count = Object.keys(snapshot.portal_sources_ok).length;
  snapshot.portal_source_errors_count = Object.values(snapshot.portal_sources_ok)
    .filter((source) => source && source.status !== 'ok')
    .length;
  snapshot.queue_count = snapshot.queue_summary && typeof snapshot.queue_summary.total === 'number'
    ? snapshot.queue_summary.total
    : 0;
  snapshot.module_count = snapshot.module_state && snapshot.module_state.modules
    ? Object.keys(snapshot.module_state.modules).length
    : 0;
  snapshot.recent_actions_count = Array.isArray(snapshot.recent_actions) ? snapshot.recent_actions.length : 0;
  snapshot.alert_count = Array.isArray(snapshot.alerts) ? snapshot.alerts.length : 0;
  snapshot.error_count = Array.isArray(snapshot.errors) ? snapshot.errors.length : 0;

  ensureDirForFile(OUTPUT_PATH);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
  const historyResult = writeHistorySnapshot(snapshot, historyLimit);
  const historyIndex = writeHistoryIndex();

  console.log('SYNC CLAWBOT READONLY: OK');
  console.log('output=' + OUTPUT_PATH);
  console.log('history=' + historyResult.written);
  console.log('history_retained=' + historyResult.retained);
  console.log('history_deleted=' + historyResult.deleted);
  console.log('history_limit=' + historyLimit);
  console.log('history_index=' + historyIndex.path);
  console.log('history_index_count=' + historyIndex.count);
  console.log('connected=' + String(snapshot.connected));
  console.log('sources=' + JSON.stringify(snapshot.sources_ok));
  console.log('portal_sources=' + JSON.stringify(snapshot.portal_sources_ok));
  console.log('portal_errors=' + snapshot.portal_errors.length);
  console.log('alerts=' + snapshot.alerts.length);
  console.log('errors=' + snapshot.errors.length);
}

try {
  run();
} catch (error) {
  console.error('SYNC CLAWBOT READONLY: ERROR');
  console.error(error && error.message ? error.message : String(error));
  process.exit(1);
}
