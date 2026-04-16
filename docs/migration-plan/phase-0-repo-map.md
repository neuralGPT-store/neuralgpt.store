# FASE 0 — Mapa técnico del repo real

Fecha de inspección: 2026-04-16  
Repositorio inspeccionado: `neuralgpt.store`  
Alcance: inspección local del repo, sin red, sin instalación de dependencias, sin cambios en páginas visibles.

## 0. Criterio de lectura

- Este documento recoge solo hechos verificables en el repo actual.
- Cuando una pieza parece inútil pero no puede demostrarse al 100% desde el repo, se marca como `sospechosa`.
- Cuando una referencia apunta a algo que no existe en el repo inspeccionado, se marca como `rotura verificada`.

## 1. Mapa completo de páginas actuales

| Archivo | Propósito actual verificable | Estado propuesto | Prioridad |
|---|---|---:|---:|
| `/index.html` | Home principal del marketplace de software e IA, con hero, catálogo destacado, CTA a compra y registro de vendedores | Reconvertir | Alta |
| `/marketplace.html` | Listado principal de productos software con filtros, ordenación y grid | Reconvertir | Alta |
| `/product.html` | Ficha de producto software con Stripe, reviews y JSON-LD de producto | Reconvertir | Alta |
| `/provider-register.html` | Formulario de alta de vendedores de software | Reconvertir | Alta |
| `/providers.html` | Directorio de proveedores/vendedores de software | Reconvertir | Media |
| `/providers-view.html` | Perfil de proveedor con placeholders y formulario de contacto | Reconvertir | Media |
| `/vendor-onboarding.html` | Guía de onboarding para vendedores de software | Reconvertir | Media |
| `/pricing.html` | Página de precios/comisiones del marketplace actual | Reconvertir | Media |
| `/category.html` | Página de categorías de software enlazando a filtros del marketplace | Reconvertir | Media |
| `/about.html` | Página corporativa “sobre nosotros” orientada a marketplace de software | Reconvertir | Media |
| `/contact.html` | Página de contacto con formulario y emails del proyecto | Conservar con ajuste de vertical | Media |
| `/terms.html` | Términos de servicio del marketplace de software digital | Reconvertir | Media |
| `/privacy.html` | Política de privacidad del proyecto actual | Reconvertir | Media |
| `/legal.html` | Aviso legal del marketplace de software digital | Reconvertir | Media |
| `/commercial-terms.html` | Términos comerciales para vendedores y Stripe Connect | Reconvertir o eliminar más adelante | Media |
| `/security.html` | Política de seguridad y divulgación responsable | Conservar con ajuste menor | Baja |
| `/404.html` | Página 404 con links a productos y marketplace actuales | Reconvertir | Media |
| `/sponsors.html` | Página de partners/patrocinios del marketplace actual | Eliminar o reconvertir muy tarde | Baja |
| `/blog.html` | Redirección inmediata a `/marketplace.html` | Eliminar o reconvertir muy tarde | Baja |
| `/trends.html` | Redirección inmediata a `/marketplace.html` | Eliminar o reconvertir muy tarde | Baja |
| `/provider-hub.html` | Redirección inmediata a `/providers.html` | Eliminar o mantener como redirect temporal | Baja |
| `/security-enterprise.html` | Redirección inmediata a `/security.html` | Mantener temporalmente o eliminar más tarde | Baja |
| `/security-insurers.html` | Redirección inmediata a `/security.html` | Mantener temporalmente o eliminar más tarde | Baja |
| `/security-pc.html` | Redirección inmediata a `/security.html` | Mantener temporalmente o eliminar más tarde | Baja |
| `/security-pyme.html` | Redirección inmediata a `/security.html` | Mantener temporalmente o eliminar más tarde | Baja |
| `/index_maintenance.html` | Página estática de mantenimiento | Conservar | Baja |
| `/api.html` | Página temporal “API no disponible” | Eliminar o reconvertir muy tarde | Baja |
| `/guides.html` | Página temporal “Guías no disponibles” | Eliminar o reconvertir muy tarde | Baja |
| `/console.html` | Página marcada como removida, con restos visuales de consola | Eliminar | Baja |
| `/quantum.html` | Landing de “Quantum Pass” con pricing separado del negocio principal | Eliminar o aislar | Baja |

## 2. Mapa de cargas por página

