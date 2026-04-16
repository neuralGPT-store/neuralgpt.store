# Release Handshake Checklist

Fecha: 2026-04-16

## Handshake del RC principal
- [ ] Branch objetivo confirmado (`main` o branch de release definida).
- [ ] `git status --short` sin cambios fuera de exclusiones intencionales.
- [ ] `git diff -- index.html marketplace.html product.html` vacio.
- [ ] `reports/bridge-public-surfaces.patch` fuera del push del RC.
- [ ] `scripts/bridge-runtime-qa.js` fuera del push del RC.
- [ ] Revision final de `reports/pr-description-pack.md`.

## Handshake de exclusiones sensibles
- [ ] `_lab_clean_routes/` fuera.
- [ ] `*-clean.html` fuera.
- [ ] `index.html` fuera.
- [ ] `marketplace.html` fuera.
- [ ] `product.html` fuera.

## Handshake de salida
- [ ] Push autorizado explicitamente.
- [ ] PR A abierta con alcance y exclusiones correctas.
- [ ] PR B diferida a fase posterior (bridge aislado).
