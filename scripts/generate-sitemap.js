#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// Obtener todas las ciudades españolas del directorio ciudad/
const ciudadDir = path.join(__dirname, '..', 'ciudad');
const cities = fs.readdirSync(ciudadDir)
  .filter(name => {
    const stat = fs.statSync(path.join(ciudadDir, name));
    return stat.isDirectory();
  })
  .sort();

// URLs estáticas principales
const staticUrls = [
  { loc: 'https://neuralgpt.store/', changefreq: 'weekly', priority: '1.0' },
  { loc: 'https://neuralgpt.store/real-estate-index.html', changefreq: 'daily', priority: '0.9' },
  { loc: 'https://neuralgpt.store/venta.html', changefreq: 'daily', priority: '0.9' },
  { loc: 'https://neuralgpt.store/alquiler.html', changefreq: 'daily', priority: '0.9' },
  { loc: 'https://neuralgpt.store/pais/es/', changefreq: 'weekly', priority: '0.8' },
  { loc: 'https://neuralgpt.store/contact.html', changefreq: 'monthly', priority: '0.6' },
  { loc: 'https://neuralgpt.store/about.html', changefreq: 'monthly', priority: '0.5' },
  { loc: 'https://neuralgpt.store/security.html', changefreq: 'monthly', priority: '0.5' },
  { loc: 'https://neuralgpt.store/legal.html', changefreq: 'monthly', priority: '0.4' },
  { loc: 'https://neuralgpt.store/terms.html', changefreq: 'monthly', priority: '0.4' },
  { loc: 'https://neuralgpt.store/privacy.html', changefreq: 'monthly', priority: '0.4' },
  { loc: 'https://neuralgpt.store/pricing.html', changefreq: 'monthly', priority: '0.5' },
  { loc: 'https://neuralgpt.store/sponsors.html', changefreq: 'monthly', priority: '0.4' },
  { loc: 'https://neuralgpt.store/blog/', changefreq: 'weekly', priority: '0.7' },
];

// Generar XML
let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

// Añadir URLs estáticas
staticUrls.forEach(url => {
  xml += `  <url><loc>${url.loc}</loc><changefreq>${url.changefreq}</changefreq><priority>${url.priority}</priority></url>\n`;
});

// Añadir todas las ciudades españolas
cities.forEach(city => {
  xml += `  <url><loc>https://neuralgpt.store/ciudad/${city}/</loc><changefreq>weekly</changefreq><priority>0.75</priority></url>\n`;
});

xml += '</urlset>\n';

// Guardar sitemap
const sitemapPath = path.join(__dirname, '..', 'sitemap.xml');
fs.writeFileSync(sitemapPath, xml, 'utf8');

console.log(`✅ Sitemap generado con ${staticUrls.length} URLs estáticas + ${cities.length} ciudades españolas`);
console.log(`📍 Total: ${staticUrls.length + cities.length} URLs`);
