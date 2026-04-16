#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LEDGER_PATH = path.join(ROOT, 'data', 'moderation-events.log.jsonl');
const RISK_REPORT_PATH = path.join(ROOT, 'data', 'risk-report.json');
const SNAPSHOT_PATH = path.join(ROOT, 'data', 'moderation-review-snapshots.log.jsonl');
const OUTPUT_PATH = path.join(ROOT, 'reports', 'moderation-risk-drift.md');

const core = require(path.join(__dirname, 'lib', 'moderation-ledger-core.js'));

function fail(message) {
  console.error('MODERATION RISK DRIFT CHECK: ERROR');
  console.error(message);
  process.exit(1);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    fail('No existe JSON requerido: ' + filePath);
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail('JSON invalido en ' + filePath + ': ' + error.message);
  }
}

function readJsonl(filePath, allowMissing) {
  if (!fs.existsSync(filePath)) {
    if (allowMissing) {
      return [];
    }
    fail('No existe JSONL requerido: ' + filePath);
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

function shouldHaveSnapshot(event) {
  const schemaVersion = core.inferSchemaVersion(event);
  const outcome = core.normalizeNullableString(event.new_outcome);
  const sensitive = core.isSensitiveTransition(core.normalizeNullableString(event.previous_outcome), outcome);

  return schemaVersion >= 2 || Boolean(event.override_transition) || sensitive || ['pending_review', 'quarantine', 'suspend_candidate'].includes(outcome);
}

function main() {
  const events = readJsonl(LEDGER_PATH, false);
  const riskReport = readJson(RISK_REPORT_PATH);
  const snapshots = readJsonl(SNAPSHOT_PATH, true);

  const riskItems = Array.isArray(riskReport.items) ? riskReport.items : [];

  const latestByListing = Object.create(null);
  events.forEach((event, index) => {
    const listingId = core.normalizeNullableString(event.listing_id);
    if (!listingId) {
      return;
    }

    const ts = Date.parse(event.created_at || '');
    const current = latestByListing[listingId];
    if (!current) {
      latestByListing[listingId] = { event, ts, line_no: index + 1 };
      return;
    }

    if (!Number.isNaN(ts) && (Number.isNaN(current.ts) || ts >= current.ts)) {
      latestByListing[listingId] = { event, ts, line_no: index + 1 };
    }
  });

  const riskByListing = Object.create(null);
  riskItems.forEach((item) => {
    if (item && item.listing_id) {
      riskByListing[item.listing_id] = item;
    }
  });

  const mismatches = [];
  Object.keys(latestByListing).forEach((listingId) => {
    const latest = latestByListing[listingId].event;
    const risk = riskByListing[listingId];
    if (!risk) {
      mismatches.push({
        listing_id: listingId,
        type: 'missing_in_risk_report',
        ledger_outcome: latest.new_outcome,
        risk_outcome: null,
        moderation_event_id: latest.moderation_event_id
      });
      return;
    }

    if (core.normalizeNullableString(latest.new_outcome) !== core.normalizeNullableString(risk.outcome)) {
      mismatches.push({
        listing_id: listingId,
        type: 'outcome_mismatch',
        ledger_outcome: latest.new_outcome,
        risk_outcome: risk.outcome,
        moderation_event_id: latest.moderation_event_id
      });
    }
  });

  const eventIdsWithSnapshot = new Set(
    snapshots
      .map((snapshot) => core.normalizeNullableString(snapshot.moderation_event_id))
      .filter(Boolean)
  );

  const eventsWithoutSnapshot = events
    .filter((event) => shouldHaveSnapshot(event))
    .filter((event) => !eventIdsWithSnapshot.has(core.normalizeNullableString(event.moderation_event_id)));

  const snapshotOrphans = snapshots
    .filter((snapshot) => {
      const eventId = core.normalizeNullableString(snapshot.moderation_event_id);
      if (!eventId) {
        return true;
      }
      return !events.some((event) => core.normalizeNullableString(event.moderation_event_id) === eventId);
    });

  const missingInLedger = riskItems
    .filter((item) => !latestByListing[item.listing_id])
    .map((item) => ({ listing_id: item.listing_id, risk_outcome: item.outcome }));

  const lines = [];
  lines.push('# Moderation vs Risk Drift Report');
  lines.push('');
  lines.push('- Generated at: ' + new Date().toISOString());
  lines.push('- Ledger events: ' + events.length);
  lines.push('- Risk report items: ' + riskItems.length);
  lines.push('- Snapshots: ' + snapshots.length);
  lines.push('- Outcome mismatches: ' + mismatches.length);
  lines.push('- Events sin snapshot (cuando aplica): ' + eventsWithoutSnapshot.length);
  lines.push('- Snapshots huérfanos: ' + snapshotOrphans.length);
  lines.push('');

  lines.push('## Incoherencias ledger vs risk-report');
  lines.push('');
  if (!mismatches.length) {
    lines.push('- No se detectan incoherencias de outcome entre ledger y risk-report.');
  } else {
    mismatches.forEach((mismatch) => {
      lines.push('- listing=`' + mismatch.listing_id + '` | type=`' + mismatch.type + '` | ledger=`' + String(mismatch.ledger_outcome) + '` | risk=`' + String(mismatch.risk_outcome) + '` | event=`' + String(mismatch.moderation_event_id) + '`');
    });
  }
  lines.push('');

  lines.push('## Eventos sin snapshot cuando ya deberían tenerlo');
  lines.push('');
  if (!eventsWithoutSnapshot.length) {
    lines.push('- No se detectan eventos sin snapshot obligatorio.');
  } else {
    eventsWithoutSnapshot.forEach((event) => {
      lines.push('- event=`' + String(event.moderation_event_id) + '` | listing=`' + String(event.listing_id) + '` | outcome=`' + String(event.new_outcome) + '`');
    });
  }
  lines.push('');

  lines.push('## Snapshots huérfanos');
  lines.push('');
  if (!snapshotOrphans.length) {
    lines.push('- No se detectan snapshots huérfanos.');
  } else {
    snapshotOrphans.forEach((snapshot) => {
      lines.push('- snapshot=`' + String(snapshot.snapshot_id || 'unknown') + '` | event=`' + String(snapshot.moderation_event_id) + '`');
    });
  }
  lines.push('');

  lines.push('## Drift documental/operativo');
  lines.push('');
  if (!missingInLedger.length) {
    lines.push('- No hay listings en risk-report sin historial en ledger.');
  } else {
    missingInLedger.forEach((entry) => {
      lines.push('- listing=`' + entry.listing_id + '` existe en risk-report pero no en ledger (risk outcome=`' + entry.risk_outcome + '`).');
    });
  }
  lines.push('');

  lines.push('## Observaciones operativas');
  lines.push('');
  if (!mismatches.length && !eventsWithoutSnapshot.length && !snapshotOrphans.length) {
    lines.push('- No se detecta drift crítico en este corte.');
  } else {
    lines.push('- Existen desviaciones entre capas de control; conviene resolver antes de push o de nuevas automatizaciones.');
  }
  lines.push('- Recomendación: regenerar snapshots tras cada evento sensible/override y sincronizar risk-report en cada lote editorial.');

  fs.writeFileSync(OUTPUT_PATH, lines.join('\n') + '\n', 'utf8');

  console.log('MODERATION RISK DRIFT CHECK: OK');
  console.log('mismatches=' + mismatches.length);
  console.log('events_without_snapshot=' + eventsWithoutSnapshot.length);
  console.log('orphan_snapshots=' + snapshotOrphans.length);
  console.log('missing_in_ledger=' + missingInLedger.length);
  console.log('output=' + OUTPUT_PATH);
}

main();
