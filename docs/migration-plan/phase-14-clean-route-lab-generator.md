# FASE 14 - Generador estatico minimo de rutas limpias en modo LAB

Fecha de ejecucion: 2026-04-16

## Objetivo de esta fase

Crear una capa de laboratorio aislada en `_lab_clean_routes/` para simular rutas limpias reales sin exponer cambios en produccion, sin mover canonicals publicos y sin activar 301.

## Archivos creados

- `scripts/generate-clean-route-lab.js`
- `_lab_clean_routes/inmobiliario/index.html`
- `_lab_clean_routes/venta/index.html`
- `_lab_clean_routes/alquiler/index.html`
- `_lab_clean_routes/pais/es/index.html`
- `_lab_clean_routes/ciudad/madrid/index.html`
- `_lab_clean_routes/hub/pais/es/index.html`
- `_lab_clean_routes/hub/ciudad/madrid/index.html`
- `_lab_clean_routes/listing/piso-senorial-reformado-barrio-salamanca-madrid/index.html`
- `docs/migration-plan/clean-route-lab-manifest.json`

## Como funciona el generador

Script:

- `node scripts/generate-clean-route-lab.js`

Flujo:

1. lee datasets reales:
   - `data/listings.json`
   - `data/taxonomy.json`
   - `data/site-settings.json`
2. valida existencia del listing de muestra:
   - `piso-senorial-reformado-barrio-salamanca-madrid`
3. regenera `_lab_clean_routes/` de forma idempotente
4. escribe 8 `index.html` estaticos con:
   - `title`
   - `meta description`
   - breadcrumbs
   - `meta robots` = `noindex,nofollow`
   - canonical interno LAB
   - comentario HTML de marca LAB
   - enlaces internos a rutas LAB validas

## Por que se genera en `_lab_clean_routes/` y no en raiz publica

- evita exposicion accidental de rutas finales
- evita competir con rutas publicas actuales del vertical
- permite QA de arquitectura limpia sin tocar produccion
- mantiene separada la validacion tecnica de la activacion SEO real

## Rutas futuras simuladas en este LAB

- `/inmobiliario` -> `_lab_clean_routes/inmobiliario/index.html`
- `/venta` -> `_lab_clean_routes/venta/index.html`
- `/alquiler` -> `_lab_clean_routes/alquiler/index.html`
- `/pais/es` -> `_lab_clean_routes/pais/es/index.html`
- `/ciudad/madrid` -> `_lab_clean_routes/ciudad/madrid/index.html`
- `/hub/pais/es` -> `_lab_clean_routes/hub/pais/es/index.html`
- `/hub/ciudad/madrid` -> `_lab_clean_routes/hub/ciudad/madrid/index.html`
- `/listing/piso-senorial-reformado-barrio-salamanca-madrid` -> `_lab_clean_routes/listing/piso-senorial-reformado-barrio-salamanca-madrid/index.html`

## Como se valida antes de pasar a rutas reales

Validaciones minimas obligatorias:

1. sintaxis del generador (`node --check`)
2. ejecucion del generador y creacion de las 8 rutas
3. existencia de cada `index.html` generado
4. presencia de:
   - `title`
   - `meta description`
   - breadcrumbs
   - `meta robots noindex,nofollow`
5. enlaces internos LAB apuntando a rutas LAB existentes
6. parseo JSON de datasets
7. verificacion de no rotura del legacy
8. verificacion de que no se han tocado paginas publicas existentes

## Que falta para convertir el LAB en publicacion real

1. generacion de rutas limpias reales en raiz publicada (fuera de LAB)
2. plan de activacion progresiva de enlaces internos productivos
3. cambio controlado de canonicals hacia rutas limpias reales
4. activacion de 301 cuando las rutas limpias esten estabilizadas
5. actualizacion de sitemap publico y validacion de rastreo

## Siguiente fase recomendada

FASE 15 - Piloto de publicacion limpia controlada fuera de LAB para un subset minimo, manteniendo coexistencia con `.html`, sin 301 y con validacion SEO tecnica antes de cambios globales.
