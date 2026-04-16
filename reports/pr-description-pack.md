# PR Description Pack

Fecha: 2026-04-16

## PR A — RC principal

Titulo recomendado:
`RC principal: vertical inmobiliario + risk/ledger/audit + governance gate`

Resumen ejecutivo:
Este PR consolida el release candidate principal de neuralgpt.store con la base publica controlada del vertical inmobiliario, el stack editorial interno de riesgo/moderacion auditable y la gobernanza de pre-push/RC ya cerrada. No incluye el bridge publico experimental.

Alcance exacto:
- Vertical inmobiliario controlado y geo piloto limpio ya definido en fases previas.
- Motor de riesgo, reglas antifraude, reportes y resumen editorial.
- Ledger append-only, integrity chain, state machine, snapshots, compliance y drift.
- Documentacion de fases 27-35 para trazabilidad operativa del RC.

Que incluye:
- Commits: `9bea198`, `19c9e4b`, `d9dfa3b`, `b925181`, `7f005e8`, `2b37401`, `b664e0a`, `1092623`.
- Reportes y docs de validacion/gate del RC.

Que no incluye:
- Bridge publico en `index.html`, `marketplace.html`, `product.html`.
- `reports/bridge-public-surfaces.patch`.
- `scripts/bridge-runtime-qa.js`.
- `_lab_clean_routes/` y `*-clean.html`.

Riesgos:
- Riesgo residual bajo en RC principal por exclusion de superficies puente de alto impacto.
- Riesgo pendiente deliberado: puente publico aislado para fase posterior.

Validaciones ejecutadas:
- `git log --oneline -n 10`.
- `git status --short`.
- `git diff -- index.html marketplace.html product.html` (vacio).
- Verificacion explicita de exclusiones sensibles del RC.

Checklist pre-push:
- [ ] `git branch --show-current` en branch objetivo.
- [ ] `git status --short` solo limpio o con exclusiones intencionales.
- [ ] Confirmar que patch/tooling bridge siguen fuera.
- [ ] Revisar descripcion PR A final.

Checklist pre-merge:
- [ ] Revisar alcance y exclusiones en descripcion.
- [ ] Verificar que no aparezcan cambios en superficies puente.
- [ ] Confirmar consistencia de docs/reports del RC.

## PR B — bridge publico aislado

Titulo recomendado:
`Bridge publico aislado: home/marketplace/product + QA runtime tooling`

Estado actual:
No listo para el RC principal. Preservado de forma recuperable y fuera de push inicial.

Por que queda fuera:
- Riesgo funcional/visual residual en superficies publicas de alto impacto.
- Decision de producto: no contaminar el release inicial.

Que falta para rescatarlo:
- Walkthrough manual en navegador con escenarios criticos completos.
- Cierre de mezcla narrativa bridge/legacy en home y marketplace.
- Gate de aprobacion final por superficie con criterio de conversion y SEO.

Artefactos asociados:
- `reports/bridge-public-surfaces.patch`
- `scripts/bridge-runtime-qa.js`
