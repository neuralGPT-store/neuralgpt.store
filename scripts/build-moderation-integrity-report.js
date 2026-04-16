#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LEDGER_PATH = path.join(ROOT, 'data', 'moderation-events.log.jsonl');
const OUTPUT_PATH = path.join(ROOT, 'reports', 'moderation-integrity.md');

const { analyzeLedger } = require(path.join(__dirname, 'validate-moderation-ledger.js'));

function formatViolation(violation) {
  return '- line=' + String(violation.line_no) + ' | code=`' + violation.code + '` | ' + violation.message;
}

function buildMarkdown(result) {
  const lines = [];
  lines.push('# Moderation Ledger Integrity Report');
  lines.push('');
  lines.push('- Generated at: ' + new Date().toISOString());
  lines.push('- Ledger: `data/moderation-events.log.jsonl`');
  lines.push('- Health: **' + (result.integrity_ok ? 'OK' : 'FAIL') + '**');
  lines.push('- total_events: **' + result.total_events + '**');
  lines.push('- valid_events: **' + result.valid_events + '**');
  lines.push('- violations_count: **' + result.violations_count + '**');
  lines.push('- warnings_count: **' + (result.warnings_count || 0) + '**');
  lines.push('');

  lines.push('## Salud global del ledger');
  lines.push('');
  lines.push('- integrity_ok: `' + String(result.integrity_ok) + '`');
  lines.push('- integrity_fail: `' + String(result.integrity_fail) + '`');
  lines.push('- chain_tail_hash: `' + String(result.chain_tail_hash || 'null') + '`');
  lines.push('');

  lines.push('## Ultimos hashes');
  lines.push('');
  if (!result.latest_hashes.length) {
    lines.push('- Sin eventos en ledger.');
  } else {
    result.latest_hashes.forEach((entry) => {
      lines.push('- line=' + entry.line_no + ' | event=`' + (entry.moderation_event_id || 'unknown') + '` | hash=`' + entry.effective_hash + '`');
    });
  }
  lines.push('');

  lines.push('## Violaciones detectadas');
  lines.push('');
  if (!result.violations.length) {
    lines.push('- No se detectaron violaciones de integridad ni contrato.');
  } else {
    result.violations.forEach((violation) => lines.push(formatViolation(violation)));
  }
  lines.push('');

  lines.push('## Warnings de compatibilidad');
  lines.push('');
  if (!result.warnings || !result.warnings.length) {
    lines.push('- No se detectaron warnings de compatibilidad.');
  } else {
    result.warnings.forEach((warning) => lines.push(formatViolation(warning)));
  }
  lines.push('');

  lines.push('## Transiciones inválidas detectadas');
  lines.push('');
  const transitionViolations = result.violations.filter((violation) => violation.code === 'invalid_transition');
  if (!transitionViolations.length) {
    lines.push('- No se detectaron transiciones inválidas.');
  } else {
    transitionViolations.forEach((violation) => lines.push(formatViolation(violation)));
  }
  lines.push('');

  lines.push('## Observaciones operativas');
  lines.push('');
  if (result.integrity_ok) {
    lines.push('- La cadena de integridad está consistente para eventos v2 y mantiene compatibilidad con eventos legacy v1.');
    lines.push('- Recomendación: emitir nuevos eventos siempre en `schema_version=2` para trazabilidad fuerte.');
  } else {
    lines.push('- Existen violaciones que requieren corrección antes de continuar ingesta editorial.');
    lines.push('- Recomendación: congelar nuevos append hasta resolver inconsistencias de hash/transition.');
  }

  return lines.join('\n') + '\n';
}

function main() {
  const result = analyzeLedger(LEDGER_PATH);
  const markdown = buildMarkdown(result);

  fs.writeFileSync(OUTPUT_PATH, markdown, 'utf8');

  console.log('MODERATION INTEGRITY REPORT BUILD: OK');
  console.log('ledger=' + LEDGER_PATH);
  console.log('output=' + OUTPUT_PATH);
  console.log('health=' + (result.integrity_ok ? 'OK' : 'FAIL'));
  console.log('total_events=' + result.total_events);
  console.log('violations_count=' + result.violations_count);

  if (!result.integrity_ok) {
    process.exit(1);
  }
}

main();
