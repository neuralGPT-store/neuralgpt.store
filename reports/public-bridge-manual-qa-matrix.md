# Public Bridge Manual QA Matrix

Generated at: 2026-04-16

## index.html

| escenario | precondición | comportamiento esperado | riesgo si falla | estado actual | acción correctiva |
|---|---|---|---|---|---|
| bridge activado con datos válidos | `?re_bridge=1` + feature flag `home` + dataset válido | métricas y cards se reemplazan por bridge sin residuos legacy | confusión de narrativa en home | pass (runtime) | completar QA visual manual de layout y copy |
| bridge activado con menos destacados | `?re_bridge=1` + model con menos items que cards existentes | cards sobrantes ocultas (`display:none`, `aria-hidden=true`) | mezcla SaaS/inmobiliario | pass (micro-fix aplicado) | mantener test visual de regresión |
| bridge desactivado | sin `?re_bridge=1` | home legacy íntegra | activación accidental | pass (kill-switch explícito) | ninguna |
| fallo de carga bridge | `?re_bridge=1` + error en datasets/adapters | no mutación parcial; se mantiene base legacy | home parcialmente mutada | pass parcial (guardas presentes) | añadir smoke manual en navegador con error simulado |
| coexistencia con rutas limpias | bridge activo en home | links a índice/sitemap inmobiliario sin romper navegación legacy | canibalización/confusión de navegación | pass parcial | validar wording final en QA editorial |

## marketplace.html

| escenario | precondición | comportamiento esperado | riesgo si falla | estado actual | acción correctiva |
|---|---|---|---|---|---|
| bridge activado con listings válidos | `?re_bridge=1` + flag `marketplace` + model catalog válido | catálogo bridge completo, sin mezcla renderer legacy | mezcla de inventario/copy | pass (runtime) | QA manual de navegación y cards |
| bridge activado con filtros activos | bridge activo + filtros de operación/tipo/país/zona | filtrado coherente, contador bridge y ordenación bridge | resultados incoherentes | pass (runtime) | QA manual de combinatorias críticas |
| bridge activado con dataset vacío | bridge activo + model sin catalog válido | aborta bridge y vuelve a legacy | pantalla vacía o semiestado | pass (kill-switch por validación mínima) | ninguna |
| bridge desactivado | sin `?re_bridge=1` | carga legacy software | activación accidental | pass (kill-switch explícito) | ninguna |
| fallo de carga datasets | `?re_bridge=1` + error de carga | reset de estado bridge + fallback legacy | medio-render bridge + fallback roto | pass (fallback endurecido) | test manual de red simulada en local |
| fallback total a legacy | `usedBridge=false` o catch error | `resetMarketplaceBridgeState()` + `loadLegacyMarketplace()` | mezcla de estados | pass (runtime) | ninguna |
| riesgo mezcla catálogo software vs bridge | bridge activo con datos mixtos | validación mínima de card evita render bridge inválido | cards híbridas rotas | pass (validación mínima aplicada) | ampliar validación si aparecen nuevos campos obligatorios |

## product.html

| escenario | precondición | comportamiento esperado | riesgo si falla | estado actual | acción correctiva |
|---|---|---|---|---|---|
| bridge activado con slug válido | `?re_bridge=1` + flag `product` + slug resoluble | render inmobiliario completo con canonical/meta bridge | ficha inconsistente | pass (runtime) | QA manual de contenido/semántica |
| bridge activado con slug inválido | `?re_bridge=1` + slug no resoluble | bridge aborta y cae a legacy | pantalla rota | pass (guardas + fallback) | ninguna |
| bridge desactivado | sin `?re_bridge=1` | flujo legacy intacto | activación accidental | pass (kill-switch explícito) | ninguna |
| fallo de carga bridge | `?re_bridge=1` + error datasets/adapters | catch -> reset bridge state -> `legacyInitProduct()` | medio-render bridge + legacy | pass (fallback endurecido) | test manual con fallo forzado |
| fallback a legacyInitProduct | `usedBridge=false` | rama then ejecuta reset + legacy | pérdida de continuidad | pass (runtime) | ninguna |
| aislamiento de Stripe legacy | modo bridge activo | CTA bridge sin `buy-btn` legacy; Stripe solo en legacy | contaminación del circuito de compra | pass (micro-fix aplicado) | ninguna |
| riesgo mezcla CTA bridge vs CTA legacy | bridge activo/inactivo | nunca coexistencia funcional ambigua de hooks | clicks a flujo incorrecto | pass parcial | QA manual de interacción en mobile/desktop |

## Resumen de estado
- `index.html`: `needs_more_work`
- `marketplace.html`: `needs_more_work`
- `product.html`: `needs_more_work`
- split commit viable: `no`

Motivo del `no`:
- checks runtime en verde, pero falta cierre de QA manual visual/funcional completa en superficies comerciales críticas.
