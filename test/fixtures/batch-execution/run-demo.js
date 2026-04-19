#!/usr/bin/env node
'use strict';

/**
 * Demostración aislada Fase 4C — happy path completo.
 * root apunta a este directorio fixture, NUNCA a data/ de producción.
 *
 * Ejecutar: node test/fixtures/batch-execution/run-demo.js
 */

const path = require('path');
const fs = require('fs');

const FIXTURE_ROOT = __dirname;
const PROD_LISTINGS = path.join(__dirname, '../../../data/listings.json');

const executionEngine = require(path.join(__dirname, '../../../scripts/ops-batch-execution-engine.js'));
const preflightEngine = require(path.join(__dirname, '../../../scripts/ops-batch-preflight-engine.js'));

// captura mtime de listings.json operativo antes de cualquier operación
const prodStat = fs.existsSync(PROD_LISTINGS) ? fs.statSync(PROD_LISTINGS).mtimeMs : null;

function readJsonlFile(p) {
  if (!fs.existsSync(p)) return [];
  const raw = fs.readFileSync(p, 'utf8');
  if (!raw.trim()) return [];
  const out = [];
  raw.split(/\r?\n/).forEach((line) => {
    const t = line.trim();
    if (t) { try { out.push(JSON.parse(t)); } catch (_) {} }
  });
  return out;
}

function section(label) {
  console.log('\n' + '═'.repeat(62));
  console.log('  ' + label);
  console.log('═'.repeat(62));
}

