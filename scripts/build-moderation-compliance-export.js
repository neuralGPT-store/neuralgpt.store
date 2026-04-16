#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LEDGER_PATH = path.join(ROOT, 'data', 'moderation-events.log.jsonl');
const SNAPSHOT_PATH = path.join(ROOT, 'data', 'moderation-review-snapshots.log.jsonl');
const LEGACY_EXCEPTIONS_PATH = path.join(ROOT, 'data', 'moderation-legacy-exceptions.json');
const OUTPUT_PATH = path.join(ROOT, 'reports', 'moderation-compliance-export.md');

const core = require(path.join(__dirname, 'lib', 'moderation-ledger-core.js'));

function fail(message) {
  console.error('MODERATION COMPLIANCE EXPORT: ERROR');
  console.error(message);
  process.exit(1);
}

function readJsonl(filePath, allowMissing) {
  if (!fs.existsSync(filePath)) {
    if (allowMissing) {
      return [];
    }
    fail('No existe archivo requerido: ' + filePath);
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

function readJson(filePath, allowMissing) {
  if (!fs.existsSync(filePath)) {
    if (allowMissing) {
      return null;
    }
    fail('No existe archivo requerido: ' + filePath);
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail('JSON invalido en ' + filePath + ': ' + error.message);
  }
}

function bump(counter, key) {
  const normalized = key == null || key === '' ? 'unknown' : String(key);
  counter[normalized] = (counter[normalized] || 0) + 1;
}

function toSorted(counter) {
  return Object.keys(counter)
    .map((key) => ({ key, count: counter[key] }))
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.key.localeCompare(b.key, 'es');
    });
}

