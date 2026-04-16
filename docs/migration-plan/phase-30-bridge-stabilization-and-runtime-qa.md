# Phase 30 - Bridge Stabilization Micro-Fixes + Runtime QA (sin push)

## Objetivo
Reducir riesgo en `index.html`, `marketplace.html` y `product.html` mediante micro-fixes verificables y QA runtime scripted, sin reescritura grande y sin mezclar otras capas.

## Archivos tocados
- `index.html`
- `marketplace.html`
- `product.html`
- `scripts/bridge-runtime-qa.js`
- `reports/public-bridge-runtime-qa.md`

## Defectos detectados

### index.html
- Riesgo de mezcla residual legacy/bridge en cards destacadas cuando el bridge no rellenaba todas las posiciones.

### marketplace.html
- No se detectó fallo crítico de fallback en runtime checks.
- Persiste riesgo estructural por bootstrap dual + SEO runtime en una página comercial crítica.

### product.html
- Riesgo de contaminación semántica con circuito legacy al reutilizar `id="buy-btn"` en CTA bridge.

## Micro-fixes aplicados

### index.html
- En `applyRealEstateHomepageFeatured`:
  - cards sin `item`: `display:none` y `aria-hidden=true`
  - cards con `item`: restauración explícita de visibilidad.

### product.html
- En `renderRealEstateProduct`:
  - CTA bridge principal cambia de `id="buy-btn"` a `id="bridge-contact-btn"`.
  - se añade `data-bridge-contact="true"` para separar hook bridge/legacy.

### marketplace.html
- Sin cambios de código en esta fase (se mantuvo como baseline del QA runtime).

## QA runtime scripted
Se creó `scripts/bridge-runtime-qa.js` con checks estáticos/semánticos para:
- presencia de bridge principal por archivo
- presencia de fallback legacy explícito
- anti-mezcla en puntos críticos
- hooks/selectores esperados
- SEO/canonical/meta hooks en bridge donde aplica
- estructura HTML básica

### Resultado
- `node --check scripts/bridge-runtime-qa.js` -> PASS
- `node scripts/bridge-runtime-qa.js` -> PASS
  - `index.html`: PASS
  - `marketplace.html`: PASS
  - `product.html`: PASS

## Validaciones obligatorias ejecutadas
- `git diff -- index.html marketplace.html product.html` -> OK
- `node --check scripts/bridge-runtime-qa.js` -> OK
- `node scripts/bridge-runtime-qa.js` -> OK
- chequeo básico HTML 3 archivos -> OK
- `git diff --cached --name-only` -> vacío
- no inclusión accidental de otros archivos en staging -> OK
- no rotura legacy (a nivel estructural y fallback explícito) -> OK

## Riesgo residual y decisión actualizada
| file | riesgo residual | decisión |
|---|---|---|
| `index.html` | medio-alto | `needs_more_work` |
| `marketplace.html` | alto | `reject_for_now` |
| `product.html` | medio-alto | `needs_more_work` |

## Viabilidad de split commit
- Estado: **no viable todavía**.
- Justificación: los checks runtime pasan, pero sigue faltando QA manual/funcional visual de alto impacto en superficies comerciales.

## Siguiente fase recomendada
FASE 31 - Manual Scenario QA Matrix + Bridge Kill-Switch Tightening (sin push):
- matriz de escenarios manuales bridge ON/OFF para home/marketplace/product
- endurecer kill-switch para activación bridge en superficies públicas
- reevaluar gate para posible split commit.