function pretty(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

const snap = JSON.parse(fs.readFileSync(path.join(FIXTURE_ROOT, 'data/chany/ops-snapshot.json'), 'utf8'));
const batchReviews = readJsonlFile(path.join(FIXTURE_ROOT, 'data/chany/batch-review-log.jsonl'));
const itemReviews = readJsonlFile(path.join(FIXTURE_ROOT, 'data/chany/batch-item-review-log.jsonl'));
const listingsData = JSON.parse(fs.readFileSync(path.join(FIXTURE_ROOT, 'data/listings.json'), 'utf8'));

// ── PASO 1: PREFLIGHT ─────────────────────────────────────────────
section('PASO 1 — Preflight (batch_executable debe ser true)');

const pfResult = preflightEngine.runBatchPreflight({
  batches: snap.operational_batches,
  validations: snap.operational_batch_validations,
  batchReviews,
  itemReviews,
  listingsData
});

const batchPf = pfResult.batch_preflight && pfResult.batch_preflight[0];
console.log('batch_preflight_summary:', JSON.stringify(pfResult.batch_preflight_summary, null, 2));
console.log('batch_executable:', batchPf && batchPf.batch_executable);
console.log('batch_blockers:', batchPf && batchPf.batch_blockers);
console.log('items_ready / items_total:', batchPf && batchPf.items_ready, '/', batchPf && batchPf.items_total);

if (!batchPf || !batchPf.batch_executable) {
  console.error('\n[ERROR] Preflight bloqueado — abortando demo.');
  process.exit(1);
}

const CTX = { actor: 'ops_admin_fixture', role: 'admin' };
const BATCH_ID = 'test_batch_exec_4c_001';
const EXEC_ID_DRY = 'exec4c_demo_dry01';  // dry-run usa un ID propio
const EXEC_ID = 'exec4c_demo_001';         // real execution
const REASON = 'Demo aislada Fase 4C — happy path completo.';
const PF_REF = {
  preflight_id: batchPf && batchPf.preflight_id,
  preflight_hash: batchPf && batchPf.preflight_hash,
  preflight_generated_at: batchPf && batchPf.preflight_generated_at
};

// ── PASO 2: DRY-RUN ──────────────────────────────────────────────
section('PASO 2 — Dry-run (no muta listings, no persiste ejecución)');

const dryResult = executionEngine.executeBatch(
  {
    execution_id: EXEC_ID_DRY,
    batch_id: BATCH_ID,
    reason: REASON,
    dry_run: true,
    preflight_id: PF_REF.preflight_id,
    preflight_hash: PF_REF.preflight_hash,
    preflight_generated_at: PF_REF.preflight_generated_at
  },
  { root: FIXTURE_ROOT, ...CTX }
);
const dryExec = dryResult.execution;
console.log('result_status:', dryExec && dryExec.result_status);
console.log('dry_run:', dryExec && dryExec.dry_run);
console.log('items:', dryExec && dryExec.item_results && dryExec.item_results.map((i) => ({
  item_id: i.item_id, result: i.result, listing_id: i.listing_id
})));

// ── PASO 3: EJECUCIÓN REAL ───────────────────────────────────────
section('PASO 3 — Ejecución real (result_status: completed)');

const execResult = executionEngine.executeBatch(
  {
    execution_id: EXEC_ID,
    batch_id: BATCH_ID,
    reason: REASON,
    confirmed: true,
    preflight_id: PF_REF.preflight_id,
    preflight_hash: PF_REF.preflight_hash,
    preflight_generated_at: PF_REF.preflight_generated_at
  },
  { root: FIXTURE_ROOT, ...CTX }
);
const realExec = execResult.execution;
console.log('result_status:', realExec && realExec.result_status);
console.log('executed_items:', realExec && realExec.executed_items);
console.log('skipped_items:', realExec && realExec.skipped_items);
console.log('item_results:');
((realExec && realExec.item_results) || []).forEach((i) => {
  console.log(`  [${i.item_id}] result=${i.result}  listing_id=${i.listing_id}  before.verification_state=${i.before && i.before.verification_state}  after.verification_state=${i.after && i.after.verification_state}`);
});

// ── PASO 4: IDEMPOTENCIA ─────────────────────────────────────────
section('PASO 4 — Idempotencia (mismo execution_id → idempotent: true)');

const idempotentResult = executionEngine.executeBatch(
  {
    execution_id: EXEC_ID,
    batch_id: BATCH_ID,
    reason: REASON,
    confirmed: true,
    preflight_id: PF_REF.preflight_id,
    preflight_hash: PF_REF.preflight_hash,
    preflight_generated_at: PF_REF.preflight_generated_at
  },
  { root: FIXTURE_ROOT, ...CTX }
);
console.log('ok:', idempotentResult.ok);
console.log('idempotent:', idempotentResult.idempotent);
console.log('already_executed:', idempotentResult.already_executed);
console.log('(ninguna acción adicional ejecutada)');

// ── PASO 5: VERIFICACIÓN DE PRODUCCIÓN ───────────────────────────
section('PASO 5 — Verificación: data/listings.json operativo NO fue modificado');

if (!fs.existsSync(PROD_LISTINGS)) {
  console.log('data/listings.json operativo no existe en disco — sin riesgo.');
} else {
  const prodStatAfter = fs.statSync(PROD_LISTINGS).mtimeMs;
  if (prodStat === prodStatAfter) {
    console.log('[OK] mtime de data/listings.json no cambió:', new Date(prodStat).toISOString());
  } else {
    console.error('[FAIL] mtime cambió — algo mutó producción!');
    process.exit(1);
  }
}

// ── RESUMEN FINAL ─────────────────────────────────────────────────
section('RESUMEN — Fase 4C Demostración Completa');
console.log('Fixture root  :', FIXTURE_ROOT);
console.log('Preflight     : batch_executable=true, 0 blockers');
console.log('Dry-run       : result_status=' + (dryExec && dryExec.result_status));
console.log('Ejecución real: result_status=' + (realExec && realExec.result_status) + ', executed_items=' + (realExec && realExec.executed_items));
console.log('Idempotencia  : idempotent=' + idempotentResult.idempotent + ', already_executed=' + idempotentResult.already_executed);
console.log('Producción    : listings.json operativo INTACTO ✓');
console.log('\nPhase 4C — happy path completo. Listo para cierre.');
