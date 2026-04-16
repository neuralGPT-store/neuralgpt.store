# FASE 9 — Índice maestro del vertical y depuración controlada de rutas puente

Fecha: 2026-04-16

## 1. Archivos creados y modificados

### Creados

- `real-estate-index.html`
- `docs/migration-plan/phase-9-real-estate-index-and-route-separation.md`

### Modificados

- `sitemap-real-estate.html`
- `listing.html`
- `venta.html`
- `alquiler.html`
- `pais.html`
- `ciudad.html`
- `hub-pais.html`
- `hub-ciudad.html`
- `index.html`

## 2. Definición clara de capas

### Rutas públicas SEO

Son las rutas que deben enlazarse públicamente a partir de ahora:

- `real-estate-index.html`
- `venta.html`
- `alquiler.html`
- `pais.html?country=...`
- `ciudad.html?city=...`
- `listing.html?slug=...`
- `sitemap-real-estate.html`
- `sitemap-real-estate.xml`
- `hub-pais.html?country=...`
- `hub-ciudad.html?city=...`

### Rutas bridge

Se mantienen como transición técnica y no se eliminan:

- `marketplace.html?re_bridge=1`
- modo inmobiliario transicional dentro de `product.html`

Estas rutas siguen siendo útiles para compatibilidad y validación, pero no deben liderar el enlazado público del vertical.

### Rutas legacy

Se mantienen sin romper:

- `product.html`
- catálogo software histórico
- checkout Stripe legacy

## 3. Qué debe enlazarse públicamente a partir de ahora

La puerta de entrada pública recomendada pasa a ser:

- `real-estate-index.html`

Desde esa página se distribuye la navegación hacia:

- colecciones
- países
- ciudades
- hubs
- sitemap HTML/XML
- listings destacados

## 4. Qué se mantiene como transición

- `marketplace.html?re_bridge=1` sigue existiendo para puente controlado.
- `product.html` sigue conviviendo como detalle legacy y superficie transicional.
- No se elimina ninguna ruta histórica en esta fase.

## 5. Cómo prepara la futura migración a rutas limpias

Esta fase deja una jerarquía más clara:

- índice maestro
- colecciones públicas
- hubs editoriales
- detalle público

Con esto resulta más sencillo migrar en una fase posterior a:

- `/venta`
- `/alquiler`
- `/pais/es`
- `/ciudad/madrid`
- `/listing/{slug}`

## 6. Límites actuales

- El vertical sigue conviviendo con plantillas `.html` y query params.
- El bridge sigue presente por necesidad de transición.
- El catálogo legacy no está desacoplado todavía a nivel de navegación global.
- La home principal sigue siendo híbrida fuera del bridge.

## 7. Siguiente fase recomendada

FASE 10 — Limpieza progresiva de exposición bridge y preparación de rutas limpias

Objetivo exacto:

- revisar qué enlaces públicos todavía apuntan a superficies puente
- consolidar qué páginas quedan ya como definitivas
- preparar un plan técnico para migrar de `.html` + query params a rutas limpias sin romper SEO ni compatibilidad