function main() {
  const events = readJsonl(LEDGER_PATH, false);
  const snapshots = readJsonl(SNAPSHOT_PATH, true);
  const legacyExceptions = readJson(LEGACY_EXCEPTIONS_PATH, true);

  const byActorType = Object.create(null);
  const byOutcome = Object.create(null);
  const byTriggerType = Object.create(null);

  const snapshotByEvent = new Set(
    snapshots
      .map((snapshot) => core.normalizeNullableString(snapshot.moderation_event_id))
      .filter(Boolean)
  );

  const overrides = [];
  const sensitiveExecuted = [];
  const gaps = [];
  const acceptedExceptions = [];

  const acceptedSensitiveExceptionIds = new Set(
    (legacyExceptions &&
      Array.isArray(legacyExceptions.accepted_sensitive_transition_exceptions)
      ? legacyExceptions.accepted_sensitive_transition_exceptions
      : []
    )
      .filter((item) => item && item.status === 'accepted_legacy_exception' && item.code === 'sensitive_without_override')
      .map((item) => core.normalizeNullableString(item.moderation_event_id))
      .filter(Boolean)
  );

  events.forEach((event, index) => {
    bump(byActorType, event.actor_type);
    bump(byOutcome, event.new_outcome);
    bump(byTriggerType, event.trigger_type);

    const previousOutcome = core.normalizeNullableString(event.previous_outcome);
    const newOutcome = core.normalizeNullableString(event.new_outcome);
    const transitionLabel = String(previousOutcome) + ' -> ' + String(newOutcome);

    const isSensitive = core.isSensitiveTransition(previousOutcome, newOutcome);
    const hasOverride = Boolean(event.override_transition);

    if (hasOverride) {
      overrides.push(event);
      if (!event.override_reason_code || !event.override_justification) {
        gaps.push({
          code: 'override_incomplete',
          message: 'Override sin reason/justification completo',
          moderation_event_id: event.moderation_event_id || null,
          line_no: index + 1
        });
      }
    }

    if (isSensitive) {
      sensitiveExecuted.push({
        moderation_event_id: event.moderation_event_id || null,
        listing_id: event.listing_id || null,
        transition: transitionLabel,
        override_transition: hasOverride,
        created_at: event.created_at || null
      });

      if (!hasOverride) {
        const eventId = core.normalizeNullableString(event.moderation_event_id);
        if (eventId && acceptedSensitiveExceptionIds.has(eventId)) {
          acceptedExceptions.push({
            code: 'sensitive_without_override',
            moderation_event_id: eventId,
            line_no: index + 1,
            message: 'Excepción legacy aceptada y documentada.'
          });
        } else {
          gaps.push({
            code: 'sensitive_without_override',
            message: 'Transicion sensible ejecutada sin override.',
            moderation_event_id: event.moderation_event_id || null,
            line_no: index + 1
          });
        }
      }
    }

    const eventId = core.normalizeNullableString(event.moderation_event_id);
    if (eventId && !snapshotByEvent.has(eventId)) {
      gaps.push({
        code: 'event_without_snapshot',
        message: 'Evento sin snapshot asociado.',
        moderation_event_id: eventId,
        line_no: index + 1
      });
    }
  });

  snapshots.forEach((snapshot, index) => {
    const eventId = core.normalizeNullableString(snapshot.moderation_event_id);
    if (!eventId) {
      gaps.push({
        code: 'snapshot_missing_event_id',
        message: 'Snapshot sin moderation_event_id.',
        moderation_event_id: null,
        line_no: index + 1
      });
      return;
    }

    const exists = events.some((event) => core.normalizeNullableString(event.moderation_event_id) === eventId);
    if (!exists) {
      gaps.push({
        code: 'orphan_snapshot',
        message: 'Snapshot huérfano sin evento en ledger.',
        moderation_event_id: eventId,
        line_no: index + 1
      });
    }
  });

  const lines = [];
  lines.push('# Moderation Compliance Export');
  lines.push('');
  lines.push('- Generated at: ' + new Date().toISOString());
  lines.push('- Ledger source: `data/moderation-events.log.jsonl`');
  lines.push('- Snapshot source: `data/moderation-review-snapshots.log.jsonl`');
  lines.push('- Total events: **' + events.length + '**');
  lines.push('- Total snapshots: **' + snapshots.length + '**');
  lines.push('- Total overrides: **' + overrides.length + '**');
  lines.push('- Excepciones legacy aceptadas: **' + acceptedExceptions.length + '**');
  lines.push('');

  lines.push('## Resumen de eventos');
  lines.push('');
  lines.push('### Por actor_type');
  toSorted(byActorType).forEach((entry) => lines.push('- `' + entry.key + '`: ' + entry.count));
  lines.push('');
  lines.push('### Por new_outcome');
  toSorted(byOutcome).forEach((entry) => lines.push('- `' + entry.key + '`: ' + entry.count));
  lines.push('');
  lines.push('### Por trigger_type');
  toSorted(byTriggerType).forEach((entry) => lines.push('- `' + entry.key + '`: ' + entry.count));
  lines.push('');

  lines.push('## Resumen de overrides');
  lines.push('');
  if (!overrides.length) {
    lines.push('- No hay overrides ejecutados.');
  } else {
    overrides.forEach((event) => {
      lines.push('- `' + (event.moderation_event_id || 'unknown') + '` | transition=' + String(event.previous_outcome) + ' -> ' + String(event.new_outcome) + ' | reason=' + String(event.override_reason_code || 'missing') + ' | actor=' + String(event.actor_type || 'unknown') + '/' + String(event.actor_id || 'null'));
    });
  }
  lines.push('');

  lines.push('## Transiciones sensibles ejecutadas');
  lines.push('');
  if (!sensitiveExecuted.length) {
    lines.push('- No hay transiciones sensibles en el corte actual.');
  } else {
    sensitiveExecuted.forEach((entry) => {
      lines.push('- `' + (entry.moderation_event_id || 'unknown') + '` | listing=' + String(entry.listing_id) + ' | ' + entry.transition + ' | override=' + String(entry.override_transition));
    });
  }
  lines.push('');

  lines.push('## Snapshots asociados');
  lines.push('');
  lines.push('- Eventos con snapshot: ' + snapshotByEvent.size + '/' + events.length);
  lines.push('');

  lines.push('## Posibles gaps de trazabilidad');
  lines.push('');
  if (!gaps.length) {
    lines.push('- No se detectan gaps en este corte.');
  } else {
    gaps.forEach((gap) => {
      lines.push('- code=`' + gap.code + '` | event=' + String(gap.moderation_event_id) + ' | line=' + String(gap.line_no) + ' | ' + gap.message);
    });
  }
  lines.push('');

  lines.push('## Excepciones legacy aceptadas');
  lines.push('');
  if (!acceptedExceptions.length) {
    lines.push('- No hay excepciones legacy aceptadas en este corte.');
  } else {
    acceptedExceptions.forEach((entry) => {
      lines.push('- code=`' + entry.code + '` | event=' + String(entry.moderation_event_id) + ' | line=' + String(entry.line_no) + ' | ' + entry.message);
    });
  }
  lines.push('');

  lines.push('## Observaciones operativas');
  lines.push('');
  if (!gaps.length) {
    lines.push('- El paquete ledger+snapshots mantiene trazabilidad operativa consistente en este corte.');
  } else {
    lines.push('- Existen gaps de trazabilidad; revisar antes de push y antes de automatización adicional.');
  }
  lines.push('- Recomendación: exigir snapshot inmediato tras cada evento sensible u override.');

  fs.writeFileSync(OUTPUT_PATH, lines.join('\n') + '\n', 'utf8');

  console.log('MODERATION COMPLIANCE EXPORT: OK');
  console.log('events=' + events.length);
  console.log('snapshots=' + snapshots.length);
  console.log('overrides=' + overrides.length);
  console.log('sensitive_transitions=' + sensitiveExecuted.length);
  console.log('accepted_legacy_exceptions=' + acceptedExceptions.length);
  console.log('gaps=' + gaps.length);
  console.log('output=' + OUTPUT_PATH);
}

main();
