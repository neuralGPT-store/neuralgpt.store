# Pre-Push Blockers (Final Gate Snapshot)

## Estado consolidado

### 1) Cambios tracked sensibles fuera de slice editorial
- Estado: **ABIERTO (bloqueador de push inicial)**
- Archivos:
  - `marketplace.html`
  - `product.html`
  - `index.html`
- Decisión gate Fase 26:
  - se **separan del primer push**.
  - requieren revisión funcional pública dedicada.

### 2) Drift operativo (ledger vs risk-report)
- Estado previo: abierto para `re-industrial-rotterdam-port-005`.
- Estado actual: **CERRADO**.
- Evidencia:
  - evento correctivo: `evt_phase26_20260416_007`.
  - `reports/moderation-risk-drift.md`: `Outcome mismatches: 0`.

### 3) Gap compliance legacy (`evt_seed_20260416_004`)
- Estado previo: transición sensible sin override.
- Estado actual: **CERRADO FORMALMENTE**.
- Evidencia:
  - excepción legacy documentada en `data/moderation-legacy-exceptions.json`.
  - `reports/moderation-compliance-export.md`: `gaps=0` y sección `Excepciones legacy aceptadas`.

## Observaciones no bloqueantes
- `reports/moderation-risk-drift.md` mantiene 3 listings en risk-report sin historial de ledger.
- Estado: no bloqueante para push inicial por tratarse de cobertura parcial de moderación (no inconsistencia de outcome activa).

## Criterio de salida para commit/push
- Hacer commit únicamente del staging por slices definido en Fase 26.
- Mantener fuera del primer push los tracked sensibles (`marketplace.html`, `product.html`, `index.html`).
