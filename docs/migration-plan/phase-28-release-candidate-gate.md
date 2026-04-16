# Phase 28 - Release Candidate Gate (sin push)

## Estado del RC
El pack commiteado de FASE 27 queda congelado y válido como base de release candidate para capa pública controlada + capa editorial/riesgo + ledger/auditoría + snapshots/compliance/drift + higiene/gobernanza.

Integridad de base confirmada:
- últimos commits del pack presentes e intactos: `9bea198`, `19c9e4b`, `d9dfa3b`, `b925181`, `7f005e8`
- documentación de ejecución F27 ya registrada: `2b37401`

## Auditoría de pendientes

### index.html
- Diff frente a `HEAD`: `+87 / -0`
- Naturaleza de cambio:
  - inyección de scripts bridge (`/js/real-estate-data.js`, `/js/real-estate-presenters.js`, `/js/real-estate-adapters.js`)
  - bloque inline nuevo de bridge home (`tryInitRealEstateHomepageBridge`, sustitución de métricas y tarjetas destacadas)
- Valor potencial:
  - conecta portada general con el vertical inmobiliario de forma controlada por feature-flag.
- Riesgo:
  - toca homepage principal (superficie máxima), modifica copy y bloques visuales críticos.
  - mezcla de responsabilidades comercial/home + bridge inmobiliario en un solo salto.
- Madurez para RC inicial:
  - **No madura para RC inicial** sin QA funcional específica de homepage.
- Decisión final:
  - **se queda fuera del release candidate inicial**.

### marketplace.html
- Diff frente a `HEAD`: `+332 / -24`
- Naturaleza de cambio:
  - mutación SEO dinámica (title/meta/og/twitter/schema)
  - bootstrap dual (legacy + bridge inmobiliario)
  - reconfiguración de filtros, conteos, sorting y rendering en modo inmobiliario
  - navegación de colecciones inmobiliarias y cambios textuales amplios de página
- Valor potencial:
  - habilita modo puente potente para catálogo inmobiliario usando dataset local.
- Riesgo:
  - volumen alto y multifrente (SEO + UX + lógica de filtros + rendering)
  - impacto directo en marketplace legacy y monetización actual si falla la compuerta
- Madurez para RC inicial:
  - **No madura para RC inicial**; requiere QA separada de regresión funcional/SEO en página crítica.
- Decisión final:
  - **se queda fuera del release candidate inicial**.

### product.html
- Diff frente a `HEAD`: `+270 / -9`
- Naturaleza de cambio:
  - bootstrap dual (legacy + bridge inmobiliario)
  - render completo alternativo de ficha (meta/schema/canonical dinámicos, galería, badges, buy-box)
  - lógica de contacto inmobiliario y transformación de tabs/paneles
- Valor potencial:
  - permite ficha inmobiliaria read/write visual desde dataset estructurado.
- Riesgo:
  - sustituye gran parte de la semántica de página de producto; superficie alta en flujo Stripe legacy adyacente.
  - riesgo de efectos laterales sobre conversión y compatibilidad histórica.
- Madurez para RC inicial:
  - **No madura para RC inicial** sin batería QA dedicada en `product.html`.
- Decisión final:
  - **se queda fuera del release candidate inicial**.

## Criterio final del release candidate

### Dentro del RC actual
- Commits del pack F27 y cierres de auditoría asociados:
  - `9bea198`, `19c9e4b`, `d9dfa3b`, `b925181`, `7f005e8`, `2b37401`, `b664e0a`
- Incluye:
  - vertical inmobiliario controlado
  - motor de riesgo y reportes
  - ledger/integrity/state machine
  - snapshots/compliance/drift
  - higiene y gobernanza documental

### Fuera del RC actual
- `index.html`
- `marketplace.html`
- `product.html`

### Riesgos abiertos
- Integración bridge en superficies comerciales principales no validada con QA funcional y SEO específica.
- Potencial canibalización UX/SEO de marketplace/product legacy si se mezcla en el primer push.

### Parte lista para push serio
- Todo el pack ya commiteado y documentado de FASE 27 (sin los tres archivos pendientes).

## Slice público puente (viabilidad)
- Resultado: **no viable en este gate** para incluirlo ahora.
- Acción: **no se prepara staging separado** en esta fase para esos tres archivos.
- Justificación: riesgo operativo superior al beneficio inmediato en RC inicial.

## Secuencia recomendada de push/PR (sin ejecutar)
1. PR/Push A - `rc-core-real-estate-editorial`
   - incluir commits del pack F27 + cierres (`9bea198`..`b664e0a`)
   - objetivo: publicar base inmobiliaria + capa editorial auditable estable.
2. PR/Push B - `rc-bridge-public-surfaces` (posterior)
   - incluir `index.html`, `marketplace.html`, `product.html` solo tras QA dedicada.
   - checklist previo obligatorio:
     - regresión funcional completa en homepage/marketplace/product
     - validación SEO/meta/schema por página
     - smoke de fallback legacy y Stripe legacy en `product.html`.

## Validaciones ejecutadas en esta fase
- `git diff -- index.html marketplace.html product.html` -> OK
- `git status --short` -> OK
- verificación de commits base intactos (`git log --oneline -n 8`) -> OK
- `node scripts/build-risk-report.js` -> OK
- `node scripts/build-risk-summary.js` -> OK
- `node scripts/build-moderation-audit-view.js` -> OK
- `node scripts/build-moderation-integrity-report.js` -> OK
- `node scripts/check-moderation-risk-drift.js` -> OK
- `node scripts/repo-hygiene-audit.js` -> OK
- verificación de no inclusión accidental `_lab_clean_routes/` y `*-clean.html` -> OK
- verificación estructural básica legacy (`<!DOCTYPE html>` y cierre HTML en 3 archivos) -> OK

## Nota operativa
- `docs/` sigue bajo política selectiva de versionado vía `.gitignore` (`docs/migration-plan/**` permitido).

## Siguiente fase recomendada
FASE 29 - Public Bridge QA Gate + Split Commit Candidate (sin push):
- diseñar checklist de QA funcional/SEO específico para `index.html`, `marketplace.html`, `product.html`
- ejecutar QA y decidir si el slice público puente se comitea como bloque aislado
- preparar candidate commit del puente solo si todas las pruebas quedan en verde.
