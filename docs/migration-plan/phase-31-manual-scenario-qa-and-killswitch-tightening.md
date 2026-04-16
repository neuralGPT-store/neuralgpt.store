# Phase 31 - Manual Scenario QA Matrix + Bridge Kill-Switch Tightening (sin push)

## Objetivo
Endurecer control bridge en `index.html`, `marketplace.html` y `product.html` con kill-switch explícito y fallback determinista, además de dejar matriz de escenarios manuales verificables antes de cualquier split commit.

## Archivos modificados en esta fase
- `index.html`
- `marketplace.html`
- `product.html`
- `scripts/bridge-runtime-qa.js`
- `reports/public-bridge-manual-qa-matrix.md`

## Endurecimiento aplicado

### index.html
- se introduce helper de kill-switch explícito: `isHomeBridgeEnabled(settings)`.
- condición bridge endurecida: requiere `?re_bridge=1` + feature flag de adapters.
- se mantiene hardening anti-mezcla de cards sobrantes.

### marketplace.html
- se introduce helper de kill-switch explícito: `isMarketplaceBridgeEnabled(settings)`.
- condición bridge endurecida: requiere `?re_bridge=1` + feature flag.
- se añade validación mínima de catálogo bridge (`hasMinimumBridgeCardData`).
- fallback endurecido:
  - rama `usedBridge=false`: `resetMarketplaceBridgeState()` + `loadLegacyMarketplace()`.
  - rama `catch`: `resetMarketplaceBridgeState()` + `loadLegacyMarketplace()`.
- reset explícito bridge para evitar semiestados (`resetMarketplaceBridgeState`).

### product.html
- se introduce helper de kill-switch explícito: `isProductBridgeEnabled(settings)`.
- condición bridge endurecida: requiere `?re_bridge=1` + feature flag.
- validación mínima de listing bridge (`id`, `slug`, `title`).
- fallback endurecido:
  - rama `usedBridge=false`: `deactivateRealEstateProductState()` + `legacyInitProduct()`.
  - rama `catch`: `deactivateRealEstateProductState()` + `legacyInitProduct()`.
- se mantiene aislamiento CTA bridge vs legacy (`bridge-contact-btn` vs `buy-btn`).

## QA script actualizado
`scripts/bridge-runtime-qa.js` ahora valida adicionalmente:
- presencia de kill-switch explícito por query `re_bridge=1` en los 3 archivos.
- presencia de helpers de kill-switch por superficie.
- paths críticos de fallback endurecido (then/catch + reset state).
- no reutilización de hook legacy en CTA bridge de product.
- señales mínimas de bridge aislado por archivo.

## Matriz manual
- reporte generado: `reports/public-bridge-manual-qa-matrix.md`
- incluye escenarios requeridos para `index.html`, `marketplace.html`, `product.html` con:
  - precondición
  - comportamiento esperado
  - riesgo si falla
  - estado actual
  - acción correctiva

## Riesgo residual por archivo
- `index.html`: medio-alto (falta QA visual/manual completa de home bridge ON/OFF).
- `marketplace.html`: alto (superficie comercial compleja con bootstrap dual + SEO runtime).
- `product.html`: medio-alto (ficha bridge extensa, falta QA manual funcional end-to-end).

## Decisión actualizada
- `index.html`: `needs_more_work`
- `marketplace.html`: `needs_more_work`
- `product.html`: `needs_more_work`

## Criterio para pasar a split commit
Solo pasar a `approved_for_split_commit` si se cumplen simultáneamente:
1. QA manual ON/OFF completada sin hallazgos críticos en 3 superficies.
2. fallback legacy validado por escenario (desactivado, fallo datasets, slug inválido).
3. ausencia de mezcla visual/funcional bridge-legacy en rutas críticas.
4. revisión final de copy/SEO runtime sin canibalización accidental.

## Validaciones obligatorias ejecutadas
- `git diff -- index.html marketplace.html product.html` -> OK
- `node --check scripts/bridge-runtime-qa.js` -> OK
- `node scripts/bridge-runtime-qa.js` -> OK (PASS)
- chequeo HTML básico (DOCTYPE + cierre html) en 3 archivos -> OK
- `git diff --cached --name-only` -> vacío
- no inclusión accidental de otros archivos en staging -> OK
- no rotura legacy (fallback explícito + estructura intacta) -> OK

## Siguiente fase recomendada
FASE 32 - Controlled Manual Walkthrough + Bridge Decision Gate (sin push):
- ejecutar walkthrough manual paso a paso de todos los escenarios de la matriz
- registrar evidencias por escenario (pass/fail)
- decidir si las 3 superficies pasan a split commit candidate o quedan fuera.
