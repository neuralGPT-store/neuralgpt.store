#!/usr/bin/env node

'use strict';

/**
 * CHANY LOCAL — GESTOR INTELIGENTE DEL ECOSISTEMA neuralgpt.store
 *
 * Capacidades:
 *   3A — Gestión inmobiliaria web:
 *     - Limpiar anuncios caducados (>90 días venta, >60 días alquiler)
 *     - Detectar duplicados en listings.json
 *     - Detectar anomalías: sin fotos, sin precio, mal formados
 *     - Recomendar acciones: destacar, renovar, eliminar
 *     - Moderar contenido sospechoso
 *     - Generar reporte diario de salud del portal
 *
 *   3B — Gestión financiera y fiscal:
 *     - Estructura /data/fiscal/ con carpetas ingresos/, gastos/, declaraciones/
 *     - Registro de ingresos/gastos mensuales
 *     - Declaraciones trimestrales y anuales
 *     - IVA 21% (España) / 0% (UE con NIF válido)
 *
 * Uso:
 *   node scripts/chany-local-agent.js clean
 *   node scripts/chany-local-agent.js audit
 *   node scripts/chany-local-agent.js fiscal:setup
 *   node scripts/chany-local-agent.js fiscal:income --date=YYYY-MM-DD --concept="..." --amount=XXX [--iva=21] [--country=ES]
 *   node scripts/chany-local-agent.js fiscal:expense --date=YYYY-MM-DD --provider="..." --concept="..." --amount=XXX [--deductible=true]
 *   node scripts/chany-local-agent.js fiscal:quarterly --year=YYYY --quarter=Q1|Q2|Q3|Q4
 *   node scripts/chany-local-agent.js fiscal:annual --year=YYYY
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const listingsPath = path.join(root, 'data', 'listings.json');
const fiscalRoot = path.join(root, 'data', 'fiscal');
const siteSettingsPath = path.join(root, 'data', 'site-settings.json');

// Umbrales desde site-settings.json
let VALIDITY_DAYS_SALE = 90;
let VALIDITY_DAYS_RENT = 60;

function loadSiteSettings() {
  if (!fs.existsSync(siteSettingsPath)) return {};
  try {
    const data = JSON.parse(fs.readFileSync(siteSettingsPath, 'utf8'));
    if (data.ops_thresholds) {
      VALIDITY_DAYS_SALE = data.ops_thresholds.validity_days_sale_non_rent || 90;
      VALIDITY_DAYS_RENT = data.ops_thresholds.validity_days_rent || 60;
    }
    return data;
  } catch (error) {
    console.warn('[ChanyLocal] Error leyendo site-settings.json:', error.message);
    return {};
  }
}

function loadListings() {
  if (!fs.existsSync(listingsPath)) {
    console.error('[ChanyLocal] No existe data/listings.json');
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(listingsPath, 'utf8'));
  } catch (error) {
    console.error('[ChanyLocal] JSON inválido en listings.json:', error.message);
    process.exit(1);
  }
}

function saveListings(listings) {
  const tmpPath = listingsPath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(listings, null, 2), 'utf8');
  fs.renameSync(tmpPath, listingsPath);
}

function isExpired(publishedAt, operation) {
  if (!publishedAt) return false;
  const published = new Date(publishedAt);
  if (isNaN(published.getTime())) return false;
  const now = Date.now();
  const limit = (operation === 'sale') ? VALIDITY_DAYS_SALE : VALIDITY_DAYS_RENT;
  const expiryMs = limit * 86400000;
  return (now - published.getTime()) > expiryMs;
}

function detectAnomalies(listing) {
  const issues = [];
  if (!Array.isArray(listing.images) || listing.images.length === 0) {
    issues.push('sin_fotos');
  }
  if (typeof listing.price !== 'number' || listing.price <= 0) {
    issues.push('sin_precio');
  }
  if (!listing.description || listing.description.trim().length < 20) {
    issues.push('descripcion_corta');
  }
  if (!listing.city || !listing.country) {
    issues.push('ubicacion_incompleta');
  }
  if (!listing.coordinates || typeof listing.coordinates.lat !== 'number' || typeof listing.coordinates.lng !== 'number') {
    issues.push('sin_coordenadas');
  }
  return issues;
}

function detectDuplicates(listings) {
  const seen = {};
  const duplicates = [];
  listings.forEach((listing) => {
    const key = [listing.title, listing.city, listing.price].join('|').toLowerCase();
    if (seen[key]) {
      duplicates.push({ id: listing.id, slug: listing.slug, duplicate_of: seen[key] });
    } else {
      seen[key] = listing.id;
    }
  });
  return duplicates;
}

function moderateContent(listing) {
  const flags = [];
  const text = [listing.title, listing.summary, listing.description].join(' ').toLowerCase();
  const spamWords = ['bitcoin', 'crypto', 'forex', 'loan', 'viagra', 'casino', 'porn', 'xxx', 'escort', 'sex'];
  spamWords.forEach((word) => {
    if (text.includes(word)) flags.push('spam_keyword_' + word);
  });
  if (text.includes('software') || text.includes('curso') || text.includes('formación')) {
    flags.push('contenido_no_inmobiliario');
  }
  return flags;
}

// ============================================================
// COMANDOS — Gestión inmobiliaria web
// ============================================================

function cmdClean() {
  loadSiteSettings();
  console.log('[ChanyLocal] Limpiando anuncios caducados...');
  const listings = loadListings();
  const before = listings.length;
  const cleaned = listings.filter((listing) => {
    if (listing.status !== 'published') return true; // Keep drafts, expired, etc.
    if (isExpired(listing.published_at, listing.operation)) {
      console.log(`  → Eliminando ${listing.slug} (caducado: ${listing.published_at})`);
      return false;
    }
    return true;
  });
  const removed = before - cleaned.length;
  if (removed > 0) {
    saveListings(cleaned);
    console.log(`[ChanyLocal] ✓ Eliminados ${removed} anuncios caducados. Total restante: ${cleaned.length}`);
  } else {
    console.log('[ChanyLocal] ✓ No hay anuncios caducados para eliminar.');
  }
}

function cmdAudit() {
  loadSiteSettings();
  console.log('[ChanyLocal] AUDITORÍA COMPLETA DEL PORTAL\n');
  const listings = loadListings();
  const published = listings.filter((l) => l.status === 'published');
  const drafts = listings.filter((l) => l.status === 'draft');
  const expired = listings.filter((l) => l.status === 'expired');

  console.log(`📊 RESUMEN:`);
  console.log(`  Total anuncios: ${listings.length}`);
  console.log(`  Publicados: ${published.length}`);
  console.log(`  Borradores: ${drafts.length}`);
  console.log(`  Expirados: ${expired.length}\n`);

  // Detectar caducados no marcados
  const caducados = published.filter((l) => isExpired(l.published_at, l.operation));
  if (caducados.length > 0) {
    console.log(`⚠️  ANUNCIOS CADUCADOS NO MARCADOS: ${caducados.length}`);
    caducados.forEach((l) => {
      console.log(`    - ${l.slug} (publicado: ${l.published_at})`);
    });
    console.log('');
  }

  // Detectar anomalías
  const anomalies = [];
  published.forEach((listing) => {
    const issues = detectAnomalies(listing);
    if (issues.length > 0) {
      anomalies.push({ id: listing.id, slug: listing.slug, issues });
    }
  });
  if (anomalies.length > 0) {
    console.log(`⚠️  ANUNCIOS CON ANOMALÍAS: ${anomalies.length}`);
    anomalies.forEach((a) => {
      console.log(`    - ${a.slug}: ${a.issues.join(', ')}`);
    });
    console.log('');
  }

  // Detectar duplicados
  const duplicates = detectDuplicates(published);
  if (duplicates.length > 0) {
    console.log(`⚠️  POSIBLES DUPLICADOS: ${duplicates.length}`);
    duplicates.forEach((d) => {
      console.log(`    - ${d.slug} (posible duplicado de ${d.duplicate_of})`);
    });
    console.log('');
  }

  // Moderar contenido
  const moderated = [];
  published.forEach((listing) => {
    const flags = moderateContent(listing);
    if (flags.length > 0) {
      moderated.push({ id: listing.id, slug: listing.slug, flags });
    }
  });
  if (moderated.length > 0) {
    console.log(`⚠️  ANUNCIOS CON SEÑALES DE MODERACIÓN: ${moderated.length}`);
    moderated.forEach((m) => {
      console.log(`    - ${m.slug}: ${m.flags.join(', ')}`);
    });
    console.log('');
  }

  // Recomendaciones
  console.log('💡 RECOMENDACIONES:');
  if (caducados.length > 0) {
    console.log(`  - Ejecutar "node scripts/chany-local-agent.js clean" para eliminar ${caducados.length} anuncios caducados`);
  }
  if (anomalies.length > 0) {
    console.log(`  - Revisar y completar ${anomalies.length} anuncios con anomalías`);
  }
  if (duplicates.length > 0) {
    console.log(`  - Revisar y eliminar ${duplicates.length} posibles duplicados`);
  }
  if (moderated.length > 0) {
    console.log(`  - Revisar ${moderated.length} anuncios con señales de spam/contenido no inmobiliario`);
  }
  if (caducados.length === 0 && anomalies.length === 0 && duplicates.length === 0 && moderated.length === 0) {
    console.log('  ✓ El portal está en perfecto estado. No hay acciones recomendadas.');
  }
  console.log('');
}

// ============================================================
// COMANDOS — Gestión financiera y fiscal
// ============================================================

function ensureFiscalStructure() {
  const dirs = [
    fiscalRoot,
    path.join(fiscalRoot, 'ingresos'),
    path.join(fiscalRoot, 'gastos'),
    path.join(fiscalRoot, 'declaraciones')
  ];
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`  → Creado: ${dir}`);
    }
  });
}

function cmdFiscalSetup() {
  console.log('[ChanyLocal] Configurando estructura fiscal...');
  ensureFiscalStructure();
  console.log('[ChanyLocal] ✓ Estructura fiscal lista en /data/fiscal/');
}

function parseArgs(argv) {
  const args = {};
  argv.forEach((arg) => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      args[key] = value || true;
    }
  });
  return args;
}

function cmdFiscalIncome(argv) {
  ensureFiscalStructure();
  const args = parseArgs(argv);
  const date = args.date || new Date().toISOString().slice(0, 10);
  const concept = args.concept || 'Ingreso sin concepto';
  const amount = parseFloat(args.amount || 0);
  const iva = parseFloat(args.iva || 21);
  const country = (args.country || 'ES').toUpperCase();

  if (amount <= 0) {
    console.error('[ChanyLocal] Error: --amount debe ser > 0');
    process.exit(1);
  }

  const [year, month] = date.split('-');
  const monthKey = `${year}-${month}`;
  const ingresosDir = path.join(fiscalRoot, 'ingresos', monthKey);
  if (!fs.existsSync(ingresosDir)) fs.mkdirSync(ingresosDir, { recursive: true });

  const ingresosFile = path.join(ingresosDir, `ingresos-${monthKey}.json`);
  let ingresos = [];
  if (fs.existsSync(ingresosFile)) {
    ingresos = JSON.parse(fs.readFileSync(ingresosFile, 'utf8'));
  }

  const baseImponible = amount / (1 + iva / 100);
  const ivaAmount = amount - baseImponible;
  const entry = {
    id: crypto.randomBytes(8).toString('hex'),
    fecha: date,
    concepto: concept,
    importe_total: amount,
    base_imponible: Math.round(baseImponible * 100) / 100,
    iva_pct: iva,
    iva_importe: Math.round(ivaAmount * 100) / 100,
    pais: country,
    created_at: new Date().toISOString()
  };

  ingresos.push(entry);
  fs.writeFileSync(ingresosFile, JSON.stringify(ingresos, null, 2), 'utf8');
  console.log(`[ChanyLocal] ✓ Ingreso registrado: ${amount} € (base: ${entry.base_imponible} € + IVA ${iva}%: ${entry.iva_importe} €)`);
}

function cmdFiscalExpense(argv) {
  ensureFiscalStructure();
  const args = parseArgs(argv);
  const date = args.date || new Date().toISOString().slice(0, 10);
  const provider = args.provider || 'Proveedor no especificado';
  const concept = args.concept || 'Gasto sin concepto';
  const amount = parseFloat(args.amount || 0);
  const deductible = args.deductible === 'true' || args.deductible === true;
  const iva = parseFloat(args.iva || 21);

  if (amount <= 0) {
    console.error('[ChanyLocal] Error: --amount debe ser > 0');
    process.exit(1);
  }

  const [year, month] = date.split('-');
  const monthKey = `${year}-${month}`;
  const gastosDir = path.join(fiscalRoot, 'gastos', monthKey);
  if (!fs.existsSync(gastosDir)) fs.mkdirSync(gastosDir, { recursive: true });

  const gastosFile = path.join(gastosDir, `gastos-${monthKey}.json`);
  let gastos = [];
  if (fs.existsSync(gastosFile)) {
    gastos = JSON.parse(fs.readFileSync(gastosFile, 'utf8'));
  }

  const baseImponible = amount / (1 + iva / 100);
  const ivaAmount = amount - baseImponible;
  const entry = {
    id: crypto.randomBytes(8).toString('hex'),
    fecha: date,
    proveedor: provider,
    concepto: concept,
    importe_total: amount,
    base_imponible: Math.round(baseImponible * 100) / 100,
    iva_pct: iva,
    iva_soportado: Math.round(ivaAmount * 100) / 100,
    deducible: deductible,
    created_at: new Date().toISOString()
  };

  gastos.push(entry);
  fs.writeFileSync(gastosFile, JSON.stringify(gastos, null, 2), 'utf8');
  console.log(`[ChanyLocal] ✓ Gasto registrado: ${amount} € (base: ${entry.base_imponible} € + IVA ${iva}%: ${entry.iva_soportado} €) ${deductible ? '[DEDUCIBLE]' : ''}`);
}

function cmdFiscalQuarterly(argv) {
  ensureFiscalStructure();
  const args = parseArgs(argv);
  const year = args.year || new Date().getFullYear().toString();
  const quarter = args.quarter || 'Q1';

  const quarterMonths = {
    Q1: ['01', '02', '03'],
    Q2: ['04', '05', '06'],
    Q3: ['07', '08', '09'],
    Q4: ['10', '11', '12']
  };

  if (!quarterMonths[quarter]) {
    console.error('[ChanyLocal] Error: --quarter debe ser Q1, Q2, Q3 o Q4');
    process.exit(1);
  }

  const months = quarterMonths[quarter];
  let totalIngresos = 0;
  let totalIvaRepercutido = 0;
  let totalGastos = 0;
  let totalIvaSoportado = 0;

  months.forEach((month) => {
    const monthKey = `${year}-${month}`;
    const ingresosFile = path.join(fiscalRoot, 'ingresos', monthKey, `ingresos-${monthKey}.json`);
    const gastosFile = path.join(fiscalRoot, 'gastos', monthKey, `gastos-${monthKey}.json`);

    if (fs.existsSync(ingresosFile)) {
      const ingresos = JSON.parse(fs.readFileSync(ingresosFile, 'utf8'));
      ingresos.forEach((i) => {
        totalIngresos += i.base_imponible;
        totalIvaRepercutido += i.iva_importe;
      });
    }

    if (fs.existsSync(gastosFile)) {
      const gastos = JSON.parse(fs.readFileSync(gastosFile, 'utf8'));
      gastos.forEach((g) => {
        if (g.deducible) {
          totalGastos += g.base_imponible;
          totalIvaSoportado += g.iva_soportado;
        }
      });
    }
  });

  const baseImponible = totalIngresos - totalGastos;
  const ivaResulta = totalIvaRepercutido - totalIvaSoportado;

  const trimestral = {
    year,
    quarter,
    periodo: months.join(', '),
    ingresos_base: Math.round(totalIngresos * 100) / 100,
    gastos_base_deducibles: Math.round(totalGastos * 100) / 100,
    base_imponible: Math.round(baseImponible * 100) / 100,
    iva_repercutido: Math.round(totalIvaRepercutido * 100) / 100,
    iva_soportado: Math.round(totalIvaSoportado * 100) / 100,
    iva_resulta: Math.round(ivaResulta * 100) / 100,
    created_at: new Date().toISOString()
  };

  const trimestralFile = path.join(fiscalRoot, 'declaraciones', `trimestral-${year}-${quarter}.json`);
  fs.writeFileSync(trimestralFile, JSON.stringify(trimestral, null, 2), 'utf8');

  console.log(`[ChanyLocal] ✓ Declaración trimestral ${year}-${quarter} generada:`);
  console.log(`  Base imponible: ${trimestral.base_imponible} €`);
  console.log(`  IVA repercutido: ${trimestral.iva_repercutido} €`);
  console.log(`  IVA soportado: ${trimestral.iva_soportado} €`);
  console.log(`  IVA resulta: ${trimestral.iva_resulta} € ${ivaResulta > 0 ? '(A INGRESAR)' : '(A COMPENSAR)'}`);
  console.log(`  Archivo: ${trimestralFile}`);
}

function cmdFiscalAnnual(argv) {
  ensureFiscalStructure();
  const args = parseArgs(argv);
  const year = args.year || new Date().getFullYear().toString();

  let totalIngresos = 0;
  let totalGastos = 0;

  for (let m = 1; m <= 12; m++) {
    const month = String(m).padStart(2, '0');
    const monthKey = `${year}-${month}`;
    const ingresosFile = path.join(fiscalRoot, 'ingresos', monthKey, `ingresos-${monthKey}.json`);
    const gastosFile = path.join(fiscalRoot, 'gastos', monthKey, `gastos-${monthKey}.json`);

    if (fs.existsSync(ingresosFile)) {
      const ingresos = JSON.parse(fs.readFileSync(ingresosFile, 'utf8'));
      ingresos.forEach((i) => {
        totalIngresos += i.base_imponible;
      });
    }

    if (fs.existsSync(gastosFile)) {
      const gastos = JSON.parse(fs.readFileSync(gastosFile, 'utf8'));
      gastos.forEach((g) => {
        if (g.deducible) {
          totalGastos += g.base_imponible;
        }
      });
    }
  }

  const beneficioNeto = totalIngresos - totalGastos;

  const anual = {
    year,
    ingresos_totales: Math.round(totalIngresos * 100) / 100,
    gastos_deducibles: Math.round(totalGastos * 100) / 100,
    beneficio_neto: Math.round(beneficioNeto * 100) / 100,
    created_at: new Date().toISOString()
  };

  const anualFile = path.join(fiscalRoot, `resumen-anual-${year}.json`);
  fs.writeFileSync(anualFile, JSON.stringify(anual, null, 2), 'utf8');

  console.log(`[ChanyLocal] ✓ Resumen anual ${year} generado:`);
  console.log(`  Ingresos totales: ${anual.ingresos_totales} €`);
  console.log(`  Gastos deducibles: ${anual.gastos_deducibles} €`);
  console.log(`  Beneficio neto: ${anual.beneficio_neto} €`);
  console.log(`  Archivo: ${anualFile}`);
}

// ============================================================
// MAIN
// ============================================================

const cmd = process.argv[2];

if (!cmd) {
  console.log('Chany Local — Gestor inteligente del ecosistema neuralgpt.store\n');
  console.log('Uso:');
  console.log('  node scripts/chany-local-agent.js clean');
  console.log('  node scripts/chany-local-agent.js audit');
  console.log('  node scripts/chany-local-agent.js fiscal:setup');
  console.log('  node scripts/chany-local-agent.js fiscal:income --date=YYYY-MM-DD --concept="..." --amount=XXX [--iva=21] [--country=ES]');
  console.log('  node scripts/chany-local-agent.js fiscal:expense --date=YYYY-MM-DD --provider="..." --concept="..." --amount=XXX [--deductible=true]');
  console.log('  node scripts/chany-local-agent.js fiscal:quarterly --year=YYYY --quarter=Q1|Q2|Q3|Q4');
  console.log('  node scripts/chany-local-agent.js fiscal:annual --year=YYYY');
  process.exit(0);
}

switch (cmd) {
  case 'clean':
    cmdClean();
    break;
  case 'audit':
    cmdAudit();
    break;
  case 'fiscal:setup':
    cmdFiscalSetup();
    break;
  case 'fiscal:income':
    cmdFiscalIncome(process.argv.slice(3));
    break;
  case 'fiscal:expense':
    cmdFiscalExpense(process.argv.slice(3));
    break;
  case 'fiscal:quarterly':
    cmdFiscalQuarterly(process.argv.slice(3));
    break;
  case 'fiscal:annual':
    cmdFiscalAnnual(process.argv.slice(3));
    break;
  default:
    console.error(`[ChanyLocal] Comando desconocido: ${cmd}`);
    process.exit(1);
}
