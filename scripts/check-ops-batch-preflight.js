#!/usr/bin/env node
'use strict';

const preflightEngine = require('./ops-batch-preflight-engine.js');
const executionEngine = require('./ops-batch-execution-engine.js');

function assert(condition, code) {
  if (!condition) {
    throw new Error(code);
  }
}

function findBatch(result, batchId) {
  const list = Array.isArray(result && result.batch_preflight) ? result.batch_preflight : [];
  return list.find((item) => item && item.batch_id === batchId) || null;
}

function deriveVisualExecutionGate(pf) {
  if (!pf) return false;
  return pf.batch_ready_for_manual_execution === true &&
    String(pf.preflight_validity_status || '') === 'vigente' &&
    String(pf.dry_run_status || '') === 'valid' &&
    pf.dry_run_matches_preflight === true;
}

function runScenarioHappyPath() {
  const batchId = 'pf_batch_ok_001';
  const nowMs = Date.parse('2026-04-18T12:00:00.000Z');
  const base = preflightEngine.runBatchPreflight({
    batches: [{
      batch_id: batchId,
      batch_type: 'moderation',
      items: [{
        item_id: 'item_ok_001',
        listing_id: 'lst_ok_001',
        city: 'Madrid',
        operation: 'sale',
        suggested_action: 'mark_pending_review'
      }]
    }],
    validations: [{
      batch_id: batchId,
      quality_gate_status: 'quality_ok',
      item_review_summary: { total: 1, accepted: 1, pending: 0 },
      review_drift: { has_drift: false, signals: [] }
    }],
    batchReviews: [{
      batch_id: batchId,
      reviewed_at: '2026-04-18T09:00:00.000Z',
      review_status: 'accepted',
      review_reason: 'aprobado para ejecución manual'
    }],
    itemReviews: [{
      batch_id: batchId,
      item_id: 'item_ok_001',
      listing_id: 'lst_ok_001',
      reviewed_at: '2026-04-18T09:05:00.000Z',
      review_status: 'accepted'
    }],
    conflicts: [],
    executionLogs: [],
    listingsData: [{ id: 'lst_ok_001', status: 'published' }],
    nowMs
  });

  const basePf = findBatch(base, batchId);
  assert(!!basePf, 'scenario_happy_base_batch_missing');

  const dryRunLog = [{
    execution_id: 'exec_dry_ok_001',
    batch_id: batchId,
    dry_run: true,
    result_status: 'dry_run_ok',
    started_at: '2026-04-18T11:59:10.000Z',
    completed_at: '2026-04-18T11:59:30.000Z',
    preflight_snapshot: {
      preflight_hash: basePf.preflight_hash
    }
  }];

  const result = preflightEngine.runBatchPreflight({
    batches: [{
      batch_id: batchId,
      batch_type: 'moderation',
      items: [{
        item_id: 'item_ok_001',
        listing_id: 'lst_ok_001',
        city: 'Madrid',
        operation: 'sale',
        suggested_action: 'mark_pending_review'
      }]
    }],
    validations: [{
      batch_id: batchId,
      quality_gate_status: 'quality_ok',
      item_review_summary: { total: 1, accepted: 1, pending: 0 },
      review_drift: { has_drift: false, signals: [] }
    }],
    batchReviews: [{
      batch_id: batchId,
      reviewed_at: '2026-04-18T09:00:00.000Z',
      review_status: 'accepted',
      review_reason: 'aprobado para ejecución manual'
    }],
    itemReviews: [{
      batch_id: batchId,
      item_id: 'item_ok_001',
      listing_id: 'lst_ok_001',
      reviewed_at: '2026-04-18T09:05:00.000Z',
      review_status: 'accepted'
    }],
    conflicts: [],
    executionLogs: dryRunLog,
    listingsData: [{ id: 'lst_ok_001', status: 'published' }],
    nowMs
  });

  const pf = findBatch(result, batchId);
  assert(!!pf, 'scenario_happy_batch_missing');
  assert(pf.batch_executable === true, 'scenario_happy_expected_executable_true');
  assert(pf.batch_ready_for_manual_execution === true, 'scenario_happy_expected_ready_for_manual_execution_true');
  assert(pf.dry_run_matches_preflight === true, 'scenario_happy_expected_dry_run_match_true');
  assert(pf.blocked_items_count === 0, 'scenario_happy_expected_no_blocked_items');
  assert(deriveVisualExecutionGate(pf) === true, 'scenario_happy_visual_gate_should_be_true');
  return pf;
}

