#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LEDGER_PATH = path.join(ROOT, 'data', 'moderation-events.log.jsonl');
const OUTPUT_PATH = path.join(ROOT, 'reports', 'moderation-audit.md');

function fail(message) {
  console.error('MODERATION AUDIT BUILD: ERROR');
  console.error(message);
  process.exit(1);
}

function ensure(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function parseJsonl(filePath) {
  ensure(fs.existsSync(filePath), 'No existe ledger: ' + filePath);

  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw.trim()) {
    return [];
  }

  const lines = raw.split(/\r?\n/);
  const events = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    try {
      const parsed = JSON.parse(trimmed);
      parsed._line = index + 1;
      events.push(parsed);
    } catch (error) {
      fail('JSON invalido en ledger, linea ' + (index + 1) + ': ' + error.message);
    }
  });

  return events;
}

function bump(counter, key) {
  const normalized = key == null || key === '' ? 'unknown' : String(key);
  counter[normalized] = (counter[normalized] || 0) + 1;
}

function toSortedEntries(counter) {
  return Object.keys(counter)
    .map((key) => ({ key, count: counter[key] }))
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.key.localeCompare(b.key, 'es');
    });
}

function sortEventsDesc(events) {
  return events
    .slice()
    .sort((a, b) => {
      const aTs = Date.parse(a.created_at || '');
      const bTs = Date.parse(b.created_at || '');
      if (!Number.isNaN(bTs) && !Number.isNaN(aTs) && bTs !== aTs) {
        return bTs - aTs;
      }
      return (b._line || 0) - (a._line || 0);
    });
}

