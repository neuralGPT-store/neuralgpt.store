#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LEDGER_PATH = path.join(ROOT, 'data', 'moderation-events.log.jsonl');
const SCHEMA_VERSION = 2;

const core = require(path.join(__dirname, 'lib', 'moderation-ledger-core.js'));

function fail(message) {
  console.error('APPEND MODERATION EVENT: ERROR');
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];
    if (typeof next === 'undefined' || next.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    i += 1;
  }
  return args;
}

function parseJsonPayload(args) {
  if (typeof args.json === 'string') {
    try {
      return JSON.parse(args.json);
    } catch (error) {
      fail('`--json` no contiene JSON valido: ' + error.message);
    }
  }

  if (typeof args['json-file'] === 'string') {
    const payloadPath = path.resolve(process.cwd(), args['json-file']);
    if (!fs.existsSync(payloadPath)) {
      fail('No existe --json-file: ' + payloadPath);
    }
    try {
      return JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
    } catch (error) {
      fail('`--json-file` invalido: ' + error.message);
    }
  }

  return null;
}

function fromCliArgs(args) {
  if (args.help || args.h) {
    console.log('Uso:');
    console.log('  node scripts/append-moderation-event.js --json "{...}"');
    console.log('  node scripts/append-moderation-event.js --json-file ./event.json');
    console.log('  node scripts/append-moderation-event.js --moderation_event_id evt_... --listing_id ... --slug ... --actor_type ops --actor_id ops_01 --previous_outcome allow --new_outcome pending_review --trigger_type manual_review --trigger_signals signal_a,signal_b --notes "..." --created_at 2026-04-16T18:00:00.000Z [--override-transition --override_reason_code evidence_verified --override_justification "..."]');
    process.exit(0);
  }

  const payload = parseJsonPayload(args);
  if (payload) {
    return payload;
  }

  if (!args.moderation_event_id && !args.listing_id) {
    fail('Faltan argumentos. Usa --json/--json-file o flags individuales.');
  }

  let triggerSignals = [];
  if (typeof args.trigger_signals === 'string') {
    triggerSignals = args.trigger_signals
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  return {
    moderation_event_id: args.moderation_event_id,
    listing_id: args.listing_id,
    slug: args.slug,
    actor_type: args.actor_type,
    actor_id: args.actor_id === 'null' ? null : args.actor_id,
    previous_outcome: args.previous_outcome === 'null' ? null : args.previous_outcome,
    new_outcome: args.new_outcome,
    trigger_type: args.trigger_type,
    trigger_signals: triggerSignals,
    notes: args.notes === 'null' ? null : args.notes,
    created_at: args.created_at,
    override_transition: Boolean(args['override-transition']),
    override_reason_code: args.override_reason_code,
    override_justification: args.override_justification
  };
}

function readLedgerRows() {
  if (!fs.existsSync(LEDGER_PATH)) {
    return [];
  }

  const raw = fs.readFileSync(LEDGER_PATH, 'utf8');
  if (!raw.trim()) {
    return [];
  }

  try {
    return core.parseJsonl(raw);
  } catch (error) {
    fail('Ledger corrupto: ' + error.message);
  }
}

function getLedgerTailInfo(rows) {
  let previousHash = null;
  const knownIds = new Set();

  rows.forEach((row) => {
    const event = row.parsed;
    const eventId = core.normalizeNullableString(event.moderation_event_id);

    if (eventId && knownIds.has(eventId)) {
      fail('Ledger con IDs duplicados; no se puede append de forma segura. ID=' + eventId);
    }
    if (eventId) {
      knownIds.add(eventId);
    }

    const schemaVersion = core.inferSchemaVersion(event);
    const derivedHash = core.computeEventHash(event, schemaVersion);

    if (schemaVersion >= 2) {
      const storedPrev = core.normalizeNullableString(event.prev_hash);
      const storedHash = core.normalizeNullableString(event.event_hash);
      if (!storedPrev || !storedHash) {
        fail('Ledger v2 invalido en linea ' + row.line_no + ': faltan prev_hash/event_hash.');
      }
      if (storedPrev !== previousHash) {
        fail('Ledger v2 invalido en linea ' + row.line_no + ': prev_hash no encadena con evento anterior.');
      }
      if (storedHash !== derivedHash) {
        fail('Ledger v2 invalido en linea ' + row.line_no + ': event_hash no coincide con hash derivado.');
      }
      previousHash = storedHash;
      return;
    }

    // Legacy v1: no exige hashes persistidos; se encadena con hash derivado para compatibilidad.
    previousHash = derivedHash;
  });

  return {
    previousHash,
    knownIds
  };
}

function getLatestOutcomeByListing(rows) {
  const latest = Object.create(null);

  rows.forEach((row) => {
    const event = row.parsed;
    const listingId = core.normalizeNullableString(event.listing_id);
    if (!listingId) {
      return;
    }

    const timestamp = Date.parse(event.created_at || '');
    const current = latest[listingId];
    if (!current) {
      latest[listingId] = {
        created_at: event.created_at || null,
        timestamp,
        line_no: row.line_no,
        outcome: core.normalizeNullableString(event.new_outcome)
      };
      return;
    }

    if (!Number.isNaN(timestamp) && (Number.isNaN(current.timestamp) || timestamp >= current.timestamp)) {
      latest[listingId] = {
        created_at: event.created_at || null,
        timestamp,
        line_no: row.line_no,
        outcome: core.normalizeNullableString(event.new_outcome)
      };
    }
  });

  return latest;
}

function normalizeAndValidateEvent(input, knownIds) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    fail('El evento debe ser un objeto JSON.');
  }

  const event = {
    schema_version: SCHEMA_VERSION,
    moderation_event_id: core.normalizeNullableString(input.moderation_event_id),
    listing_id: core.normalizeNullableString(input.listing_id),
    slug: core.normalizeNullableString(input.slug),
    actor_type: core.normalizeNullableString(input.actor_type),
    actor_id: core.normalizeNullableString(input.actor_id),
    previous_outcome: core.normalizeNullableString(input.previous_outcome),
    new_outcome: core.normalizeNullableString(input.new_outcome),
    trigger_type: core.normalizeNullableString(input.trigger_type),
    trigger_signals: core.normalizeSignalArray(input.trigger_signals),
    notes: core.normalizeNullableString(input.notes),
    created_at: core.normalizeNullableString(input.created_at),
    override_transition: Boolean(input.override_transition),
    override_reason_code: core.normalizeNullableString(input.override_reason_code),
    override_justification: core.normalizeNullableString(input.override_justification)
  };

  if (!core.isNonEmptyString(event.moderation_event_id)) {
    fail('`moderation_event_id` es obligatorio y debe ser string no vacio.');
  }
  if (knownIds.has(event.moderation_event_id)) {
    fail('`moderation_event_id` duplicado en ledger: ' + event.moderation_event_id);
  }
  if (!core.isNonEmptyString(event.listing_id)) {
    fail('`listing_id` es obligatorio y debe ser string no vacio.');
  }
  if (!core.isNonEmptyString(event.slug)) {
    fail('`slug` es obligatorio y debe ser string no vacio.');
  }
  if (!core.ACTOR_TYPES.includes(event.actor_type)) {
    fail('`actor_type` invalido. Permitidos: ' + core.ACTOR_TYPES.join(', '));
  }
  if (event.actor_id !== null && !core.isNonEmptyString(event.actor_id)) {
    fail('`actor_id` debe ser null o string no vacio.');
  }
  if (event.previous_outcome !== null && !core.OUTCOMES.includes(event.previous_outcome)) {
    fail('`previous_outcome` invalido.');
  }
  if (!core.OUTCOMES.includes(event.new_outcome)) {
    fail('`new_outcome` invalido.');
  }
  if (!core.TRIGGER_TYPES.includes(event.trigger_type)) {
    fail('`trigger_type` invalido. Permitidos: ' + core.TRIGGER_TYPES.join(', '));
  }
  if (!core.isIsoUtc(event.created_at)) {
    fail('`created_at` debe ser fecha ISO UTC terminada en Z.');
  }

  return event;
}

