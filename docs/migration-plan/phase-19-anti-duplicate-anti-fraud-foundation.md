# FASE 19 - Sistema anti-duplicados + anti-fraude + base de seguridad

Fecha: 2026-04-16

## Objetivo ejecutado

Se implementó la base técnica real y auditable para detectar duplicados, abuso del free tier y señales de fraude, con contratos puros listos para integración futura en backend sin romper la capa actual.

## Archivos creados

- `data/fraud-rules.json`
- `data/moderation-rules.json`
- `js/real-estate-risk-engine.js`
- `scripts/run-risk-engine-smoke.js`
- `docs/migration-plan/phase-19-anti-duplicate-anti-fraud-foundation.md`
- `docs/migration-plan/risk-scoring-model.md`
- `docs/migration-plan/moderation-workflow.md`

## Núcleo técnico implementado

### 1) Detección de duplicados

Señales implementadas:

- similitud de título
- similitud de descripción
- equivalencia geográfica (country/city/zone)
- proximidad de coordenadas
- precio idéntico o casi idéntico
- huella estructural (`asset_type`, `operation`, `city`, `zone`, `surface_m2`, `rooms`, `bathrooms`)
- imágenes repetidas por hash/path compartido
- mismo anunciante
- mismo contacto
- re-subida abusiva tras `expired`/`off_market`

### 2) Base anti-fraude

Señales implementadas:

- `fraud_risk_score` por listing
- señalización por severidad (`low`, `medium`, `high`, `critical`)
- abuso de free tier
- churn de publicación/estado
- patrones de automatización (IP velocity / device fanout)
- debilidad de identidad/contacto
- anomalía de valor (price per m2)
- base para reputación de anunciante y trazabilidad

### 3) Contratos del motor

Expuestos como funciones puras:

- `normalizeListingForRisk(listing)`
- `computeDuplicateSignals(listing, listings)`
- `computeFraudSignals(listing, context)`
- `scoreListingRisk(listing, listings, context)`
- `classifyModerationOutcome(score, signals)`
- `buildModerationSummary(listing, result)`

### 4) Clasificación de outcomes

- `allow`
- `allow_with_monitoring`
- `pending_review`
- `quarantine`
- `suspend_candidate`

## Smoke test

`script/run-risk-engine-smoke.js` ejecuta:

- caso baseline sobre listing real
- caso de duplicado fuerte simulado
- caso de fraude fuerte simulado

Salida:

- señales encontradas
- score por escenario
- outcome final
- resumen auditable

## No alcance (controlado)

- no backend nuevo
- no cambios en `product.html` ni `marketplace.html`
- no cambios de rutas públicas legacy por esta fase
- sin dependencias externas adicionales

## Nota de auditoría de repositorio

`.gitignore` mantiene `docs/` ignorado, por lo que la evidencia documental de fases no entra en push normal sin ajustar esa regla en fase de empaquetado final.

## Siguiente fase recomendada

FASE 20 - Integración read-only del motor en flujo editorial interno:

1. generar reporte periódico de riesgo para listings publicados
2. publicar panel técnico interno estático (solo lectura) con top flags
3. preparar contrato de persistencia (`moderation_events`) sin activar backend aún
4. definir política de override humano y SLA de revisión por outcome
