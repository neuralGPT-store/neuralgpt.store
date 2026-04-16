# FASE 32 — Controlled Manual Walkthrough + Bridge Decision Gate

Fecha: 2026-04-16
Estado: completada (sin push, sin merge)

## Alcance
Archivos evaluados/tocados en esta fase:
- `index.html`
- `marketplace.html`
- `product.html`
- `scripts/bridge-runtime-qa.js`
- `reports/public-bridge-walkthrough.md`

## Walkthrough resumido
El walkthrough completo está en `reports/public-bridge-walkthrough.md`.

Resumen por superficie:
- `index.html`: kill-switch y guards correctos; anti-mezcla de cards aplicado; persiste mezcla narrativa SaaS/inmobiliario en home bridge.
- `marketplace.html`: bootstrap dual y fallback endurecido correctos; aislamiento de renderer y estado bridge correcto; aún hay deuda de coherencia visual/copy por reutilización fuerte de shell legacy.
- `product.html`: kill-switch, fallback y aislamiento CTA/Stripe correctamente definidos; caso slug inválido endurecido con micro-fix.

## Defectos detectados
- `index.html`: el bridge no aísla toda la narrativa de home, solo secciones concretas.
- `marketplace.html`: puente sólido técnicamente, pero con fricción de UX por mezcla de lenguaje legado en algunos elementos compartidos.
- `product.html`: no se detectaron defectos críticos tras el micro-fix.

## Micro-fixes aplicados
- `product.html`:
  - Se evitó fallback ambiguo a `ghostwriter` cuando llega `slug` inválido sin `id`.
  - Cambio aplicado:
    - Antes: `var productId = params.get('id') || 'ghostwriter';`
    - Ahora: `var productId = params.get('id') || (params.get('slug') ? '' : 'ghostwriter');`
- `scripts/bridge-runtime-qa.js`:
  - Se añadió check explícito del fallback anterior para evitar regresión.

## Decisión final por archivo
- `index.html`: `needs_more_work`
- `marketplace.html`: `needs_more_work`
- `product.html`: `approved_for_split_commit` (nivel técnico local)

## Decisión final global del bridge
Decisión global: **se congela fuera del release inicial**.

Motivo:
- El bridge no está homogéneamente maduro en las tres superficies críticas.
- `index.html` y `marketplace.html` mantienen riesgo residual de mezcla bridge/legacy para un RC limpio.
- Aunque `product.html` está técnicamente más sólido, incluir solo esa pieza abriría una experiencia puente inconsistente.

## Split commit candidato
- Estado: **no habilitado en esta fase** (por decisión global de congelación).
- Nota: `product.html` queda como candidato técnico para rescate posterior si se decide un puente parcial controlado.

## Validaciones ejecutadas
- `git diff -- index.html marketplace.html product.html` -> OK
- `node --check scripts/bridge-runtime-qa.js` -> OK
- `node scripts/bridge-runtime-qa.js` -> OK (`RESULT: PASS`)
- Chequeo HTML básico (`<!DOCTYPE html>`, `<html>`, `</html>`) en los 3 -> OK
- `git diff --cached --name-only` -> vacío
- No inclusión accidental de otros archivos en staging -> OK
- No rotura del legacy (fallback explícito presente) -> OK

## Siguiente fase recomendada
**FASE 33 — BRIDGE DECOMMISSION OR ISOLATED BRIDGE BRANCH DECISION**

Objetivo sugerido:
- Opción A (recomendada para release inicial): retirar bridge de `index.html` y `marketplace.html` del RC y mantenerlo solo en rama/lab controlada.
- Opción B (si negocio lo exige): rescate parcial de `product.html` con checklist de UX/SEO específico y commit aislado, sin activar home/marketplace bridge.