function validateTransitionPolicy(event, latestOutcomes) {
  const currentListing = latestOutcomes[event.listing_id] || null;
  const expectedPreviousOutcome = currentListing ? currentListing.outcome : null;

  if (event.previous_outcome !== expectedPreviousOutcome) {
    fail('`previous_outcome` no coincide con el último estado conocido del listing. Esperado=' + String(expectedPreviousOutcome) + ', recibido=' + String(event.previous_outcome));
  }

  const allowed = core.isTransitionAllowed(event.previous_outcome, event.new_outcome);
  const sensitive = core.isSensitiveTransition(event.previous_outcome, event.new_outcome);

  if (!allowed) {
    if (!event.override_transition) {
      fail('Transicion invalida por state machine: ' + String(event.previous_outcome) + ' -> ' + String(event.new_outcome) + '. Usa --override-transition si procede.');
    }
  } else if (sensitive && !event.override_transition) {
    const rule = core.getSensitiveTransitionRule(event.previous_outcome, event.new_outcome);
    fail('Transicion sensible requiere override explícito: ' + String(event.previous_outcome) + ' -> ' + String(event.new_outcome) + '. Motivo: ' + (rule ? rule.reason : 'policy_hardening'));
  }

  if (!event.override_transition) {
    return;
  }

  if (core.OVERRIDE_POLICY.disallow_actor_type_system && event.actor_type === 'system') {
    fail('Override no permitido para actor_type=system.');
  }

  if (!core.OVERRIDE_POLICY.allowed_actor_types.includes(event.actor_type)) {
    fail('Override no permitido para actor_type=' + event.actor_type + '. Permitidos: ' + core.OVERRIDE_POLICY.allowed_actor_types.join(', '));
  }

  if (core.OVERRIDE_POLICY.require_actor_id && !event.actor_id) {
    fail('Override requiere actor_id no nulo.');
  }

  if (!event.override_reason_code || !core.OVERRIDE_REASON_CODES.includes(event.override_reason_code)) {
    fail('Override requiere override_reason_code válido. Permitidos: ' + core.OVERRIDE_REASON_CODES.join(', '));
  }

  if (!event.override_justification || event.override_justification.length < core.OVERRIDE_POLICY.required_justification_min_length) {
    fail('Override requiere override_justification de al menos ' + core.OVERRIDE_POLICY.required_justification_min_length + ' caracteres.');
  }
}

