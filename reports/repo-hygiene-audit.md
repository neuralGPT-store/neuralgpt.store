# Repo Hygiene Audit (Pre-Push)

- Generated at: 2026-04-16T18:12:07.410Z
- Total status entries: 8
- Tracked changes: 8
- Untracked files: 0

## Archivos no trackeados críticos

- No hay untracked files.

## Artefactos generados que conviene versionar

- No detectados por heurística.

## Artefactos generados que NO conviene versionar (heurístico)

- No detectados por heurística.

## Residuos o duplicados sospechosos (no borrar aún)

- No detectados.

## Inconsistencias .gitignore vs artefactos necesarios

- No se detecta bloqueo de `docs/` en `.gitignore`.

## Bloqueos pre-push

- Hay cambios tracked en archivos sensibles públicos fuera de esta fase: index.html, marketplace.html, product.html
- No se detectaron artefactos versionables en untracked ni staged para data/scripts/reports; revisar alcance de commit.

## Recomendación operativa

- No ejecutar push hasta resolver los bloqueos listados y definir una política explícita para docs/ y residuos sospechosos.
