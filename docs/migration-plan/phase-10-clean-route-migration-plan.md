# FASE 10 — Limpieza progresiva de exposición bridge y preparación de migración a rutas limpias

Fecha de auditoría: 2026-04-16  
Ámbito auditado: repo local real de `neuralgpt.store` sin red, sin instalar dependencias y sin aplicar migraciones irreversibles.

## 1. Auditoría de exposición actual

### 1.1 Enlaces internos que ya apuntan a rutas públicas SEO del vertical

Hallazgos verificables:

- `real-estate-index.html` enlaza a:
  - `/venta.html`
  - `/alquiler.html`
  - `/sitemap-real-estate.html`
  - `/sitemap-real-estate.xml`
  - `/pais.html?country=...`
  - `/ciudad.html?city=...`
  - `/hub-pais.html?country=...`
  - `/hub-ciudad.html?city=...`
  - `/listing.html?slug=...`
- `sitemap-real-estate.html` enlaza a:
  - `/real-estate-index.html`
  - `/venta.html`
  - `/alquiler.html`
  - `/pais.html?country=...`
  - `/ciudad.html?city=...`
  - `/hub-pais.html?country=...`
  - `/hub-ciudad.html?city=...`
  - `/listing.html?slug=...`
- `venta.html`, `alquiler.html`, `pais.html` y `ciudad.html` enlazan a colecciones públicas, hubs, `listing.html` y `real-estate-index.html`.
- `listing.html` enlaza a:
  - `/real-estate-index.html`
  - la colección pública por operación (`/venta.html` o `/alquiler.html`)
  - `/pais.html?country=...`
  - `/ciudad.html?city=...`
  - `/sitemap-real-estate.html`
- `hub-pais.html` y `hub-ciudad.html` enlazan a sus colecciones públicas y al sitemap inmobiliario.
- `index.html` en modo bridge añade acceso discreto a:
  - `/real-estate-index.html`
  - `/sitemap-real-estate.html`

Conclusión verificable:

- La malla interna del vertical ya prioriza rutas públicas SEO nuevas.
- `real-estate-index.html` y `sitemap-real-estate.html` actúan como puertas de entrada explícitas del vertical.

### 1.2 Enlaces internos que siguen apuntando a superficies bridge

Hallazgos verificables:

- `listing.html` mantiene una salida condicional al marketplace bridge:
  - `buildCollectionHref()` devuelve `/marketplace.html?re_bridge=1` cuando la query contiene `re_bridge=1`.
- `product.html` en modo inmobiliario bridge ajusta la miga de pan a:
  - `/marketplace.html?re_bridge=1`
- `marketplace.html` conserva un enlace de limpieza de filtros a:
  - `/marketplace.html?re_bridge=1`
- `sitemap-real-estate.html` y `real-estate-index.html` mencionan `marketplace.html?re_bridge=1` y `product.html` solo como capa transicional, no como destino principal.

Conclusión verificable:

- El bridge sigue expuesto por compatibilidad técnica y navegación reversible.
- No está sobrepromocionado dentro de las nuevas superficies SEO públicas.

### 1.3 Enlaces internos que siguen apuntando a legacy por necesidad

Hallazgos verificables:

- `index.html` sigue enlazando de forma principal al catálogo software legacy con múltiples enlaces a `/product.html?id=...`.
- `marketplace.html` legacy sigue enlazando a `/product.html?id=...`.
- `404.html` y `quantum.html` siguen enlazando a `/product.html?id=...`.
- `product.html` mantiene:
  - `legacyInitProduct()`
  - uso de `window.NeuralStripe`
  - URLs legacy tipo `https://neuralgpt.store/product.html?id=...`
- `marketplace.html` mantiene:
  - `loadLegacyMarketplace()`
  - `fetch('/data/product-catalog.json')`

Conclusión verificable:

- La capa legacy sigue viva y necesaria para compatibilidad.
- No debe tocarse todavía como parte de esta fase.

### 1.4 Piezas bridge que siguen siendo transicionales y no deben promocionarse

Piezas transicionales verificadas:

- `marketplace.html?re_bridge=1`
- modo inmobiliario de `product.html`
- acceso condicionado desde `listing.html` de vuelta a `/marketplace.html?re_bridge=1` cuando la sesión ya viene del bridge
- acceso discreto desde `index.html` bridge al índice/sitemap inmobiliario

Decisión de fase:

- No se eliminan.
- No se renombran.
- No se promocionan como rutas SEO canónicas del vertical.

## 2. Clasificación de rutas

### 2.1 Rutas públicas SEO ya consolidadas

