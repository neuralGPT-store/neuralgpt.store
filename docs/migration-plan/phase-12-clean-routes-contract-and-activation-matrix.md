# FASE 12 — Contrato técnico de rutas limpias y matriz de activación progresiva

Fecha de ejecución: 2026-04-16  
Ámbito: definición documental y validación cruzada. No activa canonicals nuevos, no activa 301 y no modifica páginas públicas existentes.

## 1. Alcance de este contrato

Este documento define la especificación exacta de las futuras rutas limpias del vertical inmobiliario y fija una matriz de activación progresiva para:

- wrappers temporales
- canonicals futuros
- enlazado interno futuro
- redirecciones 301 futuras

Quedan fuera de esta fase:

- cambios en servidor
- rewrites
- cambios de canonical en producción
- cambios de enlaces públicos actuales
- desactivación del legacy

## 2. Convenciones del contrato

### 2.1 Fuente de verdad actual

Las fuentes reales verificadas del vertical siguen siendo:

- `real-estate-index.html`
- `venta.html`
- `alquiler.html`
- `pais.html?country=...`
- `ciudad.html?city=...`
- `hub-pais.html?country=...`
- `hub-ciudad.html?city=...`
- `listing.html?slug=...`

### 2.2 Fuente de datos del vertical

Rutas documentadas contra datasets reales del repo:

- `data/listings.json`
- `data/taxonomy.json`
- `data/site-settings.json`

### 2.3 Regla de slug

- países: slug de dos letras en minúscula, alineado con `country`
- ciudades: slug ASCII normalizado a partir del nombre de ciudad
- listing: slug ASCII estable ya existente en `data/listings.json`

### 2.4 Regla de coexistencia

- mientras no existan rutas limpias reales, la ruta pública principal sigue siendo la `.html` equivalente
- los wrappers son auxiliares de transición, no rutas objetivo finales
- las rutas bridge y legacy siguen vivas por compatibilidad

## 3. Contrato técnico por ruta futura

### 3.1 `/inmobiliario`

- propósito:
  - portada maestra del vertical inmobiliario
  - nodo editorial y comercial de entrada
- ruta actual equivalente:
  - `/real-estate-index.html`
- parámetros actuales de origen:
  - ninguno
- canonical actual:
  - `https://neuralgpt.store/real-estate-index.html`
- canonical futuro esperado:
  - `https://neuralgpt.store/inmobiliario`
- tipo de contenido:
  - `CollectionPage` de navegación maestra
- fuente de datos:
  - `data/listings.json`
  - `data/taxonomy.json`
  - `data/site-settings.json`
- breadcrumbs esperados:
  - `Inicio > Inmobiliario`
- enlaces internos entrantes clave:
  - `index.html` bridge discreto
  - `sitemap-real-estate.html`
  - `venta.html`
  - `alquiler.html`
  - `pais.html`
  - `ciudad.html`
  - `hub-pais.html`
  - `hub-ciudad.html`
  - `listing.html`
- enlaces internos salientes clave:
  - `/venta`
  - `/alquiler`
  - `/pais/{slug}`
  - `/ciudad/{slug}`
  - `/hub/pais/{slug}`
  - `/hub/ciudad/{slug}`
  - `/listing/{slug}`
  - `/inmobiliario/sitemap`
- riesgos SEO si se activa mal:
  - competir con `real-estate-index.html` si cambia el canonical antes de tener la ruta limpia real
  - crear duplicidad con `sitemap-real-estate.html` si se usa como sitemap en lugar de índice maestro

### 3.2 `/venta`

- propósito:
  - colección comercial principal de activos en venta
- ruta actual equivalente:
  - `/venta.html`
- parámetros actuales de origen:
  - ninguno
- canonical actual:
  - `https://neuralgpt.store/venta.html`
- canonical futuro esperado:
  - `https://neuralgpt.store/venta`
- tipo de contenido:
  - `CollectionPage`
- fuente de datos:
  - `data/listings.json`
  - `data/taxonomy.json`
  - `data/site-settings.json`
- breadcrumbs esperados:
  - `Inicio > Inmobiliario > Venta`
- enlaces internos entrantes clave:
  - `/inmobiliario`
  - `/inmobiliario/sitemap`
  - `listing` de operación venta
  - `ciudad` y `pais` cuando corresponda
- enlaces internos salientes clave:
  - `/listing/{slug}`
  - `/pais/{slug}`
  - `/ciudad/{slug}`
  - `/alquiler`
  - `/inmobiliario`
- riesgos SEO si se activa mal:
  - canibalización con `/venta.html`
  - pérdida de señales si los enlaces siguen apuntando mayoritariamente a `.html`

### 3.3 `/alquiler`

