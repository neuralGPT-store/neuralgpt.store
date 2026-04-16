#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const LAB_ROOT = path.join(REPO_ROOT, '_lab_clean_routes');

function readJson(relativePath) {
  const absolutePath = path.join(REPO_ROOT, relativePath);
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function ensureDirForFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeFile(relativePath, content) {
  const target = path.join(LAB_ROOT, relativePath);
  ensureDirForFile(target);
  fs.writeFileSync(target, content, 'utf8');
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPrice(value, currency) {
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency || 'EUR',
      maximumFractionDigits: 0
    }).format(value || 0);
  } catch (error) {
    return String(value || 0) + ' ' + String(currency || 'EUR');
  }
}

function operationLabel(operation) {
  if (operation === 'sale') return 'Venta';
  if (operation === 'long_term_rent') return 'Alquiler larga duracion';
  if (operation === 'room_rent') return 'Habitacion larga estancia';
  return operation || 'Operacion';
}

function buildLabAbsolute(relativePath) {
  const clean = relativePath.replace(/^\/+/, '').replace(/index\.html$/, '');
  return '/_lab_clean_routes/' + clean;
}

function buildBreadcrumbs(items) {
  return items.map(function (item) {
    if (item.href) {
      return '<li><a href="' + escapeHtml(item.href) + '">' + escapeHtml(item.label) + '</a></li>';
    }
    return '<li aria-current="page">' + escapeHtml(item.label) + '</li>';
  }).join('');
}

function buildGlobalLabLinks() {
  const links = [
    { href: '/_lab_clean_routes/inmobiliario/', label: 'Indice LAB' },
    { href: '/_lab_clean_routes/venta/', label: 'Venta LAB' },
    { href: '/_lab_clean_routes/alquiler/', label: 'Alquiler LAB' },
    { href: '/_lab_clean_routes/pais/es/', label: 'Pais ES LAB' },
    { href: '/_lab_clean_routes/ciudad/madrid/', label: 'Ciudad Madrid LAB' },
    { href: '/_lab_clean_routes/hub/pais/es/', label: 'Hub Pais ES LAB' },
    { href: '/_lab_clean_routes/hub/ciudad/madrid/', label: 'Hub Ciudad Madrid LAB' },
    { href: '/_lab_clean_routes/listing/piso-senorial-reformado-barrio-salamanca-madrid/', label: 'Listing LAB' }
  ];

  return links.map(function (link) {
    return '<a href="' + escapeHtml(link.href) + '" class="chip">' + escapeHtml(link.label) + '</a>';
  }).join('');
}

function renderCard(listing, detailHref) {
  const detailLink = detailHref
    ? '<a class="btn" href="' + escapeHtml(detailHref) + '">Ver detalle LAB</a>'
    : '<span class="hint">Detalle LAB no generado para este activo en la muestra.</span>';

  return ''
    + '<article class="card">'
    + '<h3>' + escapeHtml(listing.title) + '</h3>'
    + '<p class="muted">' + escapeHtml(listing.summary) + '</p>'
    + '<p><strong>' + escapeHtml(formatPrice(listing.price, listing.currency)) + '</strong> · ' + escapeHtml(operationLabel(listing.operation)) + '</p>'
    + '<p class="muted">' + escapeHtml([listing.zone, listing.city, listing.region].filter(Boolean).join(', ')) + '</p>'
    + detailLink
    + '</article>';
}