### 2.1 Páginas principales

#### `/index.html`

- CSS:
  - `/css/main.css`
  - `/css/theme-override.css`
- JS externos:
  - `/js/i18n-global.js`
  - `/js/agent-chat.js`
- Scripts inline relevantes:
  - JSON-LD `WebSite`
  - lógica inline de búsqueda `doSearch()`
  - contadores animados
  - toggle de navegación móvil
  - newsletter simulada
  - carrusel promo reel
- Datasets JSON consumidos:
  - No consume JSON por `fetch()` desde la propia página
- Endpoints usados:
  - Ninguno verificado en esta página
- Referencias rotas o dudosas:
  - Copy y navegación 100% atados a software, productos digitales, vendedores de software y Stripe
  - `agent-chat.js` depende de `data/agent-kb.json`, orientado a software

#### `/marketplace.html`

- CSS:
  - `/css/main.css`
  - `/css/theme-override.css`
- JS externos:
  - `/js/i18n-global.js`
  - `/js/agent-chat.js`
- Scripts inline relevantes:
  - JSON-LD `ItemList`
  - catálogo hardcodeado en variable `CATALOG`
  - filtros, ordenación, paginación y render cliente
  - `fetch('/data/product-catalog.json')` para mezclar catálogo externo con hardcoded
- Datasets JSON consumidos:
  - `/data/product-catalog.json`
- Endpoints usados:
  - Ninguno verificado fuera del `fetch` al dataset local
- Referencias rotas o dudosas:
  - Catálogo duplicado: hardcoded + JSON
  - Tipologías y copy 100% software
  - La página sigue vendiendo “descarga inmediata” y “pago Stripe seguro”

#### `/product.html`

- CSS:
  - `/css/main.css`
  - `/css/theme-override.css`
- JS externos:
  - `https://js.stripe.com/v3/`
  - `/js/stripe-checkout.js`
  - `/js/i18n-global.js`
  - `/js/agent-chat.js`
- Scripts inline relevantes:
  - JSON-LD `Product` inicialmente vacío
  - render de producto según `id` por query string
  - reviews hardcodeadas
  - integración con `window.NeuralStripe`
- Datasets JSON consumidos:
  - `/data/products-stripe.json` a través de `js/stripe-checkout.js`
- Endpoints usados:
  - `/api/create-checkout-session`
  - `/api/verify-payment`
- Referencias rotas o dudosas:
  - `rotura verificada`: no existe implementación de `/api/create-checkout-session` en el repo
  - `rotura verificada`: no existe implementación de `/api/verify-payment` en el repo
  - modelo entero pensado para software descargable

#### `/provider-register.html`

- CSS:
  - `/css/main.css`
  - `/css/theme-override.css`
- JS externos:
  - `/js/i18n-global.js`
  - `/js/agent-chat.js`
- Scripts inline relevantes:
  - descripción dinámica de categoría jurídica
  - submit simulado del formulario `provider-form`
  - toggle de navegación móvil
- Datasets JSON consumidos:
  - Ninguno
- Endpoints usados:
  - Ninguno
- Referencias rotas o dudosas:
  - El formulario no envía a backend real; el submit está simulado con `setTimeout`
  - Toda la semántica gira en torno a vender software y alojarlo en GitHub Releases / Cloudflare R2 / URL de descarga

### 2.2 Páginas secundarias reconvertibles

#### `/providers.html`

- CSS:
  - `/css/main.css`
  - `/css/theme-override.css`
- JS externos:
  - `/js/i18n-global.js`
  - `/js/agent-chat.js`
- Scripts inline relevantes:
  - toggle de navegación móvil
- Datasets JSON consumidos:
  - No hay `fetch()` en el HTML abierto
- Endpoints usados:
  - Ninguno verificado en la página
- Referencias rotas o dudosas:
  - Copy 100% de directorio de proveedores software
  - Existe JS auxiliar en el repo que espera `providers-data.json`, pero ese dataset no existe

#### `/providers-view.html`

- CSS:
  - `/css/main.css`
  - `/css/theme-override.css`
- JS externos:
  - Ninguno
- Scripts inline relevantes:
  - Ninguno
- Datasets JSON consumidos:
  - Ninguno desde la propia página
- Endpoints usados:
  - Ninguno
