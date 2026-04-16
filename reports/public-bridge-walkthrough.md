# Public Bridge Walkthrough (FASE 32)

Fecha: 2026-04-16
Ámbito: `index.html`, `marketplace.html`, `product.html`
Método: walkthrough manual controlado por inspección de código + validación scripted (`scripts/bridge-runtime-qa.js`).

## index.html

| Escenario | Precondición | Resultado esperado | Resultado observado por inspección | Riesgo residual | Severidad | Decisión local |
|---|---|---|---|---|---|---|
| Home con bridge OFF | Sin `?re_bridge=1` o sin feature flag `home` | No activar bridge, mantener home legacy | `isHomeBridgeEnabled` exige `re_bridge=1` y `shouldUseRealEstateMode('home', settings)` | Muy bajo | Baja | OK |
| Home con bridge ON y datos válidos | `?re_bridge=1`, flag ON, `featuredListings` válido | Render bridge de métricas y destacados | `tryInitRealEstateHomepageBridge` aplica métricas y cards bridge | Persisten bloques SaaS globales fuera de sección destacada | Media | OK con reservas |
| Home con bridge ON y menos destacados | Menos items que cards disponibles | Sin mezcla visual parcial | Cards sobrantes se ocultan con `display:none` + `aria-hidden` | Bajo | Baja | OK |
| Home con fallo de bridge | Error cargando data/adapters o modelo inválido | No romper home | La función retorna `false`; no hay mutación bridge destructiva | No hay fallback visual explícito porque base ya es legacy, aceptable | Baja | OK |
| Coherencia enlaces rutas limpias | Bridge ON | Enlaces útiles sin canibalización agresiva | Inserta enlaces a `/real-estate-index.html` y `/sitemap-real-estate.html` | Riesgo bajo de distracción, no de rotura | Baja | OK |
| Ausencia mezcla SaaS/inmobiliario | Bridge ON | Home claramente coherente | Bridge solo transforma una sección, resto home sigue SaaS | Mezcla de narrativa en home principal | Media | Needs hardening |

## marketplace.html

| Escenario | Precondición | Resultado esperado | Resultado observado por inspección | Riesgo residual | Severidad | Decisión local |
|---|---|---|---|---|---|---|
| Bridge OFF | Sin `?re_bridge=1` o flag `marketplace` OFF | Legacy completo de software | `bootstrapMarketplacePage` cae a `loadLegacyMarketplace` + reset bridge | Muy bajo | Baja | OK |
| Bridge ON dataset válido | `?re_bridge=1`, flag ON, catálogo bridge válido | Catálogo inmobiliario consistente | `tryInitRealEstateMarketplace` valida modelo y activa estado bridge | Riesgo moderado de copy híbrido en componentes compartidos | Media | OK con reservas |
| Bridge ON dataset vacío | Catálogo bridge vacío | Fallback legacy completo | `if(!model.catalog.length) return false` y then ejecuta fallback legacy | Bajo | Baja | OK |
| Bridge ON con filtros activos | Bridge activo con interacción | Filtros, contador y cards coherentes | Rama específica bridge en `applyFilters`, contador y renderer dedicado | Taxonomía bridge reutiliza controles legacy; aceptable pero frágil | Media | Needs hardening |
| Bridge ON fallo datasets | Error en carga de datos | Fallback legacy sin estado corrupto | `catch` hace `resetMarketplaceBridgeState()` y `loadLegacyMarketplace()` | Bajo | Baja | OK |
| Fallback total legacy | Cualquier error bridge | Legacy íntegro | Presente en `then` y `catch` con reset explícito | Muy bajo | Baja | OK |
| No mezcla software/listings | Bridge ON | No combinar catálogos | `CATALOG = model.catalog.slice()` y renderer condicionado por `state.active` | Riesgo bajo-medio por estilos y textos compartidos | Media | OK con vigilancia |

## product.html

| Escenario | Precondición | Resultado esperado | Resultado observado por inspección | Riesgo residual | Severidad | Decisión local |
|---|---|---|---|---|---|---|
| Bridge OFF | Sin `?re_bridge=1` o flag `product` OFF | Flujo legacy intacto | `bootstrapProductPage` cae a `legacyInitProduct()` | Muy bajo | Baja | OK |
| Bridge ON slug válido | `?re_bridge=1`, flag ON, slug resoluble | Render detail inmobiliario estable | `resolveListingFromQuery` + `renderRealEstateProduct` | Bajo | Baja | OK |
| Bridge ON slug inválido | `slug` sin match | No default ambiguo, fallback legacy controlado | Micro-fix aplicado: `productId = params.get('id') || (params.get('slug') ? '' : 'ghostwriter')` | Bajo | Baja | OK |
| Bridge ON fallo de carga | Error en data/adapters | Reset y fallback legacy explícito | `catch` => `deactivateRealEstateProductState(); legacyInitProduct();` | Muy bajo | Baja | OK |
| Fallback a legacyInitProduct | Bridge no usable | Legacy de producto sin rotura | Rama `then` también hace fallback endurecido | Muy bajo | Baja | OK |
| Aislamiento Stripe legacy | Bridge ON/OFF | Stripe legacy no contaminado | `NeuralStripe.checkout` y `buy-btn` legacy permanecen; bridge usa `bridge-contact-btn` | Bajo | Baja | OK |
| No mezcla CTA bridge/legacy | Bridge ON | CTA inmobiliario aislado | CTA bridge en buy-box propio, buy legacy fuera del flujo bridge | Bajo | Baja | OK |

## Conclusión walkthrough

- `index.html`: aún presenta mezcla narrativa SaaS/inmobiliario cuando bridge está ON.
- `marketplace.html`: bridge funcional con fallback sólido, pero todavía comparte demasiada superficie de UI legacy.
- `product.html`: bridge más estable y controlado del trío.

Decisión operativa de gate:
- `index.html`: `needs_more_work`
- `marketplace.html`: `needs_more_work`
- `product.html`: `approved_for_split_commit` (aislado), pero condicionado al criterio global del bridge.