function renderShell(page) {
  const cardsHtml = (page.cards || []).join('');
  const sectionsHtml = (page.sections || []).join('');

  return ''
    + '<!DOCTYPE html>\n'
    + '<html lang="es">\n'
    + '<head>\n'
    + '  <meta charset="utf-8" />\n'
    + '  <meta name="viewport" content="width=device-width, initial-scale=1" />\n'
    + '  <title>' + escapeHtml(page.title) + '</title>\n'
    + '  <meta name="description" content="' + escapeHtml(page.description) + '" />\n'
    + '  <meta name="robots" content="noindex,nofollow" />\n'
    + '  <link rel="canonical" href="' + escapeHtml(page.canonicalLab) + '" />\n'
    + '  <style>\n'
    + '    :root { color-scheme: light; --bg:#f6f4ef; --ink:#1d1a16; --muted:#5f564a; --line:#d8cfbf; --card:#fff; --accent:#7a5d2f; }\n'
    + '    * { box-sizing:border-box; }\n'
    + '    body { margin:0; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; background:linear-gradient(180deg,#faf7f1 0%, #f3eee3 70%); color:var(--ink); }\n'
    + '    main { max-width:980px; margin:0 auto; padding:32px 20px 56px; }\n'
    + '    .lab { display:inline-block; padding:6px 10px; border:1px solid var(--line); border-radius:999px; font-size:12px; letter-spacing:0.08em; text-transform:uppercase; color:var(--accent); background:#fff; }\n'
    + '    h1 { margin:14px 0 10px; font-size:clamp(1.5rem,3vw,2rem); }\n'
    + '    p { margin:0 0 12px; line-height:1.65; }\n'
    + '    .muted { color:var(--muted); }\n'
    + '    nav ol { list-style:none; display:flex; flex-wrap:wrap; gap:8px; padding:0; margin:0 0 14px; font-size:14px; color:var(--muted); }\n'
    + '    nav li::after { content:"/"; margin-left:8px; }\n'
    + '    nav li:last-child::after { content:""; margin:0; }\n'
    + '    nav a { color:inherit; }\n'
    + '    .chip-row { display:flex; flex-wrap:wrap; gap:8px; margin:12px 0 20px; }\n'
    + '    .chip { text-decoration:none; font-size:13px; border:1px solid var(--line); border-radius:999px; padding:7px 12px; color:var(--ink); background:#fff; }\n'
    + '    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:14px; margin-top:14px; }\n'
    + '    .card { border:1px solid var(--line); border-radius:14px; background:var(--card); padding:16px; }\n'
    + '    .card h3 { margin:0 0 8px; font-size:1rem; }\n'
    + '    .btn { display:inline-block; margin-top:10px; text-decoration:none; padding:8px 12px; border-radius:9px; border:1px solid var(--line); color:var(--ink); background:#f8f5ee; }\n'
    + '    .hint { display:inline-block; margin-top:10px; font-size:13px; color:var(--muted); }\n'
    + '    section { border:1px solid var(--line); border-radius:14px; background:#fff; padding:16px; margin-top:14px; }\n'
    + '  </style>\n'
    + '</head>\n'
    + '<body>\n'
    + '  <!-- LAB CLEAN ROUTES: generado por scripts/generate-clean-route-lab.js -->\n'
    + '  <main>\n'
    + '    <nav aria-label="breadcrumbs"><ol id="breadcrumbs">' + page.breadcrumbs + '</ol></nav>\n'
    + '    <span class="lab">Modo LAB</span>\n'
    + '    <h1>' + escapeHtml(page.heading) + '</h1>\n'
    + '    <p class="muted">' + escapeHtml(page.intro) + '</p>\n'
    + '    <div class="chip-row">' + buildGlobalLabLinks() + '</div>\n'
    + (cardsHtml ? ('    <div class="grid">' + cardsHtml + '</div>\n') : '')
    + sectionsHtml
    + '  </main>\n'
    + '</body>\n'
    + '</html>\n';
}

