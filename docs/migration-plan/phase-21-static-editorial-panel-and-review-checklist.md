# Phase 21 - Static Editorial Panel and Review Checklist

## Executive Summary
This phase adds a fully static internal editorial layer for risk supervision, without introducing backend or touching the public SEO layer.

## Created Files
- `scripts/build-risk-summary.js`
- `reports/risk-report-summary.md` (generated artifact)
- `reports/risk-dashboard.html`
- `docs/migration-plan/editorial-review-checklist.md`
- `docs/migration-plan/phase-21-static-editorial-panel-and-review-checklist.md`

## How Summary Generation Works
- Input: `data/risk-report.json`.
- Process: `scripts/build-risk-summary.js` computes outcome distribution, top duplicate/fraud signals, top listings by score, and human-review section.
- Output: `reports/risk-report-summary.md`.
- The script is idempotent: running it repeatedly produces the same structure from the same input snapshot.

Command:
```bash
node scripts/build-risk-summary.js
```

## How to Use the Editorial Checklist
- Open `docs/migration-plan/editorial-review-checklist.md`.
- Apply outcome section first (`allow` -> `suspend_candidate`).
- Then apply signal-specific checks to support decisions with evidence.
- Keep reviewer decisions consistent with the contract documented in `docs/migration-plan/moderation-events-contract.md`.

## Static Internal Dashboard
- File: `reports/risk-dashboard.html`.
- Scope: internal/editorial only, read-only.
- Data source: `../data/risk-report.json`.
- Value added: faster human triage than raw JSON/Markdown, with outcome filter, top signals, and listing table.
- No public routing changes, no sitemap changes, no canonical changes.

## What Is Auditable Now
- Deterministic builder for summary from canonical risk dataset.
- Repeatable markdown evidence snapshot (`reports/risk-report-summary.md`).
- Internal visualization bound to the same source file (`data/risk-report.json`).
- Explicit human checklist for decisions by outcome/signal.

## Current Limits (No Backend Yet)
- No persistent moderation event log yet.
- No authenticated editorial actions or reviewer assignment.
- No immutable audit trail storage outside repository artifacts.
- Dashboard is read-only and assumes local/static serving context.

## Important Note: `docs/` ignored by `.gitignore`
- Current repository configuration includes `docs/` in `.gitignore` (line 40 at the moment of this phase).
- Consequence: these phase docs are not staged by default, which weakens traceability if not handled before final push.
- Recommendation before push: decide a controlled policy for versioning migration/compliance docs (for example, unignore selected `docs/migration-plan/` paths).
- This phase does **not** modify `.gitignore`, per scope constraints.

## Recommended Next Phase
Phase 22 - Moderation Event Ledger (append-only, static-first):
- Add `data/moderation-events.log.jsonl` with append-only entries.
- Add `scripts/append-moderation-event.js` with schema validation.
- Add `scripts/build-moderation-audit-view.js` to produce `reports/moderation-audit.md`.
- Keep read-only public layer untouched while adding strong editorial traceability.
