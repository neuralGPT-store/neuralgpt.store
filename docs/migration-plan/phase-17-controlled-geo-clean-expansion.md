# FASE 17 - Expansión SEO controlada geo mínima

Fecha: 2026-04-16

## Objetivo ejecutado

Publicar solo una expansión geográfica mínima del subset limpio mediante `/pais/es/` y `/ciudad/madrid/`, con convivencia explícita frente a rutas `.html` existentes y sin activar 301.

## Archivos creados

- `pais/es/index.html`
- `ciudad/madrid/index.html`
- `docs/migration-plan/clean-route-geo-pilot-status.json`
- `docs/migration-plan/phase-17-controlled-geo-clean-expansion.md`

## Archivos modificados

- `sitemap-real-estate.xml`
- `sitemap-real-estate.html`
- `real-estate-index.html`
- `pais.html`
- `ciudad.html`

## Publicación limpia real (solo fase 17)

- `/pais/es/`
- `/ciudad/madrid/`

## Aún no publicar fuera de LAB

- `/hub/pais/{slug}`
- `/hub/ciudad/{slug}`
- más países limpios
- más ciudades limpias
- más listings limpios

## Integración SEO controlada aplicada

### Sitemap XML (`sitemap-real-estate.xml`)

Se añadieron en bloque controlado y de prioridad moderada:

- `https://neuralgpt.store/pais/es/`
- `https://neuralgpt.store/ciudad/madrid/`

Sin eliminar ni sustituir entradas legacy (`pais.html?country=...`, `ciudad.html?city=...`).

### Sitemap HTML (`sitemap-real-estate.html`)

- Se añadieron `/pais/es/` y `/ciudad/madrid/` al bloque de piloto limpio.
- Se añadieron enlaces prudentes en secciones de países y ciudades como “piloto limpio”.
- Se mantuvo la nota de convivencia y límites (sin hubs limpios publicados).

## Descubrimiento interno mínimo

- `pais.html?country=es`: añade botón condicional a `/pais/es/`.
- `ciudad.html?city=madrid`: añade botón condicional a `/ciudad/madrid/`.
- `real-estate-index.html`: añade entradas discretas a `España (geo limpio piloto)` y `Madrid (geo limpio piloto)`.
- `sitemap-real-estate.html`: añade enlaces de descubrimiento a las dos rutas limpias nuevas.

## Política de convivencia SEO (sin 301)

- Las nuevas rutas limpias geográficas usan self-canonical.
- Las rutas legacy geográficas (`pais.html` y `ciudad.html`) mantienen canonical y rol operativo actuales.
- Se admite duplicidad temporal controlada entre limpio y legacy para medir señales antes de ampliar.

## Coste, rendimiento y escalabilidad

- No se añadieron dependencias nuevas.
- No se añadió JS pesado ni cómputo dinámico adicional.
- Rutas nuevas estáticas, aptas para cache agresiva en Cloudflare/GitHub Pages.
- Sin incremento estructural de coste operativo en fase temprana.

## Nota de control de repositorio (`docs/` ignorado)

Estado detectado: `.gitignore` incluye `docs/` (duplicado), por lo que los entregables de migración no entrarán al commit de forma normal.

Recomendación antes del push final:

1. decidir si `docs/migration-plan` debe versionarse en Git (recomendado para trazabilidad de fases)
2. ajustar `.gitignore` en fase de empaquetado final para permitir esa ruta
3. mantener bloqueado el resto de documentación sensible si aplica

No se modificó `.gitignore` en esta fase, por restricción operativa.

## Siguiente fase recomendada

FASE 18 - Segundo piloto geo mínimo + control de canibalización:

- publicar solo un segundo país limpio (`/pais/pt/`) y una segunda ciudad limpia (`/ciudad/lisboa/`)
- mantener hubs limpios fuera de publicación
- añadir enlazado mínimo desde equivalentes legacy
- comparar señales de indexación y canibalización entre ES/Madrid y PT/Lisboa antes de ampliar catálogo geo