function buildMarkdown(events) {
  const now = new Date().toISOString();
  const byActorType = Object.create(null);
  const byOutcome = Object.create(null);
  const byTriggerType = Object.create(null);
  const byTriggerSignal = Object.create(null);
  const byListing = Object.create(null);

  events.forEach((event) => {
    bump(byActorType, event.actor_type);
    bump(byOutcome, event.new_outcome);
    bump(byTriggerType, event.trigger_type);

    const signals = Array.isArray(event.trigger_signals) ? event.trigger_signals : [];
    signals.forEach((signal) => bump(byTriggerSignal, signal));

    const listingId = event.listing_id || 'unknown_listing';
    if (!byListing[listingId]) {
      byListing[listingId] = {
        listing_id: listingId,
        slug: event.slug || 'sin-slug',
        events: 0,
        last_outcome: event.new_outcome || 'unknown',
        last_created_at: event.created_at || 'unknown',
        last_event_id: event.moderation_event_id || 'unknown'
      };
    }

    byListing[listingId].events += 1;

    const currentLast = Date.parse(byListing[listingId].last_created_at || '');
    const nextTs = Date.parse(event.created_at || '');
    if (Number.isNaN(currentLast) || (!Number.isNaN(nextTs) && nextTs >= currentLast)) {
      byListing[listingId].slug = event.slug || byListing[listingId].slug;
      byListing[listingId].last_outcome = event.new_outcome || byListing[listingId].last_outcome;
      byListing[listingId].last_created_at = event.created_at || byListing[listingId].last_created_at;
      byListing[listingId].last_event_id = event.moderation_event_id || byListing[listingId].last_event_id;
    }
  });

  const latest = sortEventsDesc(events).slice(0, 8);
  const listings = Object.keys(byListing)
    .map((key) => byListing[key])
    .sort((a, b) => {
      if (b.events !== a.events) {
        return b.events - a.events;
      }
      return a.listing_id.localeCompare(b.listing_id, 'es');
    });

  const topTriggers = toSortedEntries(byTriggerSignal).slice(0, 10);

  const lines = [];
  lines.push('# Moderation Audit View (Internal)');
  lines.push('');
  lines.push('- Generated at: ' + now);
  lines.push('- Ledger source: `data/moderation-events.log.jsonl`');
  lines.push('- Total de eventos: **' + events.length + '**');
  lines.push('');

  lines.push('## Distribucion por actor_type');
  lines.push('');
  const actorEntries = toSortedEntries(byActorType);
  if (!actorEntries.length) {
    lines.push('- Sin eventos.');
  } else {
    actorEntries.forEach((entry) => lines.push('- `' + entry.key + '`: ' + entry.count));
  }
  lines.push('');

  lines.push('## Distribucion por new_outcome');
  lines.push('');
  const outcomeEntries = toSortedEntries(byOutcome);
  if (!outcomeEntries.length) {
    lines.push('- Sin eventos.');
  } else {
    outcomeEntries.forEach((entry) => lines.push('- `' + entry.key + '`: ' + entry.count));
  }
  lines.push('');

  lines.push('## Distribucion por trigger_type');
  lines.push('');
  const triggerTypeEntries = toSortedEntries(byTriggerType);
  if (!triggerTypeEntries.length) {
    lines.push('- Sin eventos.');
  } else {
    triggerTypeEntries.forEach((entry) => lines.push('- `' + entry.key + '`: ' + entry.count));
  }
  lines.push('');

  lines.push('## Ultimos eventos');
  lines.push('');
  if (!latest.length) {
    lines.push('- Sin eventos.');
  } else {
    latest.forEach((event) => {
      const signals = Array.isArray(event.trigger_signals) && event.trigger_signals.length
        ? event.trigger_signals.join(', ')
        : 'sin_signals';
      lines.push('- `' + (event.moderation_event_id || 'unknown') + '` | listing=`' + (event.listing_id || 'unknown') + '` | `' + (event.previous_outcome || 'null') + '` -> `' + (event.new_outcome || 'unknown') + '` | trigger=`' + (event.trigger_type || 'unknown') + '` | signals=' + signals + ' | created_at=' + (event.created_at || 'unknown'));
    });
  }
  lines.push('');

  lines.push('## Eventos por listing');
  lines.push('');
  if (!listings.length) {
    lines.push('- Sin eventos.');
  } else {
    listings.forEach((entry) => {
      lines.push('- `' + entry.listing_id + '` (' + entry.slug + '): eventos=' + entry.events + ', ultimo_outcome=`' + entry.last_outcome + '`, ultimo_evento=`' + entry.last_event_id + '`');
    });
  }
  lines.push('');

  lines.push('## Triggers mas frecuentes');
  lines.push('');
  if (!topTriggers.length) {
    lines.push('- Sin triggers registrados.');
  } else {
    topTriggers.forEach((entry) => lines.push('- `' + entry.key + '`: ' + entry.count));
  }
  lines.push('');

  lines.push('## Observaciones operativas');
  lines.push('');
  if (!events.length) {
    lines.push('- Ledger vacio: no hay trazabilidad historica todavia.');
  } else {
    const hasEscalated = outcomeEntries.some((entry) => entry.key === 'pending_review' || entry.key === 'quarantine' || entry.key === 'suspend_candidate');
    lines.push('- El ledger es append-only y permite reconstruir transiciones por listing sin backend dinamico.');
    lines.push('- Triggers dominantes actuales: ' + (topTriggers[0] ? '`' + topTriggers[0].key + '`' : 'n/a') + '.');
    lines.push('- Eventos con outcomes de escalado (`pending_review+`): ' + (hasEscalated ? 'presentes' : 'no presentes en este corte') + '.');
    lines.push('- Recomendacion: registrar evento por cada override humano para mantener auditabilidad completa.');
  }

  return lines.join('\n') + '\n';
}

function main() {
  const events = parseJsonl(LEDGER_PATH);
  const markdown = buildMarkdown(events);

  fs.writeFileSync(OUTPUT_PATH, markdown, 'utf8');

  const byActorType = Object.create(null);
  const byOutcome = Object.create(null);
  events.forEach((event) => {
    bump(byActorType, event.actor_type);
    bump(byOutcome, event.new_outcome);
  });

  console.log('MODERATION AUDIT BUILD: OK');
  console.log('ledger=' + LEDGER_PATH);
  console.log('output=' + OUTPUT_PATH);
  console.log('total_events=' + events.length);
  console.log('actor_types=' + JSON.stringify(byActorType));
  console.log('new_outcomes=' + JSON.stringify(byOutcome));
}

main();
