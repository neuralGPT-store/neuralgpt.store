# Phase 23 - Ledger Integrity and State Machine

## Resumen
Se endurece la capa editorial interna con:
- integrity chain (`prev_hash`, `event_hash`, `schema_version`) para eventos nuevos
- validador formal de ledger
- state machine de transiciones de outcome
- bloqueo de transiciones inválidas en appender
- reporte interno de integridad

## Archivos creados
- `scripts/lib/moderation-ledger-core.js`
- `scripts/validate-moderation-ledger.js`
- `scripts/build-moderation-integrity-report.js`
- `reports/moderation-integrity.md` (generado)
- `data/moderation-state-machine.json`
- `docs/migration-plan/phase-23-ledger-integrity-and-state-machine.md`
- `docs/migration-plan/moderation-state-machine.md`

## Archivos modificados
- `scripts/append-moderation-event.js`
- `data/moderation-events.log.jsonl` (append-only)

## Qué cambió en el ledger
Nuevos eventos (schema v2) incluyen:
- `schema_version`
- `prev_hash`
- `event_hash`

Semántica:
- `prev_hash`: hash efectivo del evento anterior válido en el ledger.
- `event_hash`: SHA-256 estable del evento normalizado (sin depender de orden textual del JSON original).

## Compatibilidad con eventos previos
- Eventos legacy existentes (sin hashes) se mantienen intactos.
- Se tratan como `schema_version=1` implícito.
- Para encadenado, se deriva hash efectivo calculado en validación/append.
- A partir de esta fase, los nuevos append se emiten en `schema_version=2`.

## Política de transiciones
La state machine define transiciones permitidas y bloqueadas entre:
- `allow`
- `allow_with_monitoring`
- `pending_review`
- `quarantine`
- `suspend_candidate`

Implementación:
- Transiciones inválidas se rechazan por defecto en `append-moderation-event.js`.
- Override explícito: `--override-transition` con restricciones:
  - no permitido para `actor_type=system`
  - requiere `notes` de al menos 20 caracteres

## Validación y reporte
- Validación estructural + integridad + transiciones:
```bash
node scripts/validate-moderation-ledger.js
```

- Construcción de reporte de integridad:
```bash
node scripts/build-moderation-integrity-report.js
```

Salida:
- `reports/moderation-integrity.md`

## Límites actuales (sin backend)
- No hay locking transaccional multiusuario.
- No hay firma externa o anclaje criptográfico fuera del repositorio.
- No hay control de permisos por usuario autenticado.

## Nota importante sobre docs/
`docs/` sigue ignorado por `.gitignore` en el estado actual del repositorio, por lo que esta documentación no se stagea automáticamente antes de push.

## Siguiente fase recomendada
Fase 24 - Editorial Actions Envelope + Immutable Snapshots:
- sobre cada cambio de outcome, generar snapshot firmado del contexto de riesgo
- registrar diff de señales (antes/después)
- preparar export de auditoría por rango temporal para compliance
