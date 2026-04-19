# neuralgpt.store — Portal Inmobiliario Fase 1

Repositorio del portal inmobiliario estático de `neuralgpt.store`.

## Identidad del proyecto

- Única identidad pública: portal inmobiliario premium europeo.
- Operación pública de fase 1: catálogo en venta y alquiler estable, fichas de activo y contacto tras pago.
- Sin vertical vacacional visible.
- Sin exposición pública de superficies operativas.

## Superficie pública activa

- `/`
- `/real-estate-index.html`
- `/venta.html`
- `/alquiler.html`
- `/listing.html?slug=...`
- `/pais.html?country=...`
- `/ciudad.html?city=...`
- `/hub-pais.html?country=...`
- `/hub-ciudad.html?city=...`
- `/contact.html`
- `/sponsors.html`
- `/about.html`
- `/terms.html`
- `/privacy.html`
- `/legal.html`
- `/security.html`
- `/sitemap-real-estate.html`
- `/sitemap-real-estate.xml`
- `/sitemap.xml`
- `/robots.txt`

## Datos

- Dataset público de frontend: `public-data/*.public.json`
- Dataset privado completo y operativo: `data/*`
- El frontend público solo debe consumir `public-data/`.

## Seguridad de rutas

Bloqueadas en acceso público real:

- `/data/*`
- `/ops/*`
- `/scripts/*`
- `/reports/*`
- `/deploy/*`
- `/test/*`
- `/_lab_clean_routes/*`
- `/autosys/*`
- `/core/*`
- `/build/*`

## Desarrollo local

```bash
npm run serve
```

Checks principales:

```bash
npm run validate:data
npm run check:static
npm run check:risk
```

## Documentación de control

- `docs/active-surface-manifest.md`
- `docs/deprecation-map.md`
- `docs/release/phase1-predeploy-manifest.md`
