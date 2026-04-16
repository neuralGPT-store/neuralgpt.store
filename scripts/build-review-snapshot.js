#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LEDGER_PATH = path.join(ROOT, 'data', 'moderation-events.log.jsonl');
const RISK_REPORT_PATH = path.join(ROOT, 'data', 'risk-report.json');
const SNAPSHOT_LOG_PATH = path.join(ROOT, 'data', 'moderation-review-snapshots.log.jsonl');
const SNAPSHOT_SCHEMA_VERSION = 1;

const core = require(path.join(__dirname, 'lib', 'moderation-ledger-core.js'));

function fail(message) {
  console.error('BUILD REVIEW SNAPSHOT: ERROR');
  console.error(message);
  process.exit(1);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    fail('No existe archivo requerido: ' + filePath);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail('JSON invalido en ' + filePath + ': ' + error.message);
  }
}

function readJsonl(filePath, allowMissing) {
  if (!fs.existsSync(filePath)) {
    return allowMissing ? [] : fail('No existe JSONL requerido: ' + filePath);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw.trim()) {
    return [];
  }

  try {
    return core.parseJsonl(raw).map((row) => row.parsed);
  } catch (error) {
    fail('JSONL invalido en ' + filePath + ': ' + error.message);
  }
}

function buildRiskIndex(riskReport) {
  const index = Object.create(null);
  const items = Array.isArray(riskReport.items) ? riskReport.items : [];

  items.forEach((item) => {
    if (!item || !item.listing_id) {
      return;
    }
    index[item.listing_id] = item;
  });

  return index;
}

function buildSnapshot(event, riskItem) {
  const payload = {
    schema_version: SNAPSHOT_SCHEMA_VERSION,
    snapshot_id: 'snap_' + String(event.moderation_event_id),
    moderation_event_id: event.moderation_event_id,
    listing_id: event.listing_id,
    slug: event.slug,
    risk_report_excerpt: {
      total_score: riskItem ? riskItem.total_score : null,
      duplicate_score: riskItem ? riskItem.duplicate_score : null,
      fraud_score: riskItem ? riskItem.fraud_score : null,
      outcome: riskItem ? riskItem.outcome : null,
      summary: riskItem ? riskItem.summary : null,
      generated_at: riskItem ? riskItem.generated_at : null,
      engine_version: riskItem ? riskItem.engine_version : null
    },
    duplicate_signals: riskItem && riskItem.duplicate_signals
      ? {
        own_flags: Array.isArray(riskItem.duplicate_signals.own_flags) ? riskItem.duplicate_signals.own_flags : [],
        peer_signal_codes: Array.isArray(riskItem.duplicate_signals.peer_signal_codes) ? riskItem.duplicate_signals.peer_signal_codes : [],
        strong_match_count: riskItem.duplicate_signals.strong_match_count || 0,
        top_peer_id: riskItem.duplicate_signals.top_peer_id || null,
        top_peer_score: riskItem.duplicate_signals.top_peer_score || 0
      }
      : {
        own_flags: [],
        peer_signal_codes: [],
        strong_match_count: 0,
        top_peer_id: null,
        top_peer_score: 0
      },
    fraud_signals: riskItem && Array.isArray(riskItem.fraud_signals) ? riskItem.fraud_signals : [],
    outcome_at_snapshot: event.new_outcome || null,
    review_priority: riskItem ? (riskItem.review_priority || null) : null,
    notes: 'Auto snapshot generated from moderation ledger and risk-report context.',
    created_at: new Date().toISOString()
  };

  payload.snapshot_hash = core.computeStableHash(payload);
  return payload;
}

function appendSnapshots(filePath, snapshots) {
  if (!snapshots.length) {
    return;
  }

  const lines = snapshots.map((snapshot) => JSON.stringify(snapshot)).join('\n') + '\n';
  fs.appendFileSync(filePath, lines, { encoding: 'utf8', flag: 'a' });
}

function main() {
  const ledgerEvents = readJsonl(LEDGER_PATH, false);
  const riskReport = readJson(RISK_REPORT_PATH);
  const existingSnapshots = readJsonl(SNAPSHOT_LOG_PATH, true);

  if (!fs.existsSync(SNAPSHOT_LOG_PATH)) {
    fs.writeFileSync(SNAPSHOT_LOG_PATH, '', 'utf8');
  }

  const riskByListing = buildRiskIndex(riskReport);
  const snapshotByEvent = new Set(
    existingSnapshots
      .map((snapshot) => core.normalizeNullableString(snapshot.moderation_event_id))
      .filter(Boolean)
  );

  const pendingEvents = ledgerEvents.filter((event) => {
    const eventId = core.normalizeNullableString(event.moderation_event_id);
    return eventId && !snapshotByEvent.has(eventId);
  });

  const snapshotsToAppend = pendingEvents.map((event) => {
    const riskItem = riskByListing[event.listing_id] || null;
    return buildSnapshot(event, riskItem);
  });

  appendSnapshots(SNAPSHOT_LOG_PATH, snapshotsToAppend);

  console.log('BUILD REVIEW SNAPSHOT: OK');
  console.log('ledger_events=' + ledgerEvents.length);
  console.log('existing_snapshots=' + existingSnapshots.length);
  console.log('appended_snapshots=' + snapshotsToAppend.length);
  console.log('snapshot_log=' + SNAPSHOT_LOG_PATH);
}

main();