- Referencias rotas o dudosas:
  - Página con placeholders (`prov-name`, `prov-desc`, `provider-products`) sin script cargado que los hidrate
  - `sospechosa`: parece diseñada para depender de `assets/js/provider-catalog.js`, pero no lo carga
  - `sospechosa`: logo por defecto apunta a `/assets/img/providers/logo-placeholder.webp`; no se ha verificado existencia en esta fase

#### `/vendor-onboarding.html`

- CSS:
  - `/css/main.css`
  - `/css/theme-override.css`
- JS externos:
  - `/js/i18n-global.js`
  - `/js/agent-chat.js`
- Scripts inline relevantes:
  - toggle de navegación móvil
- Datasets JSON consumidos:
  - Ninguno
- Endpoints usados:
  - Ninguno
- Referencias rotas o dudosas:
  - Página muy cargada de onboarding de software, Stripe Connect, hashes y URLs de descarga

#### `/pricing.html`

- CSS:
  - `/css/main.css`
  - `/css/theme-override.css`
- JS externos:
  - `/js/i18n-global.js`
  - `/js/agent-chat.js`
- Scripts inline relevantes:
  - toggle de navegación móvil
- Datasets JSON consumidos:
  - Ninguno
- Endpoints usados:
  - Ninguno
- Referencias rotas o dudosas:
  - Modelo comercial completamente ligado a comisión del 20% de venta de software y Stripe Connect

#### `/category.html`

- CSS:
  - `/css/main.css`
  - `/css/theme-override.css`
- JS externos:
  - `/js/i18n-global.js`
  - `/js/agent-chat.js`
- Scripts inline relevantes:
  - tarjetas con `onmouseover`/`onmouseout`
  - links a filtros del marketplace por query string
- Datasets JSON consumidos:
  - Ninguno
- Endpoints usados:
  - Ninguno
- Referencias rotas o dudosas:
  - Categorías de software hardcodeadas
  - Conteos visibles hardcodeados

#### `/about.html`

- CSS:
  - `/css/main.css`
  - `/css/theme-override.css`
- JS externos:
  - `/js/i18n-global.js`
  - `/js/agent-chat.js`
- Scripts inline relevantes:
  - toggle de navegación móvil
- Datasets JSON consumidos:
  - Ninguno
- Endpoints usados:
  - Ninguno
- Referencias rotas o dudosas:
  - Copy corporativo totalmente asociado a marketplace de software
  - Aparece email directo `wilfreyera@gmail.com` en el cuerpo de página

#### `/contact.html`

- CSS:
  - `/css/main.css`
  - `/css/theme-override.css`
- JS externos:
  - `/js/i18n-global.js`
  - `/js/agent-chat.js`
- Scripts inline relevantes:
  - validación y submit simulado del formulario de contacto
  - toggle de navegación móvil
- Datasets JSON consumidos:
  - Ninguno
- Endpoints usados:
  - Ninguno
- Referencias rotas o dudosas:
  - El formulario no envía a backend real
  - Los asuntos y copy están orientados al negocio actual

#### `/commercial-terms.html`

- CSS:
  - `/css/main.css`
  - `/css/theme-override.css`
- JS externos:
  - `/js/i18n-global.js`
  - `/js/agent-chat.js`
- Scripts inline relevantes:
  - toggle de navegación móvil
- Datasets JSON consumidos:
  - Ninguno
- Endpoints usados:
  - Ninguno
- Referencias rotas o dudosas:
  - Muy acoplada a Stripe Connect y hosting de software por el vendedor

#### `/terms.html`, `/privacy.html`, `/legal.html`, `/security.html`

- CSS:
  - `/css/main.css`
  - `/css/theme-override.css`
- JS externos:
  - `/js/i18n-global.js`
  - `/js/agent-chat.js`
- Scripts inline relevantes:
  - toggle de navegación móvil en varias de ellas
- Datasets JSON consumidos:
  - Ninguno
- Endpoints usados:
  - Ninguno
- Referencias rotas o dudosas:
  - Documentación legal y de seguridad adaptada al marketplace de software
  - `privacy.html` y `terms.html` contienen referencias explícitas a Stripe, Stripe Connect, compradores/vendedores de software y descargas digitales

#### `/404.html`

- CSS:
  - `/css/main.css`
  - `/css/theme-override.css`
- JS externos:
  - `/js/i18n-global.js`
  - `/js/agent-chat.js`