function appendEvent(event) {
  const line = JSON.stringify(event) + '\n';
  fs.appendFileSync(LEDGER_PATH, line, { encoding: 'utf8', mode: 0o644, flag: 'a' });
}

function main() {
  const args = parseArgs(process.argv);
  const inputEvent = fromCliArgs(args);
  const rows = readLedgerRows();
  const tailInfo = getLedgerTailInfo(rows);
  const latestOutcomes = getLatestOutcomeByListing(rows);
  const normalized = normalizeAndValidateEvent(inputEvent, tailInfo.knownIds);

  validateTransitionPolicy(normalized, latestOutcomes);

  normalized.prev_hash = tailInfo.previousHash;
  normalized.event_hash = core.computeEventHash(normalized, SCHEMA_VERSION);

  appendEvent(normalized);

  console.log('APPEND MODERATION EVENT: OK');
  console.log('ledger=' + LEDGER_PATH);
  console.log('schema_version=' + normalized.schema_version);
  console.log('moderation_event_id=' + normalized.moderation_event_id);
  console.log('listing_id=' + normalized.listing_id);
  console.log('transition=' + String(normalized.previous_outcome) + '->' + normalized.new_outcome);
  console.log('prev_hash=' + normalized.prev_hash);
  console.log('event_hash=' + normalized.event_hash);
}

main();
