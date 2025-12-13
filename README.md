neuralgpt.store — Internal Technical Dossier

Overview
--------
neuralgpt.store is a static-first, client-side marketplace for hardware, IA modules, and integration-focused providers. The frontend is vanilla HTML/CSS/JS with no server-side components embedded in this repository; external services are used for payments and analytics as delegated processes.

Architecture
------------
- Static pages (HTML/CSS/JS) served from CDN or static host.
- Data: JSON files under `/data` (product-catalog.json, providers-data.json) used for client-side rendering.
- Frontend: `assets/js/main.js` handles rendering, routing and client-only features (search, filters, quick view).
- Security: client-side sanitizers and a passive watcher are included in `assets/js/main.js` to reduce XSS and suspicious DOM insertions risk.
- Payments: delegated to PCI-compliant processors (Stripe, PayPal). No payment credentials are stored in this repository.

Performance
-----------
- Fonts: preloaded in critical pages.
- Images: lazy-loading applied to non-critical assets.
- Scripts: `defer` applied to non-critical JS to reduce render-blocking.
- Hero backgrounds: prefer AVIF/WebP via `image-set` for modern browsers.

Security & Compliance
---------------------
- CSP is defined by meta tags on pages (suitable for static hosting); server headers recommended for stricter enforcement.
- Client-side mitigations: safeUrl/safeImgSrc, innerHTML avoidance, removal of dangerous inline attrs, MutationObserver monitoring.
- Payments delegated; we do not store card data.
- Contact security@neuralgpt.store for questions related to vulnerabilities.

Roadmap / Validation
--------------------
- Next: automated Lighthouse runs in CI with thresholds for Performance/Accessibility/Best Practices/SEO.
- Integration: optional server-side headers to enforce CSP, HSTS and feature policies.
- Enterprise: add SSO for provider portals, audit logging, and SIEM integration for higher assurance.

How to validate locally
-----------------------
- Serve the repo on a static server and open pages: `npx http-server -c-1` or similar.
- Use Lighthouse in Chrome DevTools (Mobile) to run audits.

Quick developer commands
------------------------
- Generate AVIF/WebP optimized images and manifest:

```bash
npm run images:convert
```

- Run automated visual verification (starts a local static server and captures screenshots):

```bash
npm run verify:visual
```

- Detect unreferenced assets and produce a report:

```bash
npm run check:unused
```

- Move reported unused assets to a backup folder (reversible):

```bash
npm run cleanup:unused
```

Contact
-------
- Partnerships: partnerships@neuralgpt.store
- Security: security@neuralgpt.store
- Investors: investors@neuralgpt.store