function runScenarioConflict() {
  const batchId = 'pf_batch_conflict_001';
  const result = preflightEngine.runBatchPreflight({
    batches: [{
      batch_id: batchId,
      batch_type: 'moderation',
      items: [{
        item_id: 'item_conflict_001',
        listing_id: 'lst_conflict_001',
        city: 'Valencia',
        operation: 'rent',
        suggested_action: 'mark_pending_review'
      }]
    }],
    validations: [{
      batch_id: batchId,
      quality_gate_status: 'quality_ok',
      item_review_summary: { total: 1, accepted: 1, pending: 0 },
      review_drift: { has_drift: false, signals: [] }
    }],
    batchReviews: [{
      batch_id: batchId,
      reviewed_at: '2026-04-18T10:00:00.000Z',
      review_status: 'accepted',
      review_reason: 'aprobado'
    }],
    itemReviews: [{
      batch_id: batchId,
      item_id: 'item_conflict_001',
      listing_id: 'lst_conflict_001',
      reviewed_at: '2026-04-18T10:05:00.000Z',
      review_status: 'accepted'
    }],
    conflicts: [{
      conflict_id: 'conflict_test_001',
      batch_id: batchId,
      item_id: 'item_conflict_001',
      listing_id: 'lst_conflict_001',
      conflict_at: '2026-04-18T10:06:00.000Z',
      reason: 'expected_last_review_id_mismatch'
    }],
    executionLogs: [],
    listingsData: [{ id: 'lst_conflict_001', status: 'published' }]
  });
  const pf = findBatch(result, batchId);
  assert(!!pf, 'scenario_conflict_batch_missing');
  assert(pf.batch_executable === false, 'scenario_conflict_expected_executable_false');
  assert(pf.batch_ready_for_manual_execution === false, 'scenario_conflict_expected_ready_false');
  assert(Array.isArray(pf.batch_blockers) && pf.batch_blockers.some((b) => String(b).indexOf('open_concurrency_conflicts') === 0), 'scenario_conflict_blocker_missing');
  assert(deriveVisualExecutionGate(pf) === false, 'scenario_conflict_visual_gate_should_be_false');
  return pf;
}

function runScenarioQualityBlocked() {
  const batchId = 'pf_batch_quality_blocked_001';
  const result = preflightEngine.runBatchPreflight({
    batches: [{
      batch_id: batchId,
      batch_type: 'risk',
      items: [{
        item_id: 'item_qb_001',
        listing_id: 'lst_qb_001',
        city: 'Barcelona',
        operation: 'sale',
        suggested_action: 'suspend_risk_candidate'
      }]
    }],
    validations: [{
      batch_id: batchId,
      quality_gate_status: 'quality_blocked',
      item_review_summary: { total: 1, accepted: 1, pending: 0 },
      review_drift: { has_drift: false, signals: [] }
    }],
    batchReviews: [{
      batch_id: batchId,
      reviewed_at: '2026-04-18T11:00:00.000Z',
      review_status: 'accepted',
      review_reason: 'aprobado'
    }],
    itemReviews: [{
      batch_id: batchId,
      item_id: 'item_qb_001',
      listing_id: 'lst_qb_001',
      reviewed_at: '2026-04-18T11:05:00.000Z',
      review_status: 'accepted'
    }],
    conflicts: [],
    executionLogs: [],
    listingsData: [{ id: 'lst_qb_001', status: 'published' }]
  });
  const pf = findBatch(result, batchId);
  assert(!!pf, 'scenario_quality_blocked_batch_missing');
  assert(pf.batch_executable === false, 'scenario_quality_blocked_expected_executable_false');
  assert(pf.batch_ready_for_manual_execution === false, 'scenario_quality_blocked_expected_ready_false');
  assert(Array.isArray(pf.batch_blockers) && pf.batch_blockers.some((b) => String(b).indexOf('quality_gate_not_ok') === 0), 'scenario_quality_blocked_blocker_missing');
  assert(deriveVisualExecutionGate(pf) === false, 'scenario_quality_blocked_visual_gate_should_be_false');
  return pf;
}