- `real-estate-index.html`
- `sitemap-real-estate.html`
- `sitemap-real-estate.xml`
- `venta.html`
- `alquiler.html`
- `pais.html?country=...`
- `ciudad.html?city=...`
- `hub-pais.html?country=...`
- `hub-ciudad.html?city=...`
- `listing.html?slug=...`

Motivo:

- Estas rutas ya tienen enlazado interno propio dentro del vertical.
- Ya exponen copy inmobiliario, canonicals específicos o generación coherente de canonical, y navegación entre colección, hub, sitemap y detalle.

### 2.2 Rutas bridge transicionales

- `marketplace.html?re_bridge=1`
- modo inmobiliario en `product.html`
- `index.html` con soporte bridge inmobiliario parcial

Motivo:

- Siguen siendo útiles para compatibilidad, fallback y puente reversible.
- No son la arquitectura pública final del vertical.
- No deben concentrar la promoción interna futura.

### 2.3 Rutas legacy coexistentes

- `index.html`
- `marketplace.html`
- `product.html`
- rutas software históricas que enlazan a `product.html?id=...`
- catálogo cargado desde `data/product-catalog.json`

Motivo:

- Siguen sosteniendo el negocio legacy y el fallback técnico.
- No forman parte de la arquitectura SEO objetivo del vertical inmobiliario.

### 2.4 Caso específico: `index.html?re_bridge=1`

Estado verificable:

- No hay referencias internas verificadas a `index.html?re_bridge=1` como ruta pública.
- Sí existe integración bridge parcial dentro de `index.html`, pero no se ha detectado promoción explícita de la URL con ese query param.

Decisión:

- No clasificarla como ruta pública del vertical.
- Considerarla solo una variación técnica no promocionada.

## 3. Tabla de correspondencia a rutas limpias futuras

La siguiente tabla no se ejecuta todavía. Sirve como base de migración planificada.

| Ruta actual | Ruta limpia futura recomendada | Justificación |
| --- | --- | --- |
| `venta.html` | `/venta` | Mantiene intención exacta, limpia la extensión y ya funciona como colección principal. |
| `alquiler.html` | `/alquiler` | Mantiene intención exacta y consolida alquiler estable en una colección simple. |
| `pais.html?country=es` | `/pais/es` | El país ya está modelado por código y el patrón es escalable. |
| `ciudad.html?city=madrid` | `/ciudad/madrid` | El slug de ciudad ya existe y el patrón es coherente con la colección actual. |
| `hub-pais.html?country=es` | `/hub/pais/es` | Mantiene separado el hub editorial de la colección comercial. |
| `hub-ciudad.html?city=madrid` | `/hub/ciudad/madrid` | Mantiene separado el hub editorial por ciudad. |
| `listing.html?slug={slug}` | `/listing/{slug}` | Ya existe un slug estable y es la ruta natural de detalle. |
| `real-estate-index.html` | `/inmobiliario` | Funciona como puerta maestra del vertical; esta ruta es más limpia y más comercial que el nombre técnico actual. |
| `sitemap-real-estate.html` | `/inmobiliario/sitemap` | Mantiene función de mapa navegable del vertical sin competir con el sitemap XML. |
| `sitemap-real-estate.xml` | `/sitemap-real-estate.xml` | Ya es una ruta XML válida y no necesita cambio inmediato; más adelante podría integrarse en un índice global de sitemaps. |

## 4. Política futura de redirecciones

### 4.1 Páginas que deberían redirigir cuando existan rutas limpias

- `venta.html` hacia `/venta`
- `alquiler.html` hacia `/alquiler`
- `pais.html?country=...` hacia `/pais/{country}`
- `ciudad.html?city=...` hacia `/ciudad/{city}`
- `hub-pais.html?country=...` hacia `/hub/pais/{country}`
- `hub-ciudad.html?city=...` hacia `/hub/ciudad/{city}`
- `listing.html?slug=...` hacia `/listing/{slug}`
- `real-estate-index.html` hacia `/inmobiliario`
- `sitemap-real-estate.html` hacia `/inmobiliario/sitemap`

### 4.2 Páginas que deberían quedarse como puente temporal

- `marketplace.html?re_bridge=1`
- modo inmobiliario en `product.html`
- `index.html` con integración bridge parcial

Motivo:

- Estas superficies todavía soportan fallback y transición sin romper el legacy.
- Redirigirlas demasiado pronto aumentaría el riesgo de pérdida de compatibilidad interna.

### 4.3 Páginas que no deberían redirigir todavía

- `marketplace.html`
- `product.html`
- `index.html`

Motivo:

- Siguen siendo parte del stack legacy operativo.
- Aún conviven con Stripe legacy, catálogo software y rutas históricas reales del proyecto.

## 5. Política futura de canonicals