- propósito:
  - colección comercial de alquiler estable y larga estancia
- ruta actual equivalente:
  - `/alquiler.html`
- parámetros actuales de origen:
  - ninguno
- canonical actual:
  - `https://neuralgpt.store/alquiler.html`
- canonical futuro esperado:
  - `https://neuralgpt.store/alquiler`
- tipo de contenido:
  - `CollectionPage`
- fuente de datos:
  - `data/listings.json`
  - `data/taxonomy.json`
  - `data/site-settings.json`
- breadcrumbs esperados:
  - `Inicio > Inmobiliario > Alquiler`
- enlaces internos entrantes clave:
  - `/inmobiliario`
  - `/inmobiliario/sitemap`
  - `listing` de operación alquiler
  - `ciudad` y `pais` cuando corresponda
- enlaces internos salientes clave:
  - `/listing/{slug}`
  - `/pais/{slug}`
  - `/ciudad/{slug}`
  - `/venta`
  - `/inmobiliario`
- riesgos SEO si se activa mal:
  - mezcla de intención con `room_rent` si no se conserva el criterio actual del dataset
  - duplicidad con `/alquiler.html`

### 3.4 `/pais/{slug}`

- propósito:
  - colección pública por país
- ruta actual equivalente:
  - `/pais.html?country={slug}`
- parámetros actuales de origen:
  - `country`
- canonical actual:
  - `https://neuralgpt.store/pais.html?country={slug}`
- canonical futuro esperado:
  - `https://neuralgpt.store/pais/{slug}`
- tipo de contenido:
  - `CollectionPage` geográfica
- fuente de datos:
  - `data/listings.json`
  - `data/taxonomy.json`
  - `data/site-settings.json`
- breadcrumbs esperados:
  - `Inicio > Inmobiliario > País > {NombrePaís}`
- enlaces internos entrantes clave:
  - `/inmobiliario`
  - `/venta`
  - `/alquiler`
  - `/listing/{slug}`
  - `/hub/pais/{slug}`
  - `/inmobiliario/sitemap`
- enlaces internos salientes clave:
  - `/listing/{slug}`
  - `/ciudad/{slug}`
  - `/hub/pais/{slug}`
  - `/venta`
  - `/alquiler`
  - `/inmobiliario`
- riesgos SEO si se activa mal:
  - incoherencia entre código ISO y slug de país
  - pérdida de canonical exacto si la ruta limpia no conserva el país correcto

### 3.5 `/ciudad/{slug}`

- propósito:
  - colección pública por ciudad
- ruta actual equivalente:
  - `/ciudad.html?city={slug}`
- parámetros actuales de origen:
  - `city`
- canonical actual:
  - `https://neuralgpt.store/ciudad.html?city={slug}`
- canonical futuro esperado:
  - `https://neuralgpt.store/ciudad/{slug}`
- tipo de contenido:
  - `CollectionPage` geográfica
- fuente de datos:
  - `data/listings.json`
  - `data/taxonomy.json`
  - `data/site-settings.json`
- breadcrumbs esperados:
  - `Inicio > Inmobiliario > Ciudad > {NombreCiudad}`
- enlaces internos entrantes clave:
  - `/inmobiliario`
  - `/venta`
  - `/alquiler`
  - `/listing/{slug}`
  - `/hub/ciudad/{slug}`
  - `/inmobiliario/sitemap`
- enlaces internos salientes clave:
  - `/listing/{slug}`
  - `/hub/ciudad/{slug}`
  - `/pais/{slug}`
  - `/venta`
  - `/alquiler`
  - `/inmobiliario`
- riesgos SEO si se activa mal:
  - desalineación entre slug limpio y `normalizeSlug` actual
  - duplicidad si la ciudad sigue enlazada en masa a `ciudad.html?city=...`

### 3.6 `/hub/pais/{slug}`

- propósito:
  - hub editorial por país, separado de la colección comercial
- ruta actual equivalente:
  - `/hub-pais.html?country={slug}`
- parámetros actuales de origen:
  - `country`
- canonical actual:
  - `https://neuralgpt.store/hub-pais.html?country={slug}`
- canonical futuro esperado:
  - `https://neuralgpt.store/hub/pais/{slug}`
- tipo de contenido:
  - `CollectionPage` editorial
- fuente de datos:
  - `data/listings.json`
  - `data/taxonomy.json`
  - `data/site-settings.json`
- breadcrumbs esperados:
  - `Inicio > Inmobiliario > Hub país > {NombrePaís}`
- enlaces internos entrantes clave:
  - `/inmobiliario`
  - `/inmobiliario/sitemap`
  - `/pais/{slug}`
- enlaces internos salientes clave:
  - `/pais/{slug}`
  - `/listing/{slug}`
  - `/inmobiliario`
  - `/inmobiliario/sitemap`