- Scripts inline relevantes:
  - toggle de navegación móvil
- Datasets JSON consumidos:
  - Ninguno
- Endpoints usados:
  - Ninguno
- Referencias rotas o dudosas:
  - Links útiles a productos software concretos

### 2.3 Redirecciones, placeholders y páginas menores

#### `/blog.html`

- CSS:
  - `/css/main.css`
  - `/css/theme-override.css`
- JS externos:
  - Ninguno
- Scripts inline relevantes:
  - ninguno
- Datasets JSON consumidos:
  - Ninguno
- Endpoints usados:
  - Ninguno
- Referencias rotas o dudosas:
  - redirección meta-refresh a `/marketplace.html`

#### `/trends.html`

- CSS:
  - `/css/main.css`
  - `/css/theme-override.css`
- JS externos:
  - Ninguno
- Scripts inline relevantes:
  - ninguno
- Datasets JSON consumidos:
  - Ninguno
- Endpoints usados:
  - Ninguno
- Referencias rotas o dudosas:
  - redirección meta-refresh a `/marketplace.html`

#### `/provider-hub.html`

- CSS:
  - `/css/main.css`
  - `/css/theme-override.css`
- JS externos:
  - Ninguno
- Scripts inline relevantes:
  - ninguno
- Datasets JSON consumidos:
  - Ninguno
- Endpoints usados:
  - Ninguno
- Referencias rotas o dudosas:
  - redirección meta-refresh a `/providers.html`

#### `/security-enterprise.html`, `/security-insurers.html`, `/security-pc.html`, `/security-pyme.html`

- CSS:
  - Ninguno
- JS externos:
  - Ninguno
- Scripts inline relevantes:
  - ninguno
- Datasets JSON consumidos:
  - Ninguno
- Endpoints usados:
  - Ninguno
- Referencias rotas o dudosas:
  - redirecciones meta-refresh a `/security.html`

#### `/api.html`

- CSS:
  - `/css/main.css`
  - `/css/theme-override.css`
- JS externos:
  - Ninguno
- Scripts inline relevantes:
  - Ninguno
- Datasets JSON consumidos:
  - Ninguno
- Endpoints usados:
  - Ninguno
- Referencias rotas o dudosas:
  - página temporal sin funcionalidad

#### `/guides.html`

- CSS:
  - `/css/main.css`
  - `/css/theme-override.css`
- JS externos:
  - Ninguno
- Scripts inline relevantes:
  - Ninguno
- Datasets JSON consumidos:
  - Ninguno
- Endpoints usados:
  - Ninguno
- Referencias rotas o dudosas:
  - página temporal sin funcionalidad

#### `/console.html`

- CSS:
  - `/css/main.css`
  - `/css/theme-override.css`
- JS externos:
  - `/assets/js/main.js`
- Scripts inline relevantes:
  - ninguno en el bloque revisado
- Datasets JSON consumidos:
  - indirectamente puede depender de datasets que `assets/js/main.js` intenta cargar
- Endpoints usados:
  - indirectamente, ninguno propio del HTML
- Referencias rotas o dudosas:
  - página marcada como removida, pero sigue cargando `assets/js/main.js`
  - contiene estructura inconsistente y restos visuales de consola demo

#### `/quantum.html`

- CSS:
  - `/css/main.css`
  - `/css/theme-override.css`
- JS externos:
  - `/assets/js/main.js`
- Scripts inline relevantes:
  - ninguno
- Datasets JSON consumidos:
  - indirectamente, los que `assets/js/main.js` intenta cargar
- Endpoints usados:
  - ninguno propio del HTML
- Referencias rotas o dudosas:
  - landing separada del negocio actual, con pricing “Quantum Pass”
  - mezcla temática ajena a la reconversión inmobiliaria

#### `/index_maintenance.html`

- CSS:
  - solo CSS inline
- JS externos:
  - Ninguno
- Scripts inline relevantes:
  - ninguno
- Datasets JSON consumidos:
  - Ninguno
- Endpoints usados:
  - Ninguno
- Referencias rotas o dudosas:
  - ninguna en esta fase

## 3. Mapa de dependencias funcionales reutilizables

### Header

- Reutilizable como patrón visual y estructural.
- Evidencia:
  - se repite en la mayoría de páginas con `site-header`, `main-nav`, `nav-toggle`, `header-actions`
