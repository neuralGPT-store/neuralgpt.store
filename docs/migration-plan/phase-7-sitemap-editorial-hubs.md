# FASE 7 — Sitemap interno y hubs editoriales mínimos

Fecha: 2026-04-16

## 1. Archivos creados y modificados

### Creados

- `sitemap-real-estate.html`
- `hub-pais.html`
- `hub-ciudad.html`
- `docs/migration-plan/phase-7-sitemap-editorial-hubs.md`

### Modificados

- `data/taxonomy.json`
- `marketplace.html`
- `listing.html`
- `venta.html`
- `alquiler.html`
- `pais.html`
- `ciudad.html`
- `index.html`

## 2. Cómo funciona el sitemap interno

- `sitemap-real-estate.html` es un índice navegable del vertical inmobiliario.
- Renderiza enlaces reales hacia:
  - colecciones públicas
  - países disponibles
  - ciudades disponibles
  - detalles destacados
- Usa exclusivamente la base nueva:
  - `data/listings.json`
  - `data/taxonomy.json`
  - `data/site-settings.json`
  - `js/real-estate-data.js`
  - `js/real-estate-presenters.js`
  - `js/real-estate-adapters.js`
- Define:
  - `title`
  - `meta description`
  - `canonical`
  - breadcrumbs
  - intro breve
  - JSON-LD de colección

## 3. Cómo funcionan `hub-pais.html` y `hub-ciudad.html`

### `hub-pais.html`

- Resuelve país por query param:
  - `/hub-pais.html?country=es`
- Si existe país con datos:
  - compone un hub editorial breve
  - enlaza a la colección de país
  - enlaza al sitemap
  - muestra activos relevantes
- Si no hay datos:
  - muestra empty state elegante

### `hub-ciudad.html`

- Resuelve ciudad por query param:
  - `/hub-ciudad.html?city=madrid`
- Normaliza slugs de ciudad sin depender de backend.
- Si existe ciudad con datos:
  - compone un hub editorial breve
  - enlaza a la colección de ciudad
  - enlaza al sitemap
  - muestra activos relevantes
- Si no hay datos:
  - muestra empty state elegante

## 4. Impacto SEO e interlinking

- Se añade una capa de interlinking interno adicional:
  - `marketplace.html` bridge → sitemap
  - `listing.html` → sitemap
  - colecciones públicas → sitemap
  - país/ciudad → hubs editoriales
  - hubs editoriales → colecciones y fichas
  - `index.html` bridge → sitemap
- Esto mejora:
  - descubrimiento interno
  - profundidad de rastreo
  - distribución de enlaces internos hacia colecciones y detalles

## 5. Límites actuales

- Las rutas siguen siendo `.html` o query-based.
- Los hubs son mínimos y no sustituyen todavía una capa editorial real.
- No existe sitemap XML ni automatización de publicación.
- No hay módulos editoriales largos, comparativas ni contenido de apoyo adicional.

## 6. Siguiente fase recomendada

FASE 8 — Sitemap XML estático y refuerzo de canonicals públicos

Objetivo exacto:

- crear un `sitemap-real-estate.xml` estático mínimo
- consolidar canonicals previstos entre colección, hub y detalle
- preparar una página HTML de descubrimiento global más compacta
- dejar lista la transición posterior a rutas limpias sin query params