function main() {
  const listings = readJson('data/listings.json');
  const taxonomy = readJson('data/taxonomy.json');
  const settings = readJson('data/site-settings.json');

  const listingSlug = 'piso-senorial-reformado-barrio-salamanca-madrid';
  const sampleListing = listings.find(function (item) {
    return item.slug === listingSlug;
  });

  if (!sampleListing) {
    throw new Error('No existe el listing requerido para LAB: ' + listingSlug);
  }

  const countriesByCode = {};
  (taxonomy.countries || []).forEach(function (item) {
    countriesByCode[String(item.code || '').toUpperCase()] = item.name || item.code;
  });

  const listingLabHref = '/_lab_clean_routes/listing/' + sampleListing.slug + '/';
  const saleListings = listings.filter(function (item) { return item.operation === 'sale'; });
  const rentListings = listings.filter(function (item) {
    return item.operation === 'long_term_rent' || item.operation === 'room_rent';
  });
  const countryEsListings = listings.filter(function (item) { return String(item.country).toUpperCase() === 'ES'; });
  const cityMadridListings = listings.filter(function (item) { return slugify(item.city) === 'madrid'; });

  fs.rmSync(LAB_ROOT, { recursive: true, force: true });
  fs.mkdirSync(LAB_ROOT, { recursive: true });

  const pages = [
    {
      path: 'inmobiliario/index.html',
      title: 'LAB Inmobiliario | ' + settings.site_name,
      description: 'Laboratorio de rutas limpias para el indice maestro inmobiliario.',
      heading: 'Indice maestro LAB del vertical inmobiliario',
      canonicalLab: buildLabAbsolute('inmobiliario/index.html'),
      intro: 'Muestra controlada para validar publicacion de rutas limpias sin exponer produccion.',
      breadcrumbs: buildBreadcrumbs([
        { href: '/_lab_clean_routes/inmobiliario/', label: 'LAB Inicio' },
        { label: 'Inmobiliario' }
      ]),
      cards: [renderCard(sampleListing, listingLabHref)],
      sections: [
        '<section><h2>Contexto LAB</h2><p class="muted">Este entorno no sustituye rutas publicas ni canonicals actuales. Solo valida arquitectura limpia en GitHub Pages con contenido estatico.</p></section>'
      ]
    },
    {
      path: 'venta/index.html',
      title: 'LAB Venta | ' + settings.site_name,
      description: 'Laboratorio de coleccion limpia de activos en venta.',
      heading: 'Coleccion LAB de activos en venta',
      canonicalLab: buildLabAbsolute('venta/index.html'),
      intro: 'Coleccion de venta en modo laboratorio con copy premium y enlaces internos controlados.',
      breadcrumbs: buildBreadcrumbs([
        { href: '/_lab_clean_routes/inmobiliario/', label: 'LAB Inicio' },
        { label: 'Venta' }
      ]),
      cards: saleListings.slice(0, 3).map(function (item) {
        return renderCard(item, item.slug === sampleListing.slug ? listingLabHref : null);
      })
    },
    {
      path: 'alquiler/index.html',
      title: 'LAB Alquiler | ' + settings.site_name,
      description: 'Laboratorio de coleccion limpia de alquiler estable y larga estancia.',
      heading: 'Coleccion LAB de alquiler estable',
      canonicalLab: buildLabAbsolute('alquiler/index.html'),
      intro: 'Muestra de activos de larga duracion para validar estructura limpia de coleccion.',
      breadcrumbs: buildBreadcrumbs([
        { href: '/_lab_clean_routes/inmobiliario/', label: 'LAB Inicio' },
        { label: 'Alquiler' }
      ]),
      cards: rentListings.slice(0, 3).map(function (item) {
        return renderCard(item, null);
      }),
      sections: [
        '<section><h2>Nota de muestra</h2><p class="muted">En esta muestra LAB solo se publica un detalle limpio completo de listing. El resto de activos se mantiene como referencia de coleccion.</p></section>'
      ]
    },
    {
      path: 'pais/es/index.html',
      title: 'LAB Pais ES | ' + settings.site_name,
      description: 'Laboratorio de coleccion limpia por pais para Espana.',
      heading: 'Coleccion LAB por pais: Espana',
      canonicalLab: buildLabAbsolute('pais/es/index.html'),
      intro: 'Simulacion de ruta limpia por pais con datos reales de activos en Espana.',
      breadcrumbs: buildBreadcrumbs([
        { href: '/_lab_clean_routes/inmobiliario/', label: 'LAB Inicio' },
        { href: '/_lab_clean_routes/venta/', label: 'Venta' },
        { label: countriesByCode.ES || 'Espana' }
      ]),
      cards: countryEsListings.slice(0, 4).map(function (item) {
        return renderCard(item, item.slug === sampleListing.slug ? listingLabHref : null);
      })
    },
    {
      path: 'ciudad/madrid/index.html',
      title: 'LAB Ciudad Madrid | ' + settings.site_name,
      description: 'Laboratorio de coleccion limpia por ciudad para Madrid.',
      heading: 'Coleccion LAB por ciudad: Madrid',
      canonicalLab: buildLabAbsolute('ciudad/madrid/index.html'),
      intro: 'Simulacion de ruta limpia por ciudad con foco en activos de Madrid.',
      breadcrumbs: buildBreadcrumbs([
        { href: '/_lab_clean_routes/inmobiliario/', label: 'LAB Inicio' },
        { href: '/_lab_clean_routes/pais/es/', label: 'Espana' },
        { label: 'Madrid' }
      ]),
      cards: cityMadridListings.slice(0, 4).map(function (item) {
        return renderCard(item, item.slug === sampleListing.slug ? listingLabHref : null);
      })
    },
    {
      path: 'hub/pais/es/index.html',
      title: 'LAB Hub Pais ES | ' + settings.site_name,
      description: 'Laboratorio de hub editorial limpio por pais para Espana.',
      heading: 'Hub editorial LAB por pais: Espana',
      canonicalLab: buildLabAbsolute('hub/pais/es/index.html'),
      intro: (taxonomy.country_editorial && taxonomy.country_editorial.ES) || 'Narrativa editorial LAB para Espana.',
      breadcrumbs: buildBreadcrumbs([
        { href: '/_lab_clean_routes/inmobiliario/', label: 'LAB Inicio' },
        { href: '/_lab_clean_routes/pais/es/', label: 'Pais ES' },
        { label: 'Hub Pais ES' }
      ]),
      cards: [renderCard(sampleListing, listingLabHref)],
      sections: [
        '<section><h2>Enlace de coleccion</h2><p><a class="btn" href="/_lab_clean_routes/pais/es/">Abrir coleccion de Espana en LAB</a></p></section>'
      ]
    },
    {
      path: 'hub/ciudad/madrid/index.html',
      title: 'LAB Hub Ciudad Madrid | ' + settings.site_name,
      description: 'Laboratorio de hub editorial limpio por ciudad para Madrid.',
      heading: 'Hub editorial LAB por ciudad: Madrid',
      canonicalLab: buildLabAbsolute('hub/ciudad/madrid/index.html'),
      intro: (taxonomy.city_editorial && taxonomy.city_editorial.Madrid) || 'Narrativa editorial LAB para Madrid.',
      breadcrumbs: buildBreadcrumbs([
        { href: '/_lab_clean_routes/inmobiliario/', label: 'LAB Inicio' },
        { href: '/_lab_clean_routes/ciudad/madrid/', label: 'Ciudad Madrid' },
        { label: 'Hub Ciudad Madrid' }
      ]),
      cards: [renderCard(sampleListing, listingLabHref)],
      sections: [
        '<section><h2>Enlace de coleccion</h2><p><a class="btn" href="/_lab_clean_routes/ciudad/madrid/">Abrir coleccion de Madrid en LAB</a></p></section>'
      ]
    },
    {
      path: 'listing/' + sampleListing.slug + '/index.html',
      title: 'LAB Listing | ' + sampleListing.title + ' | ' + settings.site_name,
      description: sampleListing.summary,
      heading: sampleListing.title + ' (LAB)',
      canonicalLab: buildLabAbsolute('listing/' + sampleListing.slug + '/index.html'),
      intro: 'Detalle LAB para validar ruta limpia de anuncio sin tocar produccion.',
      breadcrumbs: buildBreadcrumbs([
        { href: '/_lab_clean_routes/inmobiliario/', label: 'LAB Inicio' },
        { href: '/_lab_clean_routes/venta/', label: 'Venta' },
        { label: sampleListing.title }
      ]),
      cards: [],
      sections: [
        '<section><h2>Resumen ejecutivo</h2><p class="muted">' + escapeHtml(sampleListing.description) + '</p></section>',
        '<section><h2>Datos del activo</h2><p><strong>Operacion:</strong> ' + escapeHtml(operationLabel(sampleListing.operation)) + '</p><p><strong>Tipo:</strong> ' + escapeHtml(sampleListing.asset_type) + '</p><p><strong>Ubicacion:</strong> ' + escapeHtml([sampleListing.zone, sampleListing.city, sampleListing.region, countriesByCode[String(sampleListing.country).toUpperCase()] || sampleListing.country].filter(Boolean).join(', ')) + '</p><p><strong>Superficie:</strong> ' + escapeHtml(String(sampleListing.surface_m2)) + ' m2</p><p><strong>Precio:</strong> ' + escapeHtml(formatPrice(sampleListing.price, sampleListing.currency)) + '</p><p><strong>Contacto:</strong> ' + escapeHtml(sampleListing.contact_cta) + '</p></section>',
        '<section><h2>Rutas relacionadas en LAB</h2><p><a class="btn" href="/_lab_clean_routes/venta/">Volver a venta LAB</a> <a class="btn" href="/_lab_clean_routes/pais/es/">Pais ES LAB</a> <a class="btn" href="/_lab_clean_routes/ciudad/madrid/">Ciudad Madrid LAB</a></p></section>'
      ]
    }
  ];

  pages.forEach(function (page) {
    writeFile(page.path, renderShell(page));
  });

  console.log('LAB clean routes generated:', pages.length);
}

main();