- riesgos SEO si se activa mal:
  - competir con la colección por país si el contenido editorial no se distingue claramente
  - heredar señales comerciales y diluir intención editorial

### 3.7 `/hub/ciudad/{slug}`

- propósito:
  - hub editorial por ciudad, separado de la colección comercial
- ruta actual equivalente:
  - `/hub-ciudad.html?city={slug}`
- parámetros actuales de origen:
  - `city`
- canonical actual:
  - `https://neuralgpt.store/hub-ciudad.html?city={slug}`
- canonical futuro esperado:
  - `https://neuralgpt.store/hub/ciudad/{slug}`
- tipo de contenido:
  - `CollectionPage` editorial
- fuente de datos:
  - `data/listings.json`
  - `data/taxonomy.json`
  - `data/site-settings.json`
- breadcrumbs esperados:
  - `Inicio > Inmobiliario > Hub ciudad > {NombreCiudad}`
- enlaces internos entrantes clave:
  - `/inmobiliario`
  - `/inmobiliario/sitemap`
  - `/ciudad/{slug}`
- enlaces internos salientes clave:
  - `/ciudad/{slug}`
  - `/listing/{slug}`
  - `/inmobiliario`
  - `/inmobiliario/sitemap`
- riesgos SEO si se activa mal:
  - competir con la colección de ciudad
  - duplicar textos y enlazado sin valor diferencial

### 3.8 `/listing/{slug}`

- propósito:
  - detalle limpio definitivo de cada activo
- ruta actual equivalente:
  - `/listing.html?slug={slug}`
- parámetros actuales de origen:
  - `slug`
- canonical actual:
  - `https://neuralgpt.store/listing.html?slug={slug}`
- canonical futuro esperado:
  - `https://neuralgpt.store/listing/{slug}`
- tipo de contenido:
  - `RealEstateListing` / detalle de anuncio
- fuente de datos:
  - `data/listings.json`
  - `data/site-settings.json`
- breadcrumbs esperados:
  - `Inicio > Inmobiliario > {ColecciónOperación} > {Activo}`
- enlaces internos entrantes clave:
  - `/inmobiliario`
  - `/venta`
  - `/alquiler`
  - `/pais/{slug}`
  - `/ciudad/{slug}`
  - `/hub/pais/{slug}`
  - `/hub/ciudad/{slug}`
  - `/inmobiliario/sitemap`
- enlaces internos salientes clave:
  - `/venta` o `/alquiler`
  - `/pais/{slug}`
  - `/ciudad/{slug}`
  - `/inmobiliario`
  - `/inmobiliario/sitemap`
- riesgos SEO si se activa mal:
  - duplicación directa del detalle actual
  - pérdida de señales si el canonical cambia antes de que el enlace interno y la navegación apunten a la nueva ruta
  - riesgo de cadenas de redirección si primero pasa por wrapper y luego por `.html`

## 4. Matriz de activación progresiva

| fase | ruta futura | ruta actual equivalente | activar wrapper | cambiar canonical | actualizar enlaces internos | crear 301 futura | riesgo | dependencia previa | estado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 12A | `/listing/{slug}` | `/listing.html?slug={slug}` | sí, solo QA | no | no | no | medio | wrapper `listing-clean.html`, slug estable en dataset | preparado |
| 12B | `/venta` | `/venta.html` | sí, solo QA | no | no | no | bajo | wrapper `venta-clean.html`, detalle estable | preparado |
| 12C | `/alquiler` | `/alquiler.html` | sí, solo QA | no | no | no | bajo | wrapper `alquiler-clean.html`, detalle estable | preparado |
| 12D | `/pais/{slug}` | `/pais.html?country={slug}` | sí, solo QA | no | no | no | medio | wrapper `pais-clean.html`, slugs país validados | preparado |
| 12E | `/ciudad/{slug}` | `/ciudad.html?city={slug}` | sí, solo QA | no | no | no | medio | wrapper `ciudad-clean.html`, slugs ciudad validados | preparado |
| 12F | `/hub/pais/{slug}` | `/hub-pais.html?country={slug}` | sí, solo QA | no | no | no | medio | wrapper `hub-pais-clean.html`, colección país estable | preparado |
| 12G | `/hub/ciudad/{slug}` | `/hub-ciudad.html?city={slug}` | sí, solo QA | no | no | no | medio | wrapper `hub-ciudad-clean.html`, colección ciudad estable | preparado |
| 12H | `/inmobiliario` | `/real-estate-index.html` | sí, solo QA | no | no | no | bajo | wrapper `inmobiliario.html`, malla interna estable | preparado |
| futura-1 | `/listing/{slug}` | `/listing.html?slug={slug}` | ya existe | sí | sí, primero desde colecciones | sí | alto | ruta limpia real disponible y test SEO completo | pendiente |
| futura-2 | `/venta` | `/venta.html` | ya existe | sí | sí | sí | medio | `/listing/{slug}` activo | pendiente |
| futura-3 | `/alquiler` | `/alquiler.html` | ya existe | sí | sí | sí | medio | `/listing/{slug}` activo | pendiente |
| futura-4 | `/pais/{slug}` | `/pais.html?country={slug}` | ya existe | sí | sí | sí | medio | colecciones principales activadas | pendiente |
| futura-5 | `/ciudad/{slug}` | `/ciudad.html?city={slug}` | ya existe | sí | sí | sí | medio | colecciones principales activadas | pendiente |
| futura-6 | `/hub/pais/{slug}` | `/hub-pais.html?country={slug}` | ya existe | sí | sí | sí | medio | `/pais/{slug}` activo | pendiente |
| futura-7 | `/hub/ciudad/{slug}` | `/hub-ciudad.html?city={slug}` | ya existe | sí | sí | sí | medio | `/ciudad/{slug}` activo | pendiente |
| futura-8 | `/inmobiliario` | `/real-estate-index.html` | ya existe | sí | sí, al final | sí | medio | colecciones, geografía, hubs y detail ya migrados | pendiente |

