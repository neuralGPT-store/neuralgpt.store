# FASE 2 — Preparación de integración

Fecha: 2026-04-16

## 1. Archivos creados

- `assets/img/real-estate/placeholders/madrid-salamanca-1.svg`
- `assets/img/real-estate/placeholders/madrid-salamanca-2.svg`
- `assets/img/real-estate/placeholders/lisbon-estrela-1.svg`
- `assets/img/real-estate/placeholders/lisbon-estrela-2.svg`
- `assets/img/real-estate/placeholders/berlin-room-1.svg`
- `assets/img/real-estate/placeholders/milan-brera-1.svg`
- `assets/img/real-estate/placeholders/milan-brera-2.svg`
- `assets/img/real-estate/placeholders/rotterdam-warehouse-1.svg`
- `assets/img/real-estate/placeholders/valencia-land-1.svg`
- `assets/img/real-estate/placeholders/lyon-singular-1.svg`
- `assets/img/real-estate/placeholders/lyon-singular-2.svg`
- `scripts/validate-real-estate-data.js`
- `js/real-estate-presenters.js`
- `docs/migration-plan/phase-2-integration-prep.md`

## 2. Decisiones tomadas

### Placeholders SVG

- Se han creado placeholders SVG locales, sin herramientas externas.
- Se han alineado exactamente con los paths declarados en `data/listings.json`.
- La estética es sobria y patrimonial, sin lenguaje visual SaaS o software.
- Cada listing tiene al menos un placeholder válido y los listings con más de una imagen ahora apuntan a más de un SVG real.

### Validación estricta

- Se ha creado un validador específico y aislado del legacy:
  - `scripts/validate-real-estate-data.js`
- Valida:
  - existencia de datasets
  - JSON parseable
  - campos obligatorios por listing
  - enums contra `taxonomy.json`
  - unicidad de `id` y `slug`
  - coherencia entre `published_at` y `expiration_at`
  - badges máximos
  - arrays de imágenes y existencia de assets en disco
  - coordenadas válidas
  - coherencia de `supported_locales`
  - precios promocionales exactos
- Si falla, devuelve código distinto de cero.
- Si todo pasa, imprime resumen `OK`.

### Presenters puros

- Se ha creado una capa nueva, sin dependencia del sitio actual:
  - `js/real-estate-presenters.js`
- La capa no toca DOM.
- La capa no requiere globals legacy.
- La salida está pensada para futura conexión con cards, home y detalle.
- Se ha preparado `toListingSeoModel()` para dejar lista una capa SEO reutilizable.

## 3. Cómo prepara la integración futura

### Para `marketplace.html`

- `toListingCardViewModel(listing)` deja una estructura limpia para:
  - cards
  - grid
  - list view
  - etiquetas visuales
  - precio formateado
  - ubicación legible
- `toFeaturedListingCards(listings)` prepara una selección reutilizable para destacados.

### Para `product.html`

- `toListingDetailViewModel(listing)` deja listo el modelo de detalle:
  - copy principal
  - precio
  - superficie
  - metadatos
  - imágenes
  - CTA de contacto
  - canonical path sugerido

### Para `index.html`

- `toHomepageMetrics(siteSettings, listings)` prepara métricas limpias para:
  - destacados
  - ciudades
  - activos verificados
  - anunciantes activos
- La función usa placeholders de `site-settings.json` cuando existen.

## 4. Cómo ayuda al SEO

- `toListingSeoModel(listing, siteSettings)` deja preparados:
  - `title`
  - `description`
  - `canonicalPath`
  - `ogTitle`
  - `ogDescription`
  - `ogImage`
  - `schemaType`
  - `locale`
- Esto permite, en una fase posterior:
  - sustituir metadatos SaaS de producto por metadatos inmobiliarios
  - unificar Open Graph y canonical
  - preparar JSON-LD coherente por activo
  - evitar mezclar la lógica SEO con el render visual

## 5. Qué no se ha tocado todavía

- No se han modificado páginas visibles:
  - `index.html`
  - `marketplace.html`
  - `product.html`
  - `provider-register.html`
- No se ha conectado la nueva base inmobiliaria a la UI actual.
- No se ha modificado Stripe.
- No se han tocado flujos de pago.
- No se ha tocado el i18n actual.
- No se han eliminado residuos legacy.

## 6. Riesgos o límites actuales

- Los placeholders son ilustraciones SVG de base, no fotografía real ni material comercial definitivo.
- `toListingSeoModel()` propone `schemaType: "Offer"` como base inicial; el schema final deberá definirse cuando se conecte la ficha pública.
- Los presenters están preparados para un flujo estático sin bundler, no para framework.
- La ruta canónica sugerida es `/listing/{slug}`, pero esa ruta todavía no existe en la web pública actual.
- La capa sigue coexistiendo con el vertical software sin sustituirlo aún.

## 7. Resultado práctico de esta fase

La segunda capa técnica ya está preparada:

- assets coherentes para los nuevos anuncios
- validación estricta de la base inmobiliaria
- presenters puros para cards, detalle, home y SEO

Con esto, la siguiente fase ya puede empezar a conectar `marketplace.html`, `product.html` e `index.html` a la nueva base, de forma controlada y sin improvisación.