function runScenarioDryRunMissing() {
  const batchId = 'pf_batch_missing_dry_run_001';
  const result = preflightEngine.runBatchPreflight({
    batches: [{
      batch_id: batchId,
      batch_type: 'moderation',
      items: [{
        item_id: 'item_missing_dry_001',
        listing_id: 'lst_missing_dry_001',
        city: 'Bilbao',
        operation: 'rent',
        suggested_action: 'mark_pending_review'
      }]
    }],
    validations: [{
      batch_id: batchId,
      quality_gate_status: 'quality_ok',
      item_review_summary: { total: 1, accepted: 1, pending: 0 },
      review_drift: { has_drift: false, signals: [] }
    }],
    batchReviews: [{
      batch_id: batchId,
      reviewed_at: '2026-04-18T12:05:00.000Z',
      review_status: 'accepted',
      review_reason: 'aprobado'
    }],
    itemReviews: [{
      batch_id: batchId,
      item_id: 'item_missing_dry_001',
      listing_id: 'lst_missing_dry_001',
      reviewed_at: '2026-04-18T12:06:00.000Z',
      review_status: 'accepted'
    }],
    conflicts: [],
    executionLogs: [],
    listingsData: [{ id: 'lst_missing_dry_001', status: 'published' }],
    nowMs: Date.parse('2026-04-18T12:07:00.000Z')
  });
  const pf = findBatch(result, batchId);
  assert(!!pf, 'scenario_missing_dry_run_batch_missing');
  assert(pf.batch_ready_for_manual_execution === false, 'scenario_missing_dry_run_ready_should_be_false');
  assert(Array.isArray(pf.missing_requirements) && pf.missing_requirements.indexOf('dry_run_previo_valido') >= 0, 'scenario_missing_dry_run_missing_requirement');
  assert(deriveVisualExecutionGate(pf) === false, 'scenario_missing_dry_run_visual_gate_should_be_false');
  return pf;
}

function runScenarioPreflightExpiredContract(happyPf) {
  const nowMs = Date.parse('2026-04-18T12:10:00.000Z');
  const staleGeneratedAt = '2026-04-18T11:30:00.000Z'; // 40 min antes
  const contract = executionEngine.evaluateManualContract({
    preflight_id: happyPf.preflight_id,
    preflight_hash: happyPf.preflight_hash,
    preflight_generated_at: staleGeneratedAt
  }, happyPf, nowMs);
  assert(contract.ok === false, 'scenario_preflight_expired_contract_should_fail');
  assert(Array.isArray(contract.missing_requirements) && contract.missing_requirements.indexOf('preflight_expired') >= 0, 'scenario_preflight_expired_missing');
  return contract;
}

function main() {
  const happy = runScenarioHappyPath();
  const missingDryRun = runScenarioDryRunMissing();
  const conflict = runScenarioConflict();
  const blocked = runScenarioQualityBlocked();
  const expiredContract = runScenarioPreflightExpiredContract(happy);

  console.log('[check-ops-batch-preflight] PASS');
  console.log('- happy.batch_executable=' + String(happy.batch_executable) + ' ready_for_manual_execution=' + String(happy.batch_ready_for_manual_execution));
  console.log('- dry_run_missing.ready_for_manual_execution=' + String(missingDryRun.batch_ready_for_manual_execution) + ' missing=' + JSON.stringify(missingDryRun.missing_requirements));
  console.log('- conflict.batch_executable=' + String(conflict.batch_executable) + ' blockers=' + JSON.stringify(conflict.batch_blockers));
  console.log('- quality_blocked.batch_executable=' + String(blocked.batch_executable) + ' blockers=' + JSON.stringify(blocked.batch_blockers));
  console.log('- preflight_expired.contract_ok=' + String(expiredContract.ok) + ' missing=' + JSON.stringify(expiredContract.missing_requirements));
  console.log('- visual_gate.happy=' + String(deriveVisualExecutionGate(happy)) + ' conflict=' + String(deriveVisualExecutionGate(conflict)) + ' dry_run_missing=' + String(deriveVisualExecutionGate(missingDryRun)));
}

try {
  main();
} catch (error) {
  console.error('[check-ops-batch-preflight] FAIL:', error && error.message ? error.message : error);
  process.exit(1);
}