## 5. Política futura de activación

### 5.1 Cuándo dejar de promocionar wrappers

Los wrappers deben dejar de promocionarse cuando se cumplan las tres condiciones:

1. exista una ruta limpia real navegable y estable
2. el canonical ya apunte a la ruta limpia real
3. el enlazado interno principal ya no dependa del wrapper para QA

Regla práctica:

- los wrappers nunca deben promocionarse como puerta pública principal
- su vida útil es técnica, no editorial ni comercial

### 5.2 Cuándo dejar de promocionar rutas `.html` actuales

Las rutas `.html` actuales deben dejar de promocionarse solo cuando:

1. la ruta limpia equivalente esté publicada
2. el canonical de la `.html` haya cambiado a la ruta limpia o la `.html` ya redirija
3. el enlazado interno haya sido actualizado
4. las pruebas de fallback y de rastreo interno estén cerradas

### 5.3 Orden recomendado de migración

Orden recomendado para minimizar riesgo SEO y de rotura:

1. `listing`
2. colecciones principales: `venta`, `alquiler`
3. colecciones geográficas: `pais/{slug}`, `ciudad/{slug}`
4. hubs editoriales: `hub/pais/{slug}`, `hub/ciudad/{slug}`
5. índice maestro: `/inmobiliario`

Justificación:

- `listing` concentra la URL más específica y con mayor intención transaccional
- las colecciones principales dependen del detalle para apuntar a una URL definitiva
- país y ciudad necesitan que detalle y colecciones base ya estén estabilizados
- los hubs deben migrar después de las colecciones para no competir antes de tiempo
- el índice maestro debe migrar al final, cuando ya pueda enlazar exclusivamente a rutas limpias

### 5.4 Orden que minimiza riesgo SEO y de rotura

- primero activar equivalentes limpios reales sin cambiar todavía 301 en masa
- después mover canonicals en detalle y colecciones principales
- después actualizar enlazado interno de las rutas públicas SEO
- después introducir 301 desde `.html`
- mantener bridge y legacy fuera de la transición principal hasta el final

## 6. Dependencias críticas previas a cualquier activación real

- disponibilidad real de rutas limpias en servidor o build
- preservación exacta del slug de listing
- preservación exacta del código de país
- preservación exacta del slug de ciudad normalizado
- validación de breadcrumbs y meta tags en cada ruta limpia
- actualización coordinada entre:
  - canonical
  - OG URL
  - enlaces internos
  - sitemap XML futuro

## 7. Incoherencias críticas detectadas

Resultado:

- no se ha detectado ninguna incoherencia documental crítica que exija tocar páginas o wrappers existentes en esta fase

Observación:

- la fase 10 ya apuntaba correctamente a mover primero detalle y colecciones principales; esta fase conserva esa lógica y la formaliza en matriz operativa

## 8. Estado de preparación actual

- contrato técnico: definido
- wrappers temporales: creados
- mapping estructurado: creado en CSV
- checklist operativo: creado
- activación real: no iniciada

## 9. Siguiente fase recomendada

FASE 13 recomendada:

- diseño técnico de publicación real de rutas limpias
- decisión de mecanismo de resolución:
  - rewrite estático
  - servidor
  - duplicado controlado de páginas
- definición de pruebas previas a:
  - cambio de canonical
  - actualización de enlaces internos
  - activación de 301