- Limitación:
  - está duplicado en HTML; no existe componentización real

### Footer

- Reutilizable como patrón visual.
- Evidencia:
  - se repite en la mayoría de páginas con `site-footer`
- Limitación:
  - también está copiado página a página

### Sistema visual

- Reutilizable parcialmente desde `/css/main.css`.
- Tokens verificables:
  - `:root` con colores, sombras, radios, tipografías, transición
  - fuente principal `Orbitron` para títulos
  - clases base de layout, botones, header y utilidades
- Recomendación técnica:
  - conservar la estructura de tokens y clases base
  - sustituir progresivamente el lenguaje visual demasiado “tech/neón software”

### i18n

- Reutilizable y valioso.
- Evidencia:
  - `js/i18n-global.js`
  - soporta `es`, `en`, `fr`, `de`, `ru`, `zh`, `ja`, `ar`
  - usa `data-i18n`, `data-i18n-placeholder`, `localStorage`
- Limitación:
  - el diccionario actual está contaminado por copy SaaS/software

### SEO base

- Reutilizable.
- Evidencia:
  - metas por página
  - Open Graph
  - JSON-LD en páginas clave
  - `robots.txt`
  - `sitemap.xml`
  - `CNAME`

### Workflows

- Reutilizables.
- Evidencia:
  - `.github/workflows/pages.yml`
  - `.github/workflows/lighthouse-axe.yml`
- Utilidad:
  - despliegue estático por GitHub Pages
  - auditoría básica de performance y accesibilidad

### Utilidades

- Reutilizables:
  - `scripts/static-check.js`
  - utilidades de validación/inspección en `scripts/`
  - `sw.js` como base mínima de caché estática
- Limitación:
  - parte de las utilidades esperan datasets que hoy no existen

### Formularios aprovechables

- Aprovechables visualmente:
  - `/contact.html`
  - `/provider-register.html`
- Limitación:
  - ambos envíos están simulados en cliente
  - no hay backend real

### Scripts aprovechables

- Aprovechables:
  - `js/i18n-global.js`
  - parte de `assets/js/main.js` como referencia de cache/render/utilidades, pero no para reutilización directa ciega
  - `js/stripe-checkout.js` solo como referencia de futura integración de pago, no como solución completa
- Con cautela:
  - `assets/js/main.js` mezcla demasiadas responsabilidades y arrastra deuda

## 4. Mapa de deuda y residuos

### Copy SaaS / software detectado

- `index.html`: hero, features, estadísticas, testimonials, CTA de vendedores de software
- `about.html`: misión, visión y valores de marketplace de software con IA
- `marketplace.html`: todo el copy visible
- `product.html`: ficha de software y reviews
- `provider-register.html`: alta de vendedores de software
- `vendor-onboarding.html`: onboarding de software, descargas, hash, hosting de binarios
- `pricing.html`: comisiones de venta de software
- `terms.html`, `privacy.html`, `legal.html`, `commercial-terms.html`: marco legal del marketplace de software digital
- `js/i18n-global.js`: diccionario completo orientado a software
- `data/agent-kb.json`: conocimiento del chatbot orientado a software, productos y Stripe
- `data/product-catalog.json`: catálogo actual de software
- `data/products-stripe.json`: catálogo actual para checkout de software

### Flujos de producto digital

- Compra de producto digital con Stripe en `/product.html`
- Descarga inmediata tras pago
- Registro de vendedores con URL de descarga externa
- Onboarding de vendedores y validación de software
- Directorio de proveedores software
- Reviews y ratings de productos software

### Pricing viejo

- Comisión estándar 20%
- Stripe Connect para payouts
- mínimo payout 10€
- discurso comercial “sin cuota mensual, solo pagas cuando vendes”

### Scripts muertos o dudosos

- `js/spa-nav.js`: navegación por hash/sections; no parece ser el sistema principal actual
- `js/navigation.js`: navegación SPA simple; no parece ser el sistema principal actual
- `js/contact.js`: contiene cadenas malformadas (`mailto:?subject=&body=` y cuerpo roto) y no se ha verificado uso por ninguna página inspeccionada
- `assets/js/provider-catalog.js`: espera `providers-data.json` inexistente
- `js/catalog-wire.js`: espera `providers-data.json` y `sponsors-data.json`, no verificados en `data/`
- `assets/js/main.js`: mezcla lógica útil y deuda; carga rutas de datos no existentes
- `console.html` y `quantum.html` cargan `assets/js/main.js` sin pertenecer al flujo principal actual

