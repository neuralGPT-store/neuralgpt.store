# FASE 8 — XML sitemap y consolidación de canonicals públicos

Fecha: 2026-04-16

## 1. Archivos creados y modificados

### Creados

- `sitemap-real-estate.xml`
- `docs/migration-plan/phase-8-xml-sitemap-and-canonical-consolidation.md`

### Modificados

- `sitemap-real-estate.html`

## 2. Política de canonicals aplicada

Se mantiene una política conservadora y coherente con la arquitectura actual:

- `venta.html`
  - canonical a `/venta.html`
- `alquiler.html`
  - canonical a `/alquiler.html`
- `sitemap-real-estate.html`
  - canonical a `/sitemap-real-estate.html`
- `listing.html`
  - canonical a `/listing.html?slug={slug}`
- `pais.html`
  - canonical a `/pais.html?country={code}`
- `ciudad.html`
  - canonical a `/ciudad.html?city={slug}`
- `hub-pais.html`
  - canonical a `/hub-pais.html?country={code}`
- `hub-ciudad.html`
  - canonical a `/hub-ciudad.html?city={slug}`

### Criterio seguido

- Cada página pública nueva se autodeclara sobre su URL realmente operativa hoy.
- Los query params funcionales se mantienen dentro del canonical cuando forman parte de la identidad de la página.
- No se fuerza todavía una canonical hacia rutas limpias inexistentes.
- Esto evita inconsistencias mientras conviven páginas `.html`, query params y rutas legacy.

## 3. Qué URLs entran en `sitemap-real-estate.xml`

### Colecciones

- `/venta.html`
- `/alquiler.html`
- `/pais.html?country=es`
- `/pais.html?country=pt`
- `/ciudad.html?city=madrid`
- `/ciudad.html?city=milan`

### Índices y hubs

- `/sitemap-real-estate.html`
- `/hub-pais.html?country=es`
- `/hub-pais.html?country=pt`
- `/hub-ciudad.html?city=madrid`
- `/hub-ciudad.html?city=milan`

### Detalles destacados

- `/listing.html?slug=piso-senorial-reformado-barrio-salamanca-madrid`
- `/listing.html?slug=apartamento-ejecutivo-larga-duracion-estrela-lisboa`
- `/listing.html?slug=local-prime-esquina-brera-milan`
- `/listing.html?slug=activo-singular-rehabilitado-quartier-ainay-lyon`

## 4. Cómo convive con el sitemap legacy actual

- No se modifica el sitemap legacy principal en esta fase.
- `sitemap-real-estate.xml` queda como sitemap vertical específico, aislado y no destructivo.
- La integración con el sitemap general deberá hacerse en una fase posterior, idealmente:
  - desde un índice de sitemaps
  - o desde una referencia documentada en el sitemap principal

## 5. Límites actuales

- No existe todavía `sitemap.xml` global consolidado del vertical inmobiliario.
- Las URLs siguen siendo `.html` o query-based.
- Los canonicals dependen del runtime actual en varias páginas dinámicas.
- No hay todavía estrategia automática de actualización de `lastmod`.

## 6. Siguiente fase recomendada

FASE 9 — Índice maestro del vertical y limpieza progresiva de rutas bridge

Objetivo exacto:

- crear un índice maestro compacto del vertical inmobiliario
- revisar qué rutas bridge siguen siendo necesarias
- empezar a separar claramente:
  - rutas públicas SEO
  - rutas legacy
  - rutas puente internas
