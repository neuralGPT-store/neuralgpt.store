# FASE 20 - Integración read-only del motor de riesgo en flujo editorial interno

Fecha: 2026-04-16

## Objetivo ejecutado

Se integró el motor anti-duplicados + anti-fraude en un flujo editorial interno estático, con generación auditable de `data/risk-report.json`, sin backend dinámico y sin tocar rutas públicas legacy.

## Archivos creados

- `scripts/build-risk-report.js`
- `data/risk-report.json` (generado por script)
- `docs/migration-plan/moderation-events-contract.md`
- `docs/migration-plan/phase-20-read-only-risk-integration.md`

## Flujo de generación de `risk-report.json`

Entrada:

- `data/listings.json`
- `data/fraud-rules.json`
- `data/moderation-rules.json`
- `js/real-estate-risk-engine.js`

Proceso:

1. builder carga y valida datasets
2. ejecuta `scoreListingRisk` por listing
3. consolida señales + outcome + prioridad de revisión
4. escribe `data/risk-report.json` en formato determinista

Salida por listing (mínimo):

- `listing_id`
- `slug`
- `duplicate_score`
- `fraud_score`
- `total_score`
- `outcome`
- `duplicate_signals`
- `fraud_signals`
- `summary`
- `generated_at`
- `engine_version`
- `review_priority`

## Encaje en flujo editorial futuro

- fase actual: read-only local y auditable
- fase futura: persistencia de eventos de moderación (`moderation_events`) y panel interno
- no se expone UI pública nueva en esta fase

## Qué parte ya es auditable

- reglas versionadas
- scoring reproducible
- output consolidado por anuncio
- distribución de outcomes por dataset

## Qué falta por no haber backend

- persistencia histórica de eventos
- cola de revisión humana
- overrides con identidad de moderador
- API de consulta/acción

## Nota de repositorio

`docs/` sigue ignorado por `.gitignore`, por lo que la documentación de fases no se incluirá automáticamente en push sin ajustar esa regla en fase de empaquetado final.

## Siguiente fase recomendada

FASE 21 - Primer panel editorial interno estático (sin backend):

1. generar `reports/risk-report-summary.md` automático desde `data/risk-report.json`
2. priorizar `pending_review+` y top señales
3. diseñar formato de checklist de revisión humana
4. mantener separación estricta entre capa pública y editorial interna
