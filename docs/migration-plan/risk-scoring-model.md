# Risk Scoring Model (Fase 19)

Fecha: 2026-04-16

## Principios

- score único de 0 a 100 por listing
- composición aditiva: `duplicate_score + fraud_score`
- señales trazables por `code`, `severity`, `weight`, `message`
- sin dependencias de backend para la fase actual

## Ejes de puntuación

1. Duplicate signals:
- title_similarity
- description_similarity
- location_equivalence (country/city/zone + coords)
- price_similarity
- structural_fingerprint
- image reuse
- contact/advertiser reuse
- relist abuse

2. Fraud signals:
- free tier abuse
- publication/status churn
- automation abuse (IP velocity / device fanout)
- identity/contact weaknesses
- value anomaly (price per m2)

## Risk bands

- `low`: 0-24
- `medium`: 25-49
- `high`: 50-74
- `critical`: 75-100

## Moderation outcomes

- `allow`
- `allow_with_monitoring`
- `pending_review`
- `quarantine`
- `suspend_candidate`

## Hard blocks

Se fuerza `quarantine` cuando se supera umbral de:

- duplicados fuertes simultáneos
- señales críticas simultáneas

## Escalabilidad técnica

El modelo está preparado para mover cálculo a backend sin cambiar contratos de salida:

- `scoreListingRisk(...)`
- `classifyModerationOutcome(...)`
- `buildModerationSummary(...)`