### Datasets inexistentes

- `rotura verificada`: `/data/product-data.json`
- `rotura verificada`: `/data/category-data.json`
- `rotura verificada`: `/data/providers-data.json`
- `rotura verificada`: `/data/sponsors-data.json`
- `sospechosa`: `/data/categories.json` es referenciada por `assets/js/main.js`, pero no existe en `data/`

### Endpoints inexistentes

- `rotura verificada`: `/api/create-checkout-session`
- `rotura verificada`: `/api/verify-payment`
- `sospechosa`: `/create-checkout-session` aparece en `js/payments-client.js` como endpoint por defecto, pero no existe implementación en el repo

### Páginas contaminantes para la nueva vertical

- Muy contaminantes:
  - `/index.html`
  - `/marketplace.html`
  - `/product.html`
  - `/provider-register.html`
  - `/vendor-onboarding.html`
  - `/pricing.html`
- Contaminación media:
  - `/providers.html`
  - `/providers-view.html`
  - `/about.html`
  - `/category.html`
  - `/commercial-terms.html`
- Contaminación baja o residual:
  - `/blog.html`
  - `/trends.html`
  - `/api.html`
  - `/guides.html`
  - `/console.html`
  - `/quantum.html`

## 5. Propuesta de primera ola de reconversión

### `/index.html`

- Nuevo rol inmobiliario propuesto:
  - Home principal del portal premium europeo de activos inmobiliarios
- Conservar:
  - estructura de header/footer
  - hero como layout
  - sistema visual base
  - newsletter y CTA como patrones de bloque
  - SEO base y JSON-LD de `WebSite`
- Eliminar:
  - promo reel de productos software
  - estadísticas de productos/desarrolladores/descargas
  - testimonios de software
  - CTA de vender software
  - features de descarga inmediata, Linux, IA, Stripe para software
- Sustituir:
  - búsqueda de software por búsqueda de activos/listings
  - categorías software por tipologías inmobiliarias y geografías
  - “vender software” por “publicar activo” / “solicitar valoración” / “contactar”

### `/marketplace.html`

- Nuevo rol inmobiliario propuesto:
  - listado principal de activos inmobiliarios
- Conservar:
  - grid/listado
  - barra de filtros
  - patrón de búsqueda
  - SEO base
- Eliminar:
  - catálogo hardcodeado software
  - copy de descarga inmediata y software verificado
  - categorías software actuales
- Sustituir:
  - filtros por país, operación, tipología, rango de precio, superficie, yield, estado
  - consumo de `product-catalog.json` por `listings.json`
  - `ItemList` de software por `ItemList` de listings

### `/product.html`

- Nuevo rol inmobiliario propuesto:
  - ficha de activo/anuncio inmobiliario
- Conservar:
  - layout general de detalle
  - galería/zonas de detalle si son aprovechables
  - JSON-LD como patrón estructural
- Eliminar:
  - Stripe checkout
  - reviews de software
  - copy de descarga protegida
  - badges de verificación de software
- Sustituir:
  - detalle de producto por detalle de activo
  - CTA de compra por CTA de contacto / solicitar dossier / concertar visita / recibir due diligence
  - schema `Product` por schema apropiado para listing/offer

### `/provider-register.html`

- Nuevo rol inmobiliario propuesto:
  - formulario de publicación de activo / captación de anunciante / solicitud de alta de agencia
- Conservar:
  - estructura visual del formulario
  - bloque de proceso
  - tarjetas informativas
- Eliminar:
  - categorías jurídicas de proveedor software
  - campos de URL de descarga
  - narrativa GitHub Releases / R2 / APK / software
- Sustituir:
  - campos por tipo de activo, ubicación, precio, superficie, rentabilidad, contacto y documentación
  - flujo comercial por onboarding de agencia/propietario/promotor

## 6. Lista de datasets nuevos necesarios

### `data/listings.json`

- Propósito:
  - dataset mínimo para renderizar listados y fichas de activos