### 5.1 Política actual recomendada hasta que existan rutas limpias

- Cada ruta pública SEO del vertical debe seguir autocanónica en su URL actual.
- Las rutas bridge no deben intentar competir como canónicas del vertical.
- Las rutas legacy mantienen su canonical legacy actual mientras sigan vivas.

### 5.2 Política cuando existan rutas limpias

- `/venta` será canonical de la colección de venta.
- `/alquiler` será canonical de la colección de alquiler.
- `/pais/{country}` será canonical de la colección por país.
- `/ciudad/{city}` será canonical de la colección por ciudad.
- `/hub/pais/{country}` será canonical del hub editorial de país.
- `/hub/ciudad/{city}` será canonical del hub editorial de ciudad.
- `/listing/{slug}` será canonical de detalle.
- `/inmobiliario` será canonical de la portada maestra del vertical.
- `/inmobiliario/sitemap` será canonical del mapa HTML del vertical.

### 5.3 Qué deberá cambiar primero

- `listing.html` será la primera candidata a mover canonical a `/listing/{slug}`.
- Después deberán migrarse `venta.html` y `alquiler.html`.
- Después `pais.html` y `ciudad.html`.
- Después hubs y portada maestra.

Motivo:

- El detalle y las colecciones principales concentran la mayor utilidad comercial y SEO.

## 6. Lista priorizada de enlaces internos a actualizar más adelante

Prioridad alta:

1. enlaces desde `listing.html` hacia la futura ruta limpia de detalle autorreferenciada
2. enlaces desde `venta.html` y `alquiler.html` a `/listing/{slug}`
3. enlaces desde `pais.html` y `ciudad.html` a `/listing/{slug}`
4. enlaces desde `real-estate-index.html` a colecciones limpias
5. enlaces desde `sitemap-real-estate.html` a colecciones y detalles limpios

Prioridad media:

1. enlaces desde `hub-pais.html` y `hub-ciudad.html` a colecciones limpias
2. enlaces discretos desde `index.html` bridge a `/inmobiliario`
3. enlaces internos de salida desde `listing.html` hacia `/pais/{country}` y `/ciudad/{city}`

Prioridad baja:

1. breadcrumbs bridge dentro de `product.html`
2. vuelta condicional desde `listing.html` a `/marketplace.html?re_bridge=1`
3. referencias documentales al bridge

## 7. Orden de transición recomendado para minimizar riesgo SEO

1. Mantener las rutas públicas actuales vivas y estables mientras se construyen equivalentes limpias.
2. Activar primero rutas limpias de detalle y colecciones principales.
3. Actualizar canonicals y enlazado interno hacia las nuevas rutas limpias.
4. Añadir redirecciones 301 desde las rutas `.html` públicas del vertical a sus equivalentes limpias.
5. Mantener `marketplace.html?re_bridge=1` y `product.html` como capa transicional mientras exista dependencia real del legacy.
6. Solo después revisar si el bridge puede quedar completamente despromocionado o aislado.

## 8. Ajustes de enlazado interno realizados en esta fase

Resultado:

- No se han aplicado cambios de enlazado en esta fase.

Justificación:

- La auditoría real no muestra sobreexposición excesiva del bridge en las superficies SEO nuevas.
- El bridge ya aparece documentado como transicional en `real-estate-index.html` y `sitemap-real-estate.html`.
- Tocar ahora enlaces técnicos de vuelta en `listing.html` o `product.html` añadiría riesgo sin mejorar de forma clara la arquitectura actual.

## 9. Riesgos y límites

- `marketplace.html` y `product.html` siguen mezclando responsabilidades legacy y bridge.
- `listing.html` sigue manteniendo una salida condicional al bridge para preservar navegación reversible.
- `index.html` sigue siendo principalmente una home software/legacy y no una home inmobiliaria pública.
- Las rutas limpias futuras todavía no existen en el repo.
- No se han implementado redirecciones.
- No se ha tocado el backend ni la capa de servidor, por lo que la migración a rutas limpias sigue siendo solo de planificación.

## 10. Siguiente fase recomendada

FASE 11 recomendada:

- preparar artefactos de compatibilidad para rutas limpias sin activarlas todavía
- crear un documento técnico de implementación por ruta limpia
- definir convenciones exactas de slugs, resolución y fallback
- preparar plantillas o wrappers de routing estático para:
  - `/inmobiliario`
  - `/venta`
  - `/alquiler`
  - `/pais/{slug}`
  - `/ciudad/{slug}`
  - `/hub/pais/{slug}`
  - `/hub/ciudad/{slug}`
  - `/listing/{slug}`
- dejar lista la estrategia de redirección 301 y actualización de canonical sin ejecutarla todavía
