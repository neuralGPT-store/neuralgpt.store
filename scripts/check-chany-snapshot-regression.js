#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_PATH = path.join(ROOT, 'data', 'chany', 'ops-snapshot.json');
const SYNC_SCRIPT_PATH = path.join(ROOT, 'scripts', 'sync-clawbot-readonly.js');

function fail(message) {
  console.error('CHANY SNAPSHOT CHECK: FAIL');
  console.error('- ' + message);
  process.exit(1);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    fail('No existe ' + filePath);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail('JSON inválido en ' + filePath + ': ' + error.message);
  }
}

function hasPath(obj, dottedPath) {
  return dottedPath.split('.').every((segment) => {
    if (!obj || typeof obj !== 'object' || !(segment in obj)) return false;
    obj = obj[segment];
    return true;
  });
}

const snapshot = readJson(SNAPSHOT_PATH);
const requiredPaths = [
  'snapshot_version',
  'operational_config',
  'operational_config.ops_thresholds',
  'workload_by_city',
  'workload_by_city.items',
  'reconfirmation_prepared_summary',
  'reconfirmation_prepared_items',
  'operational_batches_summary',
  'operational_batches',
  'operational_batch_validations',
  'operational_item_review_summary',
  'preset_coverage',
  'location_consistency',
  'batch_review_summary',
  'batch_review_recent',
  'batch_item_review_recent',
  'batch_preflight_summary',
  'batch_preflight',
  'suggested_actions',
  'suggested_actions_summary',
  'reconfirmation_summary',
  'expiration_summary',
  'workload_today',
  'data_health'
];

requiredPaths.forEach((dottedPath) => {
  if (!hasPath(snapshot, dottedPath)) {
    fail('Falta bloque requerido en snapshot: ' + dottedPath);
  }
});

if (!Array.isArray(snapshot.suggested_actions)) {
  fail('suggested_actions debe ser array');
}
if (!Array.isArray(snapshot.workload_by_city.items)) {
  fail('workload_by_city.items debe ser array');
}
if (!Array.isArray(snapshot.reconfirmation_prepared_items)) {
  fail('reconfirmation_prepared_items debe ser array');
}
if (!Array.isArray(snapshot.operational_batches)) {
  fail('operational_batches debe ser array');
}
if (!Array.isArray(snapshot.operational_batch_validations)) {
  fail('operational_batch_validations debe ser array');
}
if (!snapshot.operational_item_review_summary || typeof snapshot.operational_item_review_summary !== 'object') {
  fail('operational_item_review_summary debe existir');
}
if (!snapshot.preset_coverage || !Array.isArray(snapshot.preset_coverage.presets)) {
  fail('preset_coverage.presets debe ser array');
}
if (!Array.isArray(snapshot.batch_review_recent)) {
  fail('batch_review_recent debe ser array');
}
if (!Array.isArray(snapshot.batch_item_review_recent)) {
  fail('batch_item_review_recent debe ser array');
}
if (!snapshot.batch_preflight_summary || typeof snapshot.batch_preflight_summary !== 'object') {
  fail('batch_preflight_summary debe existir');
}
if (!Array.isArray(snapshot.batch_preflight)) {
  fail('batch_preflight debe ser array');
}
if (Array.isArray(snapshot.operational_batch_validations) && snapshot.operational_batch_validations.length) {
  const sampleValidation = snapshot.operational_batch_validations[0];
  ['quality_gate_status', 'item_review_summary', 'review_drift'].forEach((field) => {
    if (!(field in sampleValidation)) {
      fail('operational_batch_validations[0] sin campo requerido: ' + field);
    }
  });
}
if (Array.isArray(snapshot.batch_preflight) && snapshot.batch_preflight.length) {
  const samplePreflight = snapshot.batch_preflight[0];
  [
    'preflight_id',
    'preflight_generated_at',
    'preflight_hash',
    'preflight_ttl_seconds',
    'preflight_validity_status',
    'dry_run_required',
    'dry_run_status',
    'batch_ready_for_manual_execution',
    'readiness_checklist',
    'missing_requirements'
  ].forEach((field) => {
    if (!(field in samplePreflight)) {
      fail('batch_preflight[0] sin campo requerido: ' + field);
    }
  });
}

if (!fs.existsSync(SYNC_SCRIPT_PATH)) {
  fail('No existe ' + SYNC_SCRIPT_PATH);
}
const syncSource = fs.readFileSync(SYNC_SCRIPT_PATH, 'utf8');
const forbiddenPatterns = [
  { label: 'RECONFIRMATION_SOON_DAYS legacy', pattern: /RECONFIRMATION_SOON_DAYS/ },
  { label: 'EXPIRING_SOON_DAYS legacy', pattern: /EXPIRING_SOON_DAYS/ },
  { label: 'ARCHIVE_CANDIDATE_DAYS legacy', pattern: /ARCHIVE_CANDIDATE_DAYS/ },
  { label: 'ternario rígido 60\/90', pattern: /\?\s*60\s*:\s*90/ },
  { label: 'umbral rígido <= 7', pattern: /daysToExpire\s*!=\s*null\s*&&\s*daysToExpire\s*<=\s*7/ }
];

forbiddenPatterns.forEach((entry) => {
  if (entry.pattern.test(syncSource)) {
    fail('Hardcode operativo detectado: ' + entry.label);
  }
});

console.log('CHANY SNAPSHOT CHECK: OK');
console.log('- snapshot=' + SNAPSHOT_PATH);
console.log('- checks=' + requiredPaths.length);
console.log('- hardcode_scan=clean');
