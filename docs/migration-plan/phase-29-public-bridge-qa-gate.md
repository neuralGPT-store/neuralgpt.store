# Phase 29 - Public Bridge QA Gate + Split Commit Candidate (sin push)

## Alcance
QA dedicada y endurecimiento exclusivamente sobre:
- `index.html`
- `marketplace.html`
- `product.html`

Sin tocar el pack ya commiteado y sin incluir otras capas.

## Evidencia base
- Diff agregado en las 3 superficies: `+689 / -33`
  - `index.html`: `+87 / -0`
  - `marketplace.html`: `+332 / -24`
  - `product.html`: `+270 / -9`
- Fallback detectado por código:
  - home: `tryInitRealEstateHomepageBridge()` + retorno temprano cuando no hay modo bridge.
  - marketplace: `bootstrapMarketplacePage()` -> `tryInit...` y fallback explícito `loadLegacyMarketplace()`.
  - product: `bootstrapProductPage()` -> `tryInit...` y fallback explícito `legacyInitProduct()`.

## Corrección mínima aplicada
### `index.html`
Defecto detectado:
- cuando el bridge trae menos listings que cards visibles, quedaban cards legacy mezcladas con cards inmobiliarias.

Parche mínimo aplicado:
- en `applyRealEstateHomepageFeatured`:
  - ocultar cards sin item (`display:none`, `aria-hidden=true`)
  - restaurar visibilidad de cards con item (`display:''`, remove `aria-hidden`)

Impacto:
- reduce mezcla SaaS/inmobiliario en modo bridge sin tocar flujos legacy.

## Auditoría por superficie

### A) `index.html`
Qué cambia exactamente:
- inyección de scripts `real-estate-*`.
- bridge home: reemplazo de métricas y tarjetas de destacados en `#own-products`.
- nuevos enlaces internos a `real-estate-index.html` y `sitemap-real-estate.html`.

Dependencia bridge:
- `window.RealEstateData`, `window.RealEstateAdapters`, `shouldUseRealEstateMode('home')`.

Fallback:
- si bridge no aplica o falla, no se muta el contenido; la home legacy se mantiene.

Riesgo en home principal:
- alto: toca copy, métricas y hero cards de una superficie crítica.

Residuos SaaS cuando entra bridge:
- mitigado parcialmente con el parche de ocultación de cards sobrantes.

Riesgo de confusión con rutas limpias:
- medio: enlaces a índice/sitemap ayudan descubrimiento, pero introducen navegación paralela desde home general.

### B) `marketplace.html`
Qué cambia exactamente:
- bootstrap dual legacy/bridge.
- mutación SEO runtime (`title`, `meta`, `og`, `twitter`, `canonical`, JSON-LD).
- refactor de filtros/counter/sort/render para catálogo inmobiliario en modo bridge.
- copy y navegación interna orientada al vertical inmobiliario.

Fallback real:
- sí, explícito y robusto: `loadLegacyMarketplace()` ante no bridge o error.

Coherencia filtros/contador/cards/copy:
- coherente en modo bridge, pero la complejidad del bootstrap dual es alta.

Riesgo regresión bootstrap dual:
- alto: cambios amplios en lógica de catálogo y SEO dinámico en página comercial crítica.

Consistencia SEO sin canibalización absurda:
- razonable en intención (canonical base y taxonomía), pero requiere QA runtime dedicada antes de release.

### C) `product.html`
Qué cambia exactamente:
- bootstrap dual legacy/bridge.
- render alternativo completo de ficha inmobiliaria.
- mutación SEO runtime (`title/meta/og/canonical`) y JSON-LD `Offer`.
- reemplazo funcional de CTA/compra para contacto inmobiliario en modo bridge.

Estabilidad del detalle inmobiliario bridge:
- funcional a nivel de código, pero de alto impacto por reescritura extensa de UI/semántica.

Stripe/legacy protegidos:
- sí: fallback `legacyInitProduct()` y `stripe-checkout.js` permanece cargado para flujo legacy.

Metadatos/JSON-LD/canonical bajo control:
- sí, pero runtime y sin batería de verificación de SERP/previews en esta fase.

Riesgo de regresión:
- alto en página crítica de conversión.

## Checklist de aprobación/rechazo

| file | valor para release | madurez | riesgo | fallback | dependencia | blockers | decisión |
|---|---|---|---|---|---|---|---|
| `index.html` | medio-alto (puente visible) | media | alto | parcial/implícito OK | `RealEstateData` + `RealEstateAdapters` + flag home | superficie home crítica; falta QA visual/runtime integral | `needs_more_work` |
| `marketplace.html` | alto | media-baja | alto | explícito OK | `RealEstateData` + `RealEstateAdapters` + `RealEstatePresenters` + taxonomía SEO | SEO runtime + bootstrap dual complejo en página comercial | `reject_for_now` |
| `product.html` | alto | media-baja | alto | explícito OK | `RealEstateData` + `RealEstateAdapters` + `RealEstatePresenters` + listing query | reemplazo amplio de ficha y CTA en página de conversión | `reject_for_now` |

## Decisión de split commit
- Estado: **NO viable en esta fase**.
- Acción: no se prepara staging para `index.html`, `marketplace.html`, `product.html`.
- Motivo: riesgo agregado todavía superior al beneficio para RC inicial, pese al hardening puntual en `index.html`.

## Validaciones ejecutadas
- `git diff -- index.html marketplace.html product.html` -> OK
- chequeo estructura HTML (`<!DOCTYPE html>` + `</html>`) en los 3 -> OK
- verificación de fallback real por presencia de funciones de fallback/bootstraps -> OK
- `git diff --cached --name-only` -> vacío (sin staging accidental)
- verificación de no inclusión accidental `_lab_clean_routes/` ni `*-clean.html` -> OK
- no rotura del legacy (validación estructural y rutas legacy no alteradas fuera de estas tres superficies) -> OK

## Siguiente fase recomendada
FASE 30 - Bridge Stabilization Micro-Fixes + Runtime QA Scripted (sin push):
- micro-fixes no disruptivos en `marketplace.html` y `product.html`
- checklist reproducible de QA manual/scripted para bridge ON/OFF
- nuevo gate para decidir si el split commit pasa a `approved_for_split_commit`.