- Campos mínimos propuestos:
  - `id`
  - `slug`
  - `title`
  - `operation` (`sale`, `rent`, `investment`, etc.)
  - `asset_type`
  - `country`
  - `region`
  - `city`
  - `price`
  - `currency`
  - `surface_m2`
  - `yield_percent` opcional
  - `status`
  - `featured`
  - `images`
  - `summary`
  - `description`
  - `contact_cta`
- Relación con páginas/scripts:
  - reemplazo natural de `/marketplace.html` y `/product.html`
  - futura base para búsqueda y filtros

### `data/taxonomy.json`

- Propósito:
  - centralizar taxonomías mínimas del vertical inmobiliario
- Campos mínimos propuestos:
  - `operations`
  - `asset_types`
  - `countries`
  - `regions_by_country`
  - `status_labels`
  - `feature_flags` opcional
- Relación con páginas/scripts:
  - filtros de `/marketplace.html`
  - formularios de `/provider-register.html`
  - navegación y landings futuras

### `data/site-settings.json`

- Propósito:
  - configuración base editable sin tocar HTML
- Campos mínimos propuestos:
  - `site_name`
  - `tagline`
  - `default_locale`
  - `supported_locales`
  - `contact_email`
  - `sales_email`
  - `legal_entity_name`
  - `social_links`
  - `seo_defaults`
- Relación con páginas/scripts:
  - header/footer
  - SEO base
  - bloques de contacto y CTAs globales

### `data/i18n/*.json`

- Propósito:
  - desacoplar el diccionario hoy embebido en `js/i18n-global.js`
- Ficheros mínimos propuestos:
  - `data/i18n/es.json`
  - `data/i18n/en.json`
  - opcional desde el arranque: `fr.json`, `de.json`
- Campos mínimos:
  - navegación
  - home
  - listados
  - ficha
  - formularios
  - footer
  - legal básico
- Relación con páginas/scripts:
  - evolución futura de `js/i18n-global.js` o su sustitución progresiva

## 7. Primer bloque de ejecución real

Bloque exacto recomendado tras esta FASE 0:

1. Crear datasets base no destructivos:
   - `data/listings.json`
   - `data/taxonomy.json`
   - `data/site-settings.json`
2. Crear documentación de schema mínima para esos datasets en `docs/migration-plan/`
3. Añadir una capa de datos inmobiliarios sin conectar todavía a páginas visibles:
   - sin eliminar datasets actuales
   - sin modificar rutas existentes
4. Preparar un JS auxiliar nuevo, aislado y reversible, para leer esos datasets:
   - sin sustituir aún el JS actual de home/listado/ficha
5. Dejar lista la base para atacar después la primera ola:
   - `index.html`
   - `marketplace.html`
   - `product.html`
   - `provider-register.html`

Razón:

- Es seguro.
- Es reversible.
- No destruye nada.
- No rompe rutas.
- Permite iniciar la reconversión con datos nuevos coexistiendo con el vertical actual.

## 8. Roturas verificadas

- `/data/product-data.json` no existe en `data/`, pero es esperado por:
  - `assets/js/main.js`
  - `scripts/static-check.js`
  - `reports/validation-summary.md`
- `/data/category-data.json` no existe en `data/`, pero es esperado por:
  - `assets/js/main.js`
  - `scripts/static-check.js`
  - `reports/validation-summary.md`
- `/data/providers-data.json` no existe en `data/`, pero es esperado por:
  - `assets/js/main.js`
  - `assets/js/provider-catalog.js`
  - `js/catalog-wire.js`
  - `scripts/static-check.js`
  - `README.md`
- `/data/sponsors-data.json` no existe en `data/`, pero es esperado por:
  - `js/catalog-wire.js`
- `/api/create-checkout-session` no existe implementado en el repo, pero es usado por:
  - `js/stripe-checkout.js`
- `/api/verify-payment` no existe implementado en el repo, pero es usado por:
  - `js/stripe-checkout.js`
- `providers-view.html` no carga ningún JS que hidrate sus placeholders de proveedor; el HTML queda sin datos dinámicos reales

## 9. Sospechosos

- `js/spa-nav.js`
- `js/navigation.js`
- `js/contact.js`
- `assets/js/provider-catalog.js`
- `js/catalog-wire.js`
- `console.html`
- `quantum.html`

No se borran en esta fase. Quedan marcados como `sospechosos` porque presentan señales de residuo, dependencia rota o desalineación con el flujo principal, pero su eliminación no se propone todavía.
