# Moderation vs Risk Drift Report

- Generated at: 2026-04-16T18:12:07.394Z
- Ledger events: 7
- Risk report items: 7
- Snapshots: 7
- Outcome mismatches: 0
- Events sin snapshot (cuando aplica): 0
- Snapshots huérfanos: 0

## Incoherencias ledger vs risk-report

- No se detectan incoherencias de outcome entre ledger y risk-report.

## Eventos sin snapshot cuando ya deberían tenerlo

- No se detectan eventos sin snapshot obligatorio.

## Snapshots huérfanos

- No se detectan snapshots huérfanos.

## Drift documental/operativo

- listing=`re-room-berlin-charlottenburg-003` existe en risk-report pero no en ledger (risk outcome=`allow`).
- listing=`re-commercial-milan-brera-004` existe en risk-report pero no en ledger (risk outcome=`allow`).
- listing=`re-singular-lyon-heritage-007` existe en risk-report pero no en ledger (risk outcome=`allow`).

## Observaciones operativas

- No se detecta drift crítico en este corte.
- Recomendación: regenerar snapshots tras cada evento sensible/override y sincronizar risk-report en cada lote editorial.
