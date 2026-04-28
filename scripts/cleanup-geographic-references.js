#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const files = [
  'pais.html',
  'ciudad.html',
  'hub-ciudad.html',
  'hub-pais.html',
  'alquiler.html',
  'alquiler/index.html',
  'sponsors.html',
  'listing.html',
  'real-estate-index.html',
  'sitemap-real-estate.html'
];

const replacements = [
  // Eliminar enlaces a Lisboa
  { from: /<a href="\/ciudad\.html\?city=lisboa"[^>]*>Lisboa<\/a>/g, to: '' },
  { from: /<a href="\/hub-ciudad\.html\?city=lisboa"[^>]*>Hub Lisboa<\/a>/g, to: '' },

  // Eliminar referencias a Portugal en botones
  { from: /<a href="\/pais\.html\?country=pt"[^>]*>Portugal<\/a>/g, to: '' },
  { from: /<a href="\/hub-pais\.html\?country=pt"[^>]*>[^<]*<\/a>/g, to: '' },

  // Eliminar otros países de botones
  { from: /<a href="\/pais\.html\?country=de"[^>]*>🇩🇪 Alemania<\/a>/g, to: '' },
  { from: /<a href="\/pais\.html\?country=it"[^>]*>🇮🇹 Italia<\/a>/g, to: '' },
  { from: /<a href="\/pais\.html\?country=fr"[^>]*>🇫🇷 Francia<\/a>/g, to: '' },
  { from: /<a href="\/pais\.html\?country=nl"[^>]*>🇳🇱 Países Bajos<\/a>/g, to: '' },
  { from: /<a href="\/pais\.html\?country=gb"[^>]*>🇬🇧 Reino Unido<\/a>/g, to: '' },
  { from: /<a href="\/pais\.html\?country=ie"[^>]*>🇮🇪 Irlanda<\/a>/g, to: '' },
  { from: /<a href="\/pais\.html\?country=tr"[^>]*>🇹🇷 Turquía<\/a>/g, to: '' },
  { from: /<a href="\/pais\.html\?country=is"[^>]*>🇮🇸 Islandia<\/a>/g, to: '' },
  { from: /<a href="\/pais\.html\?country=gl"[^>]*>🇬🇱 Groenlandia<\/a>/g, to: '' },

  // Limpiar spacing
  { from: /<a href="\/pais\.html\?country=pt" class="btn">🇵🇹 Portugal<\/a>/g, to: '' },
  { from: /<a href="\/pais\.html\?country=de" class="btn">🇩🇪 Alemania<\/a>/g, to: '' },
  { from: /<a href="\/pais\.html\?country=it" class="btn">🇮🇹 Italia<\/a>/g, to: '' },
  { from: /<a href="\/pais\.html\?country=fr" class="btn">🇫🇷 Francia<\/a>/g, to: '' },
  { from: /<a href="\/pais\.html\?country=nl" class="btn">🇳🇱 Países Bajos<\/a>/g, to: '' },
  { from: /<a href="\/pais\.html\?country=gb" class="btn">🇬🇧 Reino Unido<\/a>/g, to: '' },
  { from: /<a href="\/pais\.html\?country=ie" class="btn">🇮🇪 Irlanda<\/a>/g, to: '' },
  { from: /<a href="\/ciudad\.html\?city=edinburgh" class="btn">🏴 Escocia<\/a>/g, to: '' },
  { from: /<a href="\/pais\.html\?country=tr" class="btn">🇹🇷 Turquía<\/a>/g, to: '' },
  { from: /<a href="\/pais\.html\?city=lisboa" class="btn">Lisboa<\/a>/g, to: '' },

  // Fallback names in JS
  { from: /PT:'Portugal',/g, to: '' },
  { from: /, PT:'Portugal'/g, to: '' },

  // Selector de idioma portugués
  { from: /<option value="pt">🇵🇹 PT<\/option>/g, to: '' }
];

const root = path.join(__dirname, '..');

files.forEach(file => {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  No existe: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  replacements.forEach(({ from, to }) => {
    if (content.match(from)) {
      content = content.replace(from, to);
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Limpiado: ${file}`);
  } else {
    console.log(`○ Sin cambios: ${file}`);
  }
});

console.log('\n✅ Limpieza geográfica completada');
